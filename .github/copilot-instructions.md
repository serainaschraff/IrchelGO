# Copilot instructions for IrchelGO

Read [DEVELOPER-NOTES.md](../DEVELOPER-NOTES.md) for the project's architecture, runtime constraints, development commands, deployment setup, and domain-specific reference.

## Working in this repository

- Inspect existing code and worktree changes before editing; preserve unrelated user changes.
- Keep browser/device APIs in `src/utils/*`, UI in `src/components/*`, and animal definitions in `src/animals/*`.
- Follow existing TypeScript style and reuse existing helpers. Make small, focused changes and validate affected behavior.
- Run `npm run build` for source changes and `git diff --check` for text/source edits. Device-dependent AR changes also need physical-device testing.
- Do not run WebXR and 8th Wall camera pipelines concurrently. Keep the 8th Wall runtime lazy-loaded and preserve its license and attribution.

## Conversation transcripts

Keep both `CHAT-TRANSCRIPT.md` and `CHAT-TRANSCRIPT-CLEAN.html` current by adding each user request and the corresponding final assistant response after responding. Preserve the user's wording; label summaries or reconstructions honestly.

The Markdown log may include concise context and validation details. The clean HTML is user-facing conversation only: retain substantive requests and final answers, but exclude tool calls/results, intermediate plans, progress narration, status messages, and other execution details. Preserve its speaker labels and formatting; validation notes remain visually smaller. This applies only when the repository is accessible and editable, not as background recording.
