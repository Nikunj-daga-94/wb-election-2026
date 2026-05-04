/* ============================================================
   WB ELECTION 2026 — Main JS (vanilla, zero dependencies)
   Fixes applied:
     #1  XSS — esc() helper on every innerHTML interpolation
           + partyColor() escaped in trend legend (was missed)
     #3  Donut chart — correct single-path dashoffset accumulation
     #4  SVG <title> — nested inside <circle>, not orphaned
     #6  Bar chart — label offset avoids overlap for near-zero bars
           MIN_LABEL_GAP raised from 4→12 (glyph-safe at 11px font)
     #7  Null sort — nulls always last; both-null returns 0 (stable)
     #8  Search haystack — null and stringified "null" both → ""
     #11 maxSeats (seat bar) — computed from data, not hardcoded
     #15 Global showModal — replaced with event delegation
     #17 Swing sort — numeric magnitude via end-anchored regex
     #18 renderScoreTicker — guard against empty/malformed results;
           clears static placeholder immediately; no hardcoded party names
     #19 orientationchange — re-affirms overflow state for BOTH
           open and closed modal (was only resetting when closed)
     #20 Order — populateFilterDropdowns called before renderConstituencyTable
     #21 majorityMark — computed from metadata.total_seats; correct formula
           Math.floor(n/2)+1 instead of Math.ceil(n/2) (147≠majority in 294)
     #22 Modal null handling — numeric fields use != null; || '\u2014' hid 0
     #23 Trend chart maxSeats — computed from data + rounded to nearest 50;
           was hardcoded 220 (wrong peak; breaks when results update)
     #24 Party assets guard — Object.keys().length>0 check added
     #25 Table count — "constituency" singular when showing exactly 1
     #26 Falta repoll — exempt from party filter (no winner_party yet)
     #27 Search debounce — 200ms timeout; prevents DOM thrash on fast typing
   Round 4 fixes:
     B1  renderDistrictGrid — Array.isArray guard; skips missing/non-array district data
     B2  South 24P bar — _note appended when Falta (AC#144) is pending; bar reflects decided seats
     B3  State.ready flag — sort/click handlers skip processing until data has loaded
     M1  Null-check style — normalised to != null throughout table and contest-row rendering
     M2  vote_share_pct — HTML-escaped in donut SVG <title> and legend innerHTML
     M3  swing seatsDelta===0 — now gets neutral colour instead of red
     M4  seats_delta/vote_share_delta — null values excluded from swing summary (not coerced to 0)
     M5  aria-modal focus trap — focusableEls() helper; Tab/Shift+Tab trapped within modal;
           focus moves to close button on open and is restored to trigger on close
     H1  Phase filter dropdown — data-driven from party_results.json metadata (phase_N keys)
     H2  Majority mark — driven by JS from metadata.total_seats; updates hero + ticker on load
     H4  c.reservation fallback — ?? 'GEN' prevents literal "null" appearing in modal subtitle
     D2  red_alert_constituencies — field renamed from _pct to _count; displayed as integer, not %
     C3  contest-margin-label — hidden when margin is null (pending seat); no orphaned label on em-dash
     STYLE swing-badge — not applied to em-dash placeholders (no result = plain text, not styled badge)
     STYLE stat-box-value — trailing space in class attribute fixed when cls is empty string
   Round 5 fixes:
     B1  CSS injection — p.color from JSON no longer used in style="" attributes;
           all colour-in-style sites now use partyColor(p.party) from the local constant
           map (ticker swatch/seats, donut SVG stroke, donut legend dot)
     B2  Swing valColor — explicit null branch added; null delta now gets ink-faint
           colour (same visual as 0 but semantically distinct intent in code)
     B3  majority_mark — reads metadata.majority_mark directly (single source of truth);
           falls back to formula only when field absent; eliminates dual-source divergence
     B4  Falta phase-filter exemption — is_repoll constituencies now exempt from BOTH
           party AND phase filters (previously only party filter had the exemption)
     B5  Modal _modalLastFocus — guarded; only saved when modal transitions closed→open,
           not on content updates while already open (prevents focus restoring to close button)
     M1  wPct/rPct — parseFloat() wraps toFixed() so values are always Numbers, not
           mixed string/number depending on whether total>0
     M2  Search haystack — ac_no added; users can now search by constituency number
     M5  Declared count — renderDeclaredCount() drives "293 / 294 declared" in ticker;
           element added to HTML with correct static fallback
     S2  Swing colours — replaced hardcoded hex (#007700 / #CC0000) with CSS vars
           (--positive-swing / --red-left) so dark-mode overrides propagate automatically
     S3  Runner-up party pill — conditionally rendered; no grey pill when runner_up_party
           is null (contest cards + modal runner-up field both fixed)
     GOVT government:true field in JSON now rendered as "Govt" badge in ticker card
     DATA data-quality-notice element above constituency table — JS updates it with
           actual loaded count vs total so users are never misled by partial data
   Round 6 fixes:
     B1  District filter — is_repoll exemption added (mirrors party+phase exemptions
           introduced in R5 B4; district filter had been missed, hiding Falta when
           any district was selected)
     B2  Data quality notice — "(party_results.json)" filename removed from user-visible
           text; internal implementation detail must never appear in the UI
     B3  Modal vote bar — denominator now uses c.total_votes when present (true total
           including all candidates); falls back to top-2+NOTA with a disclosure label
           so users are not misled about winner vote-share when total_candidates > 2
     B4  Ticker label changed from "LIVE STANDINGS" to "FINAL STANDINGS" — this is a
           static site with no real-time feed; "LIVE" was factually wrong
     M1  Ticker OTH — filter changed from seats>0 to seats>0||vote_share_pct>0 so
           OTH (7.93% vote share, 0 seats) is now visible in the standings ticker
     M2  Falta banner — renderFaltaBanner() reads metadata.falta_repoll dates+reason from
           JSON; HTML static text is a graceful fallback; banner auto-hides when result_final
     M3  crimColor null guard — changed from c.winner_criminal_cases>0 to
           c.winner_criminal_cases!=null&&...>0 so null cases stay neutral (inherit)
           instead of silently coercing null→0 and suppressing the red colour
     M4  Data quality notice — district count derived from pr.district_results_2026.length
           instead of hardcoded 23 (co-fixed with B2 refactor of renderDataQualityNotice)
     M6  Notable contests winner pill — conditionally rendered when winner_party!=null;
           shows "Pending" pill for repoll seats instead of crashing on null.toString()
   Round 7 fixes:
     B1  total_votes added to all 25 non-repoll records in constituencies_2026.json
           (winner_votes + runner_up_votes + nota_votes). barIsPartial now ALWAYS
           true when total_candidates > 2 — because total_votes omits other-candidate
           votes by definition, the bar denominator is never truly complete.
     B2  renderFaltaBanner — !fr branch now explicitly hides the banner element
           instead of early-returning; prevents stale static HTML showing stale
           hardcoded dates when falta_repoll is removed from JSON after result_final.
     B3  renderDataQualityNotice — hardcoded fallback "23" removed; district-total
           clause is omitted entirely when district_results_2026 is absent from JSON.
     B4  renderNotableContests — driven by is_notable flag in JSON; removed hardcoded
           NOTABLE_AC_NOS constant. Added empty-state guard for blank sections.
     B5  Dead "color" field removed from all entries in party_results.json (partyColor()
           has been the canonical source since R5 B1; the field was never read by JS).
     H1  getMajorityMark(pr) helper extracted — eliminates duplicate majority
           computation that existed in renderMajorityMark and renderSeatBarChart.
     H2  Vote bar rPct derived as 100 - wPct - notaPct (not independently rounded)
           to prevent ±0.1 rounding drift when both percentages are toFixed(1).
     H3  vote_share_pct coerced via Number() in ticker filter (was implicit || 0).
     H4  Array.isArray guard added to renderVoteShareDonut results extraction.
     M1  Array.isArray guard added to applyFilters data extraction.
     M2  No-results innerHTML changed from template-literal to literal string to
           match esc() convention applied throughout the rest of the file.
     M3  fmtDate locale changed from 'en-IN' to 'en-GB' — en-IN not guaranteed by
           ECMA-402; en-GB is, and produces the same "D Month YYYY" output.
     M4  Falta constituencies_2026.json — 2021_winner_votes and 2021_margin set to
           null (were inconsistently present as null while 2021_winner had a value).
     S1  Split comment blocks around the three-filter repoll exemption consolidated
           into a single comment block above all three filter lines.
   Round 8 fixes:
     B1  renderFaltaBanner — removed duplicate getElementById('falta-banner') that
           was re-fetched inside the result_final branch; outer bannerEl already
           in scope from the top of the function (R7 refactor made the inner fetch dead code).
     B2  Modal vote bar rPct — now computed directly as runner_up_votes/total (not
           as the remainder 100−wPct−notaPct). The R7 H2 remainder formula inflated
           the runner-up bar by absorbing all other-candidate votes when
           total_candidates > 2 (all 25 non-repoll seats). grey flex:1 div absorbs
           any rounding slack.
     B3  renderDeclaredCount — Array.isArray guard added to pr.results['2026']
           extraction; matches the pattern applied to donut (R7 H4) and seat bar.
     B4  renderSeatBarChart — Array.isArray guard added to both pr.results['2026']
           and pr.results['2021'] extractions; guarded arrays reused in .find() calls.
     C1  renderNotableContests — sort by notable_order field (added to JSON for all
           8 notable ACs). Restores the original editorial order: Bhabanipur (CM
           contest) first, Nandigram second; was wrongly showing them in ac_no order.
     C2  applyFilters search — repoll exemption added; AC#144 Falta was hidden by
           any search term not present in its null fields (e.g. "BJP", "Mamata").
           All four filter paths now exempt is_repoll constituencies uniformly.
     C3  renderTrendChart — added AJUP and AISF to the parties list; omitting them
           left 3 unaccounted seats with no visual representation on the trend chart.
     C4  party_results.json swings_2021_to_2026 — added AJUP (new party, seats_delta:2,
           vote_share_delta:null) and AISF (seats_delta:0, vote_share_delta:−1.19).
     C5  renderDataQualityNotice — replaced hardcoded "Phase 2 data expansion in
           progress" (stale phrasing) with neutral "full dataset in progress";
           when loaded>=total, appends "(excludes N repoll seat(s) pending)" if any
           is_repoll && !result_final constituencies exist.
     A1  fetchJSON — AbortController with 10s timeout; AbortError produces a
           human-readable "Fetch timed out" message through showGlobalError().
     A2  init() — State.ready = true moved to after all render*() calls; previously
           set before renders, leaving handlers live during a partially-initialised
           state and incorrectly staying true if any render threw an error.
     A3  partyColor() — console.warn added for unknown party codes so new parties
           added to JSON are not silently absorbed into the OTH grey fallback.
     M1  renderFaltaBanner docstring — updated to accurately describe the two-tier
           fallback behaviour (JS hides/shows; static HTML is the no-JS fallback).
     M2  renderConstituencyTable zero-results — count element now reads
           "0 of N constituencies" to match the "Showing N of M" format of the
           non-empty branch; was "0 results" (no denominator context).
     S1  index.html data-quality-notice static text updated to match JS-rendered
           wording ("full dataset in progress") so pre-JS and post-JS text are
           consistent.
   Round 9 fixes (R9 adversarial review):
     C1  renderFaltaBanner — when textEl is null but bannerEl exists, the banner
           was left visible with stale static HTML. Now hides bannerEl in that
           branch, matching the intent of the !fr and result_final branches.
     C2  renderNotableContests — partyColor(null) was called unconditionally for
           every notable AC before checking winner_party, firing the A3 console.warn
           for every pending/undeclared seat. wCol/rCol now computed only when the
           respective party field is non-null; '#888888' OTH fallback used otherwise.
     C3  renderDeclaredCount — added Map-based dedup by party code before the reduce
           so a duplicate JSON entry (data-entry error) cannot silently inflate the
           declared-seat count.
     V1  renderCandidateStats swing colour — was driven by seatsDelta alone.
           INC (+2 seats, negative vote-share delta) showed green — misleading.
           Now uses a five-way logic: when seatsDelta and vsDelta point in opposite
           directions (mixed signal), colour is var(--ink-faint) (neutral). Only
           single-metric or agreeing-metric cases get directional colour.
     V2  PARTY_COLORS.AISF / CSS --positive-swing (was --forest-aisf) / index.html static ticker —
           changed from #138808 (dark green, visually indistinguishable from AITC
           #00843D on chart lines and legend dots) to #7B3FA0 (purple — distinct
           from every other party and passes WCAG contrast on the parchment bg).
     V3  index.html data-quality-notice static text — removed hardcoded "All 23
           district totals are complete." from the static fallback. JS derives
           the count from pr.district_results_2026.length and is authoritative;
           the hardcoded value would drift if district data changes.
     H1  renderTrendChart — extracted yearArr() helper with Array.isArray guard;
           applied at both call sites (flatMap for maxSeats + parties.forEach for
           rendering). Mirrors the R8 B4 pattern from renderSeatBarChart.
     H2  renderCandidateStats — removed esc(b.cls) where b.cls is a hardcoded
           string literal ('highlight', 'warn', 'gold', ''). esc() on a literal
           implies user-controlled data and creates false safety reassurance.
     H3  showModal — winner_assets and winner_liabilities now strip any leading ₹
           before interpolation. Template already supplies the ₹ prefix; a JSON
           value accidentally entered as "₹1.5 Cr" would otherwise render "₹₹1.5 Cr".
   Round 10 fixes (R10 adversarial review):
     BK1 renderScoreTicker — added Array.isArray guard on pr.results['2026'];
           was the last un-guarded direct array access in the codebase.
     BK2 renderCandidateStats stat boxes — replaced || 0 with ?? 0 for all numeric
           fields (total_candidates, total_criminal, total_crorepati, avg_assets).
           || 0 silently converts genuine-zero to the same display as null/undefined.
     BK3 showModal + renderConstituencyTable — partyColor(c.winner_party) and
           partyColor(c.runner_up_party) were called unconditionally, triggering the
           A3 console.warn for every pending/undecided seat. Both call sites now guard
           with a ternary: party ? partyColor(party) : '#888888'.
     BK4 renderDataQualityNotice — removed dead || pr fallback in metadata extraction.
           If pr.metadata was falsy, the whole pr object silently became the metadata
           object, causing pr.total_seats lookups to fail and fall back to 294.
     H-A renderCandidateStats swing colour — V1 mixed-signal || bug: the third clause
           (seatsDir !== 0 || vsDir !== 0) was true when EITHER signal was non-zero,
           making a party with 0 seats-delta + non-zero VS-delta appear neutral (wrong).
           Changed || → && so "mixed" only fires when BOTH signals are non-zero.
     H-B renderDistrictGrid — d.total_seats was used as a bare denominator with no
           null/zero guard. Extracted to const totalSeats = d.total_seats || decidedSeats || 1
           so bar widths are never NaN or Infinity.
     M-C renderSeatBarChart party order — ['BJP','AITC','INC','AISF','CPI(M)','AJUP']
           had AISF/CPI(M) swapped vs renderTrendChart ['BJP','AITC','INC','CPI(M)','AJUP','AISF'].
           Both now use the same canonical order.
     M-D renderCandidateStats swings — added Map-based dedup by party before rendering
           so an accidental duplicate JSON entry cannot produce a repeated swing row.
     L-A CSS var --forest-aisf renamed to --positive-swing throughout (main.js and
           style.css). The variable drives swing-arrow colour, not AISF branding.
     Gap-1 init() — replaced single monolithic try-block wrapping all renders with
           individual safeRender(label, fn) calls. A bug in one section no longer
           aborts subsequent renders or prevents State.ready from being set.
     Gap-4 "Notable Contests" subtitle — hardcoded "26 key seats" in index.html
           replaced with id="table-section-sub" fallback; renderNotableContests()
           overwrites it with the real is_notable count on every load.
   Round 11 fixes (R12 adversarial review):
     B1  showModal vote bar — partialTotal and barIsPartial now use ?? 0 instead
           of || 0 (mirrors BK2 R10 fix that was applied to stat boxes but missed
           this site). wPct/rPct now explicitly guard against a null vote field:
           JS coerces null/total to 0 silently, making a null winner_votes look
           like a 0-vote win rather than missing data. Both divisions now require
           the vote field to be != null before computing; otherwise 0 is returned.
     H1  PARTY_COLORS — added AIFB (#8B0000 dark crimson) and CPI (#9B1B30 maroon).
           Both appear in party_avg_assets_cr in party_results.json. Without entries
           in PARTY_COLORS, every renderCandidateStats call fired the A3 console.warn
           for each, generating permanent console noise that masks genuine future
           warnings about truly unknown parties.
     H2  safeRender — was a function declaration inside the try{} block of init().
           In ES2015+ strict mode, block-scoped function declarations are valid but
           have different hoisting semantics than function-level declarations, and
           some transpilers reject them. Moved to a const arrow function at module
           scope above init() — unambiguous in all environments.
     Audit All remaining || 0 patterns replaced with ?? 0 throughout main.js:
           renderDeclaredCount (p.seats), renderSeatBarChart (r.seats, r26.seats,
           r21.seats), renderVoteShareDonut (p.vote_share_pct × 2),
           renderTrendChart (row.seats × 2). In every case the field is numeric
           and a genuine 0 is a valid data value; ?? makes the null-only fallback
           intent explicit. No live || 0 patterns remain in main.js.
   Round 12 fixes (R13 adversarial review):
     R13-1 init() — State.constituencies = cons.constituencies || [] fallback added.
           Without the guard, spreading undefined on the next line threw a fatal
           TypeError inside the outer try/catch, which called showGlobalError but
           left the entire app dead (no UI, no table, no charts). The || [] form
           means a missing or null constituencies key produces an empty array and
           all render functions see their empty-state paths instead of crashing.
     R13-2 renderScoreTicker — vote_share_pct null guard in template interpolation.
           String(null) returns "null", so a party entry with vote_share_pct: null
           and seats > 0 (passes the filter) rendered "null% votes" in the ticker.
           Changed to String(p.vote_share_pct ?? 0). Also applied ?? 0 to p.seats
           in the seats display for symmetry (seats is always numeric here, but
           the explicit fallback makes the intent clear). R13 false positives:
           OG meta/hero text hardcodes are intentional editorial copy for the
           declared 2026 results (not bugs); populateFilterDropdowns crash is
           impossible before R13-1 is applied (the spread throws first, aborting
           init before that function is ever called).
   ============================================================ */

