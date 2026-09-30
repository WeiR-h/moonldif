# Workbench visual verification — 2026-09-30

Direct built-in browser testing against the production build at `http://127.0.0.1:4188/moonldif/`. Desktop reference: 1440 × 1100. Small-screen simulation: 390 × 844; this is not a physical phone test. Screenshots and generated design reference are retained with local review materials.

| Reference point | Implementation / observation |
| --- | --- |
| Navy header and identity | White MoonLDIF wordmark and local-processing label. Initial inherited dark wordmark color was found visually and corrected. |
| Navigation hierarchy | Underlined active mode; existing mode labels retained. |
| Primary task | Existing title and file/check/export/stop controls remain first. |
| Analysis status | Full-width strip precedes rules; real success, policy block and incomplete states retain their wording. |
| Rules rail | Existing flags, profile recovery, limits, summary and explanations stay together. No configuration field removed. |
| Main workspace | Report/reproduction toolbar precedes source and review panels; source selection and line geometry remain intact. |
| Migration comparison | Same rail, two source panels and full difference list. Synthetic example returns four differences; selecting missing mail targets the original `mail` line. |
| Small screen | Stacked panels and wrapped controls. Precheck document client/scroll width both 375px in a 390px viewport with scrollbar: no horizontal page overflow. |

Copy above the fold remains the existing title, subtitle, actions and status. Added section heading: “检查规则”. Deliberate departures from the generated reference: retain complete error/privacy text, original synthetic source comments, full pagination and accessible native textareas instead of simulated syntax coloring or simplified controls. No remote assets, runtime dependencies, fonts, analytics or uploads added.

Direct checks: default risk block; invalid negative limit gives a Chinese field error and disables old outputs; correcting input and switching modes preserves content; migration example and original-line location; responsive layout. Complete download, save fallback, stale result and keyboard regression use the existing independent Chromium / Firefox suite. A later public-site check is recorded separately after deployment.
