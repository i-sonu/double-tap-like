# Fixtures (human-provided)

These are **real, logged-in HTML snapshots** of each platform's video player. The
agent will not invent them — fixture tests stay skipped until the file exists.

## How to capture one

1. Log into the platform and open a **video** post/short/reel.
2. Open DevTools → Elements.
3. Find the container element that wraps the whole post (for X: the
   `<article role="article">` containing the `<video>`).
4. Right-click it → **Copy → Copy outerHTML**.
5. Paste into the matching file below and save.

## Expected files

| File             | Platform     | Stage |
| ---------------- | ------------ | ----- |
| `twitter.html`   | X / Twitter  | 1     |
| `youtube.html`   | YouTube Shorts | 2   |
| `tiktok.html`    | TikTok       | 2     |
| `instagram.html` | Instagram    | 2     |

Capture at least the post `<article>` (X) so both the `<video>` and the like
button (`[data-testid="like"]` / `[data-testid="unlike"]`) are inside the snapshot.
