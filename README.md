# WB Election 2026 — Interactive Intelligence Dashboard

A zero-dependency static site for the **West Bengal Legislative Assembly Election 2026**, covering all 294 constituencies with historical comparisons (2011–2026), candidate profiles, vote share analytics, and citizen-facing visualisations.

**Live site:** `https://<owner>.github.io/wb-election-2026/`

---

## Quick Start

> **Important:** Do **not** open `index.html` by double-clicking (i.e. via `file://` URLs).
> Browsers block `fetch()` on `file://` for security reasons — the JSON data files will fail
> to load and you will see a "Loading constituency data…" spinner that never resolves.
> Always use a local HTTP server:

```bash
# Python (built-in, no install needed)
python3 -m http.server 8080
# Then open: http://localhost:8080

# Node (if you have npx)
npx serve .
# Then open the URL it prints

# VS Code: use the "Live Server" extension and click "Go Live"
```

---

## File Structure

```
wb-election-2026/
├── index.html                    ← Single-page app (all sections)
├── css/style.css                 ← Newsprint editorial design system
├── js/main.js                    ← All interactivity (vanilla JS, no deps)
├── data/
│   ├── constituencies_2026.json  ← 294 constituencies (ECI Form-20 data)
│   └── party_results.json        ← Party tallies 2011–2026, ADR stats, districts
├── AGENTS.md                     ← AI agent guide: verify commands, key patterns
├── CHANGELOG.md                  ← Full fix history, extracted from main.js
└── README.md
```

> **For AI agents and contributors:** Read [`AGENTS.md`](AGENTS.md) for verification commands and key patterns, and [`CHANGELOG.md`](CHANGELOG.md) for the full fix history across 20 rounds of adversarial review. Skipping these will reintroduce bugs that took multiple review rounds to find.

---

## Deployment (GitHub Pages)

1. Push this repo to GitHub
2. Go to **Settings → Pages → Source: main branch / (root)**
3. GitHub Pages will serve at `https://<owner>.github.io/<repo-name>/`

---

## Data Sources

| Source | What it covers |
|--------|---------------|
| [ECI Results Portal](https://results.eci.gov.in/) | Official vote counts, Form-20 |
| [MyNeta / ADR](https://www.myneta.info/) | Candidate affidavits: assets, criminal cases |
| [Lok Dhaba (TCPD)](https://lokdhaba.ashoka.edu.in/) | Historical 2011–2021 per constituency |
| [WB CEO](https://ceowestbengal.nic.in/) | Turnout, booth data |

---

## Data Schema

Each row in `constituencies_2026.json` follows the `Constituency` interface below. **All result fields may be `null` for `is_repoll: true` seats** (AC #144 Falta):

```typescript
interface Constituency {
  ac_no: number;                    // 1–294
  ac_name: string;
  district: string;                 // one of 23 WB districts
  reservation: "GEN"|"SC"|"ST";
  phase: 1|2;
  polling_date: string;             // ISO date "YYYY-MM-DD"

  // Result fields — null for repoll seats
  winner: string | null;
  winner_party: string | null;
  winner_votes: number | null;
  runner_up: string | null;
  runner_up_party: string | null;
  runner_up_votes: number | null;
  margin: number | null;
  total_candidates: number | null;
  nota_votes: number | null;
  total_votes: number | null;       // full ECI total (all candidates)

  // Flags / editorial
  is_repoll: boolean;               // true only for AC #144 Falta
  is_notable: boolean;              // curated for the Notable Contests section
  notable_order?: number;           // 1-based display order; absent → sorts last
  result_final: boolean;
  note?: string;                    // editorial note (repoll reason, contest significance)
}
```

> **Schema 2.0 note:** The following fields from earlier schemas are **not present** in
> the current ECI-sourced data and are conditionally rendered by the JS only when non-null:
> `turnout`, `winner_gender`, `winner_age`, `winner_education`, `winner_profession`,
> `winner_assets`, `winner_liabilities`, `winner_criminal_cases`, `winner_serious_cases`,
> `2021_winner`, `2021_winner_party`, `2021_winner_votes`, `2021_margin`, `swing`.
> They will reappear when ADR/MyNeta and Lok Dhaba data is integrated (Phase 3).

> See [`CHANGELOG.md`](CHANGELOG.md) for the full fix history and important field-level caveats (e.g. `vote_share_delta: null` for new parties, `total_votes` partial-total semantics).

---

## Phase Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1 — Core | ✅ Done | 26 key seats, party standings, ADR stats, district grid |
| 2 — Full Dataset | ✅ Done | All 294 constituencies from ECI Form-20 |
| 3 — Analytics | 📋 Planned | Per-candidate vote share, NOTA, postal ballots, Lok Dhaba history |
| 4 — Visual | 📋 Planned | SVG choropleth map, round-wise animation, Bengali i18n |

---

## Important Notes

- **AC #144 (Falta):** Repoll on 21 May 2026, result on 24 May 2026 due to EVM tampering allegations. All seat totals note this pending result.
- **Counting day snapshot:** Vote counts are from ECI live results on 4 May 2026. Final figures come from Form-20 publication.
- **Data accuracy:** No interpolation or inference of vote counts. All numbers sourced directly from ECI/ADR.

---

*Design inspired by [data-analytics.github.io/Election_Data_2021/West_Bengal.html](https://data-analytics.github.io/Election_Data_2021/West_Bengal.html)*
