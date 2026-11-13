/* An error from the network or a busy server (offline, timed out, 5xx, too many requests) says
   nothing about the site: such a result is never kept as "failed", so it is tried again later. */
window.illuTransient = msg => /net::|ERR_[A-Z_]+|timed? ?out|timeout|ECONN|ENOTFOUND|EAI_AGAIN|socket|network|offline|abort|page -\d+|\b(429|5\d\d)\b|stopped:/i.test(String(msg || ''));
/* ILLUMÉNOCTIS — what the program adds to the dashboard, loaded after its own code.
   The dashboard's ID panel keeps its look; underneath, its password, sign-out and the
   owner's reset now act on the program's real sign-in. */
(function () {
'use strict';
const sb = window.__illuSb;
const $ = s => document.querySelector(s);
const escH = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* a new password typed into "You" goes to the sign-in, never onto a document */
try {
  window.pwHash = async function (pw, salt) {
    if (salt !== undefined) return { h: 'program', s: salt };   // nothing in the program checks a password this way
    const { error } = await sb.auth.updateUser({ password: String(pw) });
    if (error) throw error;
    return { h: 'program', s: '' };
  };
} catch (e) { console.error(e); }

/* "Sign out" (the dashboard calls it Forget) ends the program's session */
document.addEventListener('click', e => {
  const f = e.target.closest && e.target.closest('#idforget');
  if (f) { e.preventDefault(); e.stopImmediatePropagation(); window.__illuSignOut(); }
}, true);

/* the owner's "Reset password": type the new one here and it is set at once */
document.addEventListener('click', e => {
  const r = e.target.closest && e.target.closest('[data-reset]');
  if (!r) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const row = r.closest('.idperson');
  if (!row || row.nextElementSibling && row.nextElementSibling.classList.contains('illupw')) return;
  const pid = r.dataset.reset;
  const nmEl = row.querySelector('.idpn');
  const name = nmEl ? nmEl.textContent.trim() : '';
  if (!name) return;
  row.insertAdjacentHTML('afterend', '<div class="illupw"><input type="password" maxlength="64" placeholder="New password for ' + escH(name) +
    ' (4 or more)"><button type="button" class="idbtn">Set</button><s></s></div>');
  const box = row.nextElementSibling, inp = box.querySelector('input'), msg = box.querySelector('s');
  inp.focus();
  const go = async () => {
    if (inp.value.length < 4) { msg.textContent = 'At least 4 characters.'; return; }
    msg.textContent = 'Setting…';
    const { error } = await sb.rpc('admin_reset_password', { p_name: name, p_password: inp.value });
    if (error) { msg.textContent = 'Could not set it: ' + error.message; return; }
    msg.textContent = 'Done — ' + name + ' signs in with the new password.';
    inp.value = ''; inp.disabled = true;
  };
  box.querySelector('button').addEventListener('click', go);
  inp.addEventListener('keydown', k => { if (k.key === 'Enter') go(); });
}, true);

/* deleting your own ID is the owner's job in the program (it also closes the sign-in) */
const st = document.createElement('style');
st.textContent = '#iddelwrap{display:none!important}' +
  /* the top bar's main buttons (Download this list, + Create a new card, Contact sheet...) a size smaller */
  '#abtools button.abnew{padding:5px 10px;border-radius:7px;font-size:10.5px;letter-spacing:.05em}' +
  /* Agency type chips on Directory rows */
  '.atchips{display:inline-flex;gap:4px;margin-left:8px;flex-wrap:wrap;vertical-align:middle}' +
  '.atchip{font-family:var(--mono);font-size:9px;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;padding:2px 8px;border-radius:20px;border:1px solid var(--line2);background:linear-gradient(180deg,rgba(255,255,255,.72),rgba(255,255,255,0)),#EDEAF1;color:var(--mut)}' +
  '.atchip[data-at="modeling"]{background:linear-gradient(180deg,rgba(255,255,255,.72),rgba(255,255,255,0)),#E3E7F4;color:#33407A}' +
  '.atchip[data-at="mother"]{background:linear-gradient(180deg,rgba(255,255,255,.72),rgba(255,255,255,0)),#F3E4EA;color:#7A3350}' +
  '.atchip[data-at="talent"]{background:linear-gradient(180deg,rgba(255,255,255,.72),rgba(255,255,255,0)),#DFEDE4;color:#2E6845}' +
  '.illupw{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:4px 0 10px 34px}' +
  '.illupw input{flex:1;min-width:160px;padding:6px 9px;border:1px solid var(--line);border-radius:7px;background:var(--surf2);color:var(--ink);font:13px var(--sans)}' +
  '.illupw s{text-decoration:none;flex-basis:100%;font-size:11.5px;color:var(--mut)}';
document.head.appendChild(st);
})();

/* ==================== Booking folders on this computer ====================
   A card in progress on the Booking tab gets its folder - BOOKING/<Model - Agency>/ with
   the eight numbered folders, on this computer and in Dropbox - as soon as its name and agency are filled in and have
   stopped changing for a few seconds. One folder per card on each computer: renaming a
   card later does not make a second folder. Cancelled cards get none. */
(function () {
  if (!window.illu || !window.illu.bookingFolder) return;
  const KEY = 'illu.bkfolders';
  const done = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) {} };
  const timers = new Map();
  const toast = msg => {
    let t = document.getElementById('illutoast');
    if (!t) { t = document.createElement('div'); t.id = 'illutoast'; document.body.appendChild(t); }
    t.textContent = msg; t.dataset.on = '1'; clearTimeout(t.__t); t.__t = setTimeout(() => { t.dataset.on = '0'; }, 4200);
  };
  window.__illuToast = toast;
  /* the Dropbox copy: kept apart, so cards whose computer folder was made before the Dropbox
     part existed get theirs too, under the very same folder name */
  const KEY2 = 'illu.bkdrop';
  const drop = (() => { try { return JSON.parse(localStorage.getItem(KEY2) || '{}') || {}; } catch (e) { return {}; } })();
  const save2 = () => { try { localStorage.setItem(KEY2, JSON.stringify(drop)); } catch (e) {} };
  const base = p => String(p || '').split(/[\\/]/).pop();
  let dropWarned = false, dropBusy = Promise.resolve();
  function dropResult(bid, d, quiet) {
    if (d && d.ok) { drop[bid] = d.path; save2(); return !d.existed; }
    if (!dropWarned) { dropWarned = true; console.warn('[booking] Dropbox folder not made:', d && d.why);
      if (!quiet) toast('Dropbox folder could not be made (' + ((d && d.why) || 'unknown') + ')'); }
    return false;
  }
  async function make(bid, c) {
    if (done[bid]) return;
    const r = await window.illu.bookingFolder(c.nm, c.ag);
    if (r && r.ok) {
      done[bid] = r.path; save();
      const newDrop = dropResult(bid, r.drop, true);
      if (!drop[bid]) toast('Folder made on this computer only: BOOKING › ' + base(r.path) + ' - Dropbox: ' + ((r.drop && r.drop.why) || 'not found'));
      else if (!r.existed || newDrop) toast('Folder made: BOOKING › ' + base(r.path) + ' (this computer + Dropbox)');
    }
  }
  function makeDrop(bid) {
    if (drop[bid] || !done[bid] || !window.illu.bookingDropbox) return;
    dropBusy = dropBusy.then(async () => {
      if (drop[bid] || dropWarned) return;
      const d = await window.illu.bookingDropbox(base(done[bid]));
      if (dropResult(bid, d)) toast('Folder made in Dropbox: BOOKING › ' + base(d.path));
    }).catch(() => {});
  }
  claude.use('db').then(db => {
    if (!db) return;
    db.collection('book').onSnapshot(snap => {
      for (const d of snap.docs) {
        const c = d.data(); if (!c) continue;
        const bid = d.id;
        const nm = String(c.nm || '').trim(), ag = String(c.ag || '').trim();
        if (done[bid] && c.st === 'proc') makeDrop(bid);
        if (done[bid] || c.st !== 'proc' || !nm || !ag) { clearTimeout(timers.get(bid)); continue; }
        clearTimeout(timers.get(bid));
        timers.set(bid, setTimeout(() => make(bid, { nm, ag }), 6000));
      }
    }, () => {});
  });
})();

