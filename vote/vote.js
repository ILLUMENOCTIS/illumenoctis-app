/* ILLUMÉNOCTIS · the Team Vote board on any phone or browser (user, 10 Nov 2026: "send the voting board
   link, and any cards that need voting can be selected from there").
   The link: <app>/vote/            everyone on the team is listed to sign in
             <app>/vote/#n=Ji,Sasha  only the people it was sent to are listed
   Signing in is the program's own sign-in: pick your name, type your PIN (password). It is kept on this
   phone/browser, so the next link opens straight to the board. Votes are written exactly as the program
   writes them (vote/<person id>), so every program and phone updates at once.
   Read: vopen (cards on the vote), vote (everyone's votes), people (the team), vpub/board (photos and
   measurements the program publishes for the cards on the vote). */
(function () {
  'use strict';
  const CFG = window.ILLU_CONFIG;
  const sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'illu.auth' } });
  const $ = s => document.querySelector(s);
  const box = $('#box');
  const H = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const KO = LS.get('illum.lang') === 'ko' || /^ko/i.test(navigator.language || '');
  const L = (en, ko) => KO ? ko : en;
  if (KO) document.documentElement.lang = 'ko';

  /* who the link was sent to */
  const hp = new URLSearchParams((location.hash || '').replace(/^#/, ''));
  const SENT = (hp.get('n') || '').split(',').map(s => s.trim()).filter(Boolean);

  function hash(s) { let h = 0x811c9dc5; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } let h2 = 5381; for (let i = 0; i < s.length; i++) h2 = (Math.imul(h2, 33) ^ s.charCodeAt(i)) >>> 0; return (h >>> 0).toString(36) + h2.toString(36); }
  const SIGNEDID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function errText(e) {
    const m = String((e && (e.message || e.error_description)) || e || '');
    if (/Invalid login|invalid_grant|credentials/i.test(m)) return L('Wrong PIN. Try again.', 'PIN이 틀렸습니다. 다시 입력하세요.');
    if (/fetch|network|Failed/i.test(m)) return L('No connection. Check the internet and try again.', '연결할 수 없습니다. 인터넷을 확인하고 다시 해 보세요.');
    return m;
  }
  addEventListener('error', e => { const t = e.target; if (t && t.tagName === 'IMG' && t.closest('.vc')) t.remove(); }, true);
  const say = (t, err) => { box.innerHTML = '<p class="msg' + (err ? ' err' : '') + '">' + H(t) + '</p>'; };

  /* ---------- signing in ---------- */
  let ME = null, MENAME = '';
  async function pickName() {
    $('#who').textContent = ''; $('#out').hidden = true;
    say(L('Opening…', '여는 중…'));
    const { data, error } = await sb.rpc('list_people');
    if (error) { say(errText(error), true); return; }
    let ppl = (data || []).map(p => p.name);
    if (SENT.length) { const s = new Set(SENT.map(n => n.toLowerCase())); const f = ppl.filter(n => s.has(n.toLowerCase())); if (f.length) ppl = f; }
    box.innerHTML = '<h2>' + H(L('Team Vote', '팀 투표')) + '</h2><p class="msg">' + H(L('Who are you?', '누구신가요?')) + '</p>' +
      '<div class="people">' + ppl.map(n => '<button type="button" data-nm="' + H(n) + '"><span class="av">' + H(n.slice(0, 1).toUpperCase()) + '</span>' + H(n) + '</button>').join('') + '</div>';
    box.querySelectorAll('[data-nm]').forEach(b => b.addEventListener('click', () => askPin(b.dataset.nm, ppl.length > 1)));
    if (ppl.length === 1) askPin(ppl[0], false);
  }
  function askPin(name, canBack) {
    box.innerHTML = '<h2>' + H(L('Hi ' + name, name + '님, 안녕하세요')) + '</h2>' +
      '<form class="pin" id="pf"><label for="pin">' + H(L('Your PIN (the password you sign in with)', 'PIN (로그인 비밀번호)')) + '</label>' +
      '<input id="pin" type="password" autocomplete="current-password" autocapitalize="off" spellcheck="false">' +
      '<p class="msg" id="perr">' + H(L('You type it once on this phone.', '이 기기에서는 한 번만 입력합니다.')) + '</p>' +
      '<button class="pri" id="go" type="submit">' + H(L('Sign in and vote', '로그인하고 투표')) + '</button></form>' +
      (canBack ? '<button type="button" class="lnk" id="back">' + H(L('← Not ' + name + '?', '← ' + name + '이(가) 아닌가요?')) + '</button>' : '');
    setTimeout(() => $('#pin').focus(), 30);
    if ($('#back')) $('#back').addEventListener('click', pickName);
    $('#pf').addEventListener('submit', async e => {
      e.preventDefault();
      const pw = $('#pin').value, er = $('#perr'); if (!pw) { $('#pin').focus(); return; }
      $('#go').disabled = true; er.className = 'msg'; er.textContent = L('Signing in…', '로그인 중…');
      const { data: em, error: e1 } = await sb.rpc('login_email', { p_name: name });
      if (e1 || !em) { er.className = 'msg err'; er.textContent = errText(e1 || 'Invalid login'); $('#go').disabled = false; return; }
      const { data, error: e2 } = await sb.auth.signInWithPassword({ email: em, password: pw });
      if (e2) { er.className = 'msg err'; er.textContent = errText(e2); $('#go').disabled = false; $('#pin').select(); return; }
      start(data.session);
    });
  }
  $('#out').addEventListener('click', async () => { try { await sb.auth.signOut(); } catch (e) {} ME = null; pickName(); });

  /* ---------- the board ---------- */
  let PEOPLE = [], OPEN = [], VT = new Map(), PUB = {};
  const pname = id => (PEOPLE.find(p => p.id === id) || {}).name || '';
  async function loadAll() {
    const [pp, op, vt, pub] = await Promise.all([
      sb.from('people').select('id,name'),
      sb.from('docs').select('id,data').eq('coll', 'vopen'),
      sb.from('docs').select('id,data').eq('coll', 'vote'),
      sb.from('docs').select('data').eq('path', 'vpub/board').maybeSingle()
    ]);
    for (const r of [pp, op, vt]) if (r.error) throw r.error;
    PEOPLE = (pp.data || []).filter(p => SIGNEDID.test(p.id));
    OPEN = (op.data || []).map(r => r.data).filter(o => o && o.k && !o.off);
    VT = new Map((vt.data || []).map(r => [r.id, { e: Object.assign({}, (r.data || {}).e || {}), t: Object.assign({}, (r.data || {}).t || {}) }]));
    PUB = (pub && pub.data && pub.data.data && pub.data.data.c) || {};
  }
  const voteOf = (pid, k, r) => { const v = VT.get(pid); return v && v.e[k] ? v.e[k][String(r)] || '' : ''; };
  /* the same count as the program: each round needs every voter; a tie starts the next round */
  function stateOf(o) {
    const live = new Set(PEOPLE.map(p => p.id));
    const vs = [...new Set((o.voters && o.voters.length ? o.voters : [...live]))].filter(p => live.has(p));
    let r = o.base || 1;
    for (let g = 0; g < 50; g++) {
      const go = vs.filter(p => voteOf(p, o.k, r) === 'g').length, no = vs.filter(p => voteOf(p, o.k, r) === 'r').length;
      if (!vs.length || go + no < vs.length) return { open: true, round: r, n: go + no, of: vs.length, voters: vs, mine: voteOf(ME, o.k, r) };
      if (go === no) { r++; continue; }
      return { open: false, round: r, n: go + no, of: vs.length, voters: vs, res: go > no ? 'appr' : 'cxl', g: go, x: no };
    }
    return null;
  }
  const fmt = v => v == null || v === '' || isNaN(+v) ? '–' : String(Math.round(+v * 10) / 10);
  function cardHtml(o, st) {
    const p = PUB[hash(o.k)] || {}, m = p.m || {};
    const meas = [['', m.ht != null ? fmt(m.ht) + ' cm' : ''], [L('B·W·H', '가슴·허리·엉덩이'), (m.bu != null || m.wa != null || m.hp != null) ? fmt(m.bu) + ' · ' + fmt(m.wa) + ' · ' + fmt(m.hp) : ''],
      [L('Shoe', '신발'), m.eu != null ? fmt(m.eu) + ' EU' + (m.us != null ? ' · ' + fmt(m.us) + ' US' : '') : (m.us != null ? fmt(m.us) + ' US' : '')]].filter(x => x[1]);
    const sentBy = pname(o.by);
    return '<article class="vc' + (st.open ? '' : ' closed') + '" data-h="' + H(hash(o.k)) + '">' +
      '<div class="top"><span>' + H(sentBy ? L('Sent by ', '보낸 사람: ') + sentBy : '') + '</span><span>' + H(st.open ? L(st.n + ' of ' + st.of + ' voted', st.of + '명 중 ' + st.n + '명 투표') + (st.round > (o.base || 1) ? L(' · tie-breaker', ' · 타이브레이커') : '') : '') + '</span></div>' +
      '<div class="img">' + (p.ph ? '<img src="' + H(p.ph) + '" alt="" loading="lazy">' : '') + '<div class="nm"><b>' + H(o.nm || '') + '</b></div></div>' +
      '<div class="meta"><span>' + H(o.ag || '') + '</span>' + meas.map(([l, v]) => '<span>' + (l ? H(l) + ' ' : '') + '<b>' + H(v) + '</b></span>').join('') +
      (o.href ? '<a href="' + H(o.href) + '" target="_blank" rel="noopener">' + H(L('Agency page ↗', '에이전시 페이지 ↗')) + '</a>' : '') + '</div></article>';
  }
  function draw(flash) {
    const rows = OPEN.map(o => ({ o, st: stateOf(o) })).filter(x => x.st && x.st.open && x.st.voters.includes(ME));
    const need = rows.filter(x => !x.st.mine).sort((a, b) => String(a.o.at).localeCompare(String(b.o.at)));
    const done = rows.filter(x => x.st.mine);
    let h = flash ? '<div class="done"><div class="big">' + (flash.v === 'g' ? '✓' : '✕') + '</div><b>' + H(L('Your ' + (flash.v === 'g' ? 'Go' : 'Pass') + ' on ' + flash.nm + ' is in.', flash.nm + ': ' + (flash.v === 'g' ? '찬성' : '반대') + ' 투표 완료')) + '</b><p class="msg">' + H(flash.line) + '</p></div>' : '';
    h += '<h2>' + H(need.length ? L(need.length + (need.length === 1 ? ' card needs' : ' cards need') + ' your vote', need.length + '장이 투표를 기다립니다') : L('Nothing waiting for your vote', '투표할 카드가 없습니다')) + '</h2>';
    if (!need.length) h += '<p class="msg">' + H(L('When a card is sent to the Team Vote, it shows up here.', '팀 투표에 카드가 올라오면 여기에 표시됩니다.')) + '</p>';
    for (const { o, st } of need) h += cardHtml(o, st) + btns(o, st) + '<p class="msg">' + H(L('Votes stay hidden until all ' + st.of + ' have voted.', '모두(' + st.of + '명) 투표할 때까지 보이지 않습니다.')) + '</p>';
    if (done.length) {
      h += '<h2>' + H(L('You voted, waiting for others', '투표 완료 · 다른 사람 대기')) + '</h2>';
      for (const { o, st } of done) h += cardHtml(o, st) + btns(o, st);
    }
    h += '<div class="foot"><a class="sec" href="../index.html">' + H(L('Open the full program', '전체 프로그램 열기')) + '</a></div>';
    box.innerHTML = h;
    window.scrollTo(0, 0);
  }
  const btns = (o, st) => '<div class="btns"><button type="button" class="vb g' + (st.mine === 'g' ? ' on' : '') + '" data-v="g" data-k="' + H(hash(o.k)) + '">✓ ' + H(L('Go', '찬성')) + '</button><button type="button" class="vb r' + (st.mine === 'r' ? ' on' : '') + '" data-v="r" data-k="' + H(hash(o.k)) + '">✕ ' + H(L('Pass', '반대')) + '</button></div>';

  box.addEventListener('click', async e => {
    const b = e.target.closest('.vb[data-v]'); if (!b || !ME) return;
    const o = OPEN.find(x => hash(x.k) === b.dataset.k); if (!o) return;
    box.querySelectorAll('.vb').forEach(x => { x.disabled = true; });
    try {
      /* read everything again first: someone may have voted, or the card may have left the vote */
      await loadAll();
      const o2 = OPEN.find(x => x.k === o.k); const st = o2 && stateOf(o2);
      if (!st || !st.open) { draw({ v: b.dataset.v, nm: o.nm, line: L('This vote has just closed, so your vote was not added.', '방금 투표가 끝나 반영되지 않았습니다.') }); return; }
      if (!st.voters.includes(ME)) { draw(); return; }
      const { data: cur, error: re } = await sb.from('docs').select('data').eq('path', 'vote/' + ME).maybeSingle();
      if (re) throw re;
      const d = (cur && cur.data) || {}; const ev = Object.assign({}, d.e || {}), tv = Object.assign({}, d.t || {});
      const r = String(st.round);
      ev[o.k] = Object.assign({}, ev[o.k] || {}, { [r]: b.dataset.v }); tv[o.k] = Object.assign({}, tv[o.k] || {}, { [r]: new Date().toISOString() });
      const body = Object.assign({}, d, { e: ev, t: tv, at: new Date().toISOString() });
      const { error: we } = await sb.from('docs').upsert({ path: 'vote/' + ME, coll: 'vote', id: ME, data: body, updated_at: new Date().toISOString() }, { onConflict: 'path' });
      if (we) throw we;
      VT.set(ME, { e: ev, t: tv });
      const after = stateOf(o2);
      const line = !after ? '' : after.open ? (after.round > st.round ? L('It was a tie, so a tie-breaker round has started.', '동점이라 타이브레이커 라운드가 시작됐습니다.') : L(after.n + ' of ' + after.of + ' have voted. The board in the program has updated.', after.of + '명 중 ' + after.n + '명 투표. 프로그램의 보드도 바뀌었습니다.'))
        : L('That was the last vote: ' + (after.res === 'appr' ? 'Approved ' : 'Cancelled ') + after.g + '–' + after.x + '.', '마지막 표였습니다: ' + (after.res === 'appr' ? '승인 ' : '취소 ') + after.g + '–' + after.x + '.');
      draw({ v: b.dataset.v, nm: o.nm, line });
    } catch (err) {
      box.querySelectorAll('.vb').forEach(x => { x.disabled = false; });
      const m = document.createElement('p'); m.className = 'msg err'; m.textContent = L('Could not save your vote. ', '투표를 저장하지 못했습니다. ') + errText(err); box.prepend(m);
    }
  });

  async function start(session) {
    if (!session) { pickName(); return; }
    ME = session.user.id;
    say(L('Loading the Team Vote…', '팀 투표를 불러오는 중…'));
    try { await loadAll(); } catch (e) { say(errText(e), true); return; }
    MENAME = pname(ME);
    $('#who').textContent = MENAME ? '· ' + MENAME : ''; $('#out').hidden = false;
    LS.set('illum.me', ME);
    draw();
  }
  /* coming back to the page refreshes it */
  addEventListener('visibilitychange', async () => { if (!document.hidden && ME) { try { await loadAll(); draw(); } catch (e) {} } });
  sb.auth.getSession().then(({ data }) => start(data && data.session), () => pickName());
})();
