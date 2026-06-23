# plan.md — "Double-Click to Like" Browser Extension

> **For the agent (Claude Code) executing this file:** Build the extension exactly to this spec. Do not
> hardcode obfuscated CSS class names anywhere. Use the semantic-selector strategy described in §5.
> When you reach §8 (Testing), understand the hard boundary: you CANNOT log into the user's real social
> accounts. Build unit + fixture tests only, then generate the manual QA checklist for the user. Do not
> claim end-to-end verification you did not perform.

---

## 1. Goal

A personal Manifest V3 browser extension. When the user **double-clicks anywhere on the video surface**
of a short-form video, it registers a **like** on that video — replicating the mobile "double-tap to like"
gesture on desktop web.

Target surfaces:
- **YouTube Shorts** (`youtube.com/shorts/*`)
- **Instagram Reels** (`instagram.com/reels/*`, `instagram.com/reel/*`, and reels in feed/explore)
- **TikTok** (`tiktok.com` — the For You / scrolling feed and individual video pages)
- **X / Twitter** (`x.com`, `twitter.com` — video posts in timeline and standalone)

A heart-burst animation should appear at the cursor position on a successful like, for parity with mobile.

## 2. Explicit Non-Goals (do not build these)

- ❌ No bulk/auto-liking, scheduling, or liking without an explicit user gesture. **One like per one deliberate double-click.**
- ❌ No Chrome Web Store publication path. This is a sideloaded personal tool. (Engagement-automation extensions get delisted.)
- ❌ No account login automation, no credential handling, no headless liking.
- ❌ No un-liking. If a video is already liked, a double-click must be a no-op (still show animation optionally), never a toggle-off.
- ❌ No analytics, telemetry, or remote calls of any kind.

## 3. Honest Constraints (read before estimating)

1. **Manifest V3 only.** Chrome completed MV2 deprecation in 2025; MV2 extensions are disabled. Build MV3.
   Firefox also supports MV3 but differs on `background` (event page vs service worker) — see §7 for the
   cross-browser note. Primary target: Chromium (Chrome/Edge/Brave). Firefox = best-effort.
2. **Selector rot is the #1 maintenance risk.** Platforms ship obfuscated class names that change frequently.
   This spec mandates semantic selectors (aria/role/SVG) to survive that. Even so, expect to update adapters
   periodically. Bake a "selectors broke" failure mode that logs clearly to the console rather than silently dying.
3. **Native-behavior conflicts** (must be handled, see §6):
   - YouTube desktop: double-click on the standard player = fullscreen. Scope strictly to the Shorts surface.
   - Instagram desktop: **may already like on double-click natively.** VERIFY FIRST (§8 manual step IG-0). If it
     does, the IG adapter should only add the heart animation and otherwise defer to native.
   - TikTok / X desktop: single click = play/pause. A double-click dispatches two clicks first; handle so the
     net result isn't a jarring pause→play flicker before the like.
4. **No autonomous end-to-end testing is possible.** See §8. The agent builds the code and fixture tests;
   the human verifies real likes.

## 4. Architecture Overview

```
manifest.json
src/
  content/
    main.js            # entry: registers ONE delegated listener, routes to adapter
    dblclick.js        # double-click detection + native-conflict handling
    heart.js           # heart-burst animation overlay (pure CSS/JS, injected)
    adapters/
      base.js          # PlatformAdapter interface + shared helpers (semantic finders)
      youtube.js
      instagram.js
      tiktok.js
      twitter.js
    detect.js          # pick the correct adapter from location.hostname/pathname
  popup/
    popup.html         # extension-icon popup: per-platform on/off toggles
    popup.js           # reads/writes chrome.storage; UI only, no like logic
    popup.css
  config.js            # shared: storage keys, defaults, isPlatformEnabled(name) helper
  styles/
    heart.css
test/
  fixtures/            # SAVED real HTML snapshots of each player (human provides; see §8)
  unit/                # logic tests (jsdom)
README.md              # install + manual QA checklist (generated last)
```

