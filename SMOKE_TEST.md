# M0 smoke checks

## Automated core checks

Run `npm test` and `npm run build`.

## Verified in this implementation

- Production build passed; six core tests passed.
- Headless desktop Chrome: new adventure → tap-to-walk to portal → timeline → Noah → NPC dialogue → ark inspection → chapter flags saved → refresh → Continue → return Home Base. No page errors.
- Chrome phone emulation (390 × 844, touch enabled): held on-screen directions → Explore → timeline → Noah. No horizontal overflow or page errors.
- Home Base, Noah, and phone screenshots inspected. This does not substitute for an actual iPhone Safari check.

## Full acceptance checklist

- [ ] Fresh browser shows New Adventure without Continue.
- [ ] Start, walk in four directions; walls/props stop movement.
- [ ] Tap to walk; holding a direction cancels the tap target.
- [ ] Approach Bible; open and advance dialogue; return to exploration.
- [ ] Walk to portal; open timeline; future entries say Coming Soon.
- [ ] Explore Noah; speak to Noah and inspect ark in either order.
- [ ] Complete first chapter; objective changes without claiming full story completion.
- [ ] Refresh; Continue resumes Noah and keeps both discoveries.
- [ ] Return home by button and meadow exit; reopen timeline.
- [ ] Export, reset with confirmation, import backup; progress restored.
- [ ] Invalid/oversized import shows error and keeps current progress.
- [ ] Reduced motion stops portal animation; no audio autoplays.
- [ ] Touch direction release/cancel stops movement; Explore triggers nearby interaction.
- [ ] Mobile portrait and landscape: no overflow, panels scroll, controls remain reachable.
- [ ] Production build under a repository subpath loads without missing assets.
- [ ] Actual iPhone Safari and desktop Safari walkthrough.
- [ ] GitHub Pages public deployment loads correctly.

Real-device and public-deployment checks must be performed before M0 signoff. Chrome mobile emulation does not verify iPhone Safari.