'use strict';

// ── XSS escape helper (#1) ─────────────────────────────────
function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── State ──────────────────────────────────────────────────
const State = {
  partyResults: null,
  constituencies: null,
  filtered: [],
  sortCol: 'ac_no',
  sortDir: 'asc',
  searchTerm: '',
  filterParty: '',
  filterPhase: '',
  filterDistrict: '',
  // B3: ready flag — set true after init() resolves so event handlers that
  // operate on constituency data (sort, click) do nothing before fetch completes.
  ready: false,
};

// ── Party colour map ───────────────────────────────────────
const PARTY_COLORS = {
  BJP:      '#FF6B00',
  AITC:     '#00843D',
  INC:      '#19AAED',
  'CPI(M)': '#CC0000',
  // V2 (R9): changed from #138808 (dark green — visually indistinguishable from
  // AITC #00843D, especially on trend-chart lines and small legend dots). AISF
  // (Indian Secular Front) uses purple in its own materials; #7B3FA0 is clearly
  // distinct from every other party in the map and passes WCAG contrast on the
  // parchment (#F5F0E8) background used for legend text.
  AISF:     '#7B3FA0',
  AJUP:     '#8B4513',
  // H1 (R11): AIFB (All India Forward Bloc) and CPI appear in party_avg_assets_cr
  // in party_results.json. Without entries here, every call to partyColor('AIFB')
  // or partyColor('CPI') fires the A3 console.warn and falls through to OTH grey.
  // AIFB uses dark crimson (#8B0000) — visually distinct from CPI(M)'s #CC0000.
  // CPI uses maroon (#9B1B30) — distinct from both CPI(M) and AIFB on the legend.
  AIFB:     '#8B0000',
  CPI:      '#9B1B30',
  OTH:      '#888888',
};

function partyColor(code) {
  if (code != null && !(code in PARTY_COLORS)) {
    // A3 (R8): warn when an unknown party code falls through to the OTH colour.
    // Without this, a new party added to the JSON silently renders as grey with
    // no developer-visible signal that PARTY_COLORS needs a new entry.
    // Using console.warn (not console.error) — it is a data-completeness gap,
    // not a runtime failure. The OTH fallback '#888888' is still returned.
    console.warn(`partyColor: unknown party code "${code}" — add to PARTY_COLORS`);
  }
  return PARTY_COLORS[code] || '#888888';
}