**Core design decision — delegated capture-phase listener, not per-element binding.**
All four sites are SPAs that destroy/recreate DOM on navigation. Do NOT bind listeners to video elements
(they get garbage-collected on scroll/nav). Instead attach **one** listener to `document` in the **capture
phase**, and at event time resolve: (a) which adapter, (b) the nearest video surface from `event.target`,
(c) that surface's associated like button. This survives all SPA re-renders.

## 5. Selector Strategy (MANDATORY — this is the whole ballgame)

Each adapter implements this interface (`base.js`):

```js
class PlatformAdapter {
  /** Does this adapter handle the current page? */
  matches(): boolean
  /** From the dblclick event target, return the video "surface" element (the area double-clicks count on),
   *  or null if the click wasn't on a likeable video. */
  resolveSurface(eventTarget: Element): Element | null
  /** Given a surface, find the associated Like button element, or null. */
  findLikeButton(surface: Element): Element | null
  /** Is this video already liked? */
  isLiked(likeButton: Element): boolean
  /** Perform the like (click the button). Returns true if a like action was issued. */
  like(likeButton: Element): boolean
}
```

**Finder priority order (use the FIRST that works; never lead with class names):**

1. `aria-label` match (case-insensitive, locale-aware-ish): button whose accessible label contains
   `like`/`unlike` (and the localized equivalents you can add later). This is the most stable anchor.
2. `aria-pressed` / `aria-checked` state for like-state detection.
3. `role="button"` + nested `<svg>` whose path `d` attribute matches the heart glyph (maintain a small
   list of known heart path fragments per platform; match on a stable substring, not the whole path).
4. Structural fallback: nearest actionbar/rail relative to the surface, then the first heart-like control.
5. **Class names are a last resort only**, and if used must be treated as fragile and wrapped in try/catch
   with a console warning.

**Per-platform notes (verify against live DOM during build; these are starting points, not gospel):**

- **YouTube Shorts:** surface = the `#shorts-player` / Shorts renderer video container. Like button is in
  the Shorts action bar; find by `button` with `aria-label` starting with "like"/"Unlike"/"I like this".
  `aria-pressed="true"` ⇒ already liked. Restrict `resolveSurface` to the Shorts route so you never hit the
  fullscreen-on-dblclick conflict of the normal watch player.
- **Instagram:** RUN MANUAL STEP IG-0 FIRST. If native double-click already likes, make `like()` a no-op
  that returns false and just trigger the animation. Otherwise: like control is an svg-bearing button with
  `aria-label="Like"` (filled/`aria-label="Unlike"` when liked). Surface = the reel `<video>`'s nearest
  `article`/dialog container.
- **TikTok:** surface = the active feed item's video wrapper. Like button = the heart in the right action
  rail; find by the strong-like/like data attributes or `aria` if present, else the heart svg in the rail
  nearest the active video. Liked state = filled heart (color/path or `aria-pressed`).
- **X / Twitter:** surface = the `<video>`'s nearest `article[role="article"]`. Like button =
  `[data-testid="like"]`; liked state = `[data-testid="unlike"]` present (X swaps testid when liked).
  X's `data-testid` is comparatively stable — acceptable to use here as the primary anchor.

## 6. Double-Click Detection & Native-Conflict Handling (`dblclick.js`)

**MVP (build this first):** Listen for the native `dblclick` event in capture phase. On fire:
1. Resolve adapter + surface + like button.
2. If no like button, ignore (let native behavior proceed).
3. If `isLiked()` ⇒ optionally show animation, do not click. Return.
4. Else call `like()`, then show heart animation at `event.clientX/clientY`.
Accept that the two underlying single clicks already fired (minor play/pause flicker on TikTok/X). Ship this,
confirm likes register, THEN consider the advanced path below.

