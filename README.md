# Double Tap Like

A personal, sideloaded **Manifest V3** browser extension. Double-click the video
surface of a short-form video to **like** it — bringing the mobile "double-tap to
like" gesture to desktop web.

Supported sites:

- **X / Twitter** — video posts **and** image posts (timeline + standalone)
- **YouTube Shorts** (`youtube.com/shorts/*`)
- **TikTok** (For You feed + individual video pages)
- **Instagram** — **videos / reels only** (photos already like natively on desktop;
  see [IG behavior](#instagram-behavior))

A heart-burst animation appears on a successful like. It **never un-likes**: a
double-click on an already-liked item is a no-op (shows a muted heart, doesn't toggle off).

---

## Install (load unpacked)

1. Open `chrome://extensions` (Chrome / Edge / Brave).
2. Toggle **Developer mode** (top-right).
3. Click **Load unpacked** and select this folder
   (`DOUBLE CLICK LIKE/` — the one containing `manifest.json`).
4. Pin the extension. Click its toolbar icon to open the **per-platform toggles**.

After editing any source file, return to `chrome://extensions` and hit **↻ reload**
on the extension, then refresh the target tab.

> Primary target is Chromium. Firefox is best-effort and untested here (MV3
> background differences don't apply — this extension has no background worker).

## Popup / toggles

The toolbar popup has a **master** switch plus one switch per platform
(X, YouTube, TikTok, Instagram). Turning a platform **off** disables double-click-to-like
there immediately (no reload) and leaves native behavior untouched. State persists
via `chrome.storage.sync`.

## How it works

- One delegated **capture-phase `click` listener** on `document` — survives SPA
  navigation/scroll, no per-element binding.
- We detect double-clicks ourselves from click **timing + cursor proximity** (not the
  native `dblclick` event), and act on the like button resolved from the **first**
  click. This is required because on X an inline image opens the photo viewer on the
  first click, so the two clicks hit different elements and `dblclick` never fires.
- Like buttons are found via **semantic selectors** (aria-label / aria-pressed /
  stable `data-testid` / `data-e2e`), never obfuscated CSS class names.

### Instagram behavior

Instagram desktop **already likes photo posts** natively on double-click, but does
**not** like videos/reels. So this extension acts on **videos/reels only** and stays
out of the way for photos (clicking Like ourselves would toggle the native like back
off). The reels heart animation is styled to match Instagram's native white double-tap heart.

---

## If a platform stops working

Platforms ship DOM changes frequently. When an adapter breaks:

1. Open DevTools console on the site — adapters log a clear `[DCL][<platform>]`
   warning when they can't find the like button.
2. Re-grab a real DOM snapshot of the player/post (see `test/fixtures/README.md`)
   and update the relevant adapter's selectors in `src/content/adapters/`.

## Non-goals

No bulk/auto-liking, no scheduling, no login automation, no un-liking, no analytics,
no network calls. One deliberate double-click = at most one like.

## Screenshots
<img width="1280" height="800" alt="1" src="https://github.com/user-attachments/assets/11b077ef-4a11-4360-9862-1afbc9157033" />
<img width="1280" height="800" alt="2" src="https://github.com/user-attachments/assets/f3947f6b-88ef-418a-a4b2-eb74f0776321" />
<img width="1280" height="800" alt="3" src="https://github.com/user-attachments/assets/af9fb6aa-c72c-49b4-b8e6-920f568ca5ea" />
<img width="1280" height="800" alt="4" src="https://github.com/user-attachments/assets/e08aaaae-a00e-403e-a2ff-d2a48129d298" />
