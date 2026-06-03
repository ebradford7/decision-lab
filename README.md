# Decision Lab

**Separate luck from skill.**

Decision Lab is a personal decision-tracking tool that helps you make better decisions over time by separating *decision quality* from *results*. The core insight: a bad outcome doesn't mean a bad decision — luck is always a factor. Decision Lab gives you the tools to track your reasoning, calibrate your forecasts, and improve the part you actually control.

Live app: [decision-lab.vercel.app](https://decision-lab.vercel.app)

---

## Problem & Motivation

Most people evaluate their decisions by their outcomes. This is called **resulting** — a well-documented cognitive bias where we judge the quality of a decision by how it turned out, rather than by the quality of the reasoning at the time.

The result: we get lucky and think we're brilliant. We make a well-reasoned call and it goes sideways due to factors outside our control, and we think we failed. Neither conclusion is accurate, and neither helps us actually improve.

**Decision Lab** is built on a different model:

> **Decision Quality + Luck = Result**

You control one of those. This app helps you track and improve it.

---

## Features

### AI-Guided Decision Creation
- A conversational chat interface powered by Claude (Anthropic) walks you through each decision using structured frameworks: Socratic questioning, pre-mortems, base rates, steel-manning, and probability forecasting
- Voice input supported via the Web Speech API — speak your reasoning directly
- As you talk, a live decision card populates in real-time on the right panel

### Probability Forecasting
- Set explicit probability estimates for each outcome
- Visual stacked bar chart shows forecast distribution
- For 2-option decisions, probabilities auto-complement to 100%
- **Live Prediction Market Integration**: searches Polymarket (real-money, actively traded) for related markets and surfaces their crowd probability as a base rate anchor for your own forecasts

### Decision Tracking
- All decisions stored privately per-user in Supabase (PostgreSQL with row-level security)
- Update decisions over time with new information and revised probability estimates (Bayesian updating)
- Set and adjust review deadlines
- Update log tracks your evolving thinking

### Resolution & Review
Structured resolution flow separates two distinct questions:
- **Results** (what the world delivered — influenced by luck): What actually happened? Did your predictions come true?
- **Decision Quality** (did your reasoning hold up — fully in your control): Did the decision achieve what you intended? Lessons learned?

### Calibration Analytics
- **Brier Score** — industry-standard probabilistic accuracy metric (lower = better)
- **Overconfidence Index** — avg predicted probability minus actual hit rate; reveals systematic bias in your thinking
- **Calibration Curve** — plots predicted vs actual probabilities; perfect calibration hugs the diagonal
- **Success Rate** — % of decisions where criteria were met

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| AI | Claude claude-opus-4-5 via Anthropic API (streaming SSE) |
| Auth | Supabase magic-link (passwordless email) |
| Database | Supabase PostgreSQL with Row Level Security |
| Prediction Markets | Polymarket via Vercel serverless proxy |
| Charts | Recharts |
| Deployment | Vercel |

---

## Architecture

```
src/
├── components/
│   ├── ChatWizard.tsx      # AI chat interface + live decision card + prediction markets
│   ├── Dashboard.tsx       # Overview with stats, active decisions, upcoming deadlines
│   ├── DecisionDetail.tsx  # Full decision view with update log and resolution
│   ├── DecisionList.tsx    # Searchable, filterable list of all decisions
│   ├── CalibrationView.tsx # Brier score, overconfidence index, calibration curve
│   ├── ResolveModal.tsx    # Structured resolution: Results + Decision Quality sections
│   ├── UpdateModal.tsx     # Add updates, revise forecasts, adjust deadlines
│   ├── Layout.tsx          # Sidebar navigation
│   └── AuthGate.tsx        # Magic link auth screen
├── lib/
│   ├── claude.ts           # Anthropic API streaming + system prompt + JSON extraction
│   └── supabase.ts         # Supabase client
├── hooks/
│   └── useDecisions.ts     # All CRUD operations + Supabase persistence
├── utils/
│   └── calibration.ts      # Brier score + calibration grade calculations
├── contexts/
│   └── AuthContext.tsx     # Auth state management
└── types.ts                # Shared TypeScript interfaces
api/
└── markets.ts              # Vercel serverless function: Polymarket proxy
```

### Key Design Decisions

**Claude as a structured coach, not a free chatbot.** The system prompt guides Claude through a specific framework (Socratic questioning → options → values → forecasts → commitment) and requires it to output structured JSON after every response. The app parses this JSON to populate the live decision card without the user filling out any forms.

**Separating decision quality from results throughout.** This isn't just a UI label — it's baked into the data model. `Resolution` stores `forecastAccuracies` (results) and `successCriteriaResult` (decision quality) as separate fields, and the calibration analytics track them independently.

**Polymarket as a base rate anchor.** When a user is setting probability forecasts, the app automatically searches Polymarket for related active markets and surfaces their crowd-sourced probability. This gives users an external reference point — a key technique used by professional forecasters to fight overconfidence.

---

## Running Locally

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [Anthropic](https://console.anthropic.com) API key

### Setup

```bash
git clone https://github.com/ebradford7/decision-lab.git
cd decision-lab
npm install
```

Create a `.env.local` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Supabase Setup

Run the following SQL in your Supabase SQL editor:

```sql
create table decisions (
  id uuid primary key,
  user_id uuid references auth.users not null,
  data jsonb not null,
  created_at timestamptz default now()
);

alter table decisions enable row level security;

create policy "Users can only access their own decisions"
  on decisions for all
  using (auth.uid() = user_id);
```

Also add your local URL to **Authentication → URL Configuration → Redirect URLs** in Supabase dashboard: `http://localhost:5173`

### Run

```bash
npm run dev
```

App runs at `http://localhost:5173`.

> **Note:** The Polymarket prediction market feature requires the Vercel serverless function (`api/markets.ts`) and only works on the deployed Vercel URL, not localhost.

---

## Evaluation & Evidence

**Forecasting framework validity:** The Brier Score is the standard metric used by academic forecasting researchers (Tetlock, Mellers et al.) and prediction market operators. The overconfidence index is derived from the same calibration literature. Both are well-validated measures of probabilistic reasoning quality.

**User testing:** The app has been used to track real decisions including social plans, job search strategy, and scheduling trade-offs. Key iteration driven by user feedback:
- Initial multi-step form wizard replaced with conversational AI interface after finding the form felt like bureaucratic overhead
- Star ratings for "process quality" removed after realizing they were arbitrary and unmotivating — replaced with structured success criteria (Met/Partial/Missed) and calibrated forecasts
- Prediction market integration added after recognizing users had no external anchor for their probability estimates

**Known limitations:**
- Calibration curve requires ~20+ resolved forecasts to be statistically meaningful — the app shows it earlier but notes this caveat
- Polymarket coverage is limited to topics with active markets (primarily politics, finance, crypto, sports) — personal decisions often won't have direct matches
- Claude's JSON extraction occasionally produces malformed output for complex decisions; the app handles this gracefully but may require re-prompting
- Voice input quality depends on browser (best in Chrome) and ambient noise

---

## What I'd Add Next

- **Shareable decisions** — opt-in public links to share a decision and get feedback from others
- **Group decisions** — multiple users contributing forecasts to the same decision
- **Notification reminders** — email or push when a review deadline approaches
- **Decision templates** — pre-loaded frameworks for common decision types (career moves, financial decisions, relationship choices)
- **Import from text** — paste any written decision and have Claude structure it automatically
- **Metaculus/Kalshi integration** — additional prediction market sources for broader topic coverage

---

## AI Usage Disclosure

This project was built with significant assistance from **Claude Code** (Anthropic's AI coding assistant) and the **Claude claude-opus-4-5** model via API.

### How AI was used:

**Claude Code (development assistant):**
- Used throughout the entire development process for writing, debugging, and refactoring React/TypeScript code
- Implemented features including: the chat streaming interface, Supabase integration, calibration analytics, voice input, prediction market proxy, and all UI components
- All code was reviewed and decisions were directed by the human developer

**Claude claude-opus-4-5 (in-app AI):**
- Powers the conversational decision-coaching interface
- System prompt engineered to guide structured thinking frameworks (Socratic questioning, pre-mortems, base rates, steel-manning)
- Extracts structured JSON from conversation to populate the live decision card

### What was human-directed:
- Product vision and core insight (separating decision quality from results)
- Framework design (what questions to ask, how to structure resolution)
- All UX/design decisions and iteration based on real usage
- Data model design and architectural choices
- Choosing to integrate Polymarket as a base rate source

---

## Sources & Credits

- **Superforecasting** (Tetlock & Gardner) — framework for probability calibration and Brier Score interpretation
- **Thinking in Bets** (Annie Duke) — conceptual foundation for separating decision quality from outcomes ("resulting")
- [Brier Score](https://en.wikipedia.org/wiki/Brier_score) — Wikipedia
- [Manifold Markets API](https://docs.manifold.markets/api) — initial prediction market integration (later replaced)
- [Polymarket Gamma API](https://gamma-api.polymarket.com) — live prediction market data
- [Supabase](https://supabase.com) — auth and database
- [Anthropic](https://anthropic.com) — Claude API
- [Recharts](https://recharts.org) — calibration curve visualization
- [Lucide React](https://lucide.dev) — icons

No base repositories were forked. This project was built from scratch.
