# getkeyd — Journey Page: Narrated Video Tutorial

Target length: ~75 seconds. Voice: warm, encouraging, plain-spoken (not salesy).
Page: `pages/journey.html` — the Guided Journey (6 phases, 23 steps, Washington State).

---

## Narration script + storyboard (scene by scene)

| # | Time | On screen (visual / action) | Voiceover |
|---|------|-----------------------------|-----------|
| 1 | 0:00–0:07 | Journey page loads. Slow pan across the "Your Guided Journey" header and the **Washington State** badge. Progress bar at 0%. | "Buying your first home has a lot of moving parts. getkeyd's Guided Journey breaks the whole thing into simple, checkable steps — tailored for Washington State." |
| 2 | 0:07–0:16 | Zoom to the progress bar reading **0% complete**. | "Everything lives on one page. This progress bar at the top tracks how far along you are — it fills up as you go, so you always know where you stand." |
| 3 | 0:16–0:28 | **Phase 1 – Financial Prep** is already open. Cursor hovers each of its 4 steps. | "Your journey is grouped into six phases. It starts with Phase 1, Financial Prep — checking your credit, working out your debt-to-income ratio, setting a down-payment goal, and building an emergency fund." |
| 4 | 0:28–0:38 | Click the checkbox on "Check your credit score." Step gets a strikethrough / done state; the phase badge ticks **1/4**; progress bar nudges up. | "As you complete each step, just check it off. Watch — the step marks done, the phase counter updates, and your overall progress climbs. It's that satisfying." |
| 5 | 0:38–0:50 | Collapse Phase 1, then click through to expand **Phase 2 – Pre-Approval**, **Phase 3 – Home Search**, briefly showing their steps. | "Each phase clicks open to reveal its steps — from getting pre-approved and comparing lenders, to finding an agent and touring homes. Open only what you're working on and keep the rest tidy." |
| 6 | 0:50–1:02 | Quick scroll past Phases 4, 5, 6 headers (Offer & Contract, Inspection & Appraisal, Closing) ending on "Sign and get your keys 🔑". | "It carries all the way through making an offer, inspection and appraisal, and closing day — right down to signing and getting your keys." |
| 7 | 1:02–1:10 | Fast-forward montage: many boxes check themselves, bar races to **100% complete**, the celebrate banner appears. | "Check off everything and you'll hit one hundred percent — with a little celebration when you get there." |
| 8 | 1:10–1:15 | Reload the page; progress is still there. End on getkeyd logo / CTA. | "And your progress saves to your account, so you can pick up right where you left off. Start your journey today — with getkeyd." |

---

## Voiceover-only script (clean copy for TTS)

> Buying your first home has a lot of moving parts. getkeyd's Guided Journey breaks the whole thing into simple, checkable steps — tailored for Washington State.
>
> Everything lives on one page. This progress bar at the top tracks how far along you are — it fills up as you go, so you always know where you stand.
>
> Your journey is grouped into six phases. It starts with Phase 1, Financial Prep — checking your credit, working out your debt-to-income ratio, setting a down-payment goal, and building an emergency fund.
>
> As you complete each step, just check it off. Watch — the step marks done, the phase counter updates, and your overall progress climbs.
>
> Each phase clicks open to reveal its steps — from getting pre-approved and comparing lenders, to finding an agent and touring homes. Open only what you're working on and keep the rest tidy.
>
> It carries all the way through making an offer, inspection and appraisal, and closing day — right down to signing and getting your keys.
>
> Check off everything and you'll hit one hundred percent — with a little celebration when you get there.
>
> And your progress saves to your account, so you can pick up right where you left off. Start your journey today — with getkeyd.

---

## How to turn this into a finished video

You need two ingredients: (A) the **screen footage** of the Journey page, and (B) the **narration audio**, then combine them.

### A. Capture the screen footage
- **Manual:** open http://localhost:8000/pages/journey.html, record with macOS `Cmd+Shift+5` (or QuickTime → New Screen Recording), and perform the actions in the storyboard.
- **Automated (reproducible):** a Playwright script can drive the exact clicks above and record straight to video — ask and I'll generate it.

### B. Generate the narration + assemble (AI tools — run these yourself)
Pick one:
- **ElevenLabs** — highest-quality AI voiceover. Paste the clean script, download the MP3, then drop it under your screen recording in any editor (iMovie, CapCut, DaVinci Resolve — all free).
- **Descript** — paste the script, it generates AI voice *and* lets you edit video + auto-captions in one place. Easiest all-in-one.
- **Synthesia / HeyGen** — if you want an on-screen AI presenter alongside the screen capture.
- **Pictory / Canva** — script-to-video with stock + AI voice; good for a quick polished cut.

Recommended fastest path: **Descript** (paste script → AI voice → drag in the screen recording → export), or **ElevenLabs + CapCut** if you want more control over timing.

> Note: these are third-party services. Review each one's data/privacy terms before uploading anything.
