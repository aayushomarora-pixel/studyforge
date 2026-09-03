import { describe, expect, it } from "vitest";

function scheduleFor(rating: "again" | "hard" | "good" | "easy", interval: number, ease: number) {
  const nextEase = rating === "easy" ? Math.min(350, ease + 15) : rating === "again" ? Math.max(130, ease - 25) : ease;
  const nextInterval = rating === "again" ? 0 : interval === 0 ? (rating === "easy" ? 4 : 1) : Math.max(1, Math.round(interval * (nextEase / 100) * (rating === "hard" ? 0.7 : rating === "easy" ? 1.3 : 1)));
  return { nextInterval, nextEase };
}

describe("StudyForge spaced repetition", () => {
  it("resets a forgotten card for immediate relearning", () => {
    expect(scheduleFor("again", 12, 250)).toEqual({ nextInterval: 0, nextEase: 225 });
  });
  it("starts a new card with a short interval", () => {
    expect(scheduleFor("good", 0, 250).nextInterval).toBe(1);
    expect(scheduleFor("easy", 0, 250).nextInterval).toBe(4);
  });
  it("grows confident reviews and caps ease", () => {
    expect(scheduleFor("easy", 10, 340)).toEqual({ nextInterval: 46, nextEase: 350 });
  });
});
