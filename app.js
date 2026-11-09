/* The Daily Dle — scoreboard for a crew of daily-puzzle people. No build step, no framework. */
(() => {
'use strict';

/* ───────────────────────── tiny helpers ───────────────────────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const r1 = (x) => Math.round(x * 10) / 10;
const fmtPts = (x) => (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, '');
const num = (x) => Number(x).toLocaleString('en-US');
const pad = (n) => String(n).padStart(2, '0');
const fmtTime = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`; };
const uid = () => 'p' + Math.random().toString(36).slice(2, 9);
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dayKey(d); };
const toArr = (x) => Array.isArray(x) ? x : x && typeof x === 'object' ? Object.keys(x).sort((a, b) => a - b).map((k) => x[k]) : [];
const ordinal = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');

const I = {
  out: '<svg viewBox="0 0 24 24" class="i"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  crown: '<svg viewBox="0 0 24 24" class="i"><path d="M3 8.5 7.5 12 12 5l4.5 7L21 8.5 19 19H5Z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  paste: '<svg viewBox="0 0 24 24" class="i"><rect x="5" y="4" width="14" height="17" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M9 4.5V3h6v1.5M9 11h6M9 15h4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  flame: '<svg viewBox="0 0 24 24" class="i"><path d="M12 22c4 0 7-2.7 7-6.8 0-4.4-3.6-6.4-4.2-10.2-2.3 1.4-3.5 3.6-3.4 6-1.3-.6-2.2-1.9-2.4-3.4C7 9.3 5 11.7 5 15.2 5 19.3 8 22 12 22Z" fill="currentColor"/></svg>',
  check: '<svg viewBox="0 0 24 24" class="i"><path d="m5 12.5 4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  warn: '<svg viewBox="0 0 24 24" class="i"><path d="M12 3 22 20H2Z" fill="currentColor"/><path d="M12 9.5v4.5M12 16.8v.2" stroke="var(--paper-2)" stroke-width="2.4" stroke-linecap="round"/></svg>',
  left: '<svg viewBox="0 0 24 24" class="i"><path d="m15 5-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  right: '<svg viewBox="0 0 24 24" class="i"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  plus: '<svg viewBox="0 0 24 24" class="i"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>',
  x: '<svg viewBox="0 0 24 24" class="i"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>',
};

/* ───────────────────────── scoring ───────────────────────── */
/* Every game is worth up to 10 points. `curve` maps "lower is better" results onto 10 → 1. */
const curve = (x, best, worst) => {
  if (worst <= best) return x <= best ? 10 : 1;
  if (x <= best) return 10;
  if (x >= worst) return 1;
  return 10 - 9 * (x - best) / (worst - best);
};
const nounFor = (noun, n) => (n === 1 ? noun.replace(/s$/, '') : noun);

const KINDS = {
  guesses: {
    label: 'Limited guesses', defaults: { max: 6 },
    fields: [['max', 'Max guesses']],
    summary: (p) => `Fewest guesses · /${p.max}`,
    rule: (p) => `1 guess = 10 · ${p.max} guesses = 1 · fail = 0`,
    fmt: (e, p) => (e.f ? `X/${p.max}` : `${e.v}/${p.max}`),
    pts: (e, p) => (e.f ? 0 : curve(+e.v, 1, +p.max)),
    valid: (e) => e.f || e.v >= 1,
  },
  open: {
    label: 'Open guesses', defaults: { par: 3, cap: 20 },
    fields: [['par', 'Par (10 pts at or under)'], ['cap', 'Cap (1 pt at or over)']],
    summary: (p) => `Fewest guesses · par ${p.par}`,
    rule: (p) => `≤${p.par} guesses = 10 · ${p.cap}+ = 1 · gave up = 0`,
    fmt: (e) => (e.f ? 'Gave up' : `${e.v} ${e.v == 1 ? 'guess' : 'guesses'}`),
    pts: (e, p) => (e.f ? 0 : curve(+e.v, +p.par, +p.cap)),
    valid: (e) => e.f || e.v >= 1,
  },
  count: {
    label: 'Fewer is better', defaults: { max: 4, noun: 'mistakes', fail: 1 },
    fields: [['max', 'Max (1 pt at this many)'], ['noun', 'Counting what', 'text'], ['fail', 'Can you fail?', 'select', [['1', 'Yes'], ['0', 'No']]]],
    summary: (p) => `Fewest ${p.noun}`,
    rule: (p) => `0 ${p.noun} = 10 · ${p.max} = 1${+p.fail ? ' · failed = 0' : ''}`,
    fmt: (e, p) => (e.f ? 'Failed' : `${e.v} ${nounFor(p.noun, +e.v)}`),
    pts: (e, p) => (e.f ? 0 : curve(+e.v, 0, +p.max)),
    valid: (e) => e.f || e.v >= 0,
  },
  time: {
    label: 'Fastest time', defaults: { gold: 60, cap: 600 },
    fields: [['gold', 'Gold time, seconds (10 pts)'], ['cap', 'Slow cap, seconds (1 pt)']],
    summary: (p) => `Fastest · gold ${fmtTime(p.gold)}`,
    rule: (p) => `≤${fmtTime(p.gold)} = 10 · ${fmtTime(p.cap)}+ = 1 · DNF = 0`,
    fmt: (e) => (e.f ? 'DNF' : fmtTime(e.v)),
    pts: (e, p) => (e.f ? 0 : curve(+e.v, +p.gold, +p.cap)),
    valid: (e) => e.f || e.v > 0,
  },
  score: {
    label: 'Score out of max', defaults: { max: 100, noun: 'pts' },
    fields: [['max', 'Perfect score'], ['noun', 'Unit', 'text']],
    summary: (p) => `Highest score · /${num(p.max)}`,
    rule: (p) => `Share of ${num(p.max)} × 10`,
    fmt: (e, p) => (e.f ? '—' : `${num(e.v)}${p.noun === '%' ? '%' : ' ' + p.noun}`),
    pts: (e, p) => (e.f ? 0 : clamp((10 * +e.v) / +p.max, 0, 10)),
    valid: (e) => e.f || e.v >= 0,
  },
  relative: {
    label: 'Versus the crew', defaults: { noun: 'pts', dir: 'high' },
    fields: [['noun', 'Unit', 'text'], ['dir', 'Better is', 'select', [['high', 'Higher'], ['low', 'Lower']]]],
    summary: (p) => (p.dir === 'low' ? 'Lowest wins · vs crew' : 'Highest wins · vs crew'),
    rule: (p) => (p.dir === 'low' ? 'Best of the day = 10 · rest scaled by best ÷ yours' : 'Best of the day = 10 · rest scaled by yours ÷ best'),
    fmt: (e, p) => (e.f ? '—' : `${num(e.v)} ${p.noun}`),
    pts: (e, p, ctx) => {
      if (e.f) return 0;
      const vals = ctx.filter((x) => !x.f && +x.v > 0).map((x) => +x.v);
      if (!vals.length || +e.v <= 0) return p.dir === 'low' && +e.v === 0 ? 10 : 0;
      if (p.dir === 'low') return clamp((10 * Math.min(...vals)) / +e.v, 0, 10);
      return clamp((10 * +e.v) / Math.max(...vals), 0, 10);
    },
    valid: (e) => e.f || e.v >= 0,
  },
  boards: {
    label: 'Multi-board', defaults: { n: 4, max: 9 },
    fields: [['n', 'Boards'], ['max', 'Max guesses']],
    summary: (p) => `${p.n} boards · /${p.max}`,
    rule: (p) => `Each board: guess ${p.n} = 10 · guess ${p.max} = 1 · missed = 0. Averaged.`,
    fmt: (e, p) => toArr(e.b).slice(0, +p.n).map((x) => (x === 'X' || x == null || x === '' ? '✕' : x)).join(' · '),
    pts: (e, p) => {
      const b = toArr(e.b); let s = 0;
      for (let i = 0; i < +p.n; i++) { const g = b[i]; s += g === 'X' || g == null || g === '' ? 0 : curve(+g, +p.n, +p.max); }
      return s / +p.n;
    },
    valid: (e, p) => toArr(e.b).length >= +p.n && toArr(e.b).slice(0, +p.n).every((x) => x === 'X' || +x >= 1),
  },
};

const CATS = {
  word: { label: 'Word', c: 'blue' },
  geo: { label: 'Geo', c: 'green' },
  trivia: { label: 'Trivia', c: 'orange' },
  logic: { label: 'Logic', c: 'violet' },
  fandom: { label: 'Fandom', c: 'pink' },
  wild: { label: 'Wildcard', c: 'yellow' },
};
const PCOLORS = ['tomato', 'cobalt', 'mint', 'sun', 'grape', 'bubble', 'teal', 'coal'];
const SHAPES = ['circle', 'burst', 'square', 'flower', 'hex', 'drop'];

/* ───────────────────────── state ───────────────────────── */
const blank = () => ({ players: {}, days: {}, overrides: {} });
const urlParams = new URLSearchParams(location.search);
const baseCfg = window.DLE_CONFIG || {};
const cfg = {
  db: (urlParams.get('db') || LS.get('dle:db', null) || baseCfg.db || '').trim().replace(/\/+$/, ''),
  room: (urlParams.get('room') || LS.get('dle:room', null) || baseCfg.room || 'crew').trim(),
};
if (urlParams.get('db') || urlParams.get('room')) {
  LS.set('dle:db', cfg.db); LS.set('dle:room', cfg.room);
  history.replaceState(null, '', location.pathname + location.hash);
}

const S = {
  data: blank(),
  me: LS.get('dle:me', null),
  view: LS.get('dle:view', 'today'),
  date: dayKey(),
  filter: 'all',
  hideDone: LS.get('dle:hideDone', false),
  range: 'week',
  openRule: null,
  pending: null,
  loaded: false,
};
const cacheKey = () => (cfg.db ? `dle:cache:${cfg.db}:${cfg.room}` : 'dle:data');

/* ───────────────────────── store (local or Firebase RTDB over REST) ───────────────────────── */
const Store = {
  status: 'local', es: null,
  init() {
    S.data = normalize(LS.get(cacheKey(), blank()));
    if (cfg.db) this.connect(); else { this.status = 'local'; S.loaded = true; }
  },
  connect() {
    if (this.es) this.es.close();
    this.status = 'connecting'; paintSync();
    let es;
    try { es = new EventSource(`${cfg.db}/rooms/${encodeURIComponent(cfg.room)}.json`); }
    catch { this.status = 'error'; paintSync(); return; }
    this.es = es;
    const onPut = (path, data) => { applyAt(path, data); };
    es.addEventListener('put', (e) => {
      const m = JSON.parse(e.data); onPut(m.path, m.data);
      if (m.path === '/') { S.loaded = true; }
      this.status = 'live'; this.persist(); schedule();
    });
    es.addEventListener('patch', (e) => {
      const m = JSON.parse(e.data);
      for (const [k, v] of Object.entries(m.data || {})) onPut(`${m.path.replace(/\/$/, '')}/${k}`, v);
      this.status = 'live'; this.persist(); schedule();
    });
    es.addEventListener('cancel', () => { this.status = 'denied'; paintSync(); toast('The database said no. Check its rules (see Club).'); });
    es.onerror = () => { if (this.status !== 'denied') { this.status = 'offline'; paintSync(); } };
  },
  persist() { LS.set(cacheKey(), S.data); },
  async set(path, val) {
    applyAt('/' + path, val); this.persist(); schedule();
    if (!cfg.db) return true;
    try {
      const r = await fetch(`${cfg.db}/rooms/${encodeURIComponent(cfg.room)}/${path}.json`, val == null ? { method: 'DELETE' } : { method: 'PUT', body: JSON.stringify(val) });
      if (!r.ok) throw new Error(r.status);
      return true;
    } catch (err) { toast('Saved here, but it didn’t sync. Check Club → Sync.'); return false; }
  },
};
function normalize(d) { d = d && typeof d === 'object' ? d : {}; d.players ||= {}; d.days ||= {}; d.overrides ||= {}; return d; }
function applyAt(path, val) {
  const parts = String(path).split('/').filter(Boolean);
  if (!parts.length) { S.data = normalize(val); return; }
  let o = S.data;
  for (let i = 0; i < parts.length - 1; i++) { if (!o[parts[i]] || typeof o[parts[i]] !== 'object') o[parts[i]] = {}; o = o[parts[i]]; }
  const k = parts[parts.length - 1];
  if (val == null) delete o[k]; else o[k] = val;
  normalize(S.data);
}

/* ───────────────────────── derived data ───────────────────────── */
function games() {
  const ov = S.data.overrides || {};
  const merge = (g, o) => {
    const kind = (o && o.kind) || g.kind;
    const base = kind === g.kind ? g.params || {} : {};
    const params = { ...KINDS[kind].defaults, ...base, ...((o && o.params) || {}) };
    const out = { ...g, ...(o || {}), kind, params };
    if (o && o.url) out.check = false;
    if (o && 'off' in o) out.off = !!o.off;
    return out;
  };
  const list = (window.DLE_GAMES || []).map((g) => merge(g, ov[g.id]));
  for (const [id, o] of Object.entries(ov)) if (o && o.custom && o.name) list.push(merge({ id, name: o.name, url: o.url || '', cat: o.cat || 'wild', kind: o.kind || 'guesses', params: {}, custom: true }, o));
  let n = 0;
  return list.map((g) => ({ ...g, n: g.off ? 0 : ++n }));
}
const active = () => games().filter((g) => !g.off);
const gameById = (id) => games().find((g) => g.id === id);
function players() {
  return Object.entries(S.data.players || {})
    .filter(([, p]) => p && p.name)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (a.joined || 0) - (b.joined || 0));
}
const player = (id) => players().find((p) => p.id === id);
const entry = (date, pid, gid) => S.data.days?.[date]?.[pid]?.[gid] || null;

function scoreDay(date) {
  const gs = active(); const ps = players(); const day = S.data.days?.[date] || {};
  const rows = Object.fromEntries(ps.map((p) => [p.id, { p, total: 0, played: 0, wins: 0, per: {} }]));
  const best = {};
  for (const g of gs) {
    const K = KINDS[g.kind]; if (!K) continue;
    const ctx = ps.map((p) => day[p.id]?.[g.id]).filter(Boolean);
    let top = -1;
    for (const p of ps) {
      const e = day[p.id]?.[g.id]; if (!e) continue;
      const pts = r1(K.pts(e, g.params, ctx));
      rows[p.id].per[g.id] = pts; rows[p.id].total += pts; rows[p.id].played++;
      top = Math.max(top, pts);
    }
    best[g.id] = top;
    if (ctx.length >= 2 && top > 0) for (const p of ps) if (rows[p.id].per[g.id] === top) rows[p.id].wins++;
  }
  const ranked = Object.values(rows).map((r) => ({ ...r, total: r1(r.total) }))
    .sort((a, b) => b.total - a.total || b.wins - a.wins || b.played - a.played);
  const lead = ranked[0];
  const champs = lead && lead.total > 0 ? ranked.filter((r) => r.total === lead.total && r.wins === lead.wins) : [];
  return { ranked, champs, best, any: ranked.some((r) => r.played) };
}

function standings(range) {
  const today = dayKey();
  const keys = Object.keys(S.data.days || {}).filter((k) => k <= today).sort();
  const from = range === 'week' ? addDays(today, -6) : range === 'month' ? addDays(today, -29) : '0000';
  const inRange = keys.filter((k) => k >= from);
  const agg = Object.fromEntries(players().map((p) => [p.id, { p, pts: 0, days: 0, played: 0, wins: 0, crowns: 0 }]));
  for (const k of inRange) {
    const d = scoreDay(k);
    for (const r of d.ranked) {
      const a = agg[r.p.id]; if (!a) continue;
      a.pts += r.total; a.played += r.played; a.wins += r.wins; if (r.played) a.days++;
    }
    if (k < today) for (const c of d.champs) if (agg[c.p.id]) agg[c.p.id].crowns++;
  }
  return Object.values(agg).map((a) => ({ ...a, pts: r1(a.pts), avg: a.days ? r1(a.pts / a.days) : 0, streak: streak(a.p.id) }))
    .sort((a, b) => b.crowns - a.crowns || b.pts - a.pts);
}
function streak(pid) {
  let k = dayKey(); const has = (d) => !!S.data.days?.[d]?.[pid] && Object.keys(S.data.days[d][pid]).length > 0;
  if (!has(k)) k = addDays(k, -1);
  let n = 0; while (has(k) && n < 3650) { n++; k = addDays(k, -1); }
  return n;
}
function specialty(pid) {
  const tally = {};
  for (const k of Object.keys(S.data.days || {})) {
    const d = scoreDay(k); const r = d.ranked.find((x) => x.p.id === pid); if (!r) continue;
    for (const [gid, pts] of Object.entries(r.per)) { (tally[gid] ||= []).push(pts); }
  }
  let best = null;
  for (const [gid, arr] of Object.entries(tally)) {
    if (arr.length < 2) continue; const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    if (!best || avg > best.avg) best = { gid, avg };
  }
  return best;
}

/* ───────────────────────── share-text parsing ───────────────────────── */
const SPECIAL = {
  wordle: (t) => guessesRx(t, 6),
  connections: (t) => {
    const rows = t.split(/\n/).map((l) => [...l].filter((c) => '🟨🟩🟦🟪'.includes(c))).filter((r) => r.length === 4);
    if (!rows.length) return null;
    const solved = rows.filter((r) => r.every((c) => c === r[0])).length;
    const mistakes = rows.length - solved;
    return solved >= 4 ? { v: mistakes, f: false } : { v: mistakes, f: true };
  },
  categories: (t) => SPECIAL.connections(t),
  strands: (t) => { if (!/[🔵🟡💡]/u.test(t)) return null; return { v: (t.match(/💡/gu) || []).length, f: false }; },
  quordle: (t) => {
    const toks = [...t.matchAll(/([1-9])️?⃣|🔟|🟥/gu)].map((m) => (m[0] === '🟥' ? 'X' : m[0] === '🔟' ? 10 : +m[1]));
    return toks.length >= 4 ? { b: toks.slice(0, 4) } : null;
  },
  globle: (t) => { const m = t.match(/=\s*(\d+)/) || t.match(/(\d+)\s*guess/i); return m ? { v: +m[1], f: false } : null; },
  travle: (t) => {
    if (/\(?\s*perfect\s*\)?/i.test(t)) return { v: 0, f: false };
    const m = t.match(/#travle\s*#?\d+\s*\+(\d+)/i) || t.match(/\+(\d+)/);
    if (/away/i.test(t)) return { v: 0, f: true };
    return m ? { v: +m[1], f: false } : null;
  },
  krillion: (t) => { const m = t.match(/(\d[\d,]*)\s*(?:m|meters|metres)\b/i); return m ? { v: +m[1].replace(/,/g, ''), f: false } : null; },
  maptap: (t) => { const m = t.match(/(?:final\s*)?score[:\s]*(\d[\d,]*)/i); return m ? { v: +m[1].replace(/,/g, ''), f: false } : null; },
  duotrigordle: (t) => { const m = t.match(/guesses[:\s]*(\d+|X)\s*\/\s*\d+/i) || t.match(/(\d+|X)\s*\/\s*37/); return m ? (m[1] === 'X' ? { f: true } : { v: +m[1], f: false }) : null; },
};
function guessesRx(t, max) {
  const m = t.match(new RegExp(`(?:^|[^\\d,])(\\d{1,2}|X)\\s*/\\s*${max}(?!\\d)`, 'i'));
  if (!m) return null;
  return m[1].toUpperCase() === 'X' ? { f: true } : { v: +m[1], f: false };
}
function parseFor(g, text) {
  const t = String(text || ''); if (!t.trim()) return null;
  const p = g.params;
  if (SPECIAL[g.id]) { const r = SPECIAL[g.id](t, p); if (r) return r; }
  switch (g.kind) {
    case 'guesses': {
      const r = guessesRx(t, p.max); if (r) return r;
      const m = t.match(/in\s+(\d+)\s*(?:tries|try|guesses|guess|attempts?)/i); return m ? { v: +m[1], f: false } : null;
    }
    case 'open': {
      const m = t.match(/(\d+)\s*(?:tries|try|guesses|guess|attempts?)/i) || t.match(/(?:tries|guesses|attempts)[:\s]*(\d+)/i) || t.match(/(\d+)\s*\/\s*\d+/);
      return m ? { v: +m[1], f: false } : null;
    }
    case 'count': {
      const w = String(p.noun || '').split(' ')[0].replace(/s$/, '').replace(/[^a-z]/gi, '') || 'mistake';
      const m = t.match(new RegExp(`(\\d+)\\s*(?:${w}|mistake|hint|wrong|error)`, 'i')) || t.match(/\+(\d+)/);
      if (m) return { v: +m[1], f: false };
      if (/(no|zero|0)\s*(hints|mistakes)|perfect|flawless/i.test(t)) return { v: 0, f: false };
      return null;
    }
    case 'time': {
      const m = t.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (!m) { const s = t.match(/(\d+)\s*(?:s|sec|seconds)\b/i); return s ? { v: +s[1], f: false } : null; }
      const v = m[3] != null ? +m[1] * 3600 + +m[2] * 60 + +m[3] : +m[1] * 60 + +m[2];
      return { v, f: false };
    }
    case 'score': case 'relative': {
      const m = (p.max && t.match(new RegExp(`(\\d[\\d,.]*)\\s*/\\s*${String(p.max).replace(/\B(?=(\d{3})+(?!\d))/g, ',?')}`)))
        || t.match(/(?:score|points|total)[^\d\n]{0,8}(\d[\d,.]*)/i)
        || t.match(/(\d[\d,.]*)\s*(?:pts|points|ep|%)/i);
      return m ? { v: +m[1].replace(/,/g, ''), f: false } : null;
    }
    case 'boards': return SPECIAL.quordle(t);
  }
  return null;
}
function detectGame(text) {
  const t = String(text || '').toLowerCase(); let best = null;
  for (const g of games()) {
    const words = [g.name.toLowerCase(), g.name.toLowerCase().replace(/\s+/g, ''), ...(g.alias || [])];
    for (const w of words) if (w && t.includes(w.toLowerCase()) && (!best || w.length > best.len)) best = { g, len: w.length };
  }
  if (!best && /🟨|🟩|🟦|🟪/u.test(text) && SPECIAL.connections(text) && [...text].filter((c) => c === '🟪').length) best = { g: gameById('connections') };
  return best ? best.g : null;
}

/* ───────────────────────── rendering ───────────────────────── */
let rafId = 0;
function schedule() { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(render); }

function avatar(p, size = '') {
  if (!p) return '';
  const i = Math.max(0, players().findIndex((x) => x.id === p.id));
  const shape = p.shape || SHAPES[i % SHAPES.length];
  return `<span class="av av-${shape} ${size}" style="--pc:var(--p-${esc(p.color || 'coal')})" title="${esc(p.name)}"><b>${esc((p.name || '?').trim()[0] || '?')}</b></span>`;
}

function render() {
  paintSync(); paintMast(); paintTicker();
  $$('.tab').forEach((b) => { b.classList.toggle('on', b.dataset.view === S.view); b.setAttribute('aria-selected', b.dataset.view === S.view); });
  const v = $('#view');
  const html = { today: viewToday, standings: viewStandings, rules: viewRules, club: viewClub }[S.view] || viewToday;
  const keep = captureFocus();
  v.innerHTML = html();
  restoreFocus(keep);
  if (S.loaded && (!S.me || !player(S.me)) && $('#modal').hidden) openWho();
}
function captureFocus() {
  const a = document.activeElement; if (!a || !a.dataset || !a.dataset.keep) return null;
  return { k: a.dataset.keep, s: a.selectionStart, e: a.selectionEnd };
}
function restoreFocus(f) {
  if (!f) return; const el = $(`[data-keep="${f.k}"]`); if (!el) return;
  el.focus(); try { el.setSelectionRange(f.s, f.e); } catch {}
}

function paintSync() {
  const el = $('#sync'); if (!el) return;
  const map = { local: ['Solo mode', 'local'], connecting: ['Connecting', 'wait'], live: ['Live', 'live'], offline: ['Offline', 'warn'], denied: ['Locked out', 'warn'], error: ['Sync error', 'warn'] };
  const [label, cls] = map[Store.status] || map.local;
  el.className = `sync mono s-${cls}`; el.innerHTML = `<i></i>${label}${cfg.db ? ` · ${esc(cfg.room)}` : ''}`;
}
function paintMast() {
  const d = new Date(); const start = new Date(2026, 0, 1);
  const no = Math.floor((d - start) / 864e5) + 1;
  $('#dateline').textContent = `${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · No. ${no} · ${active().length} puzzles`;
  const me = player(S.me);
  $('#whoami').innerHTML = me ? `${avatar(me, 'sm')}<span>${esc(me.name)}</span>` : '<span>Pick your name</span>';
  const b = window.DLE_BONUS; if (b) $('#bonus').innerHTML = `Done with all of them and still bored? <a href="${esc(b.url)}" target="_blank" rel="noopener">Press the ${esc(b.name)} ${I.out}</a>`;
}
function paintTicker() {
  const k = dayKey(); const day = S.data.days?.[k] || {}; const items = [];
  const sd = scoreDay(k);
  for (const [pid, gm] of Object.entries(day)) {
    const p = player(pid); if (!p) continue;
    for (const [gid, e] of Object.entries(gm || {})) {
      const g = gameById(gid); if (!g || !KINDS[g.kind]) continue;
      const pts = sd.ranked.find((r) => r.p.id === pid)?.per[gid];
      items.push({ at: e.at || 0, html: `<span class="tk"><b style="color:var(--p-${esc(p.color)})">${esc(p.name)}</b> ${esc(g.name)} <em>${esc(KINDS[g.kind].fmt(e, g.params))}</em>${pts != null ? ` <span class="tk-pts">+${fmtPts(pts)}</span>` : ''}</span>` });
    }
  }
  items.sort((a, b) => b.at - a.at);
  let parts = items.slice(0, 24).map((x) => x.html);
  if (sd.champs[0] && sd.champs[0].total > 0) parts.unshift(`<span class="tk tk-lead">${I.crown} ${esc(sd.champs.map((c) => c.p.name).join(' & '))} ${sd.champs.length > 1 ? 'lead' : 'leads'} with ${fmtPts(sd.champs[0].total)}</span>`);
  if (!parts.length) parts = [`<span class="tk">Fresh day. Nobody's played yet.</span>`, `<span class="tk">${active().length} puzzles on the board.</span>`, `<span class="tk">First result sets the pace.</span>`];
  while (parts.length < 6) parts = parts.concat(parts);
  const run = parts.join('<span class="tk-sep">✺</span>') + '<span class="tk-sep">✺</span>';
  const track = $('#ticker');
  if (track.dataset.sig !== run) { track.dataset.sig = run; track.innerHTML = `<div class="tk-run">${run}</div><div class="tk-run" aria-hidden="true">${run}</div>`; track.style.setProperty('--dur', `${Math.max(30, parts.length * 6)}s`); }
}

/* ─── TODAY ─── */
function viewToday() {
  const gs = active(); const me = player(S.me); const date = S.date; const today = dayKey();
  const sd = scoreDay(date);
  const mine = me ? sd.ranked.find((r) => r.p.id === me.id) : null;
  const done = mine ? mine.played : 0;
  const pct = gs.length ? done / gs.length : 0;
  const next = me ? gs.find((g) => !entry(date, me.id, g.id)) : gs[0];
  const myRank = mine ? sd.ranked.findIndex((r) => r.p.id === me.id) + 1 : 0;
  const isToday = date === today;
  const dateLabel = isToday ? 'Today' : date === addDays(today, -1) ? 'Yesterday' : parseKey(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const needLinks = games().filter((g) => g.check && !g.off).length;

  const cats = Object.entries(CATS).map(([k, c]) => {
    const n = gs.filter((g) => g.cat === k).length; if (!n) return '';
    return `<button class="chip c-${c.c} ${S.filter === k ? 'on' : ''}" data-action="filter" data-f="${k}">${c.label}<sup>${n}</sup></button>`;
  }).join('');

  const shown = gs.filter((g) => (S.filter === 'all' || g.cat === S.filter) && !(S.hideDone && me && entry(date, me.id, g.id)));

  return `
  <section class="front">
    <div class="panel me-panel">
      <div class="day-nav">
        <button class="icon-btn" data-action="day" data-d="-1" aria-label="Previous day">${I.left}</button>
        <span class="day-label">${esc(dateLabel)}</span>
        <button class="icon-btn" data-action="day" data-d="1" aria-label="Next day" ${isToday ? 'disabled' : ''}>${I.right}</button>
      </div>
      <div class="me-body">
        ${ring(pct, done, gs.length)}
        <div class="me-stats">
          <div class="big-num">${mine ? fmtPts(mine.total) : '0'}<small>pts</small></div>
          <p class="me-line">${me ? (done ? `${ordinal(myRank)} of ${sd.ranked.length} · ${mine.wins} game ${mine.wins === 1 ? 'win' : 'wins'}` : `Nothing logged ${isToday ? 'yet' : 'that day'}.`) : 'Pick your name to start.'}</p>
          <p class="me-line">${me ? `${I.flame} ${streak(me.id)}-day streak` : ''}</p>
        </div>
      </div>
      ${next ? `<a class="btn btn-go" href="${esc(next.url)}" target="_blank" rel="noopener" data-action="play" data-id="${next.id}">
        <span><small>Up next · #${pad(next.n)}</small>${esc(next.name)}</span>${I.out}</a>`
      : `<div class="btn btn-go done"><span><small>Board cleared</small>All ${gs.length} done</span>${I.check}</div>`}
    </div>

    <div class="panel race-panel">
      <h2 class="kicker">The race <span>${isToday ? 'live' : esc(dateLabel)}</span></h2>
      ${race(sd)}
    </div>
  </section>

  <section class="paste-strip" data-action="clip">
    <span class="paste-icon">${I.paste}</span>
    <p><b>Got a share text?</b> Paste it anywhere on this page (${/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'}+V) or tap here. We work out the game and the score.</p>
  </section>

  ${needLinks ? `<p class="notice">${I.warn} <span><b>${needLinks} games need a link.</b> We couldn't confirm their sites, so they open a web search for now. Fix one in <a href="#" data-action="go" data-view="rules">Rules</a> and the whole crew gets it.</span></p>` : ''}

  <div class="filters">
    <button class="chip ${S.filter === 'all' ? 'on' : ''}" data-action="filter" data-f="all">All<sup>${gs.length}</sup></button>
    ${cats}
    <label class="toggle"><input type="checkbox" data-action="hideDone" ${S.hideDone ? 'checked' : ''}><span></span>Hide finished</label>
  </div>

  <section class="grid">
    ${shown.map((g) => card(g, date, sd)).join('') || `<p class="empty">Nothing left in this pile. Nice.</p>`}
  </section>`;
}

function ring(pct, done, total) {
  const R = 46, C = 2 * Math.PI * R;
  return `<div class="ring"><svg viewBox="0 0 110 110">
    <circle cx="55" cy="55" r="${R}" class="ring-bg"/>
    <circle cx="55" cy="55" r="${R}" class="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" transform="rotate(-90 55 55)"/>
  </svg><div class="ring-txt"><b>${done}</b><span>of ${total}</span></div></div>`;
}

function race(sd) {
  if (!sd.ranked.length) return `<p class="empty">No players yet. Head to <a href="#" data-action="go" data-view="club">Club</a> or pick your name.</p>`;
  const max = Math.max(1, ...sd.ranked.map((r) => r.total));
  return `<ol class="race">${sd.ranked.map((r, i) => {
    const lead = i === 0 && r.total > 0 && sd.champs.some((c) => c.p.id === r.p.id);
    return `<li class="${lead ? 'lead' : ''}">
      <span class="race-pos">${i + 1}</span>
      ${avatar(r.p)}
      <div class="race-mid">
        <div class="race-name">${esc(r.p.name)}${lead ? `<span class="sticker">${I.crown}${sd.champs.length > 1 ? 'tied' : 'leads'}</span>` : ''}</div>
        <div class="bar"><i style="--w:${(r.total / max) * 100}%;--pc:var(--p-${esc(r.p.color)})"></i></div>
        <div class="race-meta mono">${r.played} played · ${r.wins} ${r.wins === 1 ? 'win' : 'wins'}</div>
      </div>
      <span class="race-pts mono">${fmtPts(r.total)}</span>
    </li>`;
  }).join('')}</ol>`;
}

function card(g, date, sd) {
  const c = CATS[g.cat] || CATS.wild; const K = KINDS[g.kind];
  const me = player(S.me); const mine = me && entry(date, me.id, g.id);
  const ps = players();
  const myPts = mine ? sd.ranked.find((r) => r.p.id === me.id)?.per[g.id] : null;
  const top = sd.best[g.id];
  const stamps = ps.map((p) => {
    const e = entry(date, p.id, g.id);
    const pts = e ? sd.ranked.find((r) => r.p.id === p.id)?.per[g.id] : null;
    const win = e && pts === top && top > 0 && ps.filter((q) => entry(date, q.id, g.id)).length >= 2;
    return `<span class="pstamp ${e ? 'in' : 'out'} ${win ? 'win' : ''}" title="${esc(p.name)}${e ? ': ' + esc(K.fmt(e, g.params)) + ' (' + fmtPts(pts) + ' pts)' : ' hasn’t played'}">
      ${avatar(p, 'xs')}${e ? `<em class="mono">${fmtPts(pts)}</em>` : ''}${win ? `<span class="pcrown">${I.crown}</span>` : ''}</span>`;
  }).join('');
  return `<article class="card c-${c.c} ${mine ? 'is-done' : ''}">
    <div class="card-top">
      <span class="num">${pad(g.n)}</span>
      ${mine ? `<div class="stamp"><span>${esc(K.fmt(mine, g.params))}</span><b>+${fmtPts(myPts)}</b></div>` : `<span class="cat">${c.label}</span>`}
    </div>
    <h3 class="gname">${esc(g.name)}</h3>
    <p class="how mono">${esc(K.summary(g.params))}${g.check ? ` <span class="needs" title="Link not verified. Set it in Rules.">${I.warn}link?</span>` : ''}</p>
    <div class="perf" aria-hidden="true"></div>
    <div class="card-bot">
      <div class="pstamps">${stamps}</div>
      <div class="card-actions">
        <button class="btn-log" data-action="log" data-id="${g.id}">${mine ? 'Edit' : 'Log'}</button>
        <a class="btn-play" href="${esc(g.url)}" target="_blank" rel="noopener" data-action="play" data-id="${g.id}" aria-label="Play ${esc(g.name)}">Play ${I.out}</a>
      </div>
    </div>
  </article>`;
}

/* ─── STANDINGS ─── */
function viewStandings() {
  const st = standings(S.range);
  const today = dayKey();
  const ranges = [['week', 'This week'], ['month', '30 days'], ['all', 'All time']];
  const podium = st.slice(0, 3);
  const order = podium.length === 3 ? [podium[1], podium[0], podium[2]] : podium.length === 2 ? [podium[1], podium[0]] : podium;
  const sd = scoreDay(S.date);

  return `
  <section class="stand-head">
    <h2 class="display">Standings</h2>
    <div class="seg">${ranges.map(([k, l]) => `<button class="${S.range === k ? 'on' : ''}" data-action="range" data-r="${k}">${l}</button>`).join('')}</div>
  </section>
  <p class="sub">Daily crowns decide it. A crown goes to whoever has the most points when the day ends. Points break ties.</p>

  ${st.length ? `<section class="podium">${order.map((a) => {
    const place = st.indexOf(a) + 1;
    return `<div class="pod pod-${place}" style="--pc:var(--p-${esc(a.p.color)})">
      ${avatar(a.p, 'lg')}
      <div class="pod-name">${esc(a.p.name)}</div>
      <div class="pod-block"><span class="pod-place">${place}</span>
        <div class="pod-stats mono"><b>${a.crowns}</b> ${a.crowns === 1 ? 'crown' : 'crowns'}<br>${fmtPts(a.pts)} pts</div></div>
    </div>`;
  }).join('')}</section>` : `<p class="empty">No players yet.</p>`}

  ${st.length ? `<div class="table-wrap"><table class="tbl">
    <thead><tr><th>#</th><th>Player</th><th title="Days won">Crowns</th><th>Points</th><th>Avg / day</th><th>Game wins</th><th>Played</th><th>Streak</th><th>Specialty</th></tr></thead>
    <tbody>${st.map((a, i) => { const sp = specialty(a.p.id); const sg = sp && gameById(sp.gid); return `<tr>
      <td class="mono">${i + 1}</td><td><span class="cell-p">${avatar(a.p, 'xs')}${esc(a.p.name)}</span></td>
      <td class="mono strong">${a.crowns}</td><td class="mono">${fmtPts(a.pts)}</td><td class="mono">${fmtPts(a.avg)}</td>
      <td class="mono">${a.wins}</td><td class="mono">${a.played}</td><td class="mono">${a.streak ? `${I.flame}${a.streak}` : '–'}</td>
      <td>${sg ? `${esc(sg.name)} <span class="mono dim">${fmtPts(sp.avg)}</span>` : '<span class="dim">—</span>'}</td></tr>`; }).join('')}</tbody>
  </table></div>` : ''}

  <section class="block">
    <h3 class="kicker">Hall of champions <span>last 21 days</span></h3>
    <div class="hall">${hall(today)}</div>
  </section>

  <section class="block">
    <div class="block-head">
      <h3 class="kicker">Scorecard <span>${S.date === today ? 'today' : esc(parseKey(S.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))}</span></h3>
      <div class="day-nav sm">
        <button class="icon-btn" data-action="day" data-d="-1" aria-label="Previous day">${I.left}</button>
        <button class="icon-btn" data-action="day" data-d="1" aria-label="Next day" ${S.date === today ? 'disabled' : ''}>${I.right}</button>
      </div>
    </div>
    ${matrix(sd)}
  </section>`;
}

function hall(today) {
  const out = [];
  for (let i = 21; i >= 1; i--) {
    const k = addDays(today, -i); const d = scoreDay(k); const dt = parseKey(k);
    const lbl = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!d.champs.length) { out.push(`<button class="hall-day none" data-action="jump" data-k="${k}" title="${lbl}: no games"><span class="hd-date mono">${dt.getDate()}</span></button>`); continue; }
    const c = d.champs[0].p;
    out.push(`<button class="hall-day" data-action="jump" data-k="${k}" style="--pc:var(--p-${esc(c.color)})" title="${lbl}: ${esc(d.champs.map((x) => x.p.name).join(' & '))} · ${fmtPts(d.champs[0].total)} pts">
      <span class="hd-date mono">${dt.getDate()}</span><b>${esc(c.name[0])}${d.champs.length > 1 ? '+' : ''}</b></button>`);
  }
  return out.join('');
}

function matrix(sd) {
  const ps = players(); if (!ps.length) return '';
  const gs = active().filter((g) => ps.some((p) => entry(S.date, p.id, g.id)));
  if (!gs.length) return `<p class="empty">No results logged for this day.</p>`;
  return `<div class="table-wrap"><table class="tbl matrix">
    <thead><tr><th>Game</th>${ps.map((p) => `<th>${avatar(p, 'xs')}<span class="th-name">${esc(p.name)}</span></th>`).join('')}</tr></thead>
    <tbody>${gs.map((g) => `<tr><td class="g-cell"><span class="dot c-${(CATS[g.cat] || CATS.wild).c}"></span>${esc(g.name)}</td>${ps.map((p) => {
      const e = entry(S.date, p.id, g.id); if (!e) return '<td class="m-empty">·</td>';
      const pts = sd.ranked.find((r) => r.p.id === p.id)?.per[g.id] ?? 0;
      const win = pts === sd.best[g.id] && pts > 0 && ps.filter((q) => entry(S.date, q.id, g.id)).length >= 2;
      return `<td class="m-cell ${win ? 'win' : ''}" style="--pc:var(--p-${esc(p.color)});--a:${Math.round(pts * 6)}%"><span>${esc(KINDS[g.kind].fmt(e, g.params))}</span><b class="mono">${fmtPts(pts)}</b></td>`;
    }).join('')}</tr>`).join('')}
    <tr class="m-total"><td>Total</td>${ps.map((p) => { const r = sd.ranked.find((x) => x.p.id === p.id); return `<td class="mono">${fmtPts(r ? r.total : 0)}</td>`; }).join('')}</tr>
    </tbody></table></div>`;
}

/* ─── RULES ─── */
function viewRules() {
  const gs = games();
  const kindRows = Object.entries(KINDS).map(([k, K]) => {
    const ex = gs.filter((g) => g.kind === k && !g.off).map((g) => g.name);
    return `<div class="kind"><h4>${K.label}</h4><p>${esc(K.rule(K.defaults))}</p><p class="dim mono">${ex.length ? esc(ex.slice(0, 6).join(', ')) + (ex.length > 6 ? ` +${ex.length - 6}` : '') : 'no games yet'}</p></div>`;
  }).join('');
  return `
  <section class="stand-head"><h2 class="display">Rules</h2></section>
  <div class="rules-intro">
    <div class="rule-big"><span class="mono">01</span><p><b>Every game is worth up to 10 points.</b> Each kind of result maps onto that same 10-point scale, so a Wordle and a Globle count the same.</p></div>
    <div class="rule-big"><span class="mono">02</span><p><b>Most points wins the day.</b> When the date flips, whoever's on top takes the day's crown. Skipping a game scores 0 for it.</p></div>
    <div class="rule-big"><span class="mono">03</span><p><b>Ties go to game wins.</b> Best score on a game among the crew counts as a game win. Still tied? Co-champions.</p></div>
  </div>
  <section class="kinds">${kindRows}</section>

  <section class="block">
    <div class="block-head"><h3 class="kicker">The lineup <span>${gs.filter((g) => !g.off).length} on · tap to edit</span></h3>
      <button class="btn-sm" data-action="addGame">${I.plus} Add a game</button></div>
    <p class="sub">Changes here sync to everyone. Scores are recalculated with the new rules, including past days.</p>
    <div class="lineup">${gs.map(ruleRow).join('')}</div>
  </section>`;
}
function ruleRow(g) {
  const c = CATS[g.cat] || CATS.wild; const K = KINDS[g.kind]; const open = S.openRule === g.id;
  const fields = K.fields.map(([key, label, type, opts]) => {
    if (type === 'select') return `<label class="fld"><span>${label}</span><select data-action="param" data-id="${g.id}" data-k="${key}">${opts.map(([v, l]) => `<option value="${v}" ${String(g.params[key]) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
    return `<label class="fld"><span>${label}</span><input ${type === 'text' ? 'type="text"' : 'type="number" inputmode="numeric" min="0"'} value="${esc(g.params[key])}" data-action="param" data-id="${g.id}" data-k="${key}"></label>`;
  }).join('');
  return `<div class="lrow ${open ? 'open' : ''} ${g.off ? 'off' : ''}">
    <button class="lrow-head" data-action="openRule" data-id="${g.id}">
      <span class="dot c-${c.c}"></span><span class="mono dim">${g.off ? '––' : pad(g.n)}</span>
      <b>${esc(g.name)}</b>${g.check ? `<span class="needs">${I.warn}link?</span>` : ''}${g.off ? '<span class="pill">off</span>' : ''}
      <span class="lrow-sum mono">${esc(K.summary(g.params))}</span>
    </button>
    ${open ? `<div class="lrow-body">
      ${g.note ? `<p class="note">${esc(g.note)}</p>` : ''}
      <div class="fields">
        <label class="fld wide"><span>Link</span><input type="url" value="${esc(g.url)}" data-action="gurl" data-id="${g.id}" placeholder="https://"></label>
        ${g.custom ? `<label class="fld"><span>Name</span><input type="text" value="${esc(g.name)}" data-action="gname" data-id="${g.id}"></label>` : ''}
        <label class="fld"><span>Category</span><select data-action="gcat" data-id="${g.id}">${Object.entries(CATS).map(([k, v]) => `<option value="${k}" ${g.cat === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
        <label class="fld"><span>Scoring</span><select data-action="gkind" data-id="${g.id}">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}" ${g.kind === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
        ${fields}
      </div>
      <p class="mono dim">${esc(K.rule(g.params))}</p>
      <div class="row-actions">
        <label class="toggle"><input type="checkbox" data-action="goff" data-id="${g.id}" ${g.off ? '' : 'checked'}><span></span>In the daily lineup</label>
        ${S.data.overrides?.[g.id] ? `<button class="btn-sm ghost" data-action="greset" data-id="${g.id}">${g.custom ? 'Delete game' : 'Reset to default'}</button>` : ''}
      </div>
    </div>` : ''}
  </div>`;
}

/* ─── CLUB ─── */
function viewClub() {
  const ps = players();
  const invite = cfg.db ? `${location.origin}${location.pathname}?db=${encodeURIComponent(cfg.db)}&room=${encodeURIComponent(cfg.room)}` : '';
  return `
  <section class="stand-head"><h2 class="display">Club</h2></section>
  <div class="club">
    <section class="panel">
      <h3 class="kicker">Sync <span class="sync-inline s-${Store.status}">${esc(Store.status)}</span></h3>
      ${cfg.db ? `<p>Everyone using this database and room shares one scoreboard. Send the crew this link:</p>
        <div class="copy"><input readonly value="${esc(invite)}" data-keep="invite"><button class="btn-sm" data-action="copy" data-v="${esc(invite)}">Copy invite</button></div>`
      : `<p><b>Solo mode.</b> Scores live in this browser only. To share a board with friends, connect a free Firebase database. It takes about three minutes:</p>
        <ol class="steps">
          <li>Open <a href="https://console.firebase.google.com" target="_blank" rel="noopener">console.firebase.google.com</a> and create a project (skip Analytics).</li>
          <li><b>Build → Realtime Database → Create database</b>. Pick a region, then start in <b>test mode</b>.</li>
          <li>In <b>Rules</b>, paste the snippet below and publish, so it doesn't lock after 30 days.</li>
          <li>Copy the database URL (ends in <code>firebaseio.com</code> or <code>firebasedatabase.app</code>) into the box below.</li>
        </ol>
        <pre class="code">{ "rules": { "rooms": { "$room": { ".read": true, ".write": true } } } }</pre>`}
      <div class="fields">
        <label class="fld wide"><span>Database URL</span><input type="url" id="cfg-db" value="${esc(cfg.db)}" placeholder="https://your-project-default-rtdb.firebaseio.com"></label>
        <label class="fld"><span>Room</span><input type="text" id="cfg-room" value="${esc(cfg.room)}"></label>
      </div>
      <div class="row-actions">
        <button class="btn-sm" data-action="saveCfg">${cfg.db ? 'Save & reconnect' : 'Connect'}</button>
        ${cfg.db ? '<button class="btn-sm ghost" data-action="goSolo">Go solo</button>' : ''}
      </div>
      <p class="dim small">Tip: put the URL in <code>config.js</code> before pushing to GitHub Pages and nobody needs an invite link.</p>
    </section>

    <section class="panel">
      <h3 class="kicker">The crew <span>${ps.length}</span></h3>
      <div class="crew">${ps.map((p) => `<div class="crew-row">
        ${avatar(p)}
        <input type="text" value="${esc(p.name)}" data-action="pname" data-id="${p.id}" maxlength="18" aria-label="Name">
        <div class="swatches">${PCOLORS.map((c) => `<button class="sw ${p.color === c ? 'on' : ''}" style="--pc:var(--p-${c})" data-action="pcolor" data-id="${p.id}" data-c="${c}" aria-label="${c}"></button>`).join('')}</div>
        ${S.me === p.id ? '<span class="pill">you</span>' : `<button class="btn-sm ghost" data-action="beme" data-id="${p.id}">This is me</button>`}
      </div>`).join('') || '<p class="dim">No one yet.</p>'}</div>
      <button class="btn-sm" data-action="whoami">${I.plus} Add someone</button>
    </section>

    <section class="panel">
      <h3 class="kicker">Backup</h3>
      <p>Download everything as a file, or restore from one.</p>
      <div class="row-actions">
        <button class="btn-sm" data-action="export">Download backup</button>
        <label class="btn-sm ghost file">Restore…<input type="file" accept="application/json" data-action="import" hidden></label>
      </div>
    </section>
  </div>`;
}

/* ───────────────────────── score sheet ───────────────────────── */
let sheet = null;
function openSheet(gid, draft, note) {
  const g = gameById(gid); if (!g) return;
  if (!S.me || !player(S.me)) { openWho(); return; }
  const cur = entry(S.date, S.me, gid);
  sheet = { gid, draft: draft ? { ...draft } : cur ? { v: cur.v, f: !!cur.f, b: toArr(cur.b) } : { v: null, f: false, b: [] }, note: note || '', existed: !!cur };
  paintSheet();
  const w = $('#sheet'); w.hidden = false; requestAnimationFrame(() => w.classList.add('in'));
  document.body.classList.add('locked');
}
function closeSheet() {
  const w = $('#sheet'); w.classList.remove('in'); document.body.classList.remove('locked');
  setTimeout(() => { if (!w.classList.contains('in')) { w.hidden = true; w.innerHTML = ''; } }, 260);
  sheet = null;
}
function draftValid(g, d) {
  const K = KINDS[g.kind];
  if (g.kind === 'boards') return K.valid(d, g.params);
  if (d.f) return true;
  return d.v != null && d.v !== '' && !Number.isNaN(+d.v) && K.valid({ ...d, v: +d.v }, g.params);
}
function sheetPreview(g, d) {
  if (!draftValid(g, d)) return '<span class="dim">Enter a result</span>';
  const K = KINDS[g.kind]; const e = { ...d, v: d.v != null ? +d.v : null };
  const ctx = players().filter((p) => p.id !== S.me).map((p) => entry(S.date, p.id, g.id)).filter(Boolean).concat([e]);
  return `<span>${esc(K.fmt(e, g.params))}</span><b>${fmtPts(r1(K.pts(e, g.params, ctx)))}<small>pts</small></b>`;
}
function paintSheet() {
  if (!sheet) return;
  const g = gameById(sheet.gid); const K = KINDS[g.kind]; const c = CATS[g.cat] || CATS.wild; const d = sheet.draft; const p = g.params;
  let input = '';
  const btns = (vals, cur, extra = '') => `<div class="picks">${vals.map((v) => `<button class="pick ${!d.f && +cur === +v && cur !== null && cur !== '' ? 'on' : ''}" data-action="pick" data-v="${v}">${v}</button>`).join('')}${extra}</div>`;
  const failBtn = (label) => `<button class="pick fail ${d.f ? 'on' : ''}" data-action="fail">${label}</button>`;
  if (g.kind === 'guesses') {
    input = +p.max <= 12 ? btns(Array.from({ length: +p.max }, (_, i) => i + 1), d.v, failBtn('X')) : `${numIn('Guesses', d.v)}${failBtn('Failed')}`;
  } else if (g.kind === 'count') {
    input = +p.max <= 8 ? btns(Array.from({ length: +p.fail ? +p.max : +p.max + 1 }, (_, i) => i), d.v, +p.fail ? failBtn('Failed') : '') : `${numIn(p.noun, d.v)}${+p.fail ? failBtn('Failed') : ''}`;
  } else if (g.kind === 'open') {
    input = `<div class="stepper"><button class="pick" data-action="step" data-d="-1">−</button>${numIn('Guesses', d.v, true)}<button class="pick" data-action="step" data-d="1">+</button></div><div class="picks">${failBtn('Gave up')}</div>`;
  } else if (g.kind === 'time') {
    const v = d.v != null && d.v !== '' ? +d.v : null;
    input = `<div class="time-in"><label><input type="number" inputmode="numeric" min="0" placeholder="0" value="${v != null ? Math.floor(v / 60) : ''}" data-action="tmin" data-keep="tmin"><span>min</span></label><b>:</b><label><input type="number" inputmode="numeric" min="0" max="59" placeholder="00" value="${v != null ? v % 60 : ''}" data-action="tsec" data-keep="tsec"><span>sec</span></label></div><div class="picks">${failBtn('Didn’t finish')}</div>`;
  } else if (g.kind === 'score' || g.kind === 'relative') {
    input = `<div class="score-in">${numIn(p.noun, d.v, true)}${g.kind === 'score' ? `<span class="mono">/ ${num(p.max)}</span>` : ''}</div>`;
  } else if (g.kind === 'boards') {
    const b = toArr(d.b);
    input = `<div class="boards">${Array.from({ length: +p.n }, (_, i) => `<label><span>Board ${i + 1}</span><input type="text" inputmode="numeric" maxlength="2" value="${esc(b[i] ?? '')}" placeholder="1–${p.max} or X" data-action="board" data-i="${i}" data-keep="b${i}"></label>`).join('')}</div>`;
  }
  const others = players().filter((q) => q.id !== S.me).map((q) => { const e = entry(S.date, q.id, g.id); return e ? `<span class="o">${avatar(q, 'xs')}${esc(K.fmt(e, p))}</span>` : ''; }).join('');
  $('#sheet').innerHTML = `
  <div class="sheet-bg" data-action="closeSheet"></div>
  <div class="sheet c-${c.c}" role="dialog" aria-modal="true" aria-label="Log ${esc(g.name)}">
    <div class="sheet-grab"></div>
    <header class="sheet-head">
      <div><span class="mono dim">#${pad(g.n)} · ${c.label}${S.date !== dayKey() ? ' · ' + esc(parseKey(S.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) : ''}</span><h3>${esc(g.name)}</h3><p class="mono dim">${esc(K.rule(p))}</p></div>
      <button class="icon-btn" data-action="closeSheet" aria-label="Close">${I.x}</button>
    </header>
    ${sheet.note ? `<p class="sheet-note">${sheet.note}</p>` : ''}
    <div class="paste-box">
      <textarea rows="2" placeholder="Paste the share text from ${esc(g.name)}…" data-action="sheetPaste" data-keep="sp">${esc(sheet.paste || '')}</textarea>
      <button class="btn-sm" data-action="clipSheet">${I.paste} Paste</button>
    </div>
    <div class="sheet-input">${input}</div>
    ${others ? `<div class="others mono">${others}</div>` : ''}
    <footer class="sheet-foot">
      <div class="preview" id="preview">${sheetPreview(g, d)}</div>
      <div class="sheet-btns">
        ${sheet.existed ? `<button class="btn-sm ghost" data-action="delEntry">Remove</button>` : ''}
        <a class="btn-sm ghost" href="${esc(g.url)}" target="_blank" rel="noopener" data-action="play" data-id="${g.id}" data-nosheet="1">Open ${I.out}</a>
        <button class="btn-save" data-action="saveEntry" ${draftValid(g, d) ? '' : 'disabled'}>Save</button>
      </div>
    </footer>
  </div>`;
}
function numIn(label, v, big) { return `<label class="num-in ${big ? 'big' : ''}"><input type="number" inputmode="decimal" min="0" value="${esc(v ?? '')}" data-action="numv" data-keep="numv"><span>${esc(label)}</span></label>`; }
function refreshPreview() {
  if (!sheet) return; const g = gameById(sheet.gid);
  $('#preview').innerHTML = sheetPreview(g, sheet.draft);
  const s = $('.btn-save'); if (s) s.disabled = !draftValid(g, sheet.draft);
}
function applyParsed(text, fromGlobal) {
  const det = detectGame(text);
  if (sheet && !fromGlobal) {
    const g = gameById(sheet.gid);
    const r = parseFor(g, text);
    if (r) { sheet.draft = { v: r.v ?? null, f: !!r.f, b: r.b || [] }; sheet.note = `${I.check} Read it: <b>${esc(KINDS[g.kind].fmt(sheet.draft, g.params))}</b>. Check it, then save.`; paintSheetKeep(); return true; }
    if (det && det.id !== g.id) { sheet.note = `That looks like <b>${esc(det.name)}</b>. <button class="linkish" data-action="switchTo" data-id="${det.id}">Switch to it</button>`; paintSheetKeep(); return false; }
    sheet.note = 'Couldn’t read a score from that. Enter it by hand below.'; paintSheetKeep(); return false;
  }
  if (!det) { toast('Couldn’t tell which game that was. Hit Log on the game’s card.'); return false; }
  const r = parseFor(det, text);
  openSheet(det.id, r ? { v: r.v ?? null, f: !!r.f, b: r.b || [] } : null, r ? `${I.check} Found <b>${esc(det.name)}</b>: ${esc(KINDS[det.kind].fmt({ v: r.v, f: r.f, b: r.b }, det.params))}. Check it, then save.` : `Found <b>${esc(det.name)}</b>, but no score. Enter it below.`);
  return true;
}
function paintSheetKeep() { const k = captureFocus(); paintSheet(); restoreFocus(k); }

async function saveEntry() {
  const g = gameById(sheet.gid); const d = sheet.draft;
  if (!draftValid(g, d)) return;
  const e = { f: !!d.f, at: Date.now() };
  if (g.kind === 'boards') e.b = toArr(d.b).slice(0, +g.params.n).map((x) => (String(x).toUpperCase() === 'X' ? 'X' : +x));
  else if (!d.f) e.v = +d.v;
  const name = g.name; const date = S.date;
  closeSheet();
  await Store.set(`days/${date}/${S.me}/${g.id}`, e);
  const sd = scoreDay(date); const pts = sd.ranked.find((r) => r.p.id === S.me)?.per[g.id];
  toast(`${name} logged · +${fmtPts(pts ?? 0)}`, true);
}

/* ───────────────────────── who-are-you modal ───────────────────────── */
function openWho() {
  const ps = players(); const used = ps.map((p) => p.color);
  const free = PCOLORS.find((c) => !used.includes(c)) || PCOLORS[0];
  const m = $('#modal');
  m.innerHTML = `<div class="modal-bg"></div><div class="modal" role="dialog" aria-modal="true" aria-label="Who are you">
    <h2 class="display sm">Pull up a chair.</h2>
    ${ps.length ? `<p>Who's playing on this device?</p><div class="who-list">${ps.map((p) => `<button class="who" data-action="beme" data-id="${p.id}">${avatar(p, 'lg')}<span>${esc(p.name)}</span></button>`).join('')}</div><p class="or"><span>or join the crew</span></p>` : '<p>Pick a name and a colour. That\'s it.</p>'}
    <div class="join">
      <input type="text" id="new-name" maxlength="18" placeholder="Your name" autocomplete="nickname">
      <div class="swatches">${PCOLORS.map((c) => `<button class="sw ${c === free ? 'on' : ''}" style="--pc:var(--p-${c})" data-action="newColor" data-c="${c}" aria-label="${c}"></button>`).join('')}</div>
      <button class="btn-save" data-action="join">Join</button>
    </div>
    ${S.me && player(S.me) ? '<button class="linkish close-who" data-action="closeWho">Cancel</button>' : ''}
  </div>`;
  m.dataset.color = free; m.hidden = false;
  setTimeout(() => $('#new-name')?.focus(), 50);
}
function closeWho() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }

/* ───────────────────────── toast ───────────────────────── */
let toastT = 0;
function toast(msg, good) {
  const t = $('#toast'); t.innerHTML = `${good ? I.check : ''}<span>${msg}</span>`; t.className = `toast show ${good ? 'good' : ''}`;
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ───────────────────────── events ───────────────────────── */
function setView(v) { S.view = v; LS.set('dle:view', v); window.scrollTo({ top: 0, behavior: 'smooth' }); render(); }

document.addEventListener('click', async (ev) => {
  const el = ev.target.closest('[data-action]'); if (!el) return;
  const a = el.dataset.action; const id = el.dataset.id;
  switch (a) {
    case 'go': ev.preventDefault(); setView(el.dataset.view); break;
    case 'theme': {
      const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const nxt = cur === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = nxt; LS.set('dle:theme', nxt); break;
    }
    case 'whoami': openWho(); break;
    case 'filter': S.filter = el.dataset.f; render(); break;
    case 'day': { const n = addDays(S.date, +el.dataset.d); if (n <= dayKey()) { S.date = n; render(); } break; }
    case 'jump': S.date = el.dataset.k; render(); $('.matrix')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); break;
    case 'range': S.range = el.dataset.r; render(); break;
    case 'play':
      if (!S.me || !player(S.me)) { ev.preventDefault(); openWho(); break; }
      S.pending = { id, t: Date.now() };
      if (el.dataset.nosheet) closeSheet();
      break;
    case 'log': openSheet(id); break;
    case 'clip': case 'clipSheet': {
      try {
        const txt = await navigator.clipboard.readText();
        if (!txt.trim()) { toast('Clipboard is empty.'); break; }
        if (a === 'clipSheet') { if (sheet) sheet.paste = txt; applyParsed(txt, false); } else applyParsed(txt, true);
      } catch { toast('Clipboard is blocked here. Paste with Ctrl/⌘+V instead.'); }
      break;
    }
    case 'closeSheet': closeSheet(); break;
    case 'pick': sheet.draft.v = +el.dataset.v; sheet.draft.f = false; sheet.note = ''; paintSheetKeep(); break;
    case 'fail': sheet.draft.f = !sheet.draft.f; paintSheetKeep(); break;
    case 'step': { const v = Math.max(1, (+sheet.draft.v || 0) + +el.dataset.d); sheet.draft.v = v; sheet.draft.f = false; paintSheetKeep(); break; }
    case 'switchTo': { const txt = $('[data-action="sheetPaste"]')?.value || ''; closeSheet(); setTimeout(() => applyParsed(txt, true), 280); break; }
    case 'saveEntry': saveEntry(); break;
    case 'delEntry': { const g = sheet.gid; closeSheet(); await Store.set(`days/${S.date}/${S.me}/${g}`, null); toast('Removed.'); break; }
    case 'beme': S.me = id; LS.set('dle:me', id); closeWho(); render(); toast(`Hi, ${esc(player(id)?.name)}.`, true); break;
    case 'newColor': $$('#modal .sw').forEach((s) => s.classList.toggle('on', s === el)); $('#modal').dataset.color = el.dataset.c; break;
    case 'join': {
      const name = ($('#new-name')?.value || '').trim(); if (!name) { $('#new-name')?.focus(); return; }
      const pid = uid(); const color = $('#modal').dataset.color || 'coal';
      await Store.set(`players/${pid}`, { name, color, joined: Date.now() });
      S.me = pid; LS.set('dle:me', pid); closeWho(); render(); toast(`Welcome, ${esc(name)}.`, true); break;
    }
    case 'closeWho': closeWho(); break;
    case 'pcolor': await Store.set(`players/${id}/color`, el.dataset.c); break;
    case 'openRule': S.openRule = S.openRule === id ? null : id; render(); break;
    case 'greset': await Store.set(`overrides/${id}`, null); S.openRule = null; toast('Back to default.'); break;
    case 'addGame': {
      const gid = 'x' + Math.random().toString(36).slice(2, 7);
      await Store.set(`overrides/${gid}`, { custom: true, name: 'New game', url: '', cat: 'wild', kind: 'guesses', params: { max: 6 } });
      S.openRule = gid; render(); break;
    }
    case 'copy': try { await navigator.clipboard.writeText(el.dataset.v); toast('Invite link copied.', true); } catch { $('[data-keep="invite"]')?.select(); toast('Select and copy the link.'); } break;
    case 'saveCfg': {
      const db = ($('#cfg-db').value || '').trim().replace(/\/+$/, ''); const room = ($('#cfg-room').value || 'crew').trim().replace(/[.#$\[\]\/]/g, '') || 'crew';
      if (db && !/^https:\/\//.test(db)) { toast('The database URL should start with https://'); break; }
      cfg.db = db; cfg.room = room; LS.set('dle:db', db); LS.set('dle:room', room); S.loaded = false;
      Store.init(); render(); toast(db ? 'Connecting…' : 'Solo mode.'); break;
    }
    case 'goSolo': cfg.db = ''; LS.set('dle:db', ''); if (Store.es) Store.es.close(); Store.init(); render(); toast('Solo mode. Scores stay in this browser.'); break;
    case 'export': {
      const blob = new Blob([JSON.stringify(S.data, null, 2)], { type: 'application/json' });
      const u = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = u; link.download = `daily-dle-${cfg.room}-${dayKey()}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); break;
    }
  }
});

document.addEventListener('input', (ev) => {
  const el = ev.target; const a = el.dataset.action; if (!a || !sheet && ['numv', 'tmin', 'tsec', 'board', 'sheetPaste'].includes(a)) return;
  if (a === 'numv') { sheet.draft.v = el.value === '' ? null : +el.value; sheet.draft.f = false; refreshPreview(); }
  if (a === 'tmin' || a === 'tsec') {
    const mi = +($('[data-action="tmin"]').value || 0); const se = +($('[data-action="tsec"]').value || 0);
    sheet.draft.v = mi * 60 + se || null; sheet.draft.f = false; refreshPreview();
  }
  if (a === 'board') {
    const b = toArr(sheet.draft.b).slice(); const v = el.value.trim().toUpperCase();
    b[+el.dataset.i] = v === '' ? '' : v === 'X' ? 'X' : +v || ''; sheet.draft.b = b; refreshPreview();
  }
  if (a === 'sheetPaste') { sheet.paste = el.value; clearTimeout(el._t); el._t = setTimeout(() => applyParsed(el.value, false), 120); }
});

document.addEventListener('change', async (ev) => {
  const el = ev.target; const a = el.dataset.action; const id = el.dataset.id; if (!a) return;
  const ovPath = (k) => `overrides/${id}/${k}`;
  switch (a) {
    case 'hideDone': S.hideDone = el.checked; LS.set('dle:hideDone', S.hideDone); render(); break;
    case 'param': { const k = el.dataset.k; const isText = el.type === 'text'; const v = isText ? el.value.trim() : el.tagName === 'SELECT' ? el.value : +el.value; await Store.set(`${ovPath('params')}/${k}`, v); break; }
    case 'gurl': { let v = el.value.trim(); if (v && !/^https?:\/\//.test(v)) v = 'https://' + v; await Store.set(ovPath('url'), v || null); toast('Link saved for everyone.', true); break; }
    case 'gname': await Store.set(ovPath('name'), el.value.trim() || 'Untitled'); break;
    case 'gcat': await Store.set(ovPath('cat'), el.value); break;
    case 'gkind': { await Store.set(ovPath('kind'), el.value); await Store.set(ovPath('params'), null); break; }
    case 'goff': await Store.set(ovPath('off'), !el.checked); break;
    case 'pname': if (el.value.trim()) await Store.set(`players/${id}/name`, el.value.trim()); break;
    case 'import': {
      const f = el.files[0]; if (!f) break;
      try {
        const d = normalize(JSON.parse(await f.text()));
        if (!window.confirm('Replace everything with this backup?')) { el.value = ''; break; }
        await Store.set('players', d.players); await Store.set('overrides', d.overrides); await Store.set('days', d.days);
        toast('Backup restored.', true);
      } catch { toast('That file isn’t a Daily Dle backup.'); }
      break;
    }
  }
});

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') { if (sheet) closeSheet(); else if (!$('#modal').hidden && S.me && player(S.me)) closeWho(); }
  if (ev.key === 'Enter' && ev.target.id === 'new-name') $('[data-action="join"]')?.click();
});

document.addEventListener('paste', (ev) => {
  const t = ev.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  const txt = ev.clipboardData?.getData('text') || ''; if (!txt.trim()) return;
  ev.preventDefault(); applyParsed(txt, true);
});

/* Back from a game tab → pop the score sheet for it. */
function onReturn() {
  if (document.visibilityState !== 'visible' || !S.pending) return;
  const { id, t } = S.pending; S.pending = null;
  if (Date.now() - t < 2500 || sheet || !S.me) return;
  if (entry(S.date, S.me, id)) return;
  const g = gameById(id); openSheet(id, null, `Welcome back. How did <b>${esc(g?.name)}</b> go? Paste the share text or tap your score.`);
}
document.addEventListener('visibilitychange', onReturn);
window.addEventListener('focus', onReturn);

/* Roll over to the new day at midnight if the tab is left open. */
setInterval(() => { const k = dayKey(); if (S.today !== k) { const was = S.today; S.today = k; if (was && S.date === was) { S.date = k; render(); } } }, 30000);
S.today = dayKey();

/* ───────────────────────── boot ───────────────────────── */
Store.init();
render();
if (cfg.db) setTimeout(() => { if (!S.loaded) { S.loaded = true; render(); } }, 6000);
})();
