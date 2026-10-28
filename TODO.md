# TODO

- [x] Hide debug text behind a flag so the app can run with or without debug information.
- [x] Create a welcome message that asks the user to accept all permission requests.
- [x] Move the Start AR button to the center of the screen and rename it to "Start Game!".
- [x] Add a small transparent button with white text that provides user-facing troubleshooting information, such as the current task, encountered errors, and important decisions.
- [x] Disable the camera preview before the game starts and show a stylized in-game photo instead.
- [x] Choose a game mascot and update the favicon to match.
- [ ] Refactor to remove unneeded code.

## Performance follow-up

- [ ] Review mobile bundle performance. Measure first-load and feature-load times on mobile, identify which large JavaScript chunks load initially versus on demand, and split or defer imports if measurements show user-facing delays. Latest build reported a main chunk of about 1.27 MB minified / 356 KB gzip, plus several larger room and emulator chunks.
- [ ] check if a "loading..." message is desired