**Advanced (only if the flicker is unacceptable):** Intercept `click`/`pointerdown` in capture phase, hold
the first click ~220–260ms; if a second click on the same surface arrives in-window, `stopImmediatePropagation`
+ `preventDefault` on both and fire the like; if the window elapses, re-dispatch the suppressed single click so
native play/pause still works. This is fiddly and risks breaking native behavior — do NOT start here.

**Guard rails:**
- Debounce so one gesture = at most one like (ignore repeat dblclicks within ~600ms on the same surface).
- Ignore double-clicks that land on actual controls (the like button itself, comment, share, mute, scrubber)
  by checking `event.target.closest()` against a per-adapter "interactive controls" selector list.
- Only act on primary-button (`event.button === 0`) double-clicks.

## 7. Manifest & Permissions (least privilege)

- `manifest_version: 3`
- `content_scripts` matched to the four domains only. Inject at `document_idle`, `all_frames: false`.
- Permissions: host permissions for the four domains + **`storage`** (required, for the toggles in §7.1).
  No `tabs`, no `scripting` (static content scripts suffice), no `activeTab`.
- **`action` with `default_popup: "src/popup/popup.html"`** is required (the toolbar-icon popup, §7.1).
- Background service worker: keep minimal/none. If Firefox support is attempted, provide an event-page
  fallback and document the divergence; do not block Chromium delivery on Firefox parity.

## 7.1 Popup & Per-Platform Toggles (REQUIRED)

