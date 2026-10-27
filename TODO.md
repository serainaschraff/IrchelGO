# TODO

- [ ] Review mobile bundle performance. Measure first-load and feature-load times on mobile, identify which large JavaScript chunks load initially versus on demand, and split or defer imports if measurements show user-facing delays. Latest build reported a main chunk of about 1.27 MB minified / 356 KB gzip, plus several larger room and emulator chunks.
