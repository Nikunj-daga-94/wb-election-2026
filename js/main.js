/* ============================================================
   WB ELECTION 2026 — Main JS (vanilla, zero dependencies)
   Full changelog: see CHANGELOG.md
   ============================================================ */

'use strict';

// ── XSS escape helper ─────────────────────────────────
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
  ready: false,
};

// ── Party colour map ───────────────────────────────────────
const PARTY_COLORS = {
  BJP:      '#FF6B00',
  AITC:     '#00843D',
  INC:      '#19AAED',
  'CPI(M)': '#CC0000',
  AISF:     '#7B3FA0',   // Indian Secular Front (purple — distinct from AITC green)
  AJUP:     '#8B4513',
  BGPM:     '#0D7377',   // Bharatiya Gorkha Prajatantrik Morcha (hill constituencies)
  AIFB:     '#8B0000',   // All India Forward Bloc
  CPI:      '#9B1B30',
  OTH:      '#888888',
};

function partyColor(code) {
  if (code != null && !(code in PARTY_COLORS)) {
    console.warn(`partyColor: unknown party code "${code}" — add to PARTY_COLORS`);
  }
  return PARTY_COLORS[code] || '#888888';
}

// ── Fetch helpers ──────────────────────────────────────────
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
// Wraps each render call so one failure doesn't abort subsequent renders.
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
    State.constituencies = cons.constituencies || [];
    State.filtered = [...State.constituencies];

    safeRender('renderMajorityMark',       () => renderMajorityMark(pr));
    safeRender('renderHeroTurnout',        () => renderHeroTurnout(pr));
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
    safeRender('populateFilterDropdowns',  () => populateFilterDropdowns(State.constituencies, pr.metadata));
    safeRender('renderConstituencyTable',  () => renderConstituencyTable());
    State.ready = true;
  } catch (err) {
    console.error('Init error:', err);
    showGlobalError(err.message);
  }
}

function showGlobalError(msg) {
  const el = document.getElementById('global-error');
  if (el) { el.textContent = `Data load error: ${msg}`; el.style.display = 'block'; }
}

// ── Majority mark helper ───────────────────────────
// Single source of truth for the majority mark computation.
// Prefers the explicit metadata.majority_mark field; falls back to the
// strict-majority formula only when the field is absent (e.g. old JSON).
function getMajorityMark(pr) {
  const meta = (pr && pr.metadata) || {};
  return meta.majority_mark != null
    ? meta.majority_mark
    : Math.floor((meta.total_seats || 294) / 2) + 1;
}

// ── Majority mark render ─────────────────────
// Reads majority_mark directly from metadata — single source of truth.
// The HTML static "148" remains correct if JS never runs.
function renderMajorityMark(pr) {
  const majorityMark = getMajorityMark(pr);
  const heroEl   = document.getElementById('hero-majority-val');
  const tickerEl = document.getElementById('ticker-majority-val');
  if (heroEl)   heroEl.textContent   = majorityMark;
  if (tickerEl) tickerEl.textContent = majorityMark;
}

// ── Hero turnout render ─────────────────────────────────────
// Reads statewide_turnout from metadata — single source of truth.
// The HTML static "92.93%" remains correct if JS never runs.
function renderHeroTurnout(pr) {
  const meta = (pr && pr.metadata) || {};
  if (meta.statewide_turnout == null) return;
  const el = document.getElementById('hero-turnout-val');
  if (el) el.textContent = meta.statewide_turnout + '%';
}

// ── Declared count ─────────────────────────────────
function renderDeclaredCount(pr) {
  const el = document.getElementById('ticker-declared');
  if (!el) return;
  const meta = pr.metadata || {};
  const totalSeats = meta.total_seats || 294;
  const results2026 = (pr.results && Array.isArray(pr.results['2026'])) ? pr.results['2026'] : [];
  // Dedup by party code before summing (guards against duplicate JSON entries)
  const seenParties = new Map();
  results2026.forEach(p => { if (p.party) seenParties.set(p.party, p); });
  const declared = [...seenParties.values()].reduce((sum, p) => sum + (p.seats ?? 0), 0);
  el.textContent = `${declared} / ${totalSeats} declared`;
}