// ── Fetch helpers ──────────────────────────────────────────
// A1 (R8): AbortController timeout — the previous fetch() had no timeout, so on
// a slow GitHub Pages connection (or captive portal) the page would hang silently
// for however long the browser's own timeout takes (30–300s). 10 seconds is
// generous for static JSON files served from CDN; if it fires, the error propagates
// to init()'s catch block and showGlobalError() surfaces it to the user.
async function fetchJSON(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);  // 10s
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`Fetch timed out: ${url}`);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Boot ───────────────────────────────────────────────────
// H2 (R11): safeRender must be a module-level const, not a function declaration
// inside the try{} block. In ES2015+ strict mode, function declarations inside
// blocks are block-scoped to that block — they ARE legal but some transpilers
// and older engines (e.g. Edge Legacy) treat them as syntax errors or hoist
// them differently. A const arrow function at module scope is unambiguous and
// matches the 'use strict' contract of this file.
// The helper wraps each render call so that a bug in one section does not abort
// subsequent renders. Fatal data errors (fetchJSON throws) still surface through
// the outer try/catch and call showGlobalError. Per-render errors are logged to
// the console with [render error] prefix so they are easy to grep in DevTools.
const safeRender = (label, fn) => {
  try { fn(); } catch (e) { console.error(`[render error] ${label}:`, e); }
};

async function init() {
  try {
    const [pr, cons] = await Promise.all([
      fetchJSON('data/party_results.json'),
      fetchJSON('data/constituencies_2026.json'),
    ]);
    State.partyResults = pr;
    // R13-1: guard against malformed JSON where cons.constituencies is absent
    // or undefined. Without the || [] fallback, [...State.constituencies] on the
    // next line throws "cons.constituencies is not iterable" — a fatal crash that
    // is caught by the outer try/catch and calls showGlobalError, but leaves the
    // entire UI dead. With || [], the spread produces an empty array, all render
    // functions receive empty data and render their empty-state UI, and the user
    // sees the data-quality notice + table count showing "0 of 294 constituencies"
    // instead of a blank screen. The || [] form (not ?? []) is deliberate here:
    // an empty array [] from a JSON array field is falsy-equivalent for our
    // purposes and would still pass the Array.isArray() guards downstream.
    State.constituencies = cons.constituencies || [];
    State.filtered = [...State.constituencies];
    // A2 (R8): State.ready is set AFTER all renders complete, not before them.
    // Setting it before meant a user click between the assignment and the end of
    // renderConstituencyTable() would pass the ready guard in the click handler
    // while DOM rendering was still in progress. More critically: if any render
    // function throws, the outer catch runs but State.ready is already true,
    // leaving click/sort handlers enabled against a half-initialised state.
    // Gap-1 (R10): individual safeRender() wrappers below replace the old pattern
    // of one monolithic try-block, so a partial render failure no longer prevents
    // State.ready from being set (which would disable the entire interactive UI).

    // Gap-1 (R10) / H2 (R11): safeRender is defined at module scope above init()
    // (was a block-scoped function declaration inside this try{} — see H2 comment).
    safeRender('renderMajorityMark',       () => renderMajorityMark(pr));
    safeRender('renderDeclaredCount',      () => renderDeclaredCount(pr));
    safeRender('renderFaltaBanner',        () => renderFaltaBanner(pr));
    safeRender('renderDataQualityNotice',  () => renderDataQualityNotice(State.constituencies, pr));
    safeRender('renderScoreTicker',        () => renderScoreTicker(pr));
    safeRender('renderSeatBarChart',       () => renderSeatBarChart(pr));
    safeRender('renderVoteShareDonut',     () => renderVoteShareDonut(pr));
    safeRender('renderTrendChart',         () => renderTrendChart(pr));
    safeRender('renderCandidateStats',     () => renderCandidateStats(pr.candidate_stats_2026, pr.swings_2021_to_2026));
    safeRender('renderDistrictGrid',       () => renderDistrictGrid(pr.district_results_2026));
    safeRender('renderNotableContests',    () => renderNotableContests(State.constituencies));
    // #20: populate dropdowns BEFORE rendering table so filters are ready
    // H1: pass metadata so phase dropdown is built from data, not hardcoded HTML
    safeRender('populateFilterDropdowns',  () => populateFilterDropdowns(State.constituencies, pr.metadata));
    safeRender('renderConstituencyTable',  () => renderConstituencyTable());
    State.ready = true;   // B3 (R4) + A2 (R8): unlock interaction handlers only after all renders
  } catch (err) {
    console.error('Init error:', err);
    showGlobalError(err.message);
  }
}

function showGlobalError(msg) {
  const el = document.getElementById('global-error');
  if (el) { el.textContent = `Data load error: ${msg}`; el.style.display = 'block'; }
}

// ── Majority mark helper (H1 R7) ──────────────────────────
// Single source of truth for the majority mark computation.
// H1 (R7): the same majority-mark logic was duplicated in renderMajorityMark (line ~191)
// and renderSeatBarChart (line ~371). Extracting it here eliminates the drift risk
// where a future edit to one copy might be missed in the other.
// B3 (R5): prefer the explicit metadata.majority_mark field; fall back to the
// strict-majority formula only when the field is absent (e.g. old JSON).
function getMajorityMark(pr) {
  const meta = (pr && pr.metadata) || {};
  return meta.majority_mark != null
    ? meta.majority_mark
    : Math.floor((meta.total_seats || 294) / 2) + 1;
}

// ── Majority mark render (H2 / B3-R5) ─────────────────────
// Reads majority_mark directly from metadata — single source of truth.
// The HTML static "148" remains correct if JS never runs.
function renderMajorityMark(pr) {
  const majorityMark = getMajorityMark(pr);
  const heroEl   = document.getElementById('hero-majority-val');
  const tickerEl = document.getElementById('ticker-majority-val');
  if (heroEl)   heroEl.textContent   = majorityMark;
  if (tickerEl) tickerEl.textContent = majorityMark;
}

// ── Declared count (M5 R5) ─────────────────────────────────
// Computes declared seats by summing 2026 results and compares with total_seats.
// Surfaced in the ticker as "293 / 294 declared" so users see count completeness.
function renderDeclaredCount(pr) {
  const el = document.getElementById('ticker-declared');
  if (!el) return;
  const meta = pr.metadata || {};
  const totalSeats = meta.total_seats || 294;
  // B3 (R8): Array.isArray guard — mirrors the pattern applied to renderVoteShareDonut
  // in R7 H4. pr.results['2026'] could be a non-array if the JSON schema ever drifts;
  // .reduce() on a non-array throws a TypeError rather than silently returning 0.
  const results2026 = (pr.results && Array.isArray(pr.results['2026'])) ? pr.results['2026'] : [];
  // C3 (R9): deduplicate by party code before summing. If a data-entry mistake
  // produces two entries for the same party (e.g. two 'OTH' rows), the reduce
  // would silently double-count seats. Map keyed by party keeps the last-seen
  // entry (matching the "last writer wins" convention used elsewhere in the file).
  const seenParties = new Map();
  results2026.forEach(p => { if (p.party) seenParties.set(p.party, p); });
  const declared = [...seenParties.values()].reduce((sum, p) => sum + (p.seats ?? 0), 0);
  // "293 / 294 declared" — self-explanatory; when all decided, shows "294 / 294 declared"
  el.textContent = `${declared} / ${totalSeats} declared`;
}

