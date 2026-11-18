/* ILLUMÉNOCTIS — the way in. Sign in with your ID (or make one; the first ID made is
   the owner's), then the directory is read from the shared database and the dashboard
   opens already signed in as you. */
(function () {
'use strict';
const CFG = window.ILLU_CONFIG;
const sb = window.supabase.createClient(CFG.url, CFG.key, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'illu.auth.' + ((String(CFG.url).match(/\/\/([a-z0-9]+)\./) || [])[1] || 'x') },   // 1.2.217: one sign-in per Supabase project
  /* 1.2.216: every request is counted (and can be paused) by the download meter */
  global: window.IlluNet ? { fetch: window.IlluNet.fetch } : {}
});
window.__sb = sb;
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

const KO = LS.get('illum.lang') === 'ko';
const W = KO ? {
  open: '여는 중…', who: 'ID로 로그인', pick: '이름을 고르고 비밀번호를 입력하세요.', pw: '비밀번호', signin: '로그인',
  make: '새 ID 만들기', have: '이미 ID가 있어요', name: '이름', colour: '내 색', pw4: '비밀번호 · 4자 이상', create: 'ID 만들기',
  first: '처음 만든 ID가 관리자가 되며, 비밀번호를 재설정할 수 있습니다.', wrong: '이름 또는 비밀번호가 틀렸습니다. 비밀번호를 잊었다면 관리자(Paul)에게 새 비밀번호를 받으세요.',
  taken: '이미 있는 이름입니다.', ctaken: '이미 쓰고 있는 색입니다.', short: '비밀번호는 4자 이상이어야 합니다.',
  noname: '이름을 입력하세요.', nopick: '이름을 선택하세요.', net: '공유 데이터베이스에 연결할 수 없습니다. 인터넷 연결을 확인하세요.',
  loading: '디렉터리를 불러오는 중…'
} : {
  open: 'Opening…', who: 'Sign in with your ID', pick: 'Pick your name and type your password.', pw: 'Password', signin: 'Sign in',
  make: 'Create a new ID', have: 'I already have an ID', name: 'Your name', colour: 'Your colour', pw4: 'Password · at least 4 characters', create: 'Create ID',
  first: 'The first ID made becomes the owner, who can reset passwords.', wrong: 'Wrong name or password. Forgot it? Ask the Admin (Paul) to set a new one for you.',
  taken: 'That name is already taken.', ctaken: 'That colour is already taken.', short: 'The password needs at least 4 characters.',
  noname: 'Please type a name.', nopick: 'Please pick your name.', net: 'Could not reach the shared database. Check the internet connection.',
  loading: 'Reading the directory…'
};
// the dashboard's eight ID colours
const IDC = {
  lilac: '#C7B6E6', periwinkle: '#AEBFEC', sky: '#A4CCE9', aqua: '#A6D2D9',
  mauve: '#DCB7CE', stone: '#C4BFD0', slate: '#ABB6C6', clay: '#D8C3AF'
};
const th = LS.get('illum.theme');
if (th === 'dim' || th === 'sepia') document.documentElement.dataset.theme = th;
if (KO) document.documentElement.lang = 'ko';
if (window.illu) window.illu.info().then(i => { $('#ver').textContent = i.version; });

function errText(e) {
  const m = String((e && (e.message || e.error_description)) || e || '');
  if (/name_taken/.test(m)) return W.taken;
  if (/color_taken/.test(m)) return W.ctaken;
  if (/password_too_short/.test(m)) return W.short;
  if (/name_invalid/.test(m)) return W.noname;
  if (/Invalid login|invalid_grant|credentials/i.test(m)) return W.wrong;
  if (/fetch|network|Failed/i.test(m)) return W.net;
  return m;
}