// ── Falta banner ───────────────────────────────────
// Driven from metadata.falta_repoll; static HTML is the no-JS fallback.
function renderFaltaBanner(pr) {
  const bannerEl = document.getElementById('falta-banner');
  const textEl   = document.getElementById('falta-banner-text');
  const fr = pr && pr.metadata && pr.metadata.falta_repoll;
  if (!fr) { if (bannerEl) bannerEl.style.display = 'none'; return; }
  if (!textEl) { if (bannerEl) bannerEl.style.display = 'none'; return; }
  const reason = fr.reason || 'EVM tampering allegations';
  const fmtDate = iso => {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');   // force local midnight to avoid off-by-one from TZ
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const repollDate = fmtDate(fr.repoll_date);
  const resultDate = fmtDate(fr.result_date);
  // If result is already final, suppress the pending notice.
  if (fr.result_final) {
    if (bannerEl) bannerEl.style.display = 'none';
    return;
  }
  textEl.textContent = `Repoll on ${repollDate} due to ${reason}. Result on ${resultDate}. All totals exclude this seat.`;
}

// ── Data quality notice ─────────────────────────────
function renderDataQualityNotice(constituencies, pr) {
  const el = document.getElementById('data-quality-notice');
  if (!el) return;
  const metadata = (pr && pr.metadata) || {};
  const loaded = (constituencies || []).length;
  const total  = (metadata && metadata.total_seats) || 294;
  const districtArr = pr && Array.isArray(pr.district_results_2026) ? pr.district_results_2026 : null;
  const districtClause = districtArr ? ` All ${districtArr.length} district totals are complete.` : '';
  if (loaded >= total) {
    const pendingRepoll = (constituencies || []).filter(c => c.is_repoll && !c.result_final);
    const repollClause = pendingRepoll.length
      ? ` (excludes ${pendingRepoll.length} repoll seat${pendingRepoll.length > 1 ? 's' : ''} pending)`
      : '';
    el.textContent = `All ${loaded} constituencies loaded${repollClause}.${districtClause}`;
  } else {
    el.textContent = `Showing ${loaded} of ${total} constituencies — full dataset in progress.${districtClause}`;
  }
}

// ── Score Ticker ───────────────────────────────────────────
function renderScoreTicker(pr) {
  const container = document.getElementById('ticker-cards');
  if (!container) return;

  const results2026 = (pr.results && Array.isArray(pr.results['2026'])) ? pr.results['2026'] : [];
  if (!results2026.length) {
    container.innerHTML = '<span class="ticker-vs" style="padding:0 12px;color:var(--ink-faint)">Standings unavailable</span>';
    return;
  }

  const html = results2026
    .filter(p => p.seats > 0 || Number(p.vote_share_pct) > 0)
    .map(p => {
      const col = partyColor(p.party);
      const govtBadge = p.government ? '<span class="ticker-govt-badge">Govt</span>' : '';
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

  const parties = ['BJP', 'AITC', 'INC', 'CPI(M)', 'AJUP', 'AISF'];
  const w = 340, rowH = 32, padTop = 10, padLeft = 64, barMaxW = 170;
  const totalH = parties.length * rowH + padTop + 24;

  svg.setAttribute('viewBox', `0 0 ${w} ${totalH}`);
  svg.setAttribute('width', '100%');

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

  // Majority line — uses getMajorityMark() helper (single source of truth).
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
function renderVoteShareDonut(pr) {
  const svg = document.getElementById('donut-svg');
  if (!svg) return;

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
  const turnout = (pr.metadata && pr.metadata.statewide_turnout) ?? 92.93;
  paths += `
    <text x="${cx}" y="${cy - 7}" text-anchor="middle" class="donut-center-val">${turnout}%</text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle" class="donut-center-label">TURNOUT</text>
  `;

  svg.setAttribute('viewBox', '0 0 180 180');
  svg.setAttribute('width', '100%');
  svg.innerHTML = paths;

  // Legend
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
  const parties = ['BJP', 'AITC', 'INC', 'CPI(M)', 'AJUP', 'AISF'];
  const w = 340, h = 180, padL = 36, padR = 20, padT = 12, padB = 28;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const yearArr = yr => (pr.results && Array.isArray(pr.results[yr])) ? pr.results[yr] : [];
  const allTrendSeats = parties.flatMap(p =>
    years.map(yr => {
      const row = yearArr(yr).find(r => r.party === p);
      return row ? (row.seats ?? 0) : 0;
    })
  );
  const dataPeak = Math.max(...allTrendSeats, 1);
  const maxSeats = Math.ceil(dataPeak / 50) * 50;

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

  // Lines & dots
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

    // <title> as CHILD of <circle>, not a sibling
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

  // Swing summary
  const swingEl = document.getElementById('swing-summary');
  if (swingEl && swings) {
    const uniqueSwings = [...new Map(swings.map(s => [s.party, s])).values()];
    swingEl.innerHTML = uniqueSwings.map(s => {
      const seatsDelta = s.seats_delta != null ? s.seats_delta : null;
      const vsDelta    = s.vote_share_delta != null ? s.vote_share_delta : null;
      const seatsStr = seatsDelta != null ? (seatsDelta > 0 ? '+' : '') + seatsDelta : '\u2014';
      const vsStr    = vsDelta != null ? (vsDelta > 0 ? '+' : '') + vsDelta.toFixed(2) : '\u2014';
      const col = partyColor(s.party);
      // Mixed-signal colour: neutral when seats/vote-share disagree on direction
      const seatsDir = seatsDelta == null ? 0 : Math.sign(seatsDelta);
      const vsDir    = vsDelta    == null ? 0 : Math.sign(vsDelta);
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
  if (phaseEl && metadata) {
    const phaseKeys = Object.keys(metadata)
      .filter(k => /^phase_\d+$/.test(k))
      .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));

    const phaseOpts = phaseKeys.map(k => {
      const num  = k.split('_')[1];
      const info = metadata[k];
      let dateStr = '';
      if (info && info.date) {
        const d = new Date(info.date + 'T00:00:00');
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
  const data = Array.isArray(State.constituencies) ? State.constituencies : [];
  const term = State.searchTerm.toLowerCase();

  State.filtered = data.filter(c => {
    if (term) {
      const hay = [c.ac_no, c.ac_name, c.winner, c.district, c.winner_party]
        .map(v => (v == null || v === 'null') ? '' : String(v).toLowerCase())
        .join(' ');
      if (!hay.includes(term)) return false;
    }
    if (State.filterParty    && !c.is_repoll && c.winner_party        !== State.filterParty)    return false;
    if (State.filterPhase    && String(c.phase)                       !== State.filterPhase)    return false;
    if (State.filterDistrict && c.district                            !== State.filterDistrict) return false;
    return true;
  });

  sortFiltered();
  renderConstituencyTable();
}

function sortFiltered() {
  const col = State.sortCol;
  const dir = State.sortDir === 'asc' ? 1 : -1;

  State.filtered.sort((a, b) => {
    let va = a[col];
    let vb = b[col];

    // nulls sort last
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
    tbody.innerHTML = '<tr><td colspan="6" class="no-results">No constituencies match your filters.</td></tr>';
    if (countEl) {
      const total = (State.constituencies || []).length;
      countEl.textContent = `0 of ${total} ${total === 1 ? 'constituency' : 'constituencies'}`;
    }
    return;
  }

  tbody.innerHTML = State.filtered.map(c => {
    if (c.is_repoll) {
      return `
        <tr>
          <td class="mono" style="color:var(--ink-faint)">${esc(String(c.ac_no))}</td>
          <td class="ac-name" data-acno="${esc(String(c.ac_no))}">${esc(c.ac_name)}</td>
          <td style="color:var(--ink-faint);font-size:0.82rem">${esc(c.district)}</td>
          <td><span class="repoll-badge">REPOLL PENDING</span></td>
          <td colspan="2" style="color:var(--ink-faint);font-size:0.8rem;font-style:italic">${esc(c.note || '')}</td>
        </tr>
      `;
    }
    const col = c.winner_party ? partyColor(c.winner_party) : '#888888';
    return `
      <tr>
        <td class="mono" style="color:var(--ink-faint)">${esc(String(c.ac_no))}</td>
        <td class="ac-name" data-acno="${esc(String(c.ac_no))}">${esc(c.ac_name)}</td>
        <td style="color:var(--ink-faint);font-size:0.82rem">${esc(c.district)}</td>
        <td>${c.winner ? `<span style="font-weight:500">${esc(c.winner)}</span>` : '\u2014'}</td>
        <td><span class="party-pill" style="background:${esc(col)}">${esc(c.winner_party || '\u2014')}</span></td>
        <td class="margin-num">${c.margin != null ? c.margin.toLocaleString() : '\u2014'}</td>
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

  if (!Array.isArray(districts) || !districts.length) {
    container.innerHTML = '<p style="color:var(--ink-faint);font-family:var(--font-mono);font-size:0.82rem">District data unavailable.</p>';
    return;
  }

  container.innerHTML = districts.map(d => {
    const partyEntries = Object.entries(d)
      .filter(([k, v]) => !['district', 'total_seats', '_note'].includes(k)
                          && !k.startsWith('_')
                          && typeof v === 'number' && v > 0)
      .sort((a, b) => b[1] - a[1]);

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
function renderNotableContests(constituencies) {
  const container = document.getElementById('contest-cards');
  if (!container) return;

  const notable = (constituencies || [])
    .filter(c => c.is_notable)
    .sort((a, b) => (a.notable_order ?? Infinity) - (b.notable_order ?? Infinity));

  if (!notable.length) {
    container.innerHTML = '<p style="color:var(--ink-faint);font-family:var(--font-mono);font-size:0.82rem">Notable contest data unavailable.</p>';
    return;
  }

  // Update the Notable Contests section subtitle with actual notable count
  const subEl = document.getElementById('notable-section-sub');
  if (subEl) {
    subEl.textContent = `${notable.length} key seat${notable.length === 1 ? '' : 's'} highlighted \u00B7 Click any constituency name for full details`;
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

  titleEl.textContent = c.ac_name;
  subEl.textContent   = `AC #${c.ac_no} \u00B7 ${c.district} \u00B7 Phase ${c.phase} \u00B7 ${c.reservation ?? 'GEN'}`;

  if (c.is_repoll) {
    bodyEl.innerHTML = `
      <div style="text-align:center;padding:32px 0;">
        <div style="font-size:2rem;margin-bottom:12px">\u23F3</div>
        <div class="section-label">Repoll Pending</div>
        <div style="font-family:var(--font-display);font-size:1.2rem;margin:8px 0">${esc(c.note)}</div>
        ${c['2021_winner'] ? `<div style="color:var(--ink-faint);font-size:0.85rem;margin-top:8px">
          2021 winner: ${esc(c['2021_winner'])} (${esc(c['2021_winner_party'] || '\u2014')})
        </div>` : ''}
      </div>
    `;
  } else {
    const wCol = c.winner_party    ? partyColor(c.winner_party)    : '#888888';
    const rCol = c.runner_up_party ? partyColor(c.runner_up_party) : '#888888';
    const partialTotal = (c.winner_votes ?? 0) + (c.runner_up_votes ?? 0) + (c.nota_votes ?? 0);
    const total = c.total_votes != null ? c.total_votes : partialTotal;
    const barIsPartial = (c.total_votes == null) && (c.total_candidates ?? 0) > 2;
    const wPct = (total && c.winner_votes    != null) ? parseFloat(((c.winner_votes    / total) * 100).toFixed(1)) : 0;
    const rPct = (total && c.runner_up_votes != null) ? parseFloat(((c.runner_up_votes / total) * 100).toFixed(1)) : 0;
    const hasAffidavit = [c.winner_age, c.winner_gender, c.winner_education,
      c.winner_profession, c.winner_assets, c.winner_liabilities,
      c.winner_criminal_cases].some(v => v != null);
    const genderLabel = hasAffidavit
      ? (c.winner_gender === 'F' ? 'Female' : c.winner_gender === 'M' ? 'Male' : (c.winner_gender != null ? esc(c.winner_gender) : '\u2014'))
      : '';
    const crimColor = hasAffidavit
      ? ((c.winner_criminal_cases != null && c.winner_criminal_cases > 0) ? 'var(--red-left)' : 'inherit')
      : 'inherit';

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
        ${c.turnout != null ? `<div class="modal-field">
          <div class="modal-field-label">Turnout</div>
          <div class="modal-field-value">${esc(String(c.turnout))}%</div>
        </div>` : ''}
        <div class="modal-field">
          <div class="modal-field-label">Total Candidates</div>
          <div class="modal-field-value">${c.total_candidates != null ? esc(String(c.total_candidates)) : '\u2014'}</div>
        </div>
        <div class="modal-field">
          <div class="modal-field-label">NOTA Votes</div>
          <div class="modal-field-value">${c.nota_votes != null ? c.nota_votes.toLocaleString() : '\u2014'}</div>
        </div>

        ${/* Winner Profile — only rendered when at least one affidavit field is present */
          hasAffidavit
          ? `
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
        </div>` : ''}

        ${/* 2021 Comparison — only rendered when at least one historical field is present */
          [c['2021_winner'], c['2021_winner_party'], c['2021_margin'], c.swing].some(v => v != null)
          ? `
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
        </div>` : ''}

        ${c.note ? `<div class="modal-note">${esc(c.note)}</div>` : ''}
      </div>
    `;
  }

  const alreadyOpen = overlay.classList.contains('open');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  if (!alreadyOpen) {
    _modalLastFocus = document.activeElement;
  }
  const closeBtn = document.getElementById('modal-close');
  if (closeBtn) closeBtn.focus();
}

// ── Modal focus management ─────────────────────────────────
let _modalLastFocus = null;

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

    // Focus trap
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

  window.addEventListener('orientationchange', () => {
    const ov = document.getElementById('modal-overlay');
    if (ov && ov.classList.contains('open')) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });

  // Search (debounced)
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

  // Table sort
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

  // Table row / contest card clicks → modal
  const tableBody = document.getElementById('table-body');
  if (tableBody) {
    tableBody.addEventListener('click', e => {
      if (!State.ready) return;   // ignore clicks before data is loaded
      const td = e.target.closest('td.ac-name[data-acno]');
      if (!td) return;
      const acNo = parseInt(td.dataset.acno, 10);
      if (!isNaN(acNo)) showModal(acNo);
    });
  }

  const contestContainer = document.getElementById('contest-cards');
  if (contestContainer) {
    contestContainer.addEventListener('click', e => {
      if (!State.ready) return;   // ignore clicks before data is loaded
      const card = e.target.closest('.contest-card[data-acno]');
      if (!card) return;
      const acNo = parseInt(card.dataset.acno, 10);
      if (!isNaN(acNo)) showModal(acNo);
    });
  }
});
