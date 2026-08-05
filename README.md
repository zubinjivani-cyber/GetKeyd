# getkeyd 🔑

Your guide to homeownership, without the confusion.

**getkeyd** is a homeownership-education app for first-time buyers, based on the AI Homeowner App business proposal. It walks users from *"Can I afford a home?"* through closing, with Washington State specific guidance.

## Pages

- **Home** (`index.html`) - overview and links to each tool.
- **Plan** (`pages/plan.html`) - three tools in one place:
  - *What Can I Afford?* - enter income, debts, savings, and credit to get a personalized affordable price range, monthly budget, timeline, and what to improve (36% DTI, 10% down, 30-year assumptions, all in the browser).
  - *Monthly Payment Calculator* - a home price into a full monthly breakdown (principal & interest, tax, insurance, PMI).
  - *Down Payment Savings Goal* - a progress ring and projected "ready" date; saves automatically.
- **Journey** (`pages/journey.html`) - the buying process broken into 6 checkable phases with Washington notes (Form 17, earnest money, buyer-agent commission), plus a printable document checklist for pre-approval. Progress saves automatically.
- **Learn** (`pages/learn.html`) - in-depth plain-language guides, a searchable/expandable glossary, and an FAQ.
- **Resources** (`pages/resources.html`) - links to trusted official resources (WSHFC, CFPB, HUD, AnnualCreditReport).
- **Contact** (`pages/contact.html`) - a message form (Formspree).
- **Privacy** and **Terms** (`pages/privacy.html`, `pages/terms.html`).

## Tech

Pure **HTML + CSS + vanilla JavaScript**. No React, no frameworks, no build step, no dependencies. Everything is static and runs entirely client-side, using `localStorage` for persistence. Fonts load from Google Fonts.

## Structure

```
getkeyd/
├── index.html              home (guest hero + member dashboard)
├── login.html              log in / sign up
├── settings.html           account settings (auth-gated)
├── auth-action.html        handles Firebase email links (verify, reset) on getkeyd.app
├── 404.html                not-found page
├── CNAME                   custom domain (getkeyd.app)
├── COPYRIGHT
├── README.md
├── serve.py                local no-cache dev server
├── css/
│   └── styles.css          all styles
├── js/
│   ├── app.js              shared page interactivity
│   ├── auth.js             Firebase auth, dashboard, login gate (ES module)
│   ├── layout.js           shared header/nav/footer, injected into every page
│   ├── data.js             content data (guides, glossary, journey steps)
│   ├── gate.js             auth-gate watchdog (FOUC prevention, login redirect)
│   ├── helpers.js          shared helpers (escapeHtml, money, uidPrefix, fetchJSON)
│   └── tour-journey.js     guided audio walkthrough on the Journey page
├── assets/
│   ├── favicon.svg         logo / tab icon
│   ├── og-image.png        social share card (1200×630)
│   └── journey-narration.m4a  narration track for the Journey tour
├── pages/                  all sub-pages
│   ├── plan.html
│   ├── journey.html
│   ├── learn.html
│   ├── resources.html
│   ├── contact.html
│   ├── privacy.html        (public)
│   └── terms.html          (public)
└── tutorials/              dev-only notes (not part of the shipped site)
    └── journey-video-script.md
```

Every page except `login`, `privacy`, `terms`, `404`, and `auth-action` requires a
verified account; guests are redirected to `login.html`.

## Run locally

Serve the folder (auth needs http, not `file://`):

```bash
python3 serve.py          # no-cache dev server, so edits always show
# or: python3 -m http.server 8000
# then visit http://localhost:8000
```

Because it's fully static, it can be hosted on any static file host.

## License

Proprietary. See [COPYRIGHT](COPYRIGHT). All rights reserved.

## Disclaimer

For guidance and education only, not financial advice. A licensed lender will provide exact figures.
