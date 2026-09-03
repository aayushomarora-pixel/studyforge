import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  sourceType: mysqlEnum("sourceType", ["pdf", "text"]).notNull(),
  fileKey: varchar("fileKey", { length: 512 }),
  fileUrl: varchar("fileUrl", { length: 1024 }),
  extractedText: text("extractedText").notNull(),
  charCount: int("charCount").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const studySets = mysqlTable("studySets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  documentId: int("documentId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary"),
  questionCount: int("questionCount").default(0).notNull(),
  flashcardCount: int("flashcardCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const quizQuestions = mysqlTable("quizQuestions", {
  id: int("id").autoincrement().primaryKey(),
  studySetId: int("studySetId").notNull(),
  prompt: text("prompt").notNull(),
  options: json("options").notNull(),
  correctIndex: int("correctIndex").notNull(),
  explanation: text("explanation").notNull(),
  sourceNote: text("sourceNote"),
  sortOrder: int("sortOrder").notNull(),
});

export const flashcards = mysqlTable("flashcards", {
  id: int("id").autoincrement().primaryKey(),
  studySetId: int("studySetId").notNull(),
  front: text("front").notNull(),
  back: text("back").notNull(),
  sourceNote: text("sourceNote"),
  sortOrder: int("sortOrder").notNull(),
  intervalDays: int("intervalDays").default(0).notNull(),
  easeFactor: int("easeFactor").default(250).notNull(),
  dueAt: timestamp("dueAt").defaultNow().notNull(),
  lastReviewedAt: timestamp("lastReviewedAt"),
  reviewCount: int("reviewCount").default(0).notNull(),
});

export const quizAttempts = mysqlTable("quizAttempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  studySetId: int("studySetId").notNull(),
  score: int("score").notNull(),
  total: int("total").notNull(),
  answers: json("answers").notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

export const reviewEvents = mysqlTable("reviewEvents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  flashcardId: int("flashcardId").notNull(),
  rating: mysqlEnum("rating", ["again", "hard", "good", "easy"]).notNull(),
  previousIntervalDays: int("previousIntervalDays").notNull(),
  nextIntervalDays: int("nextIntervalDays").notNull(),
  reviewedAt: timestamp("reviewedAt").defaultNow().notNull(),
});

export const reminderSettings = mysqlTable("reminderSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  enabled: int("enabled").default(0).notNull(),
  cronTaskUid: varchar("cronTaskUid", { length: 65 }),
  reminderHourUtc: int("reminderHourUtc").default(17).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type StudySet = typeof studySets.$inferSelect;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type Flashcard = typeof flashcards.$inferSelect;