Clicking the extension's toolbar icon opens a small popup with **one on/off switch per platform**:
`X`, `YouTube`, `TikTok`, `Instagram`. Each switch enables/disables double-click-to-like on that platform
only. (Add one extra **master switch** at the top — it's nearly free and lets the user kill everything at once.)

**Storage schema (`chrome.storage.sync`, defaults all `true`):**
```js
{
  enabled: { master: true, youtube: true, instagram: true, tiktok: true, twitter: true }
}
```
- `config.js` exposes `getEnabled()`, `setPlatform(name, bool)`, and
  `isPlatformEnabled(name)` → returns `enabled.master && enabled[name]`.
- **`popup.js` is UI only** — it reads/writes storage and nothing else. No like logic, no DOM scraping.
- **Content scripts must gate on the toggle.** Before issuing any like in §6, call `isPlatformEnabled(adapterName)`.
  If false, do nothing and let native behavior proceed untouched. Read the value at event time (or cache it and
  subscribe to `chrome.storage.onChanged`) so toggling takes effect without a page reload.
- Popup state must reflect current storage on open, and persist immediately on toggle.

Keep the popup dead simple: four (or five) labeled switches, no settings sprawl. This is not a config panel.

## 8. Testing Strategy (the realistic version)

**What the agent CAN and MUST do:**
1. **Unit tests (jsdom + a test runner like vitest):**
   - Double-click timing/debounce logic.
   - "Already liked ⇒ no-op" logic.
   - "Click on a control ⇒ ignored" logic.
   - Each adapter's `findLikeButton` / `isLiked` against **fixture HTML** (see below).
2. **Fixture-based DOM tests:** The HUMAN must save real, logged-in HTML snapshots of each player into
   `test/fixtures/{youtube,instagram,tiktok,twitter}.html` (DevTools → right-click the player container →
   "Copy → Copy outerHTML", or save full page). The agent writes tests asserting that each adapter locates
   the correct like button and reads like-state correctly from these fixtures. **If fixtures are absent, the
   agent must stop and request them — do NOT invent DOM.**
3. Generate `README.md` with the **Manual QA checklist** below.

**What the agent CANNOT do (state this plainly, don't fake it):**
- Cannot log into the user's accounts.
- Cannot confirm a real like persisted server-side.
- Cannot guarantee selectors still match live sites (only the fixtures).

**Manual QA checklist (goes in README, human runs it):**
- [ ] IG-0: On instagram.com desktop, double-click a reel WITHOUT the extension. Does it already like? Record result; configure IG adapter accordingly.
- [ ] Load unpacked extension (chrome://extensions → Developer mode → Load unpacked).
- [ ] YouTube Shorts: double-click center of a Short → heart fills, count increments, NO fullscreen. Re-double-click → no un-like.
- [ ] Instagram Reels: double-click → like registers (or native confirmed) + animation.
- [ ] TikTok: double-click feed video → heart fills, no jarring pause/play. Already-liked video → no toggle off.
- [ ] X: double-click a video post → like registers; non-video posts unaffected.
- [ ] Single click still pauses/plays everywhere (extension didn't break native).
- [ ] Scroll to 10+ new videos, repeat — confirms SPA-survival (delegated listener works).

## 9. Acceptance Criteria

1. Double-click on the video surface likes the video on all four platforms (or, for IG, defers to confirmed native behavior).
2. Never un-likes; already-liked ⇒ no-op.
3. Single-click native behavior is preserved on every platform.
4. No fullscreen trigger on YouTube.
5. Survives SPA navigation/scrolling without re-injection.
6. Zero network calls; permissions limited to the four host domains.
7. Heart animation renders at cursor on success.
8. Toolbar-icon popup shows per-platform toggles (+ master); toggling a platform OFF disables liking there
   immediately (no reload) and leaves native behavior untouched; state persists across sessions.
9. All unit + fixture tests pass; README contains the manual QA checklist and an honest "what wasn't auto-tested" note.

## 10. Build Sequence — STAGED, with human checkpoints (order for the agent)

This is a **gated build, not a single hands-off run.** The agent builds a stage, then HALTS and hands control
back to the human for live verification before continuing. Do not build later stages before the human confirms
the earlier one. There are two mandatory checkpoints.

### Stage 1 — Core architecture + popup + X adapter (proves the whole design)
1. Scaffold MV3 structure + `manifest.json` (§7) + `config.js` + test runner config.
2. `base.js` interface + semantic finder helpers (§5).
3. `detect.js` adapter routing.
4. `dblclick.js` MVP path (§6) + `main.js` delegated capture listener (gated on `isPlatformEnabled`, §7.1).
5. `heart.js` + `heart.css` animation.
6. `popup/` UI with all four toggles + master (§7.1) — build it now so it's testable from stage 1.
7. Implement the **X / Twitter adapter only** (most stable selectors).
8. Request the X fixture from the human if absent; write unit + X fixture tests; run until green.
9. **🛑 CHECKPOINT 1 — HALT.** Output: how to load unpacked, plus the X + toggle items from the §8 manual
   checklist. Tell the human: "Verify X works and the X/master toggles work on the live site, then tell me to
   continue." Do NOT start Stage 2 until the human confirms. Report honestly what was and wasn't tested.

### Stage 2 — Remaining adapters (only after human confirms Stage 1)
10. Run/confirm **IG-0** result with the human (does Instagram already like natively?). Configure IG adapter accordingly.
11. Implement **YouTube**, then **TikTok**, then **Instagram** adapters (same machinery as X; selectors per §5).
12. Request remaining fixtures; write unit + fixture tests for all three; run until green.
13. Generate `README.md` (install steps + full manual QA checklist + honest limitations).
14. **🛑 CHECKPOINT 2 — HALT.** Hand back the full manual QA checklist for all four platforms + toggles.
    Report what was tested (fixtures/units) vs. what only the human can verify (live likes). Do not overstate.

> If the human explicitly asks for stricter staging, also HALT after each of YouTube, TikTok, and Instagram
> individually. Default is the two checkpoints above.

## 11. Known Failure Modes to Surface (not hide)

- Selectors stop matching after a platform update → log a clear console warning per adapter; document how to re-grab fixtures and update finders.
- Instagram native double-click changes → re-run IG-0.
- Heavy anti-bot frame on a platform could ignore synthetic clicks → if `like()` issues a click but state doesn't flip in fixtures-equivalent flow, log it; this is a platform limitation, not a silent bug.
