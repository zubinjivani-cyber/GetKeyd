/* getkeyd content — the site's data (steps, glossary, FAQ), kept separate
   from app.js logic. Loaded before app.js on every page. Edit copy here. */

// A step is [title, description] with an OPTIONAL 3rd item: a list of learning
// resources. The resource-type schema lives in app.js.
// To add a YouTube video, drop in: { type:'video', title:'…', url:'https://youtu.be/…', minutes: 6 }
// (Links here are official/stable sources — verify occasionally, as URLs can change.)
const JOURNEY = [
  {
    phase: 'Phase 1 - Financial Prep',
    steps: [
      ['Check your credit score and report', 'Free through most banks and annualcreditreport.com.', [
        { type: 'tool', title: 'Get your free credit reports', url: 'https://www.annualcreditreport.com/', source: 'Official' },
        { type: 'article', title: 'How to get & read your credit report', source: 'CFPB',
          url: 'https://www.consumerfinance.gov/ask-cfpb/how-do-i-get-a-copy-of-my-credit-reports-en-5/',
          body: "<p>You're entitled to a <strong>free</strong> copy of your credit report from each of the three major bureaus — Equifax, Experian, and TransUnion — every week at AnnualCreditReport.com, the only federally authorized site.</p><p>When it arrives, scan for anything you don't recognize: unfamiliar accounts, late payments that aren't yours, or wrong balances. Errors are common and drag down your score, so dispute anything incorrect with the bureau — it's free, and they're required to investigate.</p><p>Your <strong>credit report</strong> is the detailed history; your <strong>credit score</strong> is a single number (usually 300–850) calculated from it. Lenders use that number to decide your interest rate — even a small bump can save you thousands over a 30-year loan.</p>" },
        { type: 'law', title: 'Your rights: Fair Credit Reporting Act', source: 'FTC',
          url: 'https://www.ftc.gov/legal-library/browse/statutes/fair-credit-reporting-act',
          body: "<p>The Fair Credit Reporting Act (FCRA) is the federal law that gives you control over your credit file. Your key rights:</p><p>• Get a free report and <strong>dispute errors</strong> — the bureau must investigate, usually within 30 days.<br>• Be told if information in your report was <strong>used against you</strong> (like a denied loan or apartment).<br>• Most negative marks <strong>fall off after 7 years</strong> (bankruptcies after 10).</p><p>If a company breaks these rules, you can file a free complaint with the CFPB or FTC.</p>" },
        // Add a video like: { type: 'video', title: '…', url: 'https://youtu.be/VIDEO_ID', minutes: 6 },
      ]],
      ['Calculate your debt-to-income ratio', 'Total monthly debt ÷ gross monthly income. Aim below 36%.', [
        { type: 'article', title: 'What is a debt-to-income ratio?', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-a-debt-to-income-ratio-en-1791/', source: 'CFPB' },
      ]],
      ['Set a down payment savings goal', 'Plan for ~10% down + ~3% closing costs in WA. WSHFC down-payment assistance may lower what you need.', [
        { type: 'course', title: 'Free homebuyer course (HomeView)', url: 'https://homeview.freddiemac.com/', source: 'Freddie Mac' },
        { type: 'article', title: 'How much to save for a home', url: 'https://www.consumerfinance.gov/owning-a-home/', source: 'CFPB' },
      ]],
      ['Build a 3-month emergency fund', 'Lenders like to see reserves after your down payment.'],
    ],
  },
  {
    phase: 'Phase 2 - Pre-Approval',
    steps: [
      ['Gather income documents', '2 years of tax returns, recent pay stubs, W-2s.', [
        { type: 'article', title: 'Get ready to apply for a mortgage', url: 'https://www.consumerfinance.gov/owning-a-home/process/prepare/', source: 'CFPB' },
      ]],
      ['Gather asset documents', '2 months of bank and investment statements.'],
      ['Compare 3+ lenders', 'Rates and fees vary - shopping around can save thousands. Ask which lenders offer WSHFC first-time buyer programs.', [
        { type: 'article', title: 'How to shop for your mortgage', url: 'https://www.consumerfinance.gov/owning-a-home/loan-options/', source: 'CFPB' },
        { type: 'law', title: 'Your rights: Equal Credit Opportunity Act', url: 'https://www.ftc.gov/legal-library/browse/statutes/equal-credit-opportunity-act', source: 'FTC' },
      ]],
      ['Get a pre-approval letter', 'Stronger than pre-qualification; sellers take it seriously.', [
        { type: 'article', title: 'Understand your Loan Estimate', url: 'https://www.consumerfinance.gov/owning-a-home/loan-estimate/', source: 'CFPB' },
      ]],
    ],
  },
  {
    phase: 'Phase 3 - Home Search',
    steps: [
      ['Choose a buyer\'s agent', 'An agent guides your search, offers, and negotiations.'],
      ['Define your must-haves vs. nice-to-haves', 'Keeps your search focused within budget.'],
      ['Tour homes and track them', 'Note condition, location, and gut feel for each.'],
      ['Research neighborhoods', 'Commute, schools, and local property tax rates.'],
    ],
  },
  {
    phase: 'Phase 4 - Offer & Contract',
    steps: [
      ['Make an offer', 'Your agent prepares the purchase & sale agreement.', [
        { type: 'article', title: 'Making an offer & closing the deal', url: 'https://www.consumerfinance.gov/owning-a-home/process/close/', source: 'CFPB' },
        { type: 'law', title: 'Your rights: Fair Housing Act', url: 'https://www.hud.gov/program_offices/fair_housing_equal_opp/fair_housing_act_overview', source: 'HUD' },
      ]],
      ['Provide earnest money', 'A good-faith deposit, typically 1–3% of price, held in escrow.'],
      ['Review the seller\'s disclosures', 'In Washington, sellers must provide a Form 17 disclosing known issues with the home.'],
      ['Negotiate repairs or price', 'Based on inspection findings.'],
    ],
  },
  {
    phase: 'Phase 5 - Inspection & Appraisal',
    steps: [
      ['Schedule a home inspection', 'Uncovers issues before you\'re committed.', [
        { type: 'article', title: 'Buying a home: what to know', url: 'https://www.hud.gov/topics/buying_a_home', source: 'HUD' },
      ]],
      ['Complete the lender appraisal', 'Confirms the home is worth the loan amount.'],
      ['Finalize homeowners insurance', 'Required before closing.'],
    ],
  },
  {
    phase: 'Phase 6 - Closing',
    steps: [
      ['Review the Closing Disclosure', 'Arrives 3 days before closing - check every number.', [
        { type: 'article', title: 'Review your Closing Disclosure', url: 'https://www.consumerfinance.gov/owning-a-home/closing-disclosure/', source: 'CFPB' },
        { type: 'law', title: 'Closing cost protections (RESPA)', url: 'https://www.consumerfinance.gov/rules-policy/regulations/1024/', source: 'CFPB' },
      ]],
      ['Do a final walkthrough', 'Confirm the home\'s condition and agreed repairs.'],
      ['Bring funds to close', 'Wire or cashier\'s check for down payment + closing costs.'],
      ['Sign and get your keys 🔑', 'You\'re a homeowner!'],
    ],
  },
];

const GLOSSARY = [
  ['Pre-approval', 'A lender\'s conditional commitment to lend you a specific amount, based on verified finances. Stronger than pre-qualification.',
    'To pre-approve you, a lender checks your credit and reviews documents like pay stubs, tax returns, and bank statements. They then issue a letter stating how much they\'re willing to lend. Because it\'s based on verified information, sellers take a pre-approval seriously - in competitive markets, many won\'t even consider an offer without one. Pre-approvals typically last 60–90 days.'],
  ['Pre-qualification', 'A quick, informal estimate of what you might borrow, based on self-reported info. Not a commitment.',
    'Pre-qualification is a fast, no-obligation gut-check: you tell a lender your rough income, debts, and assets, and they estimate what you could borrow. Nothing is verified, so it carries little weight with sellers. Think of it as a starting point to understand your ballpark - get a full pre-approval before you start making offers.'],
  ['Down payment', 'The upfront cash you pay toward the home price. Often 3–20%; the rest is your mortgage.',
    'You don\'t need 20% down - many conventional loans allow as little as 3%, and FHA loans go to 3.5%. A larger down payment lowers your monthly payment and can remove the need for PMI, but a smaller one may let you buy sooner. On a $580,000 home, 10% down is $58,000; 20% is $116,000.'],
  ['Closing costs', 'Fees paid at closing - lender fees, title, escrow, taxes. Typically 2–5% of the price.',
    'Closing costs are the various one-time fees to finalize your loan and transfer ownership: loan origination fees, appraisal, title insurance, escrow charges, recording fees, and prepaid property taxes and insurance. On a $580,000 home, expect roughly $12,000–$29,000. Your lender must give you a Loan Estimate up front and a Closing Disclosure three days before closing so you can check every line.'],
  ['Escrow', 'A neutral third party that holds money or documents until conditions are met. Also refers to the account for taxes/insurance.',
    'Escrow has two meanings. During the purchase, a neutral escrow company holds your earnest money and paperwork until all conditions are met, then disburses funds at closing - protecting both buyer and seller. After closing, your lender may keep an escrow account, collecting a bit extra each month to pay your property taxes and homeowners insurance on your behalf.'],
  ['Earnest money', 'A good-faith deposit showing you\'re serious about your offer. Usually 1–3% of the price, applied at closing.',
    'When you make an offer, you put down earnest money to show you\'re committed. It\'s held in escrow and credited toward your down payment or closing costs at closing. If you back out for a reason covered by a contingency (like a failed inspection or financing), you usually get it back. If you walk away without a valid reason, you can lose it.'],
  ['PMI', 'Private Mortgage Insurance - an added monthly cost when your down payment is under 20%. It protects the lender, not you.',
    'PMI is insurance that protects the lender if you stop paying - you pay for it, but it doesn\'t cover you. It\'s typically required on conventional loans with less than 20% down and costs roughly 0.3%–1.5% of the loan per year. Once you reach about 20% equity, you can request to cancel it, and it automatically drops off at 22%. (FHA loans have a similar but separate charge called MIP.)'],
  ['DTI', 'Debt-to-Income ratio - your monthly debt divided by gross monthly income. Lenders usually want it under 36–43%.',
    'DTI is one of the biggest factors in how much you can borrow. Add up your monthly debt payments (car, student loans, credit-card minimums, plus the future mortgage) and divide by your gross monthly income. Lenders generally prefer a total DTI under 36%, though some loans allow up to 43–50%. Paying down debt is often the fastest way to increase how much home you can afford.'],
  ['APR', 'Annual Percentage Rate - the true yearly cost of a loan including fees, not just the interest rate.',
    'The interest rate is only the cost of borrowing the principal. The APR rolls in most of the loan\'s fees (origination, points, and some closing costs), so it\'s a better apples-to-apples number when comparing lenders. A loan with a low rate but high fees can have a higher APR than one with a slightly higher rate and low fees.'],
  ['Fixed-rate mortgage', 'A loan whose interest rate stays the same for the entire term. Predictable payments.',
    'With a fixed-rate loan, your principal-and-interest payment never changes for the life of the loan - commonly 15 or 30 years. This makes budgeting easy and protects you if rates rise. The trade-off is that the starting rate is usually a bit higher than an ARM\'s. It\'s the most popular choice for buyers who plan to stay put.'],
  ['Adjustable-rate mortgage (ARM)', 'A loan whose rate can change over time after an initial fixed period. Lower start, more risk later.',
    'An ARM (e.g., a "5/1 ARM") offers a lower fixed rate for an initial period - say 5 years - then adjusts periodically based on market rates, within caps. Your payment can go up or down after that. ARMs can make sense if you expect to sell or refinance before the fixed period ends, but they carry more risk if rates climb and you stay.'],
  ['Appraisal', 'A licensed professional\'s estimate of the home\'s market value, required by your lender.',
    'Your lender orders an appraisal to make sure the home is worth what you\'re paying before they lend against it. If the appraisal comes in below your offer, the lender will only finance up to the appraised value - so you\'d need to renegotiate, cover the gap in cash, or walk away (if you have an appraisal contingency). You typically pay for the appraisal as part of closing costs.'],
  ['Contingency', 'A condition in your offer (like inspection or financing) that lets you back out without losing earnest money.',
    'Contingencies are safety valves written into your purchase agreement. Common ones: an inspection contingency (back out or renegotiate if problems are found), a financing contingency (back out if your loan falls through), and an appraisal contingency (back out if the home appraises too low). If a contingency isn\'t met, you can usually cancel and keep your earnest money. Waiving contingencies makes an offer stronger but riskier.'],
  ['Seller disclosure statement', 'A form where the seller reports known issues with the property. Required in most states.',
    'Most states require sellers to give buyers a disclosure statement covering what they know about the property\'s condition: the roof, plumbing, electrical, water, any defects, and more. After receiving it, you generally have a few days to review it and can rescind your offer if something concerns you. It\'s not a substitute for your own inspection.'],
  ['Title', 'Legal ownership of the property. Title insurance protects you against ownership disputes.',
    'Title is your legal right to own and use the property. During closing, a title company searches public records to confirm the seller can actually sell it and that there are no hidden liens or claims. Title insurance then protects you (and your lender) against problems that surface later - like an unknown heir, a forged signature, or unpaid back taxes from a previous owner.'],
  ['Equity', 'The share of the home you actually own - its value minus what you still owe.',
    'Equity is your home\'s current market value minus your remaining mortgage balance. It grows two ways: as you pay down your loan, and as the home appreciates. For example, a $580,000 home with a $500,000 loan balance means $80,000 in equity. You can eventually tap equity through a refinance or home-equity loan, and you keep it (minus costs) when you sell.'],
  ['Conventional loan', 'A mortgage not backed by a government program. The most common loan type.',
    'Conventional loans are offered by private lenders and aren\'t insured by the government. They typically require a higher credit score than government loans but can have lower overall costs. You can put as little as 3% down, though under 20% means paying PMI until you build enough equity. They come in "conforming" sizes (within limits set each year) and larger "jumbo" sizes.'],
  ['FHA loan', 'A government-backed loan with low down-payment and credit requirements. Popular with first-time buyers.',
    'Insured by the Federal Housing Administration, FHA loans let you buy with as little as 3.5% down and accept lower credit scores than conventional loans. The trade-off is a mortgage insurance premium (MIP) - both upfront and monthly - that often stays for the life of the loan unless you refinance. They\'re a common on-ramp for first-time and lower-credit buyers.'],
  ['VA loan', 'A loan for eligible veterans and service members - often zero down and no PMI.',
    'Backed by the Department of Veterans Affairs, VA loans are a major benefit for qualifying veterans, active-duty service members, and some surviving spouses. They typically require no down payment, charge no monthly mortgage insurance, and offer competitive rates. There\'s usually a one-time "funding fee," which can be rolled into the loan.'],
  ['USDA loan', 'A zero-down loan for buyers in eligible rural and some suburban areas.',
    'Backed by the U.S. Department of Agriculture, USDA loans help low-to-moderate-income buyers in designated rural and many suburban areas purchase with no down payment. There are income limits and the home must be in an eligible location. Like other government loans, they carry a guarantee fee instead of standard PMI.'],
  ['Jumbo loan', 'A mortgage larger than the conforming loan limit. Stricter requirements.',
    'When a loan exceeds the annual conforming limit set by regulators, it\'s a "jumbo" loan. Because lenders can\'t sell these to Fannie Mae or Freddie Mac, they carry more risk - so expect stricter credit, income, and reserve requirements, and sometimes a larger down payment. They\'re common in higher-cost housing markets.'],
  ['Discount points', 'Upfront fees you pay to lower your interest rate. One point = 1% of the loan.',
    'Buying "points" means paying cash at closing to permanently reduce your interest rate. One point costs 1% of the loan amount and typically lowers your rate by about 0.25%. It can pay off if you keep the loan long enough to recoup the cost through lower monthly payments - calculate your break-even point before deciding.'],
  ['Rate lock', 'A lender\'s guarantee to hold your interest rate for a set period while you close.',
    'Mortgage rates move daily, so once you\'re happy with a quote, you can "lock" it - usually for 30 to 60 days - so it won\'t change before closing even if the market rises. If rates fall a lot after locking, some lenders offer a one-time "float-down." Locks that expire before closing may cost a fee to extend.'],
  ['Amortization', 'How your loan is paid off over time - early payments are mostly interest, later ones mostly principal.',
    'An amortization schedule spreads your loan into equal monthly payments over the term. Early on, most of each payment goes to interest and little to principal; over time that flips. This is why making extra principal payments early saves the most interest, and why you build equity slowly in the first years of a 30-year loan.'],
  ['Refinance', 'Replacing your current mortgage with a new one - to lower your rate, payment, or tap equity.',
    'Refinancing pays off your existing loan with a new one, ideally on better terms. People refinance to grab a lower rate, shorten their term, switch from an ARM to fixed, drop mortgage insurance, or pull cash from equity ("cash-out"). It has its own closing costs, so weigh those against the savings and how long you\'ll stay.'],
  ['Origination fee', 'The lender\'s charge for processing your loan. Part of your closing costs.',
    'The origination fee covers the lender\'s work to evaluate, prepare, and fund your mortgage - underwriting, processing, and paperwork. It\'s often around 0.5%-1% of the loan amount and appears on your Loan Estimate. Because it varies by lender, comparing origination fees across a few lenders can save real money.'],
  ['Property taxes', 'Annual taxes charged by your local government, based on the home\'s assessed value.',
    'Local governments tax real estate to fund schools, roads, and services. The amount depends on your home\'s assessed value and the local tax rate, and it can change over time. Lenders usually collect a portion each month in an escrow account and pay the bill for you. Rates vary widely by area, so factor them into affordability.'],
  ['Homeowners insurance', 'Coverage protecting your home and belongings against damage and liability. Required by lenders.',
    'Homeowners insurance pays to repair or rebuild after covered events like fire, storms, or theft, and provides liability protection if someone is hurt on your property. Lenders require it and often escrow the premium into your monthly payment. Note that flood and earthquake coverage are usually separate policies.'],
  ['HOA fees', 'Recurring dues paid to a homeowners association for shared amenities and upkeep.',
    'If a home is in a homeowners association (common in condos and planned communities), you pay regular dues - monthly or annually - that fund shared maintenance, amenities, and reserves. HOAs also set rules you must follow. Lenders count HOA fees toward your monthly housing costs, so they affect how much you can afford.'],
  ['MIP', 'Mortgage Insurance Premium - the FHA\'s version of mortgage insurance.',
    'MIP is the mortgage insurance required on FHA loans. You pay an upfront premium (often rolled into the loan) plus an annual premium split into monthly payments. Unlike conventional PMI, MIP typically lasts the life of the loan if you put down less than 10% - many buyers eventually refinance into a conventional loan to shed it.'],
  ['Home warranty', 'An optional service contract covering repairs to home systems and appliances.',
    'A home warranty is a yearly plan that helps pay to repair or replace things like the furnace, water heater, or major appliances when they break from normal wear. It\'s different from homeowners insurance, which covers sudden damage and disasters. Sellers sometimes offer one to sweeten a deal, but read what\'s actually covered.'],
  ['Home inspection', 'A professional review of the home\'s condition before you finalize the purchase.',
    'You hire a licensed inspector to examine the home\'s structure and systems - roof, foundation, plumbing, electrical, HVAC, and more - and flag problems. It usually happens shortly after your offer is accepted. If serious issues surface, an inspection contingency lets you renegotiate, request repairs, or walk away. It\'s one of the most important protections you have as a buyer.'],
  ['Underwriting', 'The lender\'s deep review of your finances and the property before final loan approval.',
    'After you\'re under contract, an underwriter verifies everything - income, assets, credit, debts, the appraisal, and title - to decide whether to approve the loan. They may ask for extra documents or explanations ("conditions"). Avoid big financial changes (new debt, job changes, large deposits) during this stage, since they can derail approval.'],
  ['Loan Estimate', 'A standardized 3-page form showing your loan\'s rate, payments, and closing costs.',
    'Within three business days of applying, every lender must give you a Loan Estimate in the same format - so you can compare offers side by side. It lays out the interest rate, monthly payment, closing costs, and how the loan could change over time. Get Loan Estimates from several lenders on the same day for a true apples-to-apples comparison.'],
  ['Closing Disclosure', 'The final statement of your loan terms and costs, delivered before closing.',
    'The Closing Disclosure is the near-final version of your Loan Estimate, showing the exact loan terms, monthly payment, and money due at closing. By law you must receive it at least three business days before you sign, giving you time to compare it to your Loan Estimate and question any surprises. Check every number carefully.'],
  ['Final walkthrough', 'Your last visit to the home just before closing to confirm its condition.',
    'Usually within 24 hours of closing, you walk through the home one final time to make sure it\'s in the agreed condition, any negotiated repairs were done, and nothing was damaged or removed since your last visit. It\'s your chance to catch problems while you still have leverage - before the sale is final.'],
  ['Purchase agreement', 'The signed contract setting the price, terms, and contingencies of the sale.',
    'Also called a purchase and sale agreement, this is the binding contract between you and the seller. It spells out the price, what\'s included, the closing date, earnest money, and all contingencies. Your agent typically prepares it, but read it closely - once both parties sign, it governs the entire transaction.'],
  ['Deed', 'The legal document that transfers ownership of the property to you at closing.',
    'The deed is the document that actually conveys ownership from the seller to you. It\'s signed at closing and recorded with the county to make your ownership public record. It\'s different from the title (your legal right of ownership) and from the mortgage (the loan). A "warranty deed" also guarantees the seller holds clear title.'],
  ['Lien', 'A legal claim against a property for an unpaid debt. Must usually be cleared before sale.',
    'A lien lets a creditor stake a claim on a property until a debt is paid - your mortgage itself is a lien. Problems arise with unexpected liens (unpaid contractors, taxes, or judgments), which can block a sale. A title search uncovers them before closing, and they generally must be resolved for you to take clear ownership.'],
  ['Property survey', 'A map of the property\'s exact boundaries, structures, and easements.',
    'A survey precisely defines where the property lines are, where buildings and fences sit, and any easements or encroachments. Lenders or title companies may require one to confirm there are no boundary disputes. It\'s useful to know exactly what you\'re buying - especially before building a fence or addition later.'],
];

const CATS = ['All', 'Financing', 'Costs', 'Process', 'Ownership & Legal'];

const TERM_CAT = {
  'Pre-approval': 'Financing', 'Pre-qualification': 'Financing', 'APR': 'Financing',
  'Fixed-rate mortgage': 'Financing', 'Adjustable-rate mortgage (ARM)': 'Financing', 'DTI': 'Financing',
  'Down payment': 'Costs', 'Closing costs': 'Costs', 'PMI': 'Costs', 'Earnest money': 'Costs',
  'Escrow': 'Process', 'Appraisal': 'Process', 'Contingency': 'Process',
  'Seller disclosure statement': 'Ownership & Legal', 'Title': 'Ownership & Legal', 'Equity': 'Ownership & Legal',
  'Conventional loan': 'Financing', 'FHA loan': 'Financing', 'VA loan': 'Financing', 'USDA loan': 'Financing',
  'Jumbo loan': 'Financing', 'Discount points': 'Financing', 'Rate lock': 'Financing',
  'Amortization': 'Financing', 'Refinance': 'Financing',
  'Origination fee': 'Costs', 'Property taxes': 'Costs', 'Homeowners insurance': 'Costs',
  'HOA fees': 'Costs', 'MIP': 'Costs', 'Home warranty': 'Costs',
  'Home inspection': 'Process', 'Underwriting': 'Process', 'Loan Estimate': 'Process',
  'Closing Disclosure': 'Process', 'Final walkthrough': 'Process', 'Purchase agreement': 'Process',
  'Deed': 'Ownership & Legal', 'Lien': 'Ownership & Legal', 'Property survey': 'Ownership & Legal',
};

// In-depth explainer guides — the teaching core of the Learn page.
// Each: { slug, icon, title, minutes, summary, body } where body is trusted HTML.
// Keep bodies plain-language and WA-aware; avoid backticks and ${...} inside them.
const GUIDES = [
  {
    slug: 'how-mortgages-work',
    icon: '🏦',
    title: 'How a mortgage actually works',
    minutes: 6,
    summary: 'What you are really signing up for — principal, interest, and the four parts of every payment.',
    body: `
      <p>A mortgage is simply a loan you use to buy a home, with the home itself as collateral. If you stop paying, the lender can eventually take the home back. That is the whole deal — everything else is detail.</p>
      <h4>You are borrowing the price minus your down payment</h4>
      <p>If you buy a $580,000 home and put 10% down ($58,000), you borrow the remaining $522,000. That borrowed amount is your <strong>principal</strong>. You pay it back over a set number of years — the <strong>term</strong>, usually 15 or 30.</p>
      <h4>The four parts of a monthly payment (PITI)</h4>
      <ul>
        <li><strong>Principal</strong> — the chunk that actually pays down what you borrowed.</li>
        <li><strong>Interest</strong> — the lender's fee for lending, charged as a percentage rate.</li>
        <li><strong>Taxes</strong> — property taxes, usually collected monthly and held in escrow.</li>
        <li><strong>Insurance</strong> — homeowners insurance, and PMI if you put less than 20% down.</li>
      </ul>
      <p>People obsess over the interest rate, but your real monthly cost is all four together. The Plan calculator breaks this down for any price.</p>
      <h4>Why early payments feel like they do nothing</h4>
      <p>This is <strong>amortization</strong>. Your monthly payment stays the same, but early on most of it goes to interest and very little to principal. Over the years that flips. It is why you build equity slowly at first — and why paying a little extra toward principal early saves the most interest over the life of the loan.</p>
      <h4>Equity: the part you own</h4>
      <p>Equity is the home's value minus what you still owe. It grows two ways: as you pay down the loan, and as the home appreciates. It is the wealth-building engine of ownership — and the reason buying can beat renting if you stay long enough.</p>`,
  },
  {
    slug: 'credit-scores',
    icon: '📈',
    title: 'Credit scores, demystified',
    minutes: 5,
    summary: 'What your score means, what moves it, and why even 20 points can change your monthly payment.',
    body: `
      <p>Your credit score is a three-digit summary (usually 300–850) of how reliably you have repaid debt. Lenders use it to decide whether to lend and at what rate. A higher score signals lower risk — so you get a lower interest rate, which can save tens of thousands of dollars over a 30-year loan.</p>
      <h4>Rough ranges lenders think in</h4>
      <ul>
        <li><strong>740+</strong> — excellent; you qualify for the best rates.</li>
        <li><strong>680–739</strong> — good; solid rates on most loans.</li>
        <li><strong>620–679</strong> — fair; conventional loans possible, better rates await improvement.</li>
        <li><strong>Below 620</strong> — building; FHA loans may still be an option.</li>
      </ul>
      <h4>What actually moves your score</h4>
      <ul>
        <li><strong>Payment history (biggest factor)</strong> — pay every bill on time, every time.</li>
        <li><strong>Credit utilization</strong> — keep balances well under 30% of your limits; under 10% is even better.</li>
        <li><strong>Length of history</strong> — older accounts help, so avoid closing your oldest card.</li>
        <li><strong>New credit</strong> — each application causes a small, temporary dip.</li>
        <li><strong>Credit mix</strong> — a blend of cards and loans helps a little.</li>
      </ul>
      <h4>Fastest ways to raise it before buying</h4>
      <p>Pay down credit-card balances (utilization updates fast), never miss a payment, and dispute any errors on your report. Check your reports free at AnnualCreditReport.com — the only federally authorized source. Give yourself a few months; even a 20-point bump can move you into a better rate tier.</p>
      <p><strong>While you are shopping for a home, do not open new credit or make large purchases on credit</strong> — it can lower your score and spook underwriters right when it matters most.</p>`,
  },
  {
    slug: 'true-cost',
    icon: '🧾',
    title: 'The true monthly cost of owning',
    minutes: 5,
    summary: 'The mortgage payment is only the beginning. Here is what surprises first-time owners.',
    body: `
      <p>When you rent, one payment covers almost everything. When you own, the mortgage is just the headline number. Budgeting for the rest is what separates a stressful first year from a smooth one.</p>
      <h4>On top of principal &amp; interest, plan for:</h4>
      <ul>
        <li><strong>Property taxes</strong> — in Washington, roughly 0.9% of the home's value per year, though it varies by county.</li>
        <li><strong>Homeowners insurance</strong> — often $1,200–$2,000+ a year; required by your lender.</li>
        <li><strong>PMI</strong> — if you put less than 20% down, expect roughly 0.3%–1.5% of the loan per year until you reach ~20% equity.</li>
        <li><strong>HOA dues</strong> — for condos and many planned communities, monthly or annual fees that lenders count toward what you can afford.</li>
        <li><strong>Utilities</strong> — you now pay for everything: water, sewer, garbage, gas, electric.</li>
      </ul>
      <h4>The cost people forget: maintenance</h4>
      <p>A common rule of thumb is to budget <strong>about 1% of the home's value per year</strong> for repairs and upkeep — roughly $5,800 a year on a $580,000 home. Some years you spend nothing; the year the water heater and roof both go, you will be glad the fund exists. Treat it as a monthly savings line, not a surprise.</p>
      <h4>And the upfront cash beyond the down payment</h4>
      <p>Closing costs typically run 2%–5% of the price, due at closing. Add moving costs and the small pile of things every new home needs. A realistic budget covers the down payment <em>and</em> all of this — the Plan calculators can help you size it.</p>`,
  },
  {
    slug: 'loan-types',
    icon: '🗂️',
    title: 'Loan types compared',
    minutes: 6,
    summary: 'Conventional, FHA, VA, USDA, jumbo — which one fits your situation.',
    body: `
      <p>There is no single "best" mortgage — the right one depends on your down payment, credit, income, and where you are buying. Here is the plain-English rundown.</p>
      <h4>Conventional</h4>
      <p>The most common loan, offered by private lenders and not government-backed. As little as <strong>3% down</strong>, but under 20% means paying PMI until you build equity. Usually wants a credit score of 620+, and rewards higher scores with better rates. Best for buyers with decent credit and steady income.</p>
      <h4>FHA</h4>
      <p>Government-insured and forgiving: <strong>3.5% down</strong> with lower credit scores accepted. The trade-off is a mortgage insurance premium (MIP) that often lasts the life of the loan unless you refinance. A common on-ramp for first-time or lower-credit buyers.</p>
      <h4>VA</h4>
      <p>For eligible veterans, active-duty service members, and some surviving spouses. Frequently <strong>zero down, no monthly mortgage insurance</strong>, and competitive rates — one of the best deals in lending. There is usually a one-time funding fee that can be rolled in.</p>
      <h4>USDA</h4>
      <p><strong>Zero down</strong> for low-to-moderate-income buyers in eligible rural and many suburban areas. There are income limits and a location requirement, plus a guarantee fee instead of standard PMI.</p>
      <h4>Jumbo</h4>
      <p>For loans above the annual conforming limit — common in higher-cost markets. Expect stricter credit, income, and reserve requirements, and sometimes a larger down payment.</p>
      <p><strong>WA note:</strong> ask lenders which ones pair with WSHFC first-time buyer and down-payment-assistance programs — combining them can meaningfully lower your upfront cash.</p>`,
  },
  {
    slug: 'fixed-vs-arm',
    icon: '⚖️',
    title: 'Fixed-rate vs. adjustable (ARM)',
    minutes: 4,
    summary: 'Predictable payments or a lower start with more risk — how to choose.',
    body: `
      <p>Every mortgage is either fixed-rate or adjustable-rate. The difference is simple but it shapes your whole budget.</p>
      <h4>Fixed-rate</h4>
      <p>Your interest rate — and your principal-and-interest payment — never changes for the life of the loan, commonly 15 or 30 years. Budgeting is easy and you are protected if rates rise. The trade-off: the starting rate is usually a bit higher than an ARM's. This is what most buyers choose, especially if they plan to stay put.</p>
      <h4>Adjustable-rate (ARM)</h4>
      <p>An ARM (for example a "5/1 ARM") gives you a lower fixed rate for an initial period — say 5 years — then adjusts periodically based on the market, within caps. Your payment can rise or fall after that window.</p>
      <h4>When an ARM can make sense</h4>
      <ul>
        <li>You expect to <strong>sell or refinance before the fixed period ends</strong>.</li>
        <li>The initial-period savings are large and you have room in your budget if rates climb.</li>
      </ul>
      <h4>When to stick with fixed</h4>
      <ul>
        <li>You plan to stay in the home for many years.</li>
        <li>You value predictable payments and do not want to bet on where rates go.</li>
      </ul>
      <p>For most first-time buyers, a 30-year fixed is the safe default. Consider an ARM only if you understand exactly how high the payment could go after it adjusts — and can handle it.</p>`,
  },
  {
    slug: 'closing-costs',
    icon: '💳',
    title: 'Understanding closing costs',
    minutes: 5,
    summary: 'The one-time fees to finalize your loan — what they cover and how to keep them down.',
    body: `
      <p>Closing costs are the bundle of one-time fees you pay to finalize your loan and transfer ownership. They typically run <strong>2%–5% of the purchase price</strong> — roughly $12,000–$29,000 on a $580,000 home — and are due at closing, on top of your down payment.</p>
      <h4>What is usually in there</h4>
      <ul>
        <li><strong>Lender fees</strong> — loan origination, underwriting, and processing.</li>
        <li><strong>Third-party services</strong> — appraisal, credit report, title search.</li>
        <li><strong>Title insurance</strong> — protects you and the lender against ownership disputes.</li>
        <li><strong>Escrow / settlement fees</strong> — the neutral party handling the transaction.</li>
        <li><strong>Recording &amp; government fees</strong> — making your ownership official.</li>
        <li><strong>Prepaids</strong> — upfront property taxes and homeowners insurance to seed your escrow account.</li>
      </ul>
      <h4>Two documents that protect you</h4>
      <p>Within three business days of applying, every lender must give you a <strong>Loan Estimate</strong> in a standard format. Get them from several lenders on the same day and compare side by side. Then, at least three business days before closing, you receive the <strong>Closing Disclosure</strong> — the near-final numbers. Compare it line by line to your Loan Estimate and question anything that changed.</p>
      <h4>How to pay less</h4>
      <ul>
        <li>Shop and compare origination fees across lenders — they vary a lot.</li>
        <li>Ask the seller to contribute (seller concessions), especially in a slower market.</li>
        <li>Check whether WSHFC or other assistance programs can cover part of the costs.</li>
      </ul>`,
  },
  {
    slug: 'rent-vs-buy',
    icon: '🏡',
    title: 'Rent vs. buy: how to decide',
    minutes: 5,
    summary: 'Buying is not always the smart move. Here is how to think it through honestly.',
    body: `
      <p>"Renting is throwing money away" is a myth. Renting buys you flexibility and freedom from maintenance; buying builds equity but ties up cash and time. The right answer depends on your life, not a slogan.</p>
      <h4>The 5-year rule of thumb</h4>
      <p>Because buying and selling carry big one-time costs (closing costs, agent commissions, moving), you usually need to stay put <strong>at least ~5 years</strong> for buying to come out ahead. Sell too soon and those costs can wipe out any gain.</p>
      <h4>Buying tends to win when…</h4>
      <ul>
        <li>You will stay several years or more.</li>
        <li>Your income and job are stable.</li>
        <li>Monthly ownership cost is close to (or below) local rent.</li>
        <li>You have savings left <em>after</em> the down payment and closing costs.</li>
      </ul>
      <h4>Renting tends to win when…</h4>
      <ul>
        <li>You might move within a few years.</li>
        <li>You are still building your emergency fund or paying down high-interest debt.</li>
        <li>Buying would stretch your budget with nothing left for repairs.</li>
        <li>You value not being responsible for maintenance.</li>
      </ul>
      <h4>Compare the true costs, not just payment vs. rent</h4>
      <p>Owning adds taxes, insurance, PMI, HOA, and maintenance on top of principal and interest — see "The true monthly cost of owning." Weigh the full picture against your rent, and remember the intangible side too: stability and the freedom to make a place your own.</p>`,
  },
];

const JOURNEY_TOTAL = JOURNEY.reduce((n, p) => n + p.steps.length, 0);

const FAQ = [
  ['What\'s the difference between pre-qualification and pre-approval?',
   'Pre-qualification is a quick, informal estimate based on what you tell a lender. Pre-approval is a verified, conditional commitment based on documents you provide - it carries far more weight with sellers, so aim for a pre-approval before making offers.'],
  ['How much do I really need for a down payment?',
   'You don\'t need 20%. Many loans allow 3–5% down, and some programs go lower. Putting less than 20% down usually means paying PMI (mortgage insurance), but it can let you buy years sooner. Budget for closing costs too - typically another 2–5% of the price.'],
  ['What credit score do I need to buy a home?',
   'Conventional loans generally want 620+, and you\'ll get the best rates at 740+. FHA loans can go lower. Even a small score improvement can noticeably lower your monthly payment, so it\'s often worth a few months of credit work first.'],
  ['How long does the home-buying process take?',
   'Preparation (saving, improving credit) often takes 6–12 months. Once you\'re pre-approved and actively shopping, going from offer to closing usually takes 30–45 days.'],
  ['Is it better to rent or buy right now?',
   'It depends on how long you\'ll stay, local prices vs. rents, and your financial stability. Buying builds equity but adds maintenance and upfront costs. As a rule of thumb, buying tends to pay off if you\'ll stay put for at least 5 years.'],
  ['Are there programs to help first-time buyers?',
   'Yes - many states, including Washington, offer down-payment assistance and special loan programs for first-time and lower-income buyers. It\'s worth researching what you qualify for before assuming you can\'t afford to buy.'],
];