// ── Falta banner (M2 R6) ───────────────────────────────────
// Drives the Falta repoll banner text from metadata.falta_repoll in the JSON
// so that if dates change (e.g. the repoll is rescheduled), a single JSON edit
// propagates everywhere.
// Fallback behaviour (M1 R8): if JS executes but falta_repoll is absent from
// metadata, the banner is explicitly hidden (B2 R7). If JS fails to execute at
// all, the static HTML text acts as the visible fallback.
function renderFaltaBanner(pr) {
  const bannerEl = document.getElementById('falta-banner');
  const textEl   = document.getElementById('falta-banner-text');
  const fr = pr && pr.metadata && pr.metadata.falta_repoll;
  // B2 (R7): if falta_repoll is absent from metadata, hide the banner explicitly.
  // The old early-return left the static HTML text visible, which could show stale
  // hardcoded dates if the JSON is ever updated to remove the falta_repoll block.
  if (!fr) {
    if (bannerEl) bannerEl.style.display = 'none';
    return;
  }
  // C1 (R9): if textEl is absent (future HTML edit removed the inner <span>),
  // bannerEl is already visible from its static HTML but would show stale text.
  // Hide the whole banner so no stale content is ever displayed to the user.
  if (!textEl) { if (bannerEl) bannerEl.style.display = 'none'; return; }
  const reason = fr.reason || 'EVM tampering allegations';
  // Format ISO date "2026-05-21" → "21 May 2026"
  // M3 (R7): use 'en-GB' locale instead of 'en-IN'. en-IN is not universally
  // supported (absent in some Android WebViews and older Node environments).
  // en-GB produces the same "D Month YYYY" format and is guaranteed by ECMA-402.
  const fmtDate = iso => {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');   // force local midnight to avoid off-by-one from TZ
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const repollDate = fmtDate(fr.repoll_date);
  const resultDate = fmtDate(fr.result_date);
  // If result is already final, suppress the pending notice.
  // B1 (R8): use the bannerEl already obtained above — the previous code re-fetched
  // getElementById('falta-banner') a second time inside this branch (dead code after
  // the R7 refactor that moved the lookup to the top of the function).
  if (fr.result_final) {
    if (bannerEl) bannerEl.style.display = 'none';
    return;
  }
  textEl.textContent = `Repoll on ${repollDate} due to ${reason}. Result on ${resultDate}. All totals exclude this seat.`;
}

// ── Data quality notice (Completeness R5) ─────────────────
// Updates the banner above the constituency table with the actual loaded count
// so users are never misled about how complete the table sample is.
// B2+M4 (R6): now receives full `pr` object instead of just metadata so we can
// derive the district count from data rather than hardcoding it, and so we can
// avoid leaking internal filenames ("party_results.json") in user-visible text.
function renderDataQualityNotice(constituencies, pr) {
  const el = document.getElementById('data-quality-notice');
  if (!el) return;
  // BK4 (R10): removed dead `|| pr` fallback. This function is only ever called
  // from init() with the full pr object. The `|| pr` branch was introduced in R6 to
  // support a transitional call signature that was never used. If pr.metadata is
  // falsy, `|| pr` would silently use the whole pr object as metadata, causing
  // metadata.total_seats to be read from pr.total_seats (which does not exist at
  // the top level) and falling back to the hardcoded 294 — masking the bug entirely.
  // Making the contract explicit: this function always receives the full pr object.
  const metadata = (pr && pr.metadata) || {};
  const loaded = (constituencies || []).length;
  const total  = (metadata && metadata.total_seats) || 294;
  // C5 (R8): rework both branches so the message is always accurate:
  // — "loaded >= total" branch: note any pending repoll seat so "all loaded" is
  //   not mistaken for "all results final". We check the raw array for any entry
  //   that is is_repoll && !result_final, not the loaded count, so the phrasing
  //   is correct regardless of whether the repoll seat is included in constituencies.
  // — else branch: remove the hardcoded "Phase 2 data expansion in progress" string
  //   which will never be true once Phase 2 data is actually added (loaded == total).
  //   Replace with a neutral "Showing N of M" that ages gracefully.
  const districtArr = pr && Array.isArray(pr.district_results_2026) ? pr.district_results_2026 : null;
  const districtClause = districtArr ? ` All ${districtArr.length} district totals are complete.` : '';
  if (loaded >= total) {
    // Check for any repoll seat that is still pending to append a clear caveat.
    const pendingRepoll = (constituencies || []).filter(c => c.is_repoll && !c.result_final);
    const repollClause = pendingRepoll.length
      ? ` (excludes ${pendingRepoll.length} repoll seat${pendingRepoll.length > 1 ? 's' : ''} pending)`
      : '';
    el.textContent = `All ${loaded} constituencies loaded${repollClause}.${districtClause}`;
  } else {
    // B2 (R6): removed "(party_results.json)" — internal filename must never leak as user-visible text.
    // M4 (R6): district count derived from pr.district_results_2026.length, not hardcoded.
    // B3 (R7): omit the district-total clause entirely when district_results_2026 is absent.
    el.textContent = `Showing ${loaded} of ${total} constituencies — full dataset in progress.${districtClause}`;
  }
}

// ── Score Ticker ───────────────────────────────────────────
function renderScoreTicker(pr) {
  const container = document.getElementById('ticker-cards');
  if (!container) return;

  // Clear the static placeholder immediately — regardless of whether data is
  // good — so stale hardcoded values are never left visible after JS runs.
  container.removeAttribute('data-static-placeholder');

  // #18: guard against missing or malformed results
  // BK1 (R10): added Array.isArray guard — the truthiness check `pr.results['2026']`
  // passes for null, {}, and any other non-array truthy value. A non-array object has
  // `.length === undefined`, so `!results2026.length` evaluates to `!undefined → true`
  // and the ticker silently shows "Standings unavailable" instead of real data.
  // This is the same class of bug fixed in R8 B3/B4 and R9 H1 for every other
  // pr.results accessor — renderScoreTicker was the last ungarded call site.
  const results2026 = (pr.results && Array.isArray(pr.results['2026'])) ? pr.results['2026'] : [];
  if (!results2026.length) {
    container.innerHTML = '<span class="ticker-vs" style="padding:0 12px;color:var(--ink-faint)">Standings unavailable</span>';
    return;
  }

  // B1 (R5): use partyColor() from the local constant map, NOT p.color from JSON.
  // p.color is an unsanitised CSS value from the data file; injecting it directly
  // into style="" attributes allows CSS injection even though esc() escapes HTML.
  // partyColor() returns a hardcoded hex from PARTY_COLORS — always safe.
  // M1 (R6): filter on vote_share_pct > 0 instead of seats > 0 so that OTH
  // (7.93% vote share, 0 seats) remains visible in the ticker. Filtering only
  // on seats would hide parties that won meaningful vote share but no seats.
  // H3 (R7): use Number() to coerce vote_share_pct explicitly. The || 0 idiom
  // coerces implicitly but also swallows a value of 0 — making 0 and missing
  // indistinguishable. Number() preserves 0 as numeric 0 and converts string
  // "7.93" (possible if data is ever serialised as a string) correctly.
  const html = results2026
    .filter(p => p.seats > 0 || Number(p.vote_share_pct) > 0)
    .map(p => {
      const col = partyColor(p.party);
      // Completeness (R5): surface government:true from JSON as a small badge
      const govtBadge = p.government ? '<span class="ticker-govt-badge">Govt</span>' : '';
      // R13-2: guard vote_share_pct null before String() conversion. String(null)
      // returns the literal "null", so a party with vote_share_pct: null (data gap)
      // would render "null% votes" in the ticker. ?? 0 falls through to "0" which
      // is a safe display value. The filter above (Number(p.vote_share_pct) > 0)
      // already screens out most null-vs-zero cases, but a party with seats > 0
      // and a null vote_share_pct still passes that filter and reaches this template.
      return `
      <div class="ticker-card">
        <div class="ticker-party-swatch" style="background:${col}"></div>
        <div>
          <div class="ticker-party-name">${esc(p.party)}</div>
          <div class="ticker-vs">${esc(String(p.vote_share_pct ?? 0))}% votes</div>
          ${govtBadge}
        </div>
        <div class="ticker-seats" style="color:${col}">${esc(String(p.seats ?? 0))}</div>
      </div>
    `;
    }).join('');

  container.innerHTML = html;
}

// ── Seat Bar Chart (SVG, 2026 vs 2021) ─────────────────────
function renderSeatBarChart(pr) {
  const svg = document.getElementById('seat-bar-svg');
  if (!svg) return;

  // M-C (R10): aligned party order with renderTrendChart — both now use the same
  // sequence ['BJP','AITC','INC','CPI(M)','AJUP','AISF']. Previously this list had
  // AISF and CPI(M) swapped, causing AISF to appear above CPI(M) in the bar chart
  // while the trend chart showed the opposite order. Consistent ordering prevents
  // visual confusion when a user looks at both charts side-by-side.
  const parties = ['BJP', 'AITC', 'INC', 'CPI(M)', 'AJUP', 'AISF'];
  const w = 340, rowH = 32, padTop = 10, padLeft = 64, barMaxW = 170;
  const totalH = parties.length * rowH + padTop + 24;

  svg.setAttribute('viewBox', `0 0 ${w} ${totalH}`);
  svg.setAttribute('width', '100%');

  // #11: compute maxSeats from actual data rather than hardcoding 213
  // B4 (R8): Array.isArray guard on both year arrays — same pattern as renderVoteShareDonut
  // (R7 H4) and renderDeclaredCount (R8 B3). Spread on a non-array throws a TypeError.
  const r26arr = (pr.results && Array.isArray(pr.results['2026'])) ? pr.results['2026'] : [];
  const r21arr = (pr.results && Array.isArray(pr.results['2021'])) ? pr.results['2021'] : [];
  const allSeats = [...r26arr, ...r21arr].map(r => r.seats ?? 0);
  const maxSeats = Math.max(...allSeats, 1);

  let rows = '';

  parties.forEach((p, i) => {
    const r26 = r26arr.find(x => x.party === p);
    const r21 = r21arr.find(x => x.party === p);
    const s26 = r26 ? (r26.seats ?? 0) : 0;
    const s21 = r21 ? (r21.seats ?? 0) : 0;
    const y = padTop + i * rowH;
    const bw26 = (s26 / maxSeats) * barMaxW;
    const bw21 = (s21 / maxSeats) * barMaxW;
    const col = partyColor(p);

    // #6: minimum label offset so labels don't stack at x=padLeft for near-zero bars.
    // At 11px font, a single digit glyph is ~6–7px wide; 12px gives one glyph of
    // clearance from the bar edge. The additional +4 is the gap between bar and label.
    const MIN_LABEL_GAP = 12;
    const label26X = padLeft + Math.max(bw26, MIN_LABEL_GAP) + 4;
    const label21X = padLeft + Math.max(bw21, MIN_LABEL_GAP) + 4;

    // Avoid overlapping: if both bars are tiny, vertically separate labels
    const label26Y = y + 25;
    const label21Y = y + 13;

    rows += `
      <text x="${padLeft - 6}" y="${y + 15}" text-anchor="end" class="chart-bar-label">${esc(p)}</text>
      <rect x="${padLeft}" y="${y + 6}" width="${bw21.toFixed(2)}" height="7"
            fill="${col}" opacity="0.25" rx="2">
        <title>${esc(p)} 2021: ${s21} seats</title>
      </rect>
      <rect x="${padLeft}" y="${y + 16}" width="${bw26.toFixed(2)}" height="9"
            fill="${col}" rx="2">
        <title>${esc(p)} 2026: ${s26} seats</title>
      </rect>
      <text x="${label26X.toFixed(1)}" y="${label26Y}" class="chart-axis-label"
            fill="${col}" font-weight="600">${s26}</text>
      <text x="${label21X.toFixed(1)}" y="${label21Y}" class="chart-axis-label"
            opacity="0.6">${s21}</text>
    `;
  });

  // Majority line — H1 (R7): use getMajorityMark() helper; eliminates the duplicate
  // computation that previously lived here alongside the one in renderMajorityMark.
  const majorityMark = getMajorityMark(pr);
  const mx = padLeft + (majorityMark / maxSeats) * barMaxW;
  rows += `
    <line x1="${mx.toFixed(1)}" y1="${padTop}" x2="${mx.toFixed(1)}" y2="${totalH - 10}"
          stroke="#C9962C" stroke-width="1.5" stroke-dasharray="4,3"/>
    <text x="${(mx + 3).toFixed(1)}" y="${padTop + 9}" class="chart-axis-label" fill="#C9962C">${majorityMark}</text>
  `;

  svg.innerHTML = rows;
}

// ── Vote Share Donut (2026) ────────────────────────────────
// #3: Fixed dashoffset — single-circle-per-segment approach with
//     correct cumulative offset. Each circle is rotated so its
//     "start" aligns with where the previous segment ended.
function renderVoteShareDonut(pr) {
  const svg = document.getElementById('donut-svg');
  if (!svg) return;

  // H4 (R7): Array.isArray guard — pr.results['2026'] could theoretically be a
  // non-array (object, null, etc.) if the JSON schema changes. Without the guard,
  // a non-array value would reach .forEach() and throw a TypeError at runtime.
  const results = (pr.results && Array.isArray(pr.results['2026'])) ? pr.results['2026'] : [];
  if (!results.length) return;

  const cx = 90, cy = 90, r = 68, strokeW = 20;
  const circumference = 2 * Math.PI * r;

  let cumulativePct = 0;
  let paths = '';

  results.forEach(p => {
    const pct = (p.vote_share_pct ?? 0) / 100;
    if (pct <= 0) return;

    const dashLen = pct * circumference;
    // Each segment: dasharray = [segmentLength, rest], starting from the right
    // rotate so this segment starts at cumulativePct * 360deg offset from top (-90deg base)
    const rotateDeg = -90 + cumulativePct * 360;
    // B1 (R5): use partyColor() — not p.color from JSON — to avoid CSS injection via stroke=
    const col = partyColor(p.party);

    paths += `
      <circle
        cx="${cx}" cy="${cy}" r="${r}"
        fill="none"
        stroke="${col}"
        stroke-width="${strokeW}"
        stroke-dasharray="${dashLen.toFixed(2)} ${circumference.toFixed(2)}"
        stroke-dashoffset="0"
        transform="rotate(${rotateDeg.toFixed(3)} ${cx} ${cy})"
      ><title>${esc(p.party)}: ${esc(String(p.vote_share_pct))}%</title></circle>
    `;
    cumulativePct += pct;
  });

  // Center text — turnout from metadata
  const turnout = (pr.metadata && pr.metadata.statewide_turnout) || 92.93;
  paths += `
    <text x="${cx}" y="${cy - 7}" text-anchor="middle" class="donut-center-val">${turnout}%</text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle" class="donut-center-label">TURNOUT</text>
  `;

  svg.setAttribute('viewBox', '0 0 180 180');
  svg.setAttribute('width', '100%');
  svg.innerHTML = paths;

  // Legend — B1 (R5): partyColor() not p.color
  const legend = document.getElementById('donut-legend');
  if (legend) {
    legend.innerHTML = results
      .filter(p => (p.vote_share_pct ?? 0) > 0.5)
      .map(p => `
        <span class="trend-legend-item">
          <span class="trend-legend-dot" style="background:${partyColor(p.party)}"></span>
          ${esc(p.party)} ${esc(String(p.vote_share_pct))}%
        </span>
      `).join('');
  }
}

// ── Trend Line Chart (seats 2011–2026) ─────────────────────
function renderTrendChart(pr) {
  const svg = document.getElementById('trend-svg');
  if (!svg) return;

  const years = ['2011', '2016', '2021', '2026'];
  // C3 (R8): added AJUP and AISF — both won seats in 2026 (2 and 1 respectively).
  // Omitting them from the trend chart created an unaccounted 3-seat gap between the
  // sum of plotted parties and the total. Both parties have 0 seats before 2026
  // (AJUP is a new party; AISF had 1 seat in 2021 which the existing data covers),
  // so the chart correctly shows their lines rising from 0 in 2021 to their 2026 values.
  const parties = ['BJP', 'AITC', 'INC', 'CPI(M)', 'AJUP', 'AISF'];
  const w = 340, h = 180, padL = 36, padR = 20, padT = 12, padB = 28;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  // Compute maxSeats from data for the plotted parties across all years,
  // then round up to the nearest 50 for clean grid lines.
  // Hardcoding 220 breaks when data changes; 213 (AITC 2021) is the current
  // peak and a fixed 220 wasted 7 rows of headroom while hiding the real max.
  // H1 (R9): Array.isArray guard on pr.results[yr]. The outer truthiness check
  // (pr.results[yr] ?) passes for null, an empty object {}, or any non-array
  // truthy value — all of which would throw a TypeError on .find(). Mirror the
  // guard pattern from renderSeatBarChart (R8 B4) and renderDeclaredCount (R8 B3).
  const yearArr = yr => (pr.results && Array.isArray(pr.results[yr])) ? pr.results[yr] : [];
  const allTrendSeats = parties.flatMap(p =>
    years.map(yr => {
      const row = yearArr(yr).find(r => r.party === p);
      return row ? (row.seats ?? 0) : 0;
    })
  );
  const dataPeak = Math.max(...allTrendSeats, 1);
  const maxSeats = Math.ceil(dataPeak / 50) * 50;

  // Grid lines — generated from maxSeats so the axis always fits the data.
  // Step is 50 for any max up to 300 (all historical WB totals).
  const gridStep = 50;
  const gridValues = [];
  for (let v = 0; v <= maxSeats; v += gridStep) gridValues.push(v);

  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', '100%');

  let content = '';

  // Grid lines
  gridValues.forEach(v => {
    const y = padT + plotH - (v / maxSeats) * plotH;
    content += `
      <line x1="${padL}" y1="${y.toFixed(1)}" x2="${w - padR}" y2="${y.toFixed(1)}"
            stroke="#C8BFA8" stroke-width="0.5"/>
      <text x="${padL - 4}" y="${(y + 3).toFixed(1)}" text-anchor="end" class="chart-axis-label">${v}</text>
    `;
  });

  // Year labels
  years.forEach((yr, i) => {
    const x = padL + (i / (years.length - 1)) * plotW;
    content += `<text x="${x.toFixed(1)}" y="${h - 4}" text-anchor="middle" class="chart-axis-label">${yr}</text>`;
  });

  // Lines & dots — #4: <title> nested inside <circle>, not orphaned
  // H1 (R9): yearArr() helper (defined above) used here too — same Array.isArray guard.
  parties.forEach(p => {
    const col = partyColor(p);
    const points = years.map((yr, i) => {
      const row = yearArr(yr).find(r => r.party === p);
      const seats = row ? (row.seats ?? 0) : 0;
      const x = padL + (i / (years.length - 1)) * plotW;
      const y = padT + plotH - (seats / maxSeats) * plotH;
      return { x, y, seats };
    });

    const polyline = points.map(pt => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
    content += `<polyline points="${polyline}" fill="none" stroke="${col}" stroke-width="2.5"
                  stroke-linejoin="round" stroke-linecap="round"/>`;

    // #4: <title> as CHILD of <circle>, not a sibling
    points.forEach(pt => {
      content += `
        <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="3.5" fill="${col}">
          <title>${esc(p)}: ${pt.seats} seats</title>
        </circle>
      `;
    });

    // End label — clamp to avoid overflowing right edge
    const last = points[points.length - 1];
    const labelX = Math.min(last.x + 5, w - padR - 16);
    content += `<text x="${labelX.toFixed(1)}" y="${(last.y + 4).toFixed(1)}"
                  class="chart-axis-label" fill="${col}" font-weight="600">${last.seats}</text>`;
  });

  svg.innerHTML = content;

  // Legend
  const legend = document.getElementById('trend-legend');
  if (legend) {
    legend.innerHTML = parties.map(p => `
      <span class="trend-legend-item">
        <span class="trend-legend-dot" style="background:${esc(partyColor(p))}"></span>${esc(p)}
      </span>
    `).join('');
  }
}

// ── Candidate Stats ────────────────────────────────────────
function renderCandidateStats(stats, swings) {
  const grid = document.getElementById('stats-grid');
  if (!grid || !stats) return;

  // BK2 (R10): replaced || 0 with ?? 0 for all numeric stat fields.
  // || 0 coerces ANY falsy value (including a legitimate 0%) to 0, making a genuine
  // zero indistinguishable from a missing/null field — both display as "0%". This
  // was noted in R7 H3 for vote_share_pct but not applied here. ?? 0 only falls
  // back to 0 when the value is null or undefined, preserving a true 0 as "0%".
  // toLocaleString() is applied to integer counts so they format with commas (e.g. 2,926).
  const boxes = [
    { val: (stats.total_candidates              ?? 0).toLocaleString(), label: 'Total Candidates',        cls: '' },
    { val: `${stats.women_candidates_pct        ?? 0}%`,                label: 'Women Candidates',        cls: 'highlight' },
    { val: `${stats.with_criminal_cases_pct     ?? 0}%`,                label: 'With Criminal Cases',     cls: 'warn' },
    { val: `${stats.with_serious_cases_pct      ?? 0}%`,                label: 'Serious Criminal Cases',  cls: 'warn' },
    { val: `${stats.crorepatis_pct              ?? 0}%`,                label: 'Crorepati Candidates',    cls: 'gold' },
    { val: `\u20B9${stats.avg_assets_cr         ?? 0} Cr`,              label: 'Avg. Declared Assets',    cls: 'gold' },
    { val: `${stats.graduates_or_above_pct      ?? 0}%`,                label: 'Graduates or Above',      cls: '' },
    { val: (stats.red_alert_constituencies_count ?? 0).toLocaleString(), label: 'Red-Alert Constituencies', cls: 'warn' },
  ];

  // H2 (R9): b.cls is a hardcoded string literal — esc() on it was redundant and
  // implied the value was user-controlled, creating false safety reassurance.
  // b.val and b.label ARE user-visible strings from the data and stay escaped.
  grid.innerHTML = boxes.map(b => `
    <div class="stat-box">
      <div class="${'stat-box-value' + (b.cls ? ' ' + b.cls : '')}">${esc(b.val)}</div>
      <div class="stat-box-label">${esc(b.label)}</div>
    </div>
  `).join('');

  // Party assets
  const assetsEl = document.getElementById('party-assets');
  if (assetsEl && stats.party_avg_assets_cr && Object.keys(stats.party_avg_assets_cr).length > 0) {
    const parties = Object.entries(stats.party_avg_assets_cr).sort((a, b) => b[1] - a[1]);
    assetsEl.innerHTML = parties.map(([party, val]) => `
      <div class="party-asset-card">
        <div class="party-asset-swatch" style="background:${esc(partyColor(party))}"></div>
        <div class="party-asset-info">
          <div class="party-asset-name">${esc(party)}</div>
          <div class="party-asset-val">\u20B9${esc(String(val))} Cr</div>
        </div>
      </div>
    `).join('');
  }

  // Swing summary — #style: handle numeric sign correctly
  const swingEl = document.getElementById('swing-summary');
  if (swingEl && swings) {
    // M-D (R10): dedup swings array by party before rendering. If the JSON data
    // file is edited and a party entry is accidentally duplicated, the last entry
    // for that party wins (Map semantics preserve insertion order and overwrite
    // duplicate keys). Without this guard a duplicated party would render twice,
    // making the swing section look broken even though the JS is correct.
    const uniqueSwings = [...new Map(swings.map(s => [s.party, s])).values()];
    swingEl.innerHTML = uniqueSwings.map(s => {
      // M4: use != null rather than || 0 so a genuine delta of 0 is not silently
      // collapsed to the same display as a missing/null value.
      const seatsDelta = s.seats_delta != null ? s.seats_delta : null;
      const vsDelta    = s.vote_share_delta != null ? s.vote_share_delta : null;
      // Build sign-prefixed strings; null means "no prior comparison → show —"
      const seatsStr = seatsDelta != null ? (seatsDelta > 0 ? '+' : '') + seatsDelta : '\u2014';
      const vsStr    = vsDelta != null ? (vsDelta > 0 ? '+' : '') + vsDelta.toFixed(2) : '\u2014';
      const col = partyColor(s.party);
      // V1 (R9): five-way colour — a party can gain seats but shed vote share (or
      // vice versa). Showing green purely on seatsDelta > 0 was misleading for INC
      // (+2 seats, negative vote-share delta) and any similar split-signal case.
      // When the two metrics point in OPPOSITE directions (mixed signal), we use
      // ink-faint (neutral) rather than endorsing either direction. Only when both
      // metrics agree — or only one is available — do we apply the directional colour.
      // M3 / B2 (R5): null delta (no prior comparison) stays ink-faint. Uses CSS
      // vars (not hardcoded hex) so dark-mode overrides work automatically (S2).
      const seatsDir = seatsDelta == null ? 0 : Math.sign(seatsDelta);
      const vsDir    = vsDelta    == null ? 0 : Math.sign(vsDelta);
      // H-A (R10): fixed || → && in the third clause. Previously `seatsDir !== 0 || vsDir !== 0`
      // was true whenever *either* signal was non-zero — making a party with 0-seats-delta
      // and non-zero VS-delta count as "mixed" rather than directional. The correct
      // requirement is that BOTH signals are non-zero (and disagree) to be truly mixed.
      // With ||: AISF (seatsDir=0, vsDir=-1) → mixed=true → shown as neutral (wrong).
      // With &&: AISF (seatsDir=0, vsDir=-1) → mixed=false → effectiveDir=-1 → red (correct).
      const mixed = (seatsDelta != null && vsDelta != null) && (seatsDir !== vsDir) && (seatsDir !== 0 && vsDir !== 0);
      const effectiveDir = mixed ? 0 : seatsDir || vsDir;  // fall back to whichever is available
      const valColor = mixed || effectiveDir === 0 ? 'var(--ink-faint)'
                     : effectiveDir > 0             ? 'var(--positive-swing)'
                     :                               'var(--red-left)';
      return `
        <div class="party-asset-card">
          <div class="party-asset-swatch" style="background:${esc(col)}"></div>
          <div class="party-asset-info">
            <div class="party-asset-name">${esc(s.party)} (2021\u21922026)</div>
            <div class="party-asset-val" style="color:${valColor}">
              ${esc(seatsStr)} seats &nbsp; ${esc(vsStr)}%
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// ── Constituency Table ─────────────────────────────────────
// H1: accepts `metadata` to build phase options from data rather than hardcoding
//     phase numbers and polling dates in the HTML.
function populateFilterDropdowns(constituencies, metadata) {
  const parties   = [...new Set(constituencies.map(c => c.winner_party).filter(Boolean))].sort();
  const districts = [...new Set(constituencies.map(c => c.district).filter(Boolean))].sort();

  const partyEl = document.getElementById('filter-party');
  const distEl  = document.getElementById('filter-district');
  const phaseEl = document.getElementById('filter-phase');

  if (partyEl) {
    partyEl.innerHTML = '<option value="">All Parties</option>' +
      parties.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
  }
  if (distEl) {
    distEl.innerHTML = '<option value="">All Districts</option>' +
      districts.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('');
  }
  // H1: build phase options from metadata — phases are keyed as phase_1, phase_2, …
  if (phaseEl && metadata) {
    // Collect all phase_N keys in numeric order
    const phaseKeys = Object.keys(metadata)
      .filter(k => /^phase_\d+$/.test(k))
      .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));

    const phaseOpts = phaseKeys.map(k => {
      const num  = k.split('_')[1];
      const info = metadata[k];
      // Format date as "D Mon" (e.g. "23 Apr") if `date` field exists
      let dateStr = '';
      if (info && info.date) {
        const d = new Date(info.date + 'T00:00:00');  // force local midnight parse
        if (!isNaN(d)) {
          dateStr = ` (${d.getDate()} ${d.toLocaleString('en-GB', { month: 'short' })})`;
        }
      }
      return `<option value="${esc(num)}">Phase ${esc(num)}${esc(dateStr)}</option>`;
    }).join('');

    phaseEl.innerHTML = '<option value="">All Phases</option>' + phaseOpts;
  }
}

function applyFilters() {
  // M1 (R7): Array.isArray guard — State.constituencies is set from the JSON fetch
  // result, which the JS engine types as unknown until the promise resolves.
  // If init() ever fails after a partial load (race condition), State.constituencies
  // could be non-null but non-array; the || [] idiom would then spread an object.
  const data = Array.isArray(State.constituencies) ? State.constituencies : [];
  const term = State.searchTerm.toLowerCase();

  State.filtered = data.filter(c => {
    if (term) {
      // C2 (R8): repoll exemption for the search filter. AC#144 Falta has null values
      // for winner, winner_party, and all vote fields, so its haystack is just
      // "144 Falta  South 24 Parganas " — it will be hidden by any search term that
      // doesn't appear in those fields (e.g. "BJP", "AITC", any candidate name).
      // The three dropdown filters already have !c.is_repoll exemptions (S1 R7).
      // This brings the search filter into parity: repoll seats always pass.
      if (c.is_repoll) return true;
      // #8: null fields (both actual null/undefined AND stringified "null" from
      // bad serialisation) coalesced to empty string — never match literal 'null'.
      // M2 (R5): include ac_no so users can search by constituency number (e.g. "144").
      const hay = [c.ac_no, c.ac_name, c.winner, c.district, c.winner_party]
        .map(v => (v == null || v === 'null') ? '' : String(v).toLowerCase())
        .join(' ');
      if (!hay.includes(term)) return false;
    }
    // S1 (R7): consolidated comment — repoll exemption applies to ALL three filters
    // (party, phase, district). Each filter uses the same !c.is_repoll guard so
    // AC#144 Falta remains visible regardless of which filter is active.
    // History: party exemption was first (#26); phase added in R5 B4; district in R6 B1.
    if (State.filterParty    && !c.is_repoll && c.winner_party        !== State.filterParty)    return false;
    if (State.filterPhase    && !c.is_repoll && String(c.phase)       !== State.filterPhase)    return false;
    if (State.filterDistrict && !c.is_repoll && c.district            !== State.filterDistrict) return false;
    return true;
  });

  sortFiltered();
  renderConstituencyTable();
}

// #17: Parse swing magnitude for numeric sort.
// Expected format: "PARTY ±N" e.g. "BJP +6832", "AITC -12000".
// The regex is anchored to match a signed integer at the END of the string
// so a malformed value like "999 BJP +3700" returns 3700, not 999.
// If the format doesn't match at all, returns null (sorts last).
function swingMagnitude(swing) {
  if (!swing || swing === 'N/A') return null;
  // Match optional sign + digits anchored to end of string (after optional whitespace)
  const m = swing.match(/([+-]?\d+)\s*$/);
  return m ? Math.abs(parseInt(m[1], 10)) : null;
}

function sortFiltered() {
  const col = State.sortCol;
  const dir = State.sortDir === 'asc' ? 1 : -1;

  State.filtered.sort((a, b) => {
    let va = a[col];
    let vb = b[col];

    // #17: swing column — sort by numeric magnitude
    if (col === 'swing') {
      va = swingMagnitude(va);
      vb = swingMagnitude(vb);
    }

    // #7: nulls always sort LAST regardless of direction.
    // Both-null: stable (return 0). One-null: null goes last.
    const aNil = va === null || va === undefined;
    const bNil = vb === null || vb === undefined;
    if (aNil && bNil) return 0;
    if (aNil) return 1;
    if (bNil) return -1;

    if (typeof va === 'string') return dir * va.localeCompare(vb);
    return dir * (va - vb);
  });
}

function renderConstituencyTable() {
  const tbody   = document.getElementById('table-body');
  const countEl = document.getElementById('table-count');
  if (!tbody) return;

  if (!State.filtered.length) {
    // M2 (R7): use a literal string constant (no interpolation) to match the esc()
    // convention applied to all other innerHTML assignments in this file.
    // The message contains no user input so there is no XSS risk here, but
    // keeping the pattern consistent prevents accidental future regressions if
    // a user-controlled value is ever interpolated into this template.
    tbody.innerHTML = '<tr><td colspan="8" class="no-results">No constituencies match your filters.</td></tr>';
    // M2 (R8): use "0 of N constituencies" to match the format used in the non-empty
    // branch ("Showing N of M constituencies"). The old "0 results" was inconsistent
    // — it gave no context about how many total constituencies exist, unlike every
    // other state of the count element.
    if (countEl) {
      const total = (State.constituencies || []).length;
      countEl.textContent = `0 of ${total} ${total === 1 ? 'constituency' : 'constituencies'}`;
    }
    return;
  }

  // #15: data-acno attribute for event delegation — no inline onclick
  tbody.innerHTML = State.filtered.map(c => {
    if (c.is_repoll) {
      return `
        <tr>
          <td class="mono" style="color:var(--ink-faint)">${esc(String(c.ac_no))}</td>
          <td class="ac-name" data-acno="${esc(String(c.ac_no))}">${esc(c.ac_name)}</td>
          <td style="color:var(--ink-faint);font-size:0.82rem">${esc(c.district)}</td>
          <td><span class="repoll-badge">REPOLL PENDING</span></td>
          <td colspan="4" style="color:var(--ink-faint);font-size:0.8rem;font-style:italic">${esc(c.note || '')}</td>
        </tr>
      `;
    }
    // BK3 (R10): guard before calling partyColor() — C2 (R9) fixed renderNotableContests
    // but the same call in this table-row branch was missed. c.winner_party can be null
    // for a non-repoll entry whose data hasn't been entered yet, which triggers the A3
    // console.warn unconditionally. Conditional guard matches the C2 pattern.
    const col = c.winner_party ? partyColor(c.winner_party) : '#888888';
    return `
      <tr>
        <td class="mono" style="color:var(--ink-faint)">${esc(String(c.ac_no))}</td>
        <td class="ac-name" data-acno="${esc(String(c.ac_no))}">${esc(c.ac_name)}</td>
        <td style="color:var(--ink-faint);font-size:0.82rem">${esc(c.district)}</td>
        <td>${c.winner ? `<span style="font-weight:500">${esc(c.winner)}</span>` : '\u2014'}</td>
        <td><span class="party-pill" style="background:${esc(col)}">${esc(c.winner_party || '\u2014')}</span></td>
        <td class="margin-num">${c.margin != null ? c.margin.toLocaleString() : '\u2014'}</td>
        <td style="color:var(--ink-faint);font-size:0.82rem">${c.turnout != null ? esc(String(c.turnout)) + '%' : '\u2014'}</td>
        <td>${c.swing ? `<span class="swing-badge">${esc(c.swing)}</span>` : '\u2014'}</td>
      </tr>
    `;
  }).join('');

  if (countEl) {
    const total = (State.constituencies || []).length;
    const shown = State.filtered.length;
    const noun = shown === 1 ? 'constituency' : 'constituencies';
    countEl.textContent = `Showing ${shown} of ${total} ${noun}`;
  }

  // Update sort indicators
  document.querySelectorAll('#table-head th').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.col === State.sortCol) {
      th.classList.add(State.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
}

// ── District Grid ──────────────────────────────────────────
function renderDistrictGrid(districts) {
  const container = document.getElementById('district-cards');
  if (!container) return;

  // B1: guard against missing or non-array data — crash path if JSON key absent
  if (!Array.isArray(districts) || !districts.length) {
    container.innerHTML = '<p style="color:var(--ink-faint);font-family:var(--font-mono);font-size:0.82rem">District data unavailable.</p>';
    return;
  }

  container.innerHTML = districts.map(d => {
    // Filter out metadata keys — only numeric party seat values
    const partyEntries = Object.entries(d)
      .filter(([k, v]) => !['district', 'total_seats', '_note'].includes(k)
                          && !k.startsWith('_')
                          && typeof v === 'number' && v > 0)
      .sort((a, b) => b[1] - a[1]);

    // B2: Compute decided seats separately from total_seats.
    // total_seats is the official seat count; some may be pending (e.g. Falta in
    // South 24 Parganas). We size bars against total_seats so the chart scale is
    // always correct, and add a "pending" grey segment for any undecided remainder.
    // H-B (R10): guard denominator — if total_seats is 0, null, or undefined, fall
    // back to decidedSeats so we never divide by zero and produce NaN/Infinity widths.
    const decidedSeats = partyEntries.reduce((sum, [, n]) => sum + n, 0);
    const totalSeats   = d.total_seats || decidedSeats || 1;   // never 0
    const pendingSeats = Math.max(0, totalSeats - decidedSeats);

    const barSegs = partyEntries.map(([p, seats]) => `
      <div class="district-bar-seg"
           style="width:${(seats / totalSeats * 100).toFixed(1)}%;background:${esc(partyColor(p))}"
           title="${esc(p)}: ${seats}"></div>
    `).join('') + (pendingSeats > 0 ? `
      <div class="district-bar-seg"
           style="width:${(pendingSeats / totalSeats * 100).toFixed(1)}%;background:var(--border-light)"
           title="Pending: ${pendingSeats}"></div>
    ` : '');

    const breakdown = partyEntries.map(([p, seats]) => `
      <span class="district-breakdown-item">
        <span class="district-breakdown-dot" style="background:${esc(partyColor(p))}"></span>
        ${esc(p)} <strong>${seats}</strong>
      </span>
    `).join('') + (pendingSeats > 0 ? `
      <span class="district-breakdown-item" style="color:var(--ink-faint)">
        <span class="district-breakdown-dot" style="background:var(--border)"></span>
        Pending <strong>${pendingSeats}</strong>
      </span>
    ` : '');

    const noteHtml = d._note
      ? `<div style="font-size:0.65rem;color:var(--ink-faint);margin-top:6px;font-style:italic">${esc(d._note)}</div>`
      : '';

    return `
      <div class="district-card">
        <div class="district-name">${esc(d.district)}</div>
        <div class="district-total">${totalSeats} seat${totalSeats === 1 ? '' : 's'}</div>
        <div class="district-bar">${barSegs}</div>
        <div class="district-breakdown">${breakdown}</div>
        ${noteHtml}
      </div>
    `;
  }).join('');
}

// ── Notable Contests ───────────────────────────────────────
// B4 (R7): driven by is_notable flag in constituencies_2026.json rather than a
// hardcoded NOTABLE_AC_NOS array. This prevents silent card loss if an AC is
// absent from the JSON (the old array.find() returned undefined, which .filter(Boolean)
// silently swallowed — no error, no card). The flag lives in the data so updates
// to the notable set require only a JSON edit, not a code change.
function renderNotableContests(constituencies) {
  const container = document.getElementById('contest-cards');
  if (!container) return;

  // C1 (R8): sort by notable_order field (added to JSON) to restore the original
  // editorial sequence: Bhabanipur (CM contest) first, Nandigram second, etc.
  // Before this fix, filter() returned ACs in JSON array order (ascending ac_no),
  // making Bhabanipur 5th — burying the lead story. notable_order is a 1-based
  // integer; ACs without the field (unexpected) sort to the end via Infinity.
  const notable = (constituencies || [])
    .filter(c => c.is_notable)
    .sort((a, b) => (a.notable_order ?? Infinity) - (b.notable_order ?? Infinity));

  // Empty-state guard: if JSON has no is_notable entries, surface an explicit
  // message rather than rendering a blank section.
  if (!notable.length) {
    container.innerHTML = '<p style="color:var(--ink-faint);font-family:var(--font-mono);font-size:0.82rem">Notable contest data unavailable.</p>';
    return;
  }

  // #15: data-acno for event delegation — no inline onclick
  // C2 (R9): wCol/rCol computed only when the respective party field is non-null.
  // Previously partyColor(null) was called unconditionally for every notable AC,
  // triggering the A3 console.warn for every pending/undecided seat — noise with
  // no actionable signal. The template already conditional-renders the pills;
  // the colour computation must be equally conditional to avoid the spurious warn.
  // Gap-4 (R10): update the section subtitle with the actual notable count so it
  // never goes stale when JSON data changes. The element has id="table-section-sub"
  // (added in R10); if it is absent (older HTML), the querySelector silently no-ops.
  const subEl = document.getElementById('table-section-sub');
  if (subEl) {
    subEl.textContent = `${notable.length} key seat${notable.length === 1 ? '' : 's'} highlighted · Click any constituency name for full details · Full 294-seat data via Phase 2 expansion`;
  }

  container.innerHTML = notable.map(c => {
    const wCol = c.winner_party     ? partyColor(c.winner_party)     : '#888888';
    const rCol = c.runner_up_party  ? partyColor(c.runner_up_party)  : '#888888';
    return `
      <div class="contest-card" data-acno="${esc(String(c.ac_no))}">
        <div class="contest-card-header">
          <div>
            <div class="contest-ac-no">AC #${esc(String(c.ac_no))} \u00B7 ${esc(c.district)}</div>
            <div class="contest-ac-name">${esc(c.ac_name)}</div>
          </div>
          ${c.winner_party ? `<span class="party-pill" style="background:${esc(wCol)}">${esc(c.winner_party)}</span>` : '<span class="party-pill" style="background:var(--ink-faint)">Pending</span>'}
        </div>
        <div class="contest-card-body">
          <div class="contest-winner-row">
            <div class="contest-winner-name">${esc(c.winner || 'Pending')}</div>
          </div>
          <div class="contest-margin">${c.margin != null ? c.margin.toLocaleString() : '\u2014'}</div>
          ${c.margin != null ? '<div class="contest-margin-label">Margin of victory</div>' : ''}
          ${c.runner_up ? `
            <div class="contest-runner-row">
              ${c.runner_up_party ? `<span class="party-pill" style="background:${esc(rCol)};opacity:0.85">${esc(c.runner_up_party)}</span>` : ''}
              <span>${esc(c.runner_up)}</span>
              <span style="margin-left:auto">${c.runner_up_votes != null ? c.runner_up_votes.toLocaleString() : ''}</span>
            </div>
          ` : ''}
          ${c.note ? `<div class="contest-note">${esc(c.note)}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ── Modal ──────────────────────────────────────────────────
function showModal(acNo) {
  const c = (State.constituencies || []).find(x => x.ac_no === acNo);
  if (!c) return;

  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const subEl   = document.getElementById('modal-subtitle');
  const bodyEl  = document.getElementById('modal-body');
  if (!overlay || !titleEl || !subEl || !bodyEl) return;

  // Use textContent for title/subtitle — no HTML needed, fully safe
  titleEl.textContent = c.ac_name;
  // H4: c.reservation may be null for future entries — use ?? to avoid literal "null"
  subEl.textContent   = `AC #${c.ac_no} \u00B7 ${c.district} \u00B7 Phase ${c.phase} \u00B7 ${c.reservation ?? 'GEN'}`;

  if (c.is_repoll) {
    bodyEl.innerHTML = `
      <div style="text-align:center;padding:32px 0;">
        <div style="font-size:2rem;margin-bottom:12px">\u23F3</div>
        <div class="section-label">Repoll Pending</div>
        <div style="font-family:var(--font-display);font-size:1.2rem;margin:8px 0">${esc(c.note)}</div>
        <div style="color:var(--ink-faint);font-size:0.85rem;margin-top:8px">
          2021 winner: ${esc(c['2021_winner'] || '\u2014')} (${esc(c['2021_winner_party'] || '\u2014')})
        </div>
      </div>
    `;
  } else {
    // BK3 (R10): guard partyColor() for both winner and runner-up party fields.
    // The same fix was applied to renderNotableContests (R9 C2) and renderConstituencyTable
    // (R10 BK3) — the modal branch was the third unchecked call site. A non-repoll
    // entry with null winner_party (data not yet entered) would trigger the A3 warn.
    const wCol = c.winner_party    ? partyColor(c.winner_party)    : '#888888';
    const rCol = c.runner_up_party ? partyColor(c.runner_up_party) : '#888888';
    // B3 (R6): use total_votes from JSON when available — it is winner+runner_up+nota
    // (known votes only; does not include other-candidate votes when total_candidates > 2).
    // Fall back to inline sum if the field is absent.
    // B1 (R7): barIsPartial is ALWAYS true when total_candidates > 2 because total_votes
    // in the JSON is deliberately defined as the sum of only the known top-3 fields
    // (winner, runner_up, nota). Any "other" candidate votes are not stored, so the
    // bar never shows a true 100% denominator when more than 2 candidates stood.
    // B1 (R11): replaced || 0 with ?? 0 for all three vote-count fields. The || 0
    // form would coerce a genuine 0 correctly (0 || 0 === 0), but it also coerces
    // null → 0, making null indistinguishable from a real zero-vote count. ?? 0
    // preserves null semantics: null ?? 0 === 0, 0 ?? 0 === 0 (same result), but
    // the intent is explicit. This mirrors the BK2 (R10) fix applied to stat boxes;
    // that fix was described as covering "all numeric fields" but missed this site.
    const partialTotal = (c.winner_votes ?? 0) + (c.runner_up_votes ?? 0) + (c.nota_votes ?? 0);
    const total = c.total_votes != null ? c.total_votes : partialTotal;
    // B1 (R11): ?? 0 for consistency with BK2 pattern. || 0 and ?? 0 are identical
    // for a count field (0 is falsy, so both coerce null→0), but ?? makes the
    // intent clear: only null/undefined is replaced, not a genuine 0.
    const barIsPartial = (c.total_candidates ?? 0) > 2;
    // M1 (R5): always Numbers — toFixed() returns a string, so parse back to float.
    // Mixing string/number in width:${wPct}% is safe in browsers today but
    // any future arithmetic (e.g. wPct + rPct) would silently concatenate.
    // B1 (R11): guard both divisions against a null vote field. JS evaluates
    // null / total as 0 (null coerces to 0 in numeric context) — not NaN — so
    // the bar silently renders 0% width for a winner with a null vote count when
    // total_votes is present and > 0. The explicit null-check makes the fallback
    // intentional: a null count gets 0% width, which is correct because we have
    // no data to display.
    const wPct = (total && c.winner_votes    != null) ? parseFloat(((c.winner_votes    / total) * 100).toFixed(1)) : 0;
    // B2 (R8): compute rPct directly from runner_up_votes / total, not as a
    // remainder (100 - wPct - notaPct). The remainder formula was introduced in
    // R7 H2 to avoid ±0.1 rounding drift, but it silently absorbed all votes from
    // every candidate OTHER than the winner and NOTA into the runner-up bar — making
    // the runner-up bar visually inflated by every "other" candidate's share when
    // total_candidates > 2 (which is ALL 25 non-repoll seats). The grey flex:1 div
    // after the two named bars already absorbs any rounding gap, so independent
    // rounding is harmless and correctness is more important than pixel-perfect fit.
    const rPct = (total && c.runner_up_votes != null) ? parseFloat(((c.runner_up_votes / total) * 100).toFixed(1)) : 0;
    const genderLabel = c.winner_gender === 'F' ? 'Female' : c.winner_gender === 'M' ? 'Male' : (c.winner_gender != null ? esc(c.winner_gender) : '\u2014');
    // M3 (R6): null criminal cases must not coerce to 0 via > 0 comparison.
    // Use != null guard so crimColor is only set red when data is confirmed non-zero.
    const crimColor = (c.winner_criminal_cases != null && c.winner_criminal_cases > 0) ? 'var(--red-left)' : 'inherit';

    bodyEl.innerHTML = `
      <div class="modal-result-bar" style="margin-bottom:${barIsPartial ? '4px' : '20px'}">
        <div style="width:${wPct}%;background:${esc(wCol)}"></div>
        <div style="width:${rPct}%;background:${esc(rCol)};opacity:0.5"></div>
        <div style="flex:1;background:var(--border-light)"></div>
      </div>
      ${barIsPartial ? '<div style="font-size:0.75rem;color:var(--ink-faint);margin-bottom:16px;text-align:right">Bar shows top 2 candidates + NOTA only</div>' : ''}
      <div class="modal-fields">
        <div class="modal-section-head">2026 Result</div>

        <div class="modal-field">
          <div class="modal-field-label">Winner</div>
          <div class="modal-field-value large">${esc(c.winner)}</div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">Party</div>
          <div class="modal-field-value">
            <span class="party-pill" style="background:${esc(wCol)}">${esc(c.winner_party)}</span>
          </div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">Winner Votes</div>
          <div class="modal-field-value large">${c.winner_votes != null ? c.winner_votes.toLocaleString() : '\u2014'}</div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">Margin</div>
          <div class="modal-field-value large" style="color:var(--saffron)">${c.margin != null ? c.margin.toLocaleString() : '\u2014'}</div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">Runner-Up</div>
          <div class="modal-field-value">${esc(c.runner_up || '\u2014')}</div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">Runner-Up Party</div>
          <div class="modal-field-value">
            ${c.runner_up_party
              ? `<span class="party-pill" style="background:${esc(rCol)}">${esc(c.runner_up_party)}</span>`
              : '\u2014'}
          </div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">Runner-Up Votes</div>
          <div class="modal-field-value">${c.runner_up_votes != null ? c.runner_up_votes.toLocaleString() : '\u2014'}</div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">Turnout</div>
          <div class="modal-field-value">${c.turnout != null ? esc(String(c.turnout)) + '%' : '\u2014'}</div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">Total Candidates</div>
          <div class="modal-field-value">${c.total_candidates != null ? esc(String(c.total_candidates)) : '\u2014'}</div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">NOTA Votes</div>
          <div class="modal-field-value">${c.nota_votes != null ? c.nota_votes.toLocaleString() : '\u2014'}</div>
        </div>

        <div class="modal-section-head">Winner Profile (Affidavit)</div>

        <div class="modal-field">
          <div class="modal-field-label">Age</div>
          <div class="modal-field-value">${c.winner_age != null ? esc(String(c.winner_age)) : '\u2014'}</div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">Gender</div>
          <div class="modal-field-value">${genderLabel}</div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">Education</div>
          <div class="modal-field-value">${c.winner_education != null ? esc(c.winner_education) : '\u2014'}</div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">Profession</div>
          <div class="modal-field-value">${c.winner_profession != null ? esc(c.winner_profession) : '\u2014'}</div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">Declared Assets</div>
          <!-- H3 (R9): strip any leading ₹ from the JSON value before interpolating.
               The template already supplies the ₹ prefix; if the JSON value was
               accidentally entered as "₹1.5 Cr", the modal would show "₹₹1.5 Cr".
               String.replace(/^₹\s*/, '') is safe: it only affects the first char. -->
          <div class="modal-field-value large" style="color:var(--gold)">\u20B9${c.winner_assets != null ? esc(String(c.winner_assets).replace(/^\u20B9\s*/, '')) : '\u2014'}</div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">Liabilities</div>
          <div class="modal-field-value">\u20B9${c.winner_liabilities != null ? esc(String(c.winner_liabilities).replace(/^\u20B9\s*/, '')) : '\u2014'}</div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">Criminal Cases</div>
          <div class="modal-field-value" style="color:${crimColor}">
            ${esc(String(c.winner_criminal_cases ?? '\u2014'))}
            (${esc(String(c.winner_serious_cases ?? '\u2014'))} serious)
          </div>
        </div>

        <div class="modal-section-head">2021 Comparison</div>

        <div class="modal-field">
          <div class="modal-field-label">2021 Winner</div>
          <div class="modal-field-value">${esc(c['2021_winner'] || '\u2014')}</div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">2021 Party</div>
          <div class="modal-field-value">
            ${c['2021_winner_party']
              ? `<span class="party-pill" style="background:${esc(partyColor(c['2021_winner_party']))}">${esc(c['2021_winner_party'])}</span>`
              : '\u2014'}
          </div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">2021 Margin</div>
          <div class="modal-field-value">${c['2021_margin'] != null ? c['2021_margin'].toLocaleString() : '\u2014'}</div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">Swing</div>
          <div class="modal-field-value">${c.swing ? `<span class="swing-badge">${esc(c.swing)}</span>` : '\u2014'}</div>
        </div>

        ${c.note ? `<div class="modal-note">${esc(c.note)}</div>` : ''}
      </div>
    `;
  }

  const alreadyOpen = overlay.classList.contains('open');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // M5 / B5 (R5): only save the triggering element if the modal was CLOSED before
  // this call. If it was already open (e.g. rapid keyboard navigation between rows),
  // we update content but do not overwrite _modalLastFocus — that would restore focus
  // to the close button (inside the modal) instead of the original trigger element.
  if (!alreadyOpen) {
    _modalLastFocus = document.activeElement;
  }
  const closeBtn = document.getElementById('modal-close');
  if (closeBtn) closeBtn.focus();
}

// ── Modal focus management (M5: WCAG 2.1 §2.1.2 + §4.1.2) ─
// Tracks the element that triggered the modal so focus is returned on close.
let _modalLastFocus = null;

// Returns all keyboard-focusable elements inside `container`.
function focusableEls(container) {
  return Array.from(container.querySelectorAll(
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
    'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
  ));
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
  // M5: restore focus to the element that opened the modal
  if (_modalLastFocus) {
    _modalLastFocus.focus();
    _modalLastFocus = null;
  }
}

// ── Event Listeners ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init();

  // Modal close
  const overlay = document.getElementById('modal-overlay');
  const closeBtn = document.getElementById('modal-close');
  if (overlay) {
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  }
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => {
    const ov = document.getElementById('modal-overlay');
    const isOpen = ov && ov.classList.contains('open');

    if (e.key === 'Escape' && isOpen) { closeModal(); return; }

    // M5: Tab / Shift+Tab focus trap — keep keyboard focus inside the modal
    if (e.key === 'Tab' && isOpen) {
      const modal = ov.querySelector('.modal');
      if (!modal) return;
      const els = focusableEls(modal);
      if (!els.length) { e.preventDefault(); return; }
      const first = els[0];
      const last  = els[els.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    }
  });

  // #19: On orientation change, reset body overflow to the correct state for
  // the current modal visibility. This prevents the iOS bug where rotating
  // the device with the modal open leaves overflow locked after the modal is
  // subsequently closed, or leaves the modal scrolled off-screen.
  window.addEventListener('orientationchange', () => {
    const ov = document.getElementById('modal-overlay');
    if (ov && ov.classList.contains('open')) {
      // Modal is open: keep overflow hidden (re-affirm, in case iOS reset it)
      document.body.style.overflow = 'hidden';
    } else {
      // Modal is closed: ensure overflow is not stuck hidden
      document.body.style.overflow = '';
    }
  });

  // Search — debounced so rapid typing doesn't thrash the DOM
  // (200ms delay; negligible for current dataset, useful pre-Phase 2 expansion)
  const searchEl = document.getElementById('search-input');
  if (searchEl) {
    let searchTimer = null;
    searchEl.addEventListener('input', e => {
      clearTimeout(searchTimer);
      const val = e.target.value.trim();
      searchTimer = setTimeout(() => {
        State.searchTerm = val;
        applyFilters();
      }, 200);
    });
  }

  // Filters
  ['filter-party', 'filter-phase', 'filter-district'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', e => {
        if (id === 'filter-party')    State.filterParty    = e.target.value;
        if (id === 'filter-phase')    State.filterPhase    = e.target.value;
        if (id === 'filter-district') State.filterDistrict = e.target.value;
        applyFilters();
      });
    }
  });

  // Table sort — B3: guard with State.ready so a click before fetch completes
  // doesn't render a misleading "No constituencies match your filters." row.
  const thead = document.getElementById('table-head');
  if (thead) {
    thead.addEventListener('click', e => {
      if (!State.ready) return;
      const th = e.target.closest('th[data-col]');
      if (!th) return;
      const col = th.dataset.col;
      if (State.sortCol === col) {
        State.sortDir = State.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        State.sortCol = col;
        State.sortDir = 'asc';
      }
      sortFiltered();
      renderConstituencyTable();
    });
  }

  // #15: Event delegation for constituency table rows and contest cards
  // Table body — ac-name cells
  const tableBody = document.getElementById('table-body');
  if (tableBody) {
    tableBody.addEventListener('click', e => {
      if (!State.ready) return;   // B3: ignore clicks before data is loaded
      const td = e.target.closest('td.ac-name[data-acno]');
      if (!td) return;
      const acNo = parseInt(td.dataset.acno, 10);
      if (!isNaN(acNo)) showModal(acNo);
    });
  }

  // Contest cards
  const contestContainer = document.getElementById('contest-cards');
  if (contestContainer) {
    contestContainer.addEventListener('click', e => {
      if (!State.ready) return;   // B3: ignore clicks before data is loaded
      const card = e.target.closest('.contest-card[data-acno]');
      if (!card) return;
      const acNo = parseInt(card.dataset.acno, 10);
      if (!isNaN(acNo)) showModal(acNo);
    });
  }
});
