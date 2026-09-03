import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { documents, flashcards, quizAttempts, quizQuestions, reminderSettings, reviewEvents, studySets } from "../drizzle/schema";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { PDFParse } from "pdf-parse";

const generationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    questions: { type: "array", items: { type: "object", additionalProperties: false, properties: { prompt: { type: "string" }, options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 }, correctIndex: { type: "integer", minimum: 0, maximum: 3 }, explanation: { type: "string" }, sourceNote: { type: "string" } }, required: ["prompt", "options", "correctIndex", "explanation", "sourceNote"] } },
    flashcards: { type: "array", items: { type: "object", additionalProperties: false, properties: { front: { type: "string" }, back: { type: "string" }, sourceNote: { type: "string" } }, required: ["front", "back", "sourceNote"] } },
  },
  required: ["title", "summary", "questions", "flashcards"],
} as const;

function contentOf(response: Awaited<ReturnType<typeof invokeLLM>>) {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("The model returned no usable content.");
  return JSON.parse(content) as { title: string; summary: string; questions: Array<{ prompt: string; options: string[]; correctIndex: number; explanation: string; sourceNote: string }>; flashcards: Array<{ front: string; back: string; sourceNote: string }> };
}

function scheduleFor(rating: "again" | "hard" | "good" | "easy", interval: number, ease: number) {
  const nextEase = rating === "easy" ? Math.min(350, ease + 15) : rating === "again" ? Math.max(130, ease - 25) : ease;
  const nextInterval = rating === "again" ? 0 : interval === 0 ? (rating === "easy" ? 4 : 1) : Math.max(1, Math.round(interval * (nextEase / 100) * (rating === "hard" ? 0.7 : rating === "easy" ? 1.3 : 1)));
  return { nextInterval, nextEase };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  study: router({
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [sets, due, reviewed] = await Promise.all([
        db.select().from(studySets).where(eq(studySets.userId, ctx.user.id)).orderBy(desc(studySets.updatedAt)).limit(8),
        db.select({ card: flashcards, setTitle: studySets.title }).from(flashcards).innerJoin(studySets, eq(flashcards.studySetId, studySets.id)).where(and(eq(studySets.userId, ctx.user.id), lte(flashcards.dueAt, new Date()))).orderBy(flashcards.dueAt).limit(50),
        db.select({ count: sql<number>`count(*)` }).from(reviewEvents).where(eq(reviewEvents.userId, ctx.user.id)),
      ]);
      return { sets, due, reviewedCount: Number(reviewed[0]?.count ?? 0) };
    }),
    set: protectedProcedure.input(z.object({ id: z.number().int() })).query(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const set = (await db.select().from(studySets).where(and(eq(studySets.id, input.id), eq(studySets.userId, ctx.user.id))).limit(1))[0];
      if (!set) throw new TRPCError({ code: "NOT_FOUND" });
      const [questions, cards] = await Promise.all([db.select().from(quizQuestions).where(eq(quizQuestions.studySetId, set.id)).orderBy(quizQuestions.sortOrder), db.select().from(flashcards).where(eq(flashcards.studySetId, set.id)).orderBy(flashcards.sortOrder)]);
      return { set, questions, cards };
    }),
    create: protectedProcedure.input(z.object({ title: z.string().optional(), text: z.string().optional(), fileName: z.string().optional(), fileBase64: z.string().optional(), mimeType: z.string().optional() })).mutation(async ({ ctx, input }) => {
      if (!input.text?.trim() && !input.fileBase64) throw new TRPCError({ code: "BAD_REQUEST", message: "Add pasted text or a PDF file." });
      let extracted = input.text?.trim() ?? ""; let fileKey: string | undefined; let fileUrl: string | undefined; const sourceType = input.fileBase64 ? "pdf" : "text" as const;
      if (input.fileBase64) {
        if (input.mimeType !== "application/pdf") throw new TRPCError({ code: "BAD_REQUEST", message: "Only PDF files are supported." });
        const buffer = Buffer.from(input.fileBase64, "base64");
        const stored = await storagePut(`users/${ctx.user.id}/documents/${Date.now()}-${(input.fileName ?? "document.pdf").replace(/[^a-zA-Z0-9._-]/g, "-")}`, buffer, "application/pdf"); fileKey = stored.key; fileUrl = stored.url;
        const parser = new PDFParse({ data: buffer }); const parsed = await parser.getText(); extracted = parsed.text?.trim() ?? ""; await parser.destroy();
      }
      if (extracted.length < 80) throw new TRPCError({ code: "BAD_REQUEST", message: "Please provide at least a few paragraphs of readable text." });
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const docResult = await db.insert(documents).values({ userId: ctx.user.id, title: input.title?.trim() || input.fileName?.replace(/\.pdf$/i, "") || "Untitled document", sourceType, fileKey, fileUrl, extractedText: extracted.slice(0, 60000), charCount: extracted.length });
      const documentId = Number(docResult[0].insertId);
      const response = await invokeLLM({ model: "claude-sonnet-4-6", maxTokens: 6000, messages: [{ role: "system", content: "You are an expert learning designer. Generate precise, non-trivial study material only from the supplied document. Avoid duplicate questions, trick wording, and unsupported claims." }, { role: "user", content: `Create a compact but high-quality study set from this document. Return 8 multiple-choice questions and 10 flashcards.\n\nDOCUMENT:\n${extracted.slice(0, 50000)}` }], responseFormat: { type: "json_schema", json_schema: { name: "study_set", strict: true, schema: generationSchema } } });
      const generated = contentOf(response);
      const setResult = await db.insert(studySets).values({ userId: ctx.user.id, documentId, title: generated.title || "New study set", summary: generated.summary, questionCount: generated.questions.length, flashcardCount: generated.flashcards.length });
      const studySetId = Number(setResult[0].insertId);
      if (generated.questions.length) await db.insert(quizQuestions).values(generated.questions.map((q, i) => ({ studySetId, prompt: q.prompt, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation, sourceNote: q.sourceNote, sortOrder: i })));
      if (generated.flashcards.length) await db.insert(flashcards).values(generated.flashcards.map((c, i) => ({ studySetId, front: c.front, back: c.back, sourceNote: c.sourceNote, sortOrder: i, dueAt: new Date() })));
      return { studySetId, title: generated.title, questionCount: generated.questions.length, flashcardCount: generated.flashcards.length };
    }),
    submitQuiz: protectedProcedure.input(z.object({ studySetId: z.number().int(), answers: z.array(z.number().int()) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const set = (await db.select().from(studySets).where(and(eq(studySets.id, input.studySetId), eq(studySets.userId, ctx.user.id))).limit(1))[0]; if (!set) throw new TRPCError({ code: "NOT_FOUND" }); const qs = await db.select().from(quizQuestions).where(eq(quizQuestions.studySetId, input.studySetId)).orderBy(quizQuestions.sortOrder); const score = qs.reduce((sum, q, i) => sum + (input.answers[i] === q.correctIndex ? 1 : 0), 0); await db.insert(quizAttempts).values({ userId: ctx.user.id, studySetId: input.studySetId, score, total: qs.length, answers: input.answers }); return { score, total: qs.length };
    }),
    reviewCard: protectedProcedure.input(z.object({ flashcardId: z.number().int(), rating: z.enum(["again", "hard", "good", "easy"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const card = (await db.select({ card: flashcards, userId: studySets.userId }).from(flashcards).innerJoin(studySets, eq(flashcards.studySetId, studySets.id)).where(and(eq(flashcards.id, input.flashcardId), eq(studySets.userId, ctx.user.id))).limit(1))[0]; if (!card) throw new TRPCError({ code: "NOT_FOUND" }); const { nextInterval, nextEase } = scheduleFor(input.rating, card.card.intervalDays, card.card.easeFactor); const due = new Date(Date.now() + nextInterval * 86400000); await db.update(flashcards).set({ intervalDays: nextInterval, easeFactor: nextEase, dueAt: due, lastReviewedAt: new Date(), reviewCount: card.card.reviewCount + 1 }).where(eq(flashcards.id, input.flashcardId)); await db.insert(reviewEvents).values({ userId: ctx.user.id, flashcardId: input.flashcardId, rating: input.rating, previousIntervalDays: card.card.intervalDays, nextIntervalDays: nextInterval }); return { dueAt: due, nextIntervalDays: nextInterval };
    }),
    reminder: protectedProcedure.query(async ({ ctx }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); return (await db.select().from(reminderSettings).where(eq(reminderSettings.userId, ctx.user.id)).limit(1))[0] ?? { enabled: 0, reminderHourUtc: 17 }; }),
    updateReminder: protectedProcedure.input(z.object({ enabled: z.boolean(), reminderHourUtc: z.number().int().min(0).max(23) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.insert(reminderSettings).values({ userId: ctx.user.id, enabled: input.enabled ? 1 : 0, reminderHourUtc: input.reminderHourUtc }).onDuplicateKeyUpdate({ set: { enabled: input.enabled ? 1 : 0, reminderHourUtc: input.reminderHourUtc } }); return { enabled: input.enabled, reminderHourUtc: input.reminderHourUtc }; }),
  }),
});
export type AppRouter = typeof appRouter;