/* ==================== Contact agency (Hiworks) ====================
   Email is written from the agency's contact list. A model card's ✉ chip opens her
   agency's contacts; the ✉ beside a contact opens Hiworks addressed to that person, the
   letter written about the model whose card it was opened from. Opened from the Directory
   (no model card), the email is addressed but has no letter. A model anyone has ruled out
   (red) is never put in an email. Nothing is ever sent: Hiworks opens filled in and the
   person presses Send. */
(function () {
  let IDX = null;
  function index() {
    if (IDX) return IDX;
    IDX = new Map();
    try {
      for (const a of AG) for (const b of a.boards || []) for (const m of b.m || []) {
        const raw = String(m[1] || ''); const href = raw.charAt(0) === '|' ? raw.slice(1) : (b.p || '') + raw;
        IDX.set(normKey(href), { nm: m[0] || '', url: href, dom: a.domain, ag: a.name, g: b.g || '?' });
      }
    } catch (e) { console.error(e); }
    return IDX;
  }
  function infoOf(mk) {
    const key = mk.dataset.mk;
    const hit = index().get(key);
    if (hit) return Object.assign({ key }, hit);
    const url = mk.dataset.url || '';
    let dom = ''; try { dom = new URL(url).hostname.replace(/^www\./, ''); } catch (e) {}
    const a = (typeof AG !== 'undefined' ? AG : []).find(x => x.domain && dom && (dom === x.domain || dom.endsWith('.' + x.domain)));
    return { key, nm: mk.dataset.nm || '', url, dom: a ? a.domain : dom, ag: a ? a.name : (String(mk.dataset.meta || '').split(' · ')[0] || dom), g: '?' };
  }
  const anyRed = key => { try { if (window.__illuVoteState) return window.__illuVoteState(key) === 'cxl'; return lampAny(key, 'r'); } catch (e) { return false; } };

  /* the words */
  const SUBJECT = 'MDI MODEL MANAGEMENT - Model Inquiry (Seoul, South Korea)';
  const escT = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function letter(agName, models) {
    const me = (typeof meRec === 'function' && meRec()) || {};
    const one = models.length === 1;
    const g = one ? models[0].g : '';
    const [sub, pos] = g === 'F' ? ['she', 'her'] : g === 'M' ? ['he', 'his'] : ['they', 'their'];
    const L = [
      'Dear ' + agName + ' Team,', '',
      'I hope you are doing well.', '',
      'My name is ' + (me.n || '') + ', and I am an international booker at MDI Model Management in Seoul, South Korea.', '',
      'I came across your website and am interested in the following ' + (one ? 'model' : 'models') + ':', ''
    ];
    for (const m of models) { L.push(String(m.nm || '').toUpperCase()); L.push('\u0000' + m.url); L.push(''); }
    if (one) {
      L.push('Could you kindly let me know if ' + sub + ' ' + (sub === 'they' ? 'are' : 'is') + ' available for placement in South Korea?', '');
      L.push('If so, I would appreciate it if you could share ' + pos + ' full book, recent snaps, and videos.', '');
    } else {
      L.push('Could you kindly let me know if they are available for placement in South Korea?', '');
      L.push('If so, I would appreciate it if you could share their full books, recent snaps, and videos.', '');
    }
    L.push('Looking forward to hearing from you.', '', 'Thank you!', '');
    const html = L.map(l => l === '' ? '<p><br></p>' : l.charAt(0) === '\u0000'
      ? '<p><a href="' + escT(l.slice(1)) + '">' + escT(l.slice(1)) + '</a></p>' : '<p>' + escT(l) + '</p>').join('');
    const text = L.map(l => l.replace('\u0000', '')).join('\n');
    return { html, text };
  }
  window.__illuLetter = letter;

  function compose(job) {
    if (window.illu && window.illu.hiworks) window.illu.hiworks(job);
    else (window.__illuComposed = window.__illuComposed || []).push(job);
  }
  window.__illuCompose = compose;
  /* 1.2.171 (user: "When an email gets sent out via Hiworks regarding a model, I want the Email Stage to automatically
     change the status of the Email to Processing"): the program confirms the email in Hiworks' Sent side (main.js);
     each model in it that has a booking card gets Email = In process, unless it is already In process or Done */
  function emailSent(d) {
    const done = [];
    for (const k of (d && d.about) || []) {
      let c = null; try { c = /^bid:/.test(k) ? BOOK.get(k.slice(4)) : (typeof bkForKey === 'function' ? bkForKey(k) : null); } catch (e) {}
      if (!c || !c.id) continue;
      const st = (c.s && c.s.email) || {}, now = (st.p === 'g' || st.p === 'y') ? st.p : (st.d ? 'g' : '');
      if (now) continue;
      try { window.__illuSetStage && window.__illuSetStage(c.id, 'email', 'y'); done.push(c.nm || ''); } catch (e) {}
    }
    if (done.length) { try { const t = document.createElement('div'); t.className = 'illusenttoast'; t.setAttribute('role', 'status'); t.textContent = 'Email sent · ' + done.join(', ') + ' — Email stage is now In process'; document.body.appendChild(t); setTimeout(() => t.remove(), 6000); } catch (e) {} }
    return done;
  }
  window.__illuEmailSent = emailSent;
  try { if (window.illu && window.illu.onHiworksSent) window.illu.onHiworksSent(emailSent); } catch (e) {}

  /* ---------- email templates (docs mailtpl/<id>: {name, subject, body, kind, by, at, o}) ---------- */
  const TPL = new Map();
  const BUILTIN = { id: 'model-inquiry', name: 'Model inquiry (Seoul)', subject: SUBJECT, kind: 'inquiry', o: 0, note: 'Lists the models you picked; says she / he / they by itself' };
  (function listen() {
    if (typeof DB === 'undefined' || !DB) { setTimeout(listen, 800); return; }
    try { DB.collection('mailtpl').onSnapshot(sn => { TPL.clear(); for (const x of (sn.docs || [])) { const v = typeof docOf === 'function' ? docOf(x) : x.data(); if (v && !v.off) TPL.set(x.id, Object.assign({ id: x.id }, v)); } paintPick(); }, () => {}); } catch (e) {}
    /* the template the user had saved becomes the first entry, for everyone */
    setTimeout(async () => { try { if (!TPL.has(BUILTIN.id) && typeof SIGNED === 'function' && SIGNED()) { const snap = await DB.doc('mailtpl/' + BUILTIN.id).get(); const v = typeof docOf === 'function' ? docOf(snap) : null; if (!v) await DB.doc('mailtpl/' + BUILTIN.id).set({ name: BUILTIN.name, subject: BUILTIN.subject, kind: 'inquiry', body: '', o: 0, by: (typeof ME !== 'undefined' && ME) || '', at: new Date().toISOString() }); } } catch (e) {} }, 6000);
  })();
  const list = () => { const l = [...TPL.values()]; if (!l.some(t => t.id === BUILTIN.id)) l.push(BUILTIN); return l.sort((p, q) => (p.o || 0) - (q.o || 0) || String(p.name).localeCompare(String(q.name))); };
  function fill(t, agName, ms) {
    if (t.kind === 'inquiry' && !String(t.body || '').trim()) return Object.assign({ subject: t.subject || SUBJECT }, ms.length ? letter(agName, ms) : letter(agName, []));
    const me = (typeof meRec === 'function' && meRec()) || {};
    const one = ms.length === 1, g = one ? ms[0].g : '';
    const [sub, pos] = g === 'F' ? ['she', 'her'] : g === 'M' ? ['he', 'his'] : ['they', 'their'];
    /* 1.2.162: grammar that follows how many models (one: "Is she", "model"; more: "Are they", "models") - {Is} {She} {Her} capitalised at a sentence start */
    const isW = sub === 'they' ? 'are' : 'is', cap = w => w.charAt(0).toUpperCase() + w.slice(1);
    const rep = x => String(x || '').replace(/\{agency\}/gi, agName || '').replace(/\{my name\}/gi, me.n || '').replace(/\{model\(s\)\}/gi, one ? 'model' : 'models').replace(/\{model\}/g, one ? String(ms[0].nm || '') : 'the models')
      .replace(/\{Is\}/g, cap(isW)).replace(/\{is\}/g, isW).replace(/\{She\}/g, cap(sub)).replace(/\{she\}/g, sub).replace(/\{Her\}/g, cap(pos)).replace(/\{her\}/g, pos)
      .replace(/\{date\}/gi, new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
    const lines = [];
    /* {models}: each name as the agency writes it, its link under it, a blank line between */
    for (const l of rep(t.body).split('\n')) { if (/\{models\}/i.test(l)) { ms.forEach((m, i) => { lines.push(String(m.nm || '')); lines.push('\u0000' + m.url); if (i < ms.length - 1) lines.push(''); }); } else lines.push(l); }
    const html = lines.map(l => l === '' ? '<p><br></p>' : l.charAt(0) === '\u0000' ? '<p><a href="' + escT(l.slice(1)) + '">' + escT(l.slice(1)) + '</a></p>' : '<p>' + escT(l) + '</p>').join('');
    return { subject: rep(t.subject), html, text: lines.map(l => l.replace('\u0000', '')).join('\n') };
  }
  let PK = null;   /* {addr, agName, ms, el, edit} */
  /* 1.2.160 (user: "allow me to also select multiple models from that agency ... to add onto the email"): the agency's
     models, ticked in the same box; the one the email was opened for is ticked already */
  function agModels(dom) {
    const a = (typeof AG !== 'undefined' ? AG : []).find(x => x.domain === dom); if (!a) return [];
    const out = new Map();
    for (const b of a.boards || []) for (const m of b.m || []) { const raw = String(m[1] || ''); const url = raw.charAt(0) === '|' ? raw.slice(1) : (b.p || '') + raw; let key = url; try { key = normKey(url); } catch (e) {} if (!out.has(key)) out.set(key, { key, nm: m[0] || '', url, g: b.g || '?', ag: a.name, bd: b.d || '' }); }
    return [...out.values()].sort((p, q) => String(p.nm).localeCompare(String(q.nm), undefined, { sensitivity: 'base', numeric: true }));
  }
  function tplPick(anchor, addr, agName, ms, dom) { PK = { addr, agName, ms: (ms || []).slice(), dom: dom || '', edit: null, open: false, q: '', cc: [] }; let box = document.getElementById('illutpl'); if (!box) { box = document.createElement('div'); box.id = 'illutpl'; document.body.appendChild(box); } box.hidden = false; paintPick(); }
  function paintPick() {
    const box = document.getElementById('illutpl'); if (!box || box.hidden || !PK) return;
    const me = (typeof ME !== 'undefined' && ME) || '';
    let last = ''; try { last = localStorage.getItem('illu.tpl.last.' + me) || ''; } catch (e) {}
    const L = list(); if (last) L.sort((p, q) => (q.id === last) - (p.id === last));
    if (PK.edit) {
      const t = PK.edit;
      box.innerHTML = '<div class="tplveil" data-tplx></div><div class="tplbox" role="dialog" aria-modal="true"><h3>' + (t.id ? 'Edit template' : 'New template') + '</h3>' +
        '<label>Name<input id="tplnm" maxlength="60" value="' + escT(t.name || '') + '" placeholder="e.g. Follow-up after no reply"></label>' +
        '<label>Subject<input id="tplsub" maxlength="200" value="' + escT(t.subject || '') + '"></label>' +
        '<label>Email<textarea id="tplbody" rows="12" placeholder="Dear {agency} Team,&#10;&#10;…&#10;&#10;{models}&#10;&#10;Thank you!">' + escT(t.body || (t.kind === 'inquiry' ? fill(t, '{agency}', []).text.replace(/following models:\n\n/, 'following models:\n\n{models}\n').replace(/My name is [^,]*,/, 'My name is {my name},') : '')) + '</textarea></label>' +
        '<p class="tplhelp">Filled in for you: <b>{agency}</b> the agency · <b>{my name}</b> your name · <b>{models}</b> the model names with their links · <b>{model}</b> one model\'s name · <b>{model(s)}</b> model or models · <b>{she}</b> / <b>{her}</b> / <b>{is}</b> she·he·they, her·his·their, is·are (write <b>{She}</b> <b>{Is}</b> at the start of a sentence) · <b>{date}</b> today. Your Hiworks signature is added by Hiworks.</p>' +
        '<div class="tplacts">' + (t.id && t.id !== BUILTIN.id ? '<button type="button" class="tpldel" data-tpldel="' + escT(t.id) + '">Delete</button>' : '') + '<span></span><button type="button" data-tplback>Back</button><button type="button" class="tplgo" data-tplsave>Save</button></div></div>';
      setTimeout(() => { const i = box.querySelector('#tplnm'); if (i) i.focus(); }, 30);
      return;
    }
    box.innerHTML = '<div class="tplveil" data-tplx></div><div class="tplbox" role="dialog" aria-modal="true"><h3>Which email?</h3><p class="tplto">To <b>' + escT(PK.addr) + '</b>' + (PK.ms.length ? ' · about <b>' + escT(PK.ms.map(m => String(m.nm || '').toUpperCase()).join(', ')) + '</b>' : '') + '</p>' +
      '<div class="tpllist">' + L.map(t => '<div class="tplrow"><button type="button" class="tpluse" data-tpluse="' + escT(t.id) + '"><b>' + escT(t.name) + '</b><small>' + escT(t.subject || '') + (t.id === last ? ' · last used' : '') + '</small></button><button type="button" class="tpled" data-tpled="' + escT(t.id) + '" title="Edit">Edit</button>' + (t.id !== BUILTIN.id ? '<button type="button" class="tpled tpldx' + (PK.arm === t.id ? ' on' : '') + '" data-tpldel="' + escT(t.id) + '" title="Delete this template">' + (PK.arm === t.id ? 'Delete?' : 'Delete') + '</button>' : '') + '</div>').join('') +
      '<div class="tplrow"><button type="button" class="tpluse blank" data-tpluse=""><b>Blank email</b><small>Only the address — write it yourself</small></button></div></div>' +
      '<div class="tplacts"><button type="button" data-tplnew>+ New template</button><span></span><button type="button" data-tplx>Cancel</button></div></div>';
    /* the models in this email */
    const all = PK.dom ? agModels(PK.dom) : [];
    if (all.length) {
      const on = new Set(PK.ms.map(m => m.key)), q = PK.q.toLowerCase();
      const shown = all.filter(m => !q || String(m.nm).toLowerCase().includes(q));
      const sec = '<div class="tplms"><div class="tplmsh"><b>Models in this email · ' + PK.ms.length + '</b><button type="button" data-tplmore>' + (PK.open ? 'Done' : '+ Add models from ' + escT(PK.agName)) + '</button></div>' +
        (PK.ms.length ? '<div class="tplchips">' + PK.ms.map(m => '<span class="tplchip">' + escT(String(m.nm).toUpperCase()) + '<button type="button" data-tploff="' + escT(m.key) + '" aria-label="Remove">✕</button></span>').join('') + '</div>' : '<p class="tplnone">No model — the email goes without a model list.</p>') +
        (PK.open ? '<input class="tplq" data-tplq placeholder="Search ' + all.length + ' models…" value="' + escT(PK.q) + '"><div class="tplml">' + shown.slice(0, 400).map(m => { const red = anyRed(m.key); return '<label class="tplm' + (red ? ' red' : '') + '"><input type="checkbox" data-tplm="' + escT(m.key) + '"' + (on.has(m.key) ? ' checked' : '') + (red ? ' disabled' : '') + '><span>' + escT(m.nm) + '</span><small>' + escT(red ? 'voted out' : m.bd) + '</small></label>'; }).join('') + '</div>' : '') + '</div>';
      const to = box.querySelector('.tplto'); if (to) to.insertAdjacentHTML('afterend', sec);
      if (PK.open && PK.focusQ) { const i = box.querySelector('[data-tplq]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
    }
    /* 1.2.164 (user: "the option to see a list of the contacts from that agency I can CC to"): the agency's other
       contacts with an email, ticked ones go in CC */
    let cts = []; try { cts = ((typeof CONTACTS !== 'undefined' && CONTACTS.get(PK.dom)) || []).filter(c => c && c.e && /@/.test(c.e)); } catch (e) {}
    const seen = new Set([String(PK.addr).toLowerCase()]); cts = cts.filter(c => { const e = String(c.e).trim().toLowerCase(); if (seen.has(e)) return false; seen.add(e); return true; });
    if (cts.length) {
      const on = new Set(PK.cc.map(x => x.toLowerCase()));
      const cc = '<div class="tplcc"><div class="tplmsh"><b>CC · ' + PK.cc.length + '</b>' + (cts.length > 1 ? '<button type="button" data-tplccall>' + (PK.cc.length === cts.length ? 'Clear' : 'Tick all') + '</button>' : '') + '</div><div class="tplccl">' +
        cts.map(c => '<label class="tplm"><input type="checkbox" data-tplcc="' + escT(String(c.e).trim()) + '"' + (on.has(String(c.e).trim().toLowerCase()) ? ' checked' : '') + '><span>' + escT(c.n || String(c.e).split('@')[0]) + '</span><small>' + escT(String(c.e).trim()) + (c.r ? ' · ' + escT(c.r) : '') + '</small></label>').join('') + '</div></div>';
      const anchor = box.querySelector('.tplms') || box.querySelector('.tplto'); if (anchor) anchor.insertAdjacentHTML('afterend', cc);
    }
  }
  document.addEventListener('change', e => { const c = e.target.closest && e.target.closest('#illutpl [data-tplcc]'); if (!c || !PK) return; const v = c.dataset.tplcc; PK.cc = PK.cc.filter(x => x.toLowerCase() !== v.toLowerCase()); if (c.checked) PK.cc.push(v); paintPick(); }, true);
  document.addEventListener('input', e => { const i = e.target.closest && e.target.closest('#illutpl [data-tplq]'); if (!i || !PK) return; PK.q = i.value; PK.focusQ = true; paintPick(); PK.focusQ = false; }, true);
  document.addEventListener('change', e => { const c = e.target.closest && e.target.closest('#illutpl [data-tplm]'); if (!c || !PK) return;
    const m = agModels(PK.dom).find(x => x.key === c.dataset.tplm); if (!m) return;
    if (c.checked) { if (!PK.ms.some(x => x.key === m.key)) PK.ms.push(m); } else PK.ms = PK.ms.filter(x => x.key !== m.key);
    const keepScroll = (document.querySelector('#illutpl .tplml') || {}).scrollTop || 0; paintPick(); const l = document.querySelector('#illutpl .tplml'); if (l) l.scrollTop = keepScroll; }, true);
  document.addEventListener('click', async e => {
    const box = document.getElementById('illutpl'); if (!box || box.hidden || !box.contains(e.target) || !PK) return;
    const b = e.target.closest('[data-tplx],[data-tpluse],[data-tpled],[data-tplnew],[data-tplback],[data-tplsave],[data-tpldel],[data-tplmore],[data-tploff],[data-tplccall]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const me = (typeof ME !== 'undefined' && ME) || '';
    if (b.hasAttribute('data-tplx')) { box.hidden = true; PK = null; return; }
    if (b.hasAttribute('data-tplmore')) { PK.open = !PK.open; PK.focusQ = PK.open; paintPick(); PK.focusQ = false; return; }
    if (b.hasAttribute('data-tplccall')) { const all = [...box.querySelectorAll('[data-tplcc]')].map(x => x.dataset.tplcc); PK.cc = PK.cc.length === all.length ? [] : all; paintPick(); return; }
    if (b.dataset.tploff) { PK.ms = PK.ms.filter(x => x.key !== b.dataset.tploff); paintPick(); return; }
    if (b.hasAttribute('data-tpluse')) {
      const id = b.dataset.tpluse, t = id ? list().find(x => x.id === id) : null;
      const f = t ? fill(t, PK.agName, PK.ms) : { subject: '', html: '', text: '' };
      compose({ to: [PK.addr], cc: PK.cc.slice(), subject: f.subject, html: f.html, text: f.text, about: PK.ms.map(m => m.key).filter(Boolean) });
      try { localStorage.setItem('illu.tpl.last.' + me, id); } catch (er) {}
      box.hidden = true; PK = null; return;
    }
    if (b.dataset.tpled) { PK.edit = Object.assign({}, list().find(x => x.id === b.dataset.tpled)); paintPick(); return; }
    if (b.hasAttribute('data-tplnew')) { PK.edit = { name: '', subject: SUBJECT, body: 'Dear {agency} Team,\n\n\n\nThank you!' }; paintPick(); return; }
    if (b.hasAttribute('data-tplback')) { PK.edit = null; paintPick(); return; }
    /* 1.2.171 (user: "I also want to be able to Delete the Templates"): Delete on every row of the list too (not only
       inside Edit). First press asks ("Delete?"), second press deletes; Undo brings it back. The standard inquiry stays. */
    if (b.dataset.tpldel) {
      const id = b.dataset.tpldel;
      if (PK.edit) { if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Delete — press again'; return; } }
      else if (PK.arm !== id) { PK.arm = id; clearTimeout(PK.armT); PK.armT = setTimeout(() => { if (PK && PK.arm === id) { PK.arm = null; paintPick(); } }, 4000); paintPick(); return; }
      const keep = Object.assign({}, TPL.get(id) || {}); delete keep.id; delete keep.off;
      try { await DB.doc('mailtpl/' + id).set(Object.assign({}, keep, { off: { by: me, at: new Date().toISOString() } })); } catch (er) {}
      TPL.delete(id); PK.arm = null; PK.edit = null; paintPick();
      try { window.__illuUndo && window.__illuUndo.push('Template "' + (keep.name || '') + '" deleted', async () => { TPL.set(id, Object.assign({ id }, keep)); try { await DB.doc('mailtpl/' + id).set(keep); } catch (er) {} paintPick(); }); } catch (er) {}
      return;
    }
    if (b.hasAttribute('data-tplsave')) {
      if (typeof SIGNED === 'function' && !SIGNED()) { if (typeof nudgeSignIn === 'function') nudgeSignIn(); return; }
      const nm = box.querySelector('#tplnm').value.trim(), sub = box.querySelector('#tplsub').value.trim(), body = box.querySelector('#tplbody').value.replace(/\r/g, '');
      if (!nm) { box.querySelector('#tplnm').focus(); return; }
      const t = PK.edit, id = t.id || ('t' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
      const doc = { name: nm, subject: sub, body, kind: t.kind || '', o: t.o != null ? t.o : list().length, by: t.by || me, at: t.at || new Date().toISOString(), ed: { by: me, at: new Date().toISOString() } };
      TPL.set(id, Object.assign({ id }, doc)); try { await DB.doc('mailtpl/' + id).set(doc); } catch (er) {}
      PK.edit = null; paintPick(); return;
    }
  }, true);
  document.addEventListener('keydown', e => { const box = document.getElementById('illutpl'); if (e.key === 'Escape' && box && !box.hidden) { e.stopPropagation(); if (PK && PK.edit) { PK.edit = null; paintPick(); } else { box.hidden = true; PK = null; } } }, true);
  window.__illuTplPick = tplPick; window.__illuTplList = list; window.__illuTplFill = fill;

  /* which model a contact list was opened for: the one model card the chip sits in */
  let FOR = null;
  function modelAround(el) {
    for (let n = el && el.parentElement, i = 0; n && n !== document.body && i < 12; n = n.parentElement, i++) {
      const mks = n.querySelectorAll('.mk[data-mk], .vmk[data-mk]');
      if (mks.length === 1) return infoOf(mks[0]);
      if (mks.length > 1) return null;                 // an agency row with several models: no single model
    }
    return null;
  }
  // window capture runs before the dashboard's own document listener that opens the panel
  window.addEventListener('click', e => {
    const chip = e.target.closest && e.target.closest('[data-ctopen]');
    if (!chip) return;
    FOR = modelAround(chip);
    /* 1.2.168: from a booking card's Email stage, the email is about that card's model */
    if (!FOR) { const w = chip.closest('[data-emfor]'); const c = w && typeof BOOK !== 'undefined' ? BOOK.get(w.dataset.emfor) : null;
      if (c && c.k) { const hit = index().get(c.k); FOR = hit ? Object.assign({ key: c.k }, hit) : { key: c.k, nm: c.nm || '', url: /^https?:/i.test(c.k) ? c.k : '', dom: c.agd || '', ag: c.ag || '', g: '?' }; }
      else if (c && c.id) FOR = { key: 'bid:' + c.id, nm: c.nm || '', url: '', dom: c.agd || '', ag: c.ag || '', g: '?' }; }
    /* 1.2.160: from her photo view / panel, the email is about her */
    if (!FOR && chip.closest('#illufv') && window.__illuFvNow) { const v = window.__illuFvNow(); if (v && v.key && !/^bid:/.test(v.key)) { const hit = index().get(v.key); FOR = hit ? Object.assign({ key: v.key }, hit) : { key: v.key, nm: v.nm, url: v.url || v.key, dom: chip.dataset.dom || '', ag: '', g: '?' }; } }
    setTimeout(() => {
      const hd = document.querySelector('.ctbox .ctbhd'); if (!hd || hd.querySelector('.illufor')) return;
      const p = document.createElement('p'); p.className = 'illufor';
      p.innerHTML = FOR
        ? (anyRed(FOR.key) ? (window.__illuVoteState ? 'The team voted this model out (Cancelled) — ✉ opens an email without the model. Reopen the vote to include them.' : 'This model is ruled out (red) by someone — ✉ opens an email without the model. Take the red lamp off to include them.') :
           'Click ✉ beside a contact to email about <b>' + escT(FOR.nm.toUpperCase()) + '</b>.')
        : 'Click ✉ beside a contact to write to them.';
      hd.appendChild(p);
    }, 0);
  }, true);
  /* a contact's ✉: Hiworks to that address, about the model (if any) */
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a.ctmail[href^="mailto:"]');
    if (!a) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const addr = decodeURIComponent(a.getAttribute('href').slice(7)).trim();
    const box = a.closest('.cts[data-dom]'); const dom = box ? box.dataset.dom : '';
    const agName = ((typeof AG !== 'undefined' ? AG : []).find(x => x.domain === dom) || {}).name || (FOR && FOR.ag) || dom;
    const ms = FOR && !anyRed(FOR.key) ? [FOR] : [];
    /* 1.2.160 (user, 12 Nov 2026: "several templates saved to select from when sending an email ... Save that template.
       I will add more eventually"): ✉ first asks which template; the Model inquiry is saved as the first one */
    tplPick(a, addr, agName, ms, dom);
    a.classList.add('illusent'); a.title = 'Opened in Hiworks';
    /* kept for Data Analytics: who wrote to which agency, when, about whom (docs hwlog/<id>-<YYYY-MM>) */
    try{
      if(typeof DB !== 'undefined' && DB && typeof ME !== 'undefined' && ME){
        const d = new Date(), mo = d.toISOString().slice(0, 7), id = 'hwlog/' + String(ME).replace(/[^A-Za-z0-9_-]/g, '') + '-' + mo;
        const row = [d.toISOString(), dom, agName, ms.length ? ms[0].key : '', ms.length ? (ms[0].g || '?') : ''];
        DB.doc(id).get().then(snap => { const v = (typeof docOf === 'function' ? docOf(snap) : null) || {}; const e = Array.isArray(v.e) ? v.e.slice(-1500) : []; e.push(row);
          return DB.doc(id).set({p: ME, m: mo, e}); }).catch(() => {});
      }
    }catch(err){}
  }, true);
  // a contact list opened some other way (Directory row, Booking card) is about no model
  document.addEventListener('keydown', e => { if (e.key === 'Escape') FOR = null; }, true);

  const st = document.createElement('style');
  st.textContent =
    '.illutick{appearance:none;flex:none;width:17px;height:17px;margin:0 6px 0 0;padding:0;border:1.5px solid var(--faint);border-radius:4px;background:var(--surf);cursor:pointer;vertical-align:middle;position:relative;z-index:3}' +
    '.illutick:hover{border-color:var(--acc)}' +
    '.illutick[aria-pressed="true"]{background:var(--acc);border-color:var(--acc)}' +
    '.illutick[aria-pressed="true"]::after{content:"";position:absolute;left:4.5px;top:1px;width:4px;height:8px;border:solid var(--on-acc,#fff);border-width:0 2px 2px 0;transform:rotate(45deg)}' +
    '#illucbar{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:80;display:flex;align-items:center;gap:10px;padding:8px 10px 8px 18px;border-radius:30px;background:var(--surf);border:1px solid var(--line);box-shadow:0 14px 34px -12px rgba(27,23,36,.45);font:13px var(--sans);color:var(--ink)}' +
    '#illucbar b{font-weight:500}' +
    '#illucbar button{border:1px solid var(--line);background:var(--surf2);color:var(--ink);border-radius:20px;padding:7px 16px;font:500 13px var(--sans);cursor:pointer}' +
    '#illucbar #illucgo{background:var(--acc);border-color:var(--acc);color:var(--on-acc,#fff)}' +
    '#illucm{position:fixed;inset:0;z-index:90;background:rgba(26,19,44,.45);display:grid;place-items:start center;overflow:auto;padding:40px 16px}' +
    '#illucm[hidden]{display:none}' +
    '.illucbox{width:min(640px,100%);background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:20px 22px;box-shadow:0 26px 70px rgba(20,14,38,.3);color:var(--ink);font:14px var(--sans)}' +
    '.illucbox h3{margin:0 0 10px;font:400 22px var(--disp,serif)}' +
    '.illucbox section{border:1px solid var(--line);border-radius:11px;background:var(--surf);padding:12px 14px;margin:10px 0}' +
    '.illucbox h4{margin:0 0 4px;font-size:15px}.illucbox h4 s{text-decoration:none;font:11px var(--mono);color:var(--mut);margin-left:6px}' +
    '.illums{margin:0 0 8px;color:var(--ink2);font-size:13px}' +
    '.illuct label{display:flex;align-items:center;gap:10px;justify-content:space-between;padding:6px 0;border-top:1px solid var(--line2,var(--line))}' +
    '.illuct s{text-decoration:none;font:12px var(--mono);color:var(--mut)}' +
    '.illurole{display:flex;gap:4px}.illurole button{border:1px solid var(--line);background:var(--surf2);color:var(--mut);border-radius:20px;padding:4px 12px;font:12px var(--sans);cursor:pointer}' +
    '.illurole button[aria-pressed="true"]{background:var(--acc);border-color:var(--acc);color:var(--on-acc,#fff)}' +
    '.illuopen{margin-top:10px;border:1px solid var(--acc);background:var(--acc);color:var(--on-acc,#fff);border-radius:20px;padding:7px 18px;font:500 13px var(--sans);cursor:pointer}' +
    '.illuwarn{margin:6px 0;padding:8px 10px;border-radius:8px;background:var(--holdbg,#F4EBD5);color:var(--hold,#84610F);font-size:12.5px}' +
    '.illuacts{display:flex;justify-content:flex-end;margin-top:12px}.illuacts button{border:1px solid var(--line);background:var(--surf);border-radius:20px;padding:7px 18px;cursor:pointer;color:var(--ink)}' +
    '#illutoast{position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:95;padding:9px 16px;border-radius:22px;background:var(--surf);border:1px solid var(--line);font:500 12.5px var(--sans);color:var(--ink);box-shadow:0 10px 30px -12px rgba(0,0,0,.4);opacity:0;transition:opacity .2s;pointer-events:none}' +
    '#illutoast[data-on="1"]{opacity:1}' +
    '.ctbhd .illufor{flex-basis:100%;margin:6px 0 0;font-size:12.5px;color:var(--mut)}.ctbhd .illufor b{color:var(--ink);font-weight:600}' +
    'a.ctmail.illusent{color:var(--acc)}' +
    '#illutpl{position:fixed;inset:0;z-index:9200;display:grid;place-items:center}#illutpl[hidden]{display:none}' +
    '#illutpl .tplveil{position:absolute;inset:0;background:rgba(20,12,24,.4)}' +
    '#illutpl .tplbox{position:relative;width:min(560px,calc(100vw - 32px));max-height:calc(100vh - 60px);overflow:auto;background:var(--paper,#fff);color:var(--ink,#211C26);border:1px solid var(--line);border-radius:14px;box-shadow:0 26px 70px rgba(20,14,38,.35);padding:18px 20px;display:flex;flex-direction:column;gap:10px;font:14px var(--sans)}' +
    '#illutpl h3{margin:0;font-size:17px}#illutpl .tplto{margin:0;color:var(--mut);font-size:12.5px}#illutpl .tplto b{color:var(--ink)}' +
    '#illutpl .tpllist{display:flex;flex-direction:column;gap:6px}#illutpl .tplrow{display:flex;gap:6px;align-items:stretch}' +
    '#illutpl .tpluse{flex:1;text-align:left;border:1px solid var(--line);background:var(--surf,#fff);border-radius:10px;padding:9px 12px;cursor:pointer;color:inherit;font:inherit;display:flex;flex-direction:column;gap:2px}#illutpl .tpluse:hover{border-color:var(--acc)}#illutpl .tpluse small{color:var(--mut);font-size:11.5px}#illutpl .tpluse.blank{border-style:dashed}' +
    '#illutpl .tpled{border:1px solid var(--line);background:var(--surf2,#f6f3f8);border-radius:10px;padding:0 12px;cursor:pointer;color:var(--mut);font:600 12px var(--sans)}' +
    '.illusenttoast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;background:#2A1F2E;color:#fff;font:500 13px var(--sans);padding:10px 16px;border-radius:999px;box-shadow:0 10px 30px rgba(0,0,0,.25);max-width:calc(100vw - 32px)}' +
    '#illutpl .tpldx{color:#A3283F}#illutpl .tpldx.on{background:#A3283F;border-color:#A3283F;color:#fff}' +
    '#illutpl label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:var(--mut)}#illutpl input,#illutpl textarea{border:1px solid var(--line);border-radius:8px;padding:8px 10px;font:14px var(--sans);color:var(--ink);background:var(--surf,#fff)}#illutpl textarea{resize:vertical;line-height:1.5}' +
    '#illutpl .tplms{border:1px solid var(--line);border-radius:10px;padding:9px 11px;display:flex;flex-direction:column;gap:7px;background:var(--surf2,#faf8fb)}#illutpl .tplmsh{display:flex;align-items:center;gap:8px}#illutpl .tplmsh b{flex:1;font-size:12.5px}#illutpl .tplmsh button{border:0;background:none;color:var(--acc);font:600 12.5px var(--sans);cursor:pointer}' +
    '#illutpl .tplchips{display:flex;flex-wrap:wrap;gap:5px}#illutpl .tplchip{display:inline-flex;align-items:center;gap:4px;background:var(--surf,#fff);border:1px solid var(--line);border-radius:999px;padding:3px 4px 3px 10px;font-size:12px;font-weight:600}#illutpl .tplchip button{border:0;background:none;cursor:pointer;color:var(--mut);font-size:11px}#illutpl .tplnone{margin:0;font-size:12px;color:var(--mut)}' +
    '#illutpl .tplcc{border:1px solid var(--line);border-radius:10px;padding:9px 11px;display:flex;flex-direction:column;gap:6px}#illutpl .tplccl{display:flex;flex-direction:column;max-height:180px;overflow:auto}#illutpl .tplcc .tplm small{margin-left:auto;text-align:right}' +
    '#illutpl .tplq{border:1px solid var(--line);border-radius:8px;padding:7px 10px;font:13px var(--sans)}#illutpl .tplml{max-height:240px;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:2px 10px}#illutpl .tplm{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:500;color:var(--ink);flex-direction:row;padding:3px 0;cursor:pointer}#illutpl .tplm small{color:var(--mut);font-size:10.5px;font-weight:400;margin-left:auto}#illutpl .tplm.red{opacity:.5}' +
    '#illutpl .tplhelp{margin:0;font-size:12px;color:var(--mut);line-height:1.5}#illutpl .tplhelp b{color:var(--ink)}' +
    '#illutpl .tplacts{display:flex;gap:8px;align-items:center}#illutpl .tplacts span{flex:1}#illutpl .tplacts button{border:1px solid var(--line);background:var(--surf,#fff);border-radius:20px;padding:7px 16px;cursor:pointer;color:var(--ink);font:500 13px var(--sans)}#illutpl .tplacts .tplgo{background:var(--acc);border-color:var(--acc);color:var(--on-acc,#fff)}#illutpl .tplacts .tpldel{color:#A3283F}';
  document.head.appendChild(st);
})();

/* ==================== Bring the dashboard's data over (owner only) ====================
   In "Who is using this": choose the import file and everything from the dashboard comes
   in — the directory, booking cards with their files, lamps, photos, measurements,
   contacts, chat and history. Nothing already in the program is overwritten. */
(function () {
'use strict';
if (!window.illu || !window.illu.importPick) return;
const D = (window.illu.dirSync && window.illu.dirSync()) || {};
if (!D.me || D.me !== D.admin) return;
const st = document.createElement('style');
st.textContent = '#illuimp .idnote{margin:4px 0 8px}#illuimp .bar{height:6px;border-radius:3px;background:var(--surf2);overflow:hidden;margin:8px 0}' +
  '#illuimp .bar i{display:block;height:100%;width:0;background:var(--ink);transition:width .2s}#illuimp .sum{font-size:12px;color:var(--mut);white-space:pre-line}';
document.head.appendChild(st);
function mount() {
  const body = document.querySelector('#idmodal .idbody');
  if (!body || document.getElementById('illuimp')) return;
  body.insertAdjacentHTML('beforeend', '<section class="idsec" id="illuimp"><span class="flabel">Bring over from the dashboard</span>' +
    '<p class="idnote">Choose the import file (any of its parts — keep them all in one folder). The directory, booking cards and their files, everyone’s lamps, photos, measurements, contacts, chat and history come in. Anything already in the program is kept as it is.</p>' +
    '<div class="idacts"><button class="idbtn" id="illuimpgo" type="button">Choose the import file…</button></div>' +
    '<div class="bar" hidden><i></i></div><p class="sum" id="illuimpsum"></p></section>');
  const go = document.getElementById('illuimpgo'), sum = document.getElementById('illuimpsum');
  const bar = document.querySelector('#illuimp .bar'), fill = bar.querySelector('i');
  let picked = null, running = false;
  go.addEventListener('click', async () => {
    if (running) return;
    if (!picked) {
      const r = await window.illu.importPick();
      if (!r || r.canceled) return;
      if (!r.ok) { sum.textContent = r.why; return; }
      picked = r;
      sum.textContent = 'Found: ' + r.agencies + ' agencies, ' + r.models.toLocaleString() + ' models, ' + r.booking + ' booking cards, ' +
        r.docs + ' notes and ' + r.files + ' photos and files (' + r.mb + ' MB in ' + r.parts + ' parts).\nThe directory in the program is replaced by this one.';
      go.textContent = 'Bring it over';
      return;
    }
    running = true; go.disabled = true; bar.hidden = false;
    const W = { check: [0, 2], dir: [2, 10], docs: [10, 20], link: [20, 22], files: [22, 99], done: [100, 100] };
    window.illu.onImportProgress(p => {
      const w = W[p.step] || [0, 0];
      fill.style.width = (w[0] + (p.of ? (w[1] - w[0]) * p.done / p.of : 0)) + '%';
      sum.textContent = p.text;
    });
    let r;
    try{ r = await window.illu.importRun(picked.file); }
    catch(e){ r = {ok: false, why: String(e && e.message || e)}; }     // the file moved or went missing: never stuck on "running"
    running = false; go.disabled = false;
    if (!r.ok) { sum.textContent = 'Stopped: ' + r.why + '\nRun it again — what came in already is kept.'; go.textContent = 'Try again'; return; }
    fill.style.width = '100%';
    const linked = (r.linked || []).length;
    sum.textContent = 'Done. ' + r.agencies + ' agencies and ' + r.models.toLocaleString() + ' models in the directory; ' + r.docsSent + ' notes and cards; ' +
      (r.filesAdded + r.filesThere) + ' photos and files' + (linked ? '; ' + linked + ' old ID' + (linked > 1 ? 's' : '') + ' handed over' : '') + '.' +
      (r.failed.length ? '\n' + r.failed.length + ' file(s) could not be sent — run it again to retry them.' : '') + '\nReloading…';
    if (!r.failed.length) setTimeout(() => location.replace('../index.html'), 2500);
    else { go.textContent = 'Run it again'; }
  });
}
mount();
new MutationObserver(mount).observe(document.body, { childList: true, subtree: false });
})();

/* ==================== Program updates ====================
   Every copy checks for a newer program when it opens and every few hours; when one has
   been fetched and checked, a note offers a restart. The owner publishes updates from
   "Who is using this". */
(function () {
'use strict';
if (!window.illu || !window.illu.updateState) return;
const D = (window.illu.dirSync && window.illu.dirSync()) || {};
const owner = !!(D.me && D.me === D.admin);
const escH = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const st = document.createElement('style');
st.textContent = '#illuupd{position:fixed;right:18px;bottom:18px;z-index:99999;max-width:360px;background:var(--surf,#fff);color:var(--ink,#222);border:1px solid var(--line,#ccc);border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.18);padding:12px 14px;font:13px/1.4 var(--sans,sans-serif)}' +
  '#illuupd b{display:block;margin-bottom:3px}#illuupd p{margin:0 0 9px;color:var(--mut,#666);font-size:12px;white-space:pre-line}#illuupd .r{display:flex;gap:8px;justify-content:flex-end}' +
  '#illuver .idnote{margin:4px 0 8px}#illuver .sum{font-size:12px;color:var(--mut);white-space:pre-line;margin:6px 0 0}';
document.head.appendChild(st);
let shown = null;
function toast(u) {
  if (!u || u.state !== 'ready' || shown === u.v) return;
  shown = u.v;
  const old = document.getElementById('illuupd'); if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', '<div id="illuupd" role="status"><b>ILLUMÉNOCTIS ' + escH(u.v) + ' is ready</b>' +
    (u.notes ? '<p>' + escH(u.notes) + '</p>' : '<p>Restart the program to use it.</p>') +
    '<div class="r"><button type="button" class="idbtn alt" data-x="later">Later</button><button type="button" class="idbtn" data-x="go">Restart now</button></div></div>');
  const box = document.getElementById('illuupd');
  box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.x === 'go') window.illu.restart(); else box.remove();
  });
}
window.illu.onUpdateReady(toast);
window.illu.updateState().then(toast).catch(() => {});

// "Who is using this": the version, a check, and (owner) publishing
function mount() {
  const body = document.querySelector('#idmodal .idbody');
  if (!body || document.getElementById('illuver')) return;
  body.insertAdjacentHTML('beforeend', '<section class="idsec" id="illuver"><span class="flabel">Program</span>' +
    '<p class="idnote" id="illuvern">…</p><div class="idacts"><button class="idbtn alt" id="illuchk" type="button">Check for updates</button>' +
    (owner ? '<button class="idbtn" id="illupub" type="button">Publish an update to everyone…</button>' : '') + '</div><p class="sum" id="illuversum"></p></section>');
  const vn = document.getElementById('illuvern'), sum = document.getElementById('illuversum');
  window.illu.info().then(i => { vn.textContent = 'This computer runs ILLUMÉNOCTIS ' + i.version + (i.updated ? ' (updated without reinstalling; installed ' + i.shell + ')' : '') + '. Updates arrive by themselves.'; });
  document.getElementById('illuchk').addEventListener('click', async () => {
    sum.textContent = 'Checking…';
    const u = await window.illu.updateCheck();
    if (u && u.state === 'ready') { sum.textContent = 'Update ' + u.v + ' is ready.'; shown = null; toast(u); }
    else sum.textContent = 'This is the newest version.' + (u && u.why ? ' (' + u.why + ')' : '');
  });
  if (!owner) return;
  let picked = null;
  const pub = document.getElementById('illupub');
  pub.addEventListener('click', async () => {
    if (!picked) {
      const r = await window.illu.updatePick();
      if (!r || r.canceled) return;
      if (!r.ok) { sum.textContent = r.why; return; }
      picked = r;
      sum.textContent = 'Update ' + r.v + ' (' + r.files + ' files)' + (r.notes ? ': ' + r.notes : '') + '\nThis computer runs ' + r.running + '.';
      pub.textContent = 'Send ' + r.v + ' to everyone';
      return;
    }
    pub.disabled = true; sum.textContent = 'Sending…';
    const r = await window.illu.updatePublish(picked.file);
    pub.disabled = false;
    if (!r.ok) { sum.textContent = 'Not sent: ' + r.why; return; }
    sum.textContent = 'Sent. Every computer picks up ' + r.v + ' when the program opens or within 3 hours.';
    picked = null; pub.textContent = 'Publish an update to everyone…';
    shown = null; toast({ state: 'ready', v: r.v, notes: r.notes });
  });
}
mount();
new MutationObserver(mount).observe(document.body, { childList: true });
})();
