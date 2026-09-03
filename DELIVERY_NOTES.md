# StudyForge Delivery Notes

StudyForge is a polished, authenticated study workspace for turning reading into active recall. Users can upload a PDF or paste notes, save the source metadata to their account, and generate a study set containing structured multiple-choice questions and flashcards through the server-side Claude-compatible LLM workflow.

## Included experience

| Area | What is implemented |
|---|---|
| Ingestion | Authenticated PDF upload and pasted-text input with title support and readable-text validation |
| Storage | Original PDF bytes are stored in object storage; the database retains the object key and serving reference alongside document metadata |
| Generation | Structured JSON generation for study-set title, summary, quiz questions, explanations, source notes, and flashcards |
| Quiz | One-question-at-a-time flow, answer selection, correct/incorrect feedback, correct-answer reveal, explanations, score, and saved attempts |
| Flashcards | Reveal interaction, self-rated Again/Hard/Good/Easy responses, review history, and next-due date updates |
| Scheduling | Lightweight SM-2-inspired interval and ease-factor scheduling with a due-today queue |
| Dashboard | Recent study sets, due-card count, review count, progress surface, and clear upload/quiz/review entry points |
| Reminders | Persisted daily reminder preference toggle and hour setting as the foundation for scheduled notification delivery |

## Basic usage

Sign in, choose **Choose PDF** or paste several paragraphs into the study studio, optionally add a title, and select **Generate study set**. Open the resulting set from the recent-study-set library. Use **Quiz** for active recall with feedback and saved scoring, or use **Flashcards** to reveal each answer and rate your recall. The rating determines the next review interval, while due cards appear in the dashboard queue.

## Validation

The project passes `pnpm check` and the Vitest suite. Current automated coverage includes the existing authentication logout flow and focused spaced-repetition scheduling rules. The desktop preview was visually verified after the final styling pass.

## Known limitation

The reminder toggle currently persists the learner’s preference and target hour in the database but does not yet create or send an external notification job. This keeps the in-app due queue fully functional while leaving the notification delivery hook ready for a later scheduled-notification implementation that requires deployment before scheduling.
