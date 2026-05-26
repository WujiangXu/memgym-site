/* MemGym project page — vanilla JS.
 *
 * NOTE: fetch('data/leaderboard.json') only works over HTTP, not file://.
 *       Preview locally with `python -m http.server 8000` (see README).
 */

const TRACK_ORDER = ['tau2', 'webarena', 'swe', 'codeqa', 'dr'];

const COLS = [
  { key: 'method',     label: 'Method',  cls: '' },
  { key: 'base_model', label: 'Model',   cls: '' },
  { key: 'n',          label: 'N',       cls: 'num' },
  { key: 'score',      label: 'Score',   cls: 'score' },
  { key: 'delta',      label: 'Δ',       cls: 'delta' },
  { key: 'notes',      label: 'Notes',   cls: 'notes' },
];

document.addEventListener('DOMContentLoaded', () => {
  setupBibtexDialog();
  setupInlineCopy();
  loadLeaderboard();
});

/* ──────────────────────── leaderboard ──────────────────────── */
async function loadLeaderboard() {
  const container = document.getElementById('lb-container');
  const tabs = document.getElementById('lb-tabs');
  const meta = document.getElementById('lb-meta');
  if (!container) return;

  try {
    const res = await fetch('data/leaderboard.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderLeaderboard(data, container, tabs, meta);
    renderDomainCards(data);
  } catch (err) {
    console.warn('[leaderboard] fetch failed:', err);
    container.innerHTML = `
      <div class="lb-error">
        <strong>Could not load leaderboard.</strong><br>
        If you opened this page with <code>file://</code>, the browser blocks
        <code>fetch</code> on local files. Start a local server instead:
        <pre><code>python -m http.server 8000</code></pre>
        Then visit <code>http://localhost:8000</code>.
      </div>`;
  }
}

function renderLeaderboard(data, container, tabs, meta) {
  const labels = data.meta?.track_labels ?? {};
  const descs  = data.meta?.track_descriptions ?? {};

  // group by track
  const groups = {};
  for (const e of data.entries) (groups[e.track] ??= []).push(e);

  // sort each group: non-baseline by score desc, then baseline rows at tail
  for (const t of Object.keys(groups)) {
    groups[t].sort((a, b) => {
      if (a.is_baseline !== b.is_baseline) return a.is_baseline ? 1 : -1;
      return (b.score ?? -Infinity) - (a.score ?? -Infinity);
    });
  }

  // tabs
  tabs.innerHTML = '';
  for (const t of TRACK_ORDER) {
    if (!groups[t]?.length) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lb-tab';
    btn.textContent = labels[t] ?? t;
    btn.addEventListener('click', () => {
      document.getElementById(`lb-group-${t}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    tabs.appendChild(btn);
  }

  // tables
  container.innerHTML = '';
  for (const t of TRACK_ORDER) {
    const rows = groups[t];
    if (!rows?.length) continue;

    const wrap = document.createElement('div');
    wrap.className = 'lb-group';
    wrap.id = `lb-group-${t}`;

    const h3 = document.createElement('h3');
    h3.innerHTML = `${labels[t] ?? t} <span class="lb-track-label">${t}</span>`;
    wrap.appendChild(h3);

    if (descs[t]) {
      const p = document.createElement('p');
      p.className = 'lb-desc';
      p.textContent = descs[t];
      wrap.appendChild(p);
    }

    const tableWrap = document.createElement('div');
    tableWrap.className = 'lb-table-wrap';
    tableWrap.appendChild(buildTable(rows));
    wrap.appendChild(tableWrap);

    container.appendChild(wrap);
  }

  if (meta && data.meta?.last_updated) {
    meta.textContent = `Last updated: ${data.meta.last_updated}.  ` +
      `Add a row by editing data/leaderboard.json on GitHub.`;
  }
}

/* ──────────────────────── domain cards ──────────────────────── */
function renderDomainCards(data) {
  const host = document.getElementById('domain-cards');
  if (!host) return;

  const labels = data.meta?.track_labels ?? {};
  const tracks = data.meta?.tracks ?? {};

  // group entries by track (same shape the leaderboard uses)
  const groups = {};
  for (const e of data.entries) (groups[e.track] ??= []).push(e);

  host.innerHTML = '';
  for (const t of TRACK_ORDER) {
    const rows = groups[t];
    const tmeta = tracks[t];
    if (!rows?.length || !tmeta) continue;

    // best memory strategy = highest-scoring non-baseline row; pair it with the no-memory baseline
    const candidates = rows.filter(r => !r.is_baseline);
    if (!candidates.length) continue;
    const best = candidates.reduce((a, b) => (b.score > a.score ? b : a));
    const base = rows.find(r => r.is_baseline);
    const units = best.score_units ?? '';

    const card = document.createElement('article');
    card.className = 'domain-card';
    card.innerHTML = `
      <span class="regime-tag">${escapeHtml(tmeta.regime ?? '')}</span>
      <h3 class="card-title">${escapeHtml(labels[t] ?? t)}</h3>
      <p class="card-n">${(best.n ?? 0).toLocaleString()} tasks</p>
      <div class="card-headline">
        <span class="num">${escapeHtml(tmeta.headline ?? '')}</span>
        <span class="num-label">${escapeHtml(tmeta.headline_label ?? '')}</span>
      </div>
      <p class="card-desc">${escapeHtml(tmeta.blurb ?? '')}</p>
      ${scoreBar(best, base, units)}`;
    host.appendChild(card);
  }
}

function scoreBar(best, base, units) {
  const scale = units === '%' ? 100 : 1;            // % tracks fill /100, acc/judge fill /1
  const pct = (v) => Math.max(0, Math.min(100, (v / scale) * 100));

  const rows = [{
    name: best.method, cls: 'best',
    w: pct(best.score), val: fmtCardVal(best.score, units),
  }];
  if (base && base.score != null) {
    rows.push({
      name: 'None', cls: 'baseline',
      w: pct(base.score), val: fmtCardVal(base.score, units),
    });
  }

  const bars = rows.map(r => `
      <div class="bar-row">
        <span class="bar-name" title="${escapeHtml(r.name)}">${escapeHtml(r.name)}</span>
        <span class="bar-track"><span class="bar-fill ${r.cls}" style="width:${r.w.toFixed(1)}%"></span></span>
        <span class="bar-val">${r.val}</span>
      </div>`).join('');
  return `<div class="score-bar">${bars}</div>`;
}

function fmtCardVal(score, units) {
  if (score == null) return '—';
  if (units === '%') return `${score.toFixed(1)}%`;
  return Math.abs(score) < 0.1 ? score.toFixed(3) : score.toFixed(2);
}

function buildTable(rows) {
  const table = document.createElement('table');
  table.className = 'lb-table';

  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  for (const c of COLS) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = c.label;
    trh.appendChild(th);
  }
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const row of rows) {
    const tr = document.createElement('tr');
    if (row.is_baseline) tr.className = 'baseline-row';
    for (const c of COLS) {
      const td = document.createElement('td');
      td.className = c.cls;
      td.innerHTML = renderCell(c.key, row);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}

function renderCell(key, row) {
  const v = row[key];
  if (key === 'score') return formatScore(row);
  if (key === 'delta') return formatDelta(row);
  if (key === 'n')     return v == null ? '—' : v.toLocaleString();
  if (v == null || v === '') return '—';
  return escapeHtml(String(v));
}

function formatScore(row) {
  if (row.score == null) return '—';
  const units = row.score_units ?? '';
  if (units === '%')  return `${row.score.toFixed(1)} <span class="muted">%</span>`;
  if (units === 'pp') return `${row.score.toFixed(1)} <span class="muted">pp</span>`;
  // generic small-number metrics: 3 decimals
  return Number.isInteger(row.score) ? `${row.score}` : row.score.toFixed(3);
}

function formatDelta(row) {
  if (row.is_baseline) return '—';
  if (row.delta == null) return '—';
  const d = row.delta;
  const cls = d > 0 ? 'delta-pos' : d < 0 ? 'delta-neg' : 'delta-zero';
  const unit = row.score_units === '%' ? 'pp' : '';
  const sign = d > 0 ? '+' : '';
  const txt  = Math.abs(d) >= 1 ? d.toFixed(1) : d.toFixed(3);
  return `<span class="${cls}">${sign}${txt}${unit ? ' ' + unit : ''}</span>`;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ──────────────────────── BibTeX modal ──────────────────────── */
function setupBibtexDialog() {
  const dialog = document.getElementById('bibtex-dialog');
  const openBtn = document.getElementById('open-bibtex');
  const closeBtn = document.getElementById('bibtex-close');
  const copyBtn = document.getElementById('bibtex-copy');
  const pre = document.getElementById('bibtex-content');
  if (!dialog || !openBtn) return;

  openBtn.addEventListener('click', () => dialog.showModal());
  closeBtn?.addEventListener('click', () => dialog.close());

  // click-outside-to-close
  dialog.addEventListener('click', (e) => {
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right ||
        e.clientY < r.top  || e.clientY > r.bottom) {
      dialog.close();
    }
  });

  copyBtn?.addEventListener('click', () => copyText(copyBtn, pre.textContent.trim()));
}

function setupInlineCopy() {
  const btn = document.getElementById('copy-bibtex-inline');
  const pre = document.getElementById('bibtex-inline');
  if (!btn || !pre) return;
  btn.addEventListener('click', () => copyText(btn, pre.textContent.trim()));
}

function copyText(btn, text) {
  const restore = btn.textContent;
  const flash = (msg) => {
    btn.textContent = msg;
    setTimeout(() => { btn.textContent = restore; }, 1800);
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text)
      .then(() => flash('Copied!'))
      .catch(() => flash('Copy failed'));
  } else {
    // fallback for non-secure contexts
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); flash('Copied!'); }
    catch { flash('Copy failed'); }
    finally { document.body.removeChild(ta); }
  }
}