async function show(mode) {
  document.documentElement.classList.add('gform');
  const { data: list, error } = await sb.rpc('list_people');
  const ppl = error ? [] : (list || []);
  if (!mode) mode = ppl.length ? 'in' : 'new';
  const box = $('#box');
  if (mode === 'in') {
    box.innerHTML = '<h2>' + esc(W.who) + '</h2><p class="lead">' + esc(W.pick) + '</p>' +
      '<div class="people">' + ppl.map(p => '<button type="button" data-nm="' + esc(p.name) + '" aria-pressed="false"><i style="background:' + (IDC[p.color] || IDC.lilac) + '"></i>' + esc(p.name) + '</button>').join('') + '</div>' +
      '<label class="fl" for="pw">' + esc(W.pw) + '</label><input id="pw" type="password" autocomplete="current-password">' +
      '<div class="err" id="err">' + (error ? esc(errText(error)) : '') + '</div>' +
      '<div class="acts"><button type="button" class="lnk" id="tonew">' + esc(W.make) + '</button><button type="button" class="btn pri" id="go">' + esc(W.signin) + '</button></div>';
    let pick = ppl.length === 1 ? ppl[0].name : '';
    const paint = () => box.querySelectorAll('.people button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.nm === pick)));
    paint();
    box.querySelectorAll('.people button').forEach(b => b.addEventListener('click', () => { pick = b.dataset.nm; paint(); $('#pw').focus(); }));
    const go = async () => {
      const er = $('#err');
      if (!pick) { er.textContent = W.nopick; return; }
      $('#go').disabled = true; er.textContent = '';
      const { data: em, error: e1 } = await sb.rpc('login_email', { p_name: pick });
      if (e1) { er.textContent = errText(e1); $('#go').disabled = false; return; }
      const { data, error: e2 } = await sb.auth.signInWithPassword({ email: em, password: $('#pw').value });
      if (e2) { er.textContent = errText(e2); $('#go').disabled = false; return; }
      enter(data.session);
    };
    $('#go').addEventListener('click', go);
    $('#pw').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    $('#tonew').addEventListener('click', () => show('new'));
    setTimeout(() => (pick ? $('#pw') : box.querySelector('.people button') || $('#pw')).focus(), 30);
  } else {
    const taken = new Set(ppl.map(p => p.color));
    let col = Object.keys(IDC).find(c => !taken.has(c)) || 'lilac';
    box.innerHTML = '<h2>' + esc(W.make) + '</h2>' + (ppl.length ? '' : '<p class="lead">' + esc(W.first) + '</p>') +
      '<label class="fl" for="nm">' + esc(W.name) + '</label><input id="nm" type="text" maxlength="24" autocomplete="off">' +
      '<label class="fl">' + esc(W.colour) + '</label><div class="sw">' + Object.entries(IDC).map(([k, v]) =>
        '<button type="button" data-c="' + k + '" title="' + k + '" style="background:' + v + '" aria-pressed="' + (k === col) + '"' + (taken.has(k) ? ' disabled' : '') + '></button>').join('') + '</div>' +
      '<label class="fl" for="npw">' + esc(W.pw4) + '</label><input id="npw" type="password" autocomplete="new-password">' +
      '<div class="err" id="err">' + (error ? esc(errText(error)) : '') + '</div>' +
      '<div class="acts">' + (ppl.length ? '<button type="button" class="lnk" id="toin">' + esc(W.have) + '</button>' : '<span></span>') + '<button type="button" class="btn pri" id="go">' + esc(W.create) + '</button></div>';
    box.querySelectorAll('.sw button').forEach(b => b.addEventListener('click', () => { col = b.dataset.c; box.querySelectorAll('.sw button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }));
    if ($('#toin')) $('#toin').addEventListener('click', () => show('in'));
    const go = async () => {
      const nm = $('#nm').value.trim(), pw = $('#npw').value, er = $('#err');
      if (!nm) { er.textContent = W.noname; return; }
      if (pw.length < 4) { er.textContent = W.short; return; }
      $('#go').disabled = true; er.textContent = '';
      const { data, error: e1 } = await sb.rpc('sign_up', { p_name: nm, p_password: pw, p_color: col });
      if (e1) { er.textContent = errText(e1); $('#go').disabled = false; return; }
      const { data: d2, error: e2 } = await sb.auth.signInWithPassword({ email: data.email, password: pw });
      if (e2) { er.textContent = errText(e2); $('#go').disabled = false; return; }
      enter(d2.session);
    };
    $('#go').addEventListener('click', go);
    $('#npw').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    setTimeout(() => $('#nm').focus(), 30);
  }
}

/* The directory, in the shape the dashboard reads it: agencies, each with its boards,
   each board with its models as [name, "|" + profile address]. */
function buildAG(ags, bds, mds, extra) {
  const byA = new Map(), byB = new Map();
  for (const b of bds) { if (!byA.has(b.agency_id)) byA.set(b.agency_id, []); byA.get(b.agency_id).push(b); }
  for (const m of mds) { if (m.gone) continue; if (!byB.has(m.board_id)) byB.set(m.board_id, []); byB.get(m.board_id).push(m); }
  return ags.map(a => {
    let boards = (byA.get(a.id) || []).filter(b => b.active !== false).map(b => ({
      d: b.division || '', t: b.tier || 'unlabelled', g: b.gender || '?', p: '', u: b.url || '',
      m: (byB.get(b.id) || []).map(m => [m.name || '', '|' + (m.profile_url || '')])
    }));
    /* boards the program's crawler found or re-read (docs crawlb/<agency id>): a re-read board
       takes the place of the stored one with the same address, a new one is added */
    const x = extra && extra.get(String(a.id));
    if (x && Array.isArray(x.boards)) {
      for (const nb of x.boards) {
        if (!nb || !nb.u || !Array.isArray(nb.m)) continue;
        const b = { d: String(nb.d || ''), t: String(nb.t || 'unlabelled'), g: String(nb.g || '?'), p: '', u: String(nb.u), m: nb.m.filter(m => Array.isArray(m)).map(m => [String(m[0] || ''), String(m[1] || '')]), crawled: true };
        if (nb.x === 'talent' || nb.x === 'model') b.x = nb.x;   // a Talent / plain Model board (sex not stated)
        const i = boards.findIndex(o => o.u.replace(/\/$/, '') === b.u.replace(/\/$/, ''));
        if (i >= 0) boards[i] = b; else boards.push(b);
      }
    }
    return {
      id: a.id, site: a.website || '', name: a.name, domain: a.domain || '', country: a.country || '', city: a.city || '', boards,
      n: boards.reduce((s, b) => s + b.m.length, 0), region: a.region || 'Unknown', at: a.agency_type || '', added: a.created_at || '',
      tiers: [...new Set(boards.map(b => b.t))], sexes: [...new Set(boards.map(b => b.g))]
    };
  });
}
/* A whole table, 1000 rows a request. The row count is asked first, then up to six pages are
   fetched at the same time instead of one after another (27,000 models = 28 pages). */
async function readAll(table, cols) {
  const page = (from) => sb.from(table).select(cols).order('id').range(from, from + 999).then(({ data, error }) => { if (error) throw error; return data || []; });
  let total = null;
  try { const r = await sb.from(table).select('id', { count: 'exact', head: true }); if (!r.error && typeof r.count === 'number') total = r.count; } catch (e) {}
  if (total == null) {                       // no count: the old way, page by page
    const out = [];
    for (let from = 0; ; from += 1000) { const d = await page(from); out.push(...d); if (d.length < 1000) break; }
    return out;
  }
  const starts = []; for (let f = 0; f < total; f += 1000) starts.push(f);
  const parts = new Array(starts.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(6, starts.length) }, async () => { while (next < starts.length) { const i = next++; parts[i] = await page(starts[i]); } }));
  const out = []; for (const d of parts) out.push(...d);
  /* rows added while reading: one more page past the count */
  if (out.length >= total && total % 1000 === 0 && total) { const d = await page(total); out.push(...d); }
  return out;
}
/* 1.2.216 (17 Nov 2026): the directory (2,400 agencies, 27,700 models: about 5 MB) and the crawler's boards
   (about 6 MB) used to be downloaded in full every time the program opened. They are now kept on this computer
   (IlluCache) and read again only when they changed: the directory carries a version number that the database
   raises on every change (dir_version), and the crawler's boards are brought up to date with just the changed
   documents. If the copy here can't be used, everything is read as before. */
const KC = window.IlluCache || null;
async function directory() {
  let v = null;
  try { const r = await sb.from('dir_version').select('v').eq('id', 1).maybeSingle(); if (!r.error && r.data) v = r.data.v; } catch (e) {}
  if (KC && v != null) {
    const kept = await KC.getMeta('dir');
    if (kept && kept.v === v && Array.isArray(kept.mds) && kept.mds.length) return kept;
  }
  const [ags, bds, mds, ppl] = await Promise.all([
    // agency_type came later; a database without it still opens
    readAll('agencies', 'id,name,domain,country,city,region,website,agency_type,created_at').catch(() => readAll('agencies', 'id,name,domain,country,city,region,website,agency_type')).catch(() => readAll('agencies', 'id,name,domain,country,city,region,website')),   /* 1.2.223: created_at for the NEW tag */
    readAll('boards', 'id,agency_id,division,gender,tier,url,active'),
    readAll('models', 'id,board_id,agency_id,name,profile_url,gone'),
    readAll('people', 'id,is_admin')
  ]);
  const d = { v, ags, bds, mds, ppl };
  if (KC && v != null) await KC.setMeta('dir', d);
  return d;
}
const later = (a, b) => (!a ? b : !b ? a : (Date.parse(b) > Date.parse(a) ? b : a));
async function keptDocs(colls) {
  const k = KC ? await KC.getMeta('gate.docs') : null;
  const fresh = k && k.sync && k.checked && Date.now() - k.checked < 25 * 86400e3 && colls.every(c => Array.isArray((k.rows || {})[c]));
  if (fresh) {
    try {
      const since = new Date(Date.parse(k.sync) - 120e3).toISOString();
      const nowR = await sb.rpc('illu_now');
      const qnow = !nowR.error && nowR.data ? new Date(Date.parse(String(nowR.data).replace(' ', 'T').replace(/\+00$/, '+00:00')) - 60e3).toISOString() : null;
      /* which documents changed (path and time only), then just those this computer doesn't have in that version */
      const ch = await sb.from('docs').select('path,coll,updated_at').in('coll', colls).gt('updated_at', since).order('updated_at').limit(1000);
      const tb = await sb.from('doc_tombs').select('path,coll,deleted_at').in('coll', colls).gt('deleted_at', since);
      if (!ch.error && !tb.error && ch.data.length < 1000) {   // 1000 or more: read afresh (the database answers at most 1000 rows)
        let sync = k.sync;
        for (const c of colls) k.rows[c] = new Map(k.rows[c].map(r => [r.path, r]));
        const need = [];
        for (const r of ch.data) { sync = later(sync, r.updated_at); const h = k.rows[r.coll].get(r.path); if (!h || h.u !== r.updated_at) need.push(r.path); }
        for (let i = 0; i < need.length; i += 100) {
          const g = await sb.from('docs').select('path,id,coll,data,updated_at').in('path', need.slice(i, i + 100));
          if (g.error) throw g.error;
          for (const r of g.data) k.rows[r.coll].set(r.path, { path: r.path, id: r.id, data: r.data, u: r.updated_at });
        }
        for (const t of tb.data) { sync = later(sync, t.deleted_at); if (k.rows[t.coll]) k.rows[t.coll].delete(t.path); }
        for (const c of colls) k.rows[c] = [...k.rows[c].values()];
        k.sync = qnow && Date.parse(qnow) > Date.parse(sync) ? qnow : sync; k.checked = Date.now();
        if (KC) KC.setMeta('gate.docs', k);
        return k.rows;
      }
    } catch (e) {}
  }
  let mark = null;
  try { const r = await sb.from('docs').select('updated_at').order('updated_at', { ascending: false }).limit(1); if (!r.error && r.data && r.data[0]) mark = r.data[0].updated_at; } catch (e) {}
  const rows = {};
  for (const c of colls) {
    rows[c] = [];
    for (let from = 0; ; from += 500) {
      const r = await sb.from('docs').select('path,id,data,updated_at').eq('coll', c).order('id').range(from, from + 499);
      if (r.error) { mark = null; break; }
      rows[c].push(...(r.data || []).map(x => ({ path: x.path, id: x.id, data: x.data, u: x.updated_at })));
      if ((r.data || []).length < 500) break;
    }
  }
  if (KC && mark) KC.setMeta('gate.docs', { sync: mark, checked: Date.now(), rows });
  return rows;
}
let entering = false;
async function enter(session) {
  if (entering || !session) return;
  entering = true;
  $('#box').innerHTML = '<p class="lead">' + esc(W.loading) + '</p>';
  try {
    const [D, K] = await Promise.all([directory(), keptDocs(['crawlb', 'agdel']).catch(() => ({ crawlb: [], agdel: [] }))]);
    const { ags, bds, mds, ppl } = D;
    const CRB = K.crawlb || [], DEL = K.agdel || [];
    const extra = new Map((CRB || []).map(d => [String(d.id), d.data || {}]));
    const admin = (ppl.find(p => p.is_admin) || {}).id || '';
    /* agencies removed from the Directory (docs agdel/<id>) come marked, so they can be put back */
    const gone = new Set((DEL || []).map(d => String(d.id)));
    const ag = buildAG(ags, bds, mds, extra);
    for (const a of ag) if (gone.has(String(a.id))) a.removed = true;
    if (window.illu) {
      await window.illu.setDir({ ag, admin, me: session.user.id });
      await window.illu.setToken(session.access_token);
    }
    LS.set('illum.me', session.user.id);
    location.replace('dash/index.html');
  } catch (e) {
    entering = false; document.documentElement.classList.add('gform');
    $('#box').innerHTML = '<p class="err">' + esc(errText(e)) + '</p><div class="acts"><span></span><button type="button" class="btn pri" id="retry">OK</button></div>';
    $('#retry').addEventListener('click', () => location.reload());
  }
}

$('#wait').textContent = W.open;
sb.auth.getSession().then(({ data }) => {
  if (data && data.session) enter(data.session); else show();
}, () => show());
})();
