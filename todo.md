# Project TODO

- [x] Build authenticated StudyForge dashboard shell with elegant study-focused visual system
- [x] Support PDF upload and pasted text input
- [x] Extract usable text from uploaded PDFs and validate text length/content
- [x] Store document metadata and original PDF references separately from the database
- [x] Add database schema for documents, study sets, quiz questions, flashcards, quiz attempts, and review events
- [x] Connect server-side generation workflow to Claude-compatible LLM with structured JSON output
- [x] Generate and persist multiple-choice questions with explanations and source context
- [x] Generate and persist flashcards from document text
- [x] Add study set list and detail views
- [x] Add interactive quiz flow with feedback, score, explanations, and saved attempts
- [x] Add flashcard review flow with self-rated recall responses
- [x] Implement spaced-repetition scheduling and due-today queue
- [x] Add learning dashboard with recent study sets, due cards, progress, and clear entry points
- [x] Add optional review reminder preference pathway (in-app toggle persisted for future scheduled notifications)
- [x] Add Vitest coverage for scheduling logic and existing auth procedure
- [x] Run type checks, tests, and visual verification at desktop width
- [ ] Save final checkpoint and prepare delivery notes
- [x] Add per-question quiz feedback that marks selected answers correct or incorrect and reveals the correct option before advancing
