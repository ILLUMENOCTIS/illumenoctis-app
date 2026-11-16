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
  /* 1.2.171 (user: "allow me look through all the photos available on the slideshow from the link"): every photo the
     program published for the card (her BOOK, the agency's photos), with ‹ › / swipe on the card and a full-screen view */
  const IDX = new Map(), BAD = new Set(), OBJ = new Map();
  const galOf = h => { const p = PUB[h] || {}; return [...new Set([p.ph].concat(p.ps || []).filter(Boolean))].filter(u => !BAD.has(u)); };
  const small = (u, w) => /^https?:\/\//i.test(u) && !/\.(gif|svg)(\?|$)/i.test(u) ? 'https://images.weserv.nl/?url=' + encodeURIComponent(u) + '&w=' + w + '&we&output=jpg&q=82&default=' + encodeURIComponent(u) : u;
  /* a stored photo (/_blob/<id>) is read with the sign-in */
  async function blobUrl(u) {
    const id = u.replace(/^\/_blob\//, '').split('?')[0];
    if (OBJ.has(id)) return OBJ.get(id);
    const pr = (async () => { const { data, error } = await sb.storage.from('assets').download(id); if (error || !data) throw error || new Error('no photo'); return URL.createObjectURL(data); })();
    OBJ.set(id, pr); pr.catch(() => OBJ.delete(id)); return pr;
  }
  /* 1.2.215 (user, 16 Nov 2026: "a considerable amount of delay and lag regarding the slideshow and the photos appearing"):
     measured in Chrome - a photo straight from the agency's site: 0.7-1.1 s; the same photo through the resizing service
     (images.weserv.nl): 15-25 s or more the first time. The agencies' photos are already 1000-1200 px, so the page now
     loads them straight from the agency (no referrer, as some sites refuse other sites' pages) and only uses the resizing
     service when that fails. */
  function setImg(img, u, w) {
    img.dataset.u = u; img.dataset.w = w; delete img.dataset.via;
    if (/^\/_blob\//.test(u)) { img.removeAttribute('src'); blobUrl(u).then(s => { if (img.dataset.u === u) img.src = s; }, () => { if (img.dataset.u === u) bad(img); }); }
    else if (/^https?:\/\//i.test(u)) { img.referrerPolicy = 'no-referrer'; img.decoding = 'async'; img.src = u; }
    else img.src = small(u, w);
  }
  /* the next and previous photos load while you look at this one */
  const PRE = new Map();
  function preload(u) {
    if (!u || PRE.has(u) || !/^https?:\/\//i.test(u) || BAD.has(u)) return;
    const im = new Image(); im.referrerPolicy = 'no-referrer'; im.decoding = 'async'; im.src = u; PRE.set(u, im);
    if (PRE.size > 60) PRE.delete(PRE.keys().next().value);
  }
  function bad(img) {
    const u = img.dataset.u; if (u) BAD.add(u);
    const vc = img.closest('.vc'); if (vc) paintImg(vc.dataset.h); else if (img.closest('#vv')) vvShow(0);
  }
  function paintImg(h) {
    const el = box.querySelector('.vc[data-h="' + h + '"] .img'); if (!el) return;
    const g = galOf(h); let i = Math.min(IDX.get(h) || 0, Math.max(0, g.length - 1)); IDX.set(h, i);
    let img = el.querySelector('img');
    if (!g.length) { if (img) img.remove(); el.querySelectorAll('.gnav,.gct').forEach(x => x.remove()); return; }
    if (!img) { img = document.createElement('img'); img.alt = ''; el.prepend(img); }
    setImg(img, g[i], 900);
    el.querySelectorAll('.gnav,.gct').forEach(x => x.remove());
    if (g.length > 1) el.insertAdjacentHTML('beforeend', '<button type="button" class="gnav p" data-gp="' + H(h) + '" aria-label="' + H(L('Previous photo', '이전 사진')) + '">‹</button><button type="button" class="gnav n" data-gn="' + H(h) + '" aria-label="' + H(L('Next photo', '다음 사진')) + '">›</button><span class="gct">' + (i + 1) + ' / ' + g.length + '</span>');
  }
  const step = (h, d) => { const g = galOf(h); if (g.length < 2) return; IDX.set(h, ((IDX.get(h) || 0) + d + g.length) % g.length); paintImg(h); };
  /* full screen.
     1.2.204 (user, 16 Nov 2026, approved demo "Vote Slideshow Panel"): Book · Snaps · Videos · Agency along the top
     like the program's slideshow, and her details beside the photos - on a computer a panel on the right, on a phone
     a sheet from below that slides to three places (down: only the photos, middle: name, measurements and the vote,
     up: everything). Her name opens her page on the agency's site. Go / Pass can be cast from here (effect #7). */
  let VV = null;
  const SRCS = [['b', 'Book', 'BOOK'], ['s', 'Snaps', 'SNAPS'], ['v', 'Videos', '영상'], ['a', 'Agency', '에이전시']];
  function srcsOf(h) {
    const p = PUB[h] || {}, gb = p.gb;
    const ok = u => u && !BAD.has(u);
    if (!gb) { const g = galOf(h); return g.length ? [{ k: 'p', l: L('Photos', '사진'), it: g.map(u => ({ u })) }] : []; }
    const out = [];
    for (const [k, en, ko] of SRCS) {
      let it = (gb[k] || []).map(x => typeof x === 'string' ? { u: x } : x).filter(x => x && ok(x.u));
      if (k === 'v') it = it.map(x => Object.assign({ vid: 1 }, x));
      if (it.length) out.push({ k, l: L(en, ko), it });
    }
    if (!out.length && p.ph && ok(p.ph)) out.push({ k: 'p', l: L('Photos', '사진'), it: [{ u: p.ph }] });
    return out;
  }
  const ICO = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3h7v7M13 3L5 11"/></svg>';
  const when = iso => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return ''; const t = new Date(), y = new Date(t); y.setDate(t.getDate() - 1); const hm = d.toLocaleTimeString(KO ? 'ko-KR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }); return d.toDateString() === t.toDateString() ? L('Today ', '오늘 ') + hm : d.toDateString() === y.toDateString() ? L('Yesterday ', '어제 ') + hm : d.toLocaleDateString(KO ? 'ko-KR' : 'en-GB', { day: 'numeric', month: 'short' }) + ' ' + hm; };
  const originOf = u => { try { return new URL(u).origin + '/'; } catch (e) { return ''; } };
  function panelHtml(h) {
    const o = VV.o, p = PUB[h] || {}, d = p.d || {}, m = p.m || {}, st = stateOf(o) || {};
    const pg = d.pg || o.href || '', ag = d.ag || o.ag || '', agUrl = originOf(pg);
    const line = [d.pl, d.g === 'F' ? L('Female', '여성') : d.g === 'M' ? L('Male', '남성') : '', d.tier].filter(Boolean).join(' · ');
    const nm = H(o.nm || '');
    const cell = (l, v, u) => '<div><span>' + H(l) + '</span><b>' + (v == null || v === '' ? '–' : H(v) + (u ? '<small>' + H(u) + '</small>' : '')) + '</b></div>';
    const ms = '<div class="vvms">' + cell(L('Height', '키'), m.ht != null ? fmt(m.ht) : '', 'cm') + cell(L('Bust', '가슴'), m.bu != null ? fmt(m.bu) : '', 'cm') + cell(L('Waist', '허리'), m.wa != null ? fmt(m.wa) : '', 'cm') + cell(L('Hips', '엉덩이'), m.hp != null ? fmt(m.hp) : '', 'cm') + cell(L('Shoe', '신발'), m.eu != null ? fmt(m.eu) : m.us != null ? fmt(m.us) : '', m.eu != null ? 'EU' : m.us != null ? 'US' : '') + cell(L('Age', '나이'), d.age || '', '') + '</div>';
    const rows = list => { const r = list.filter(x => x[1]); return r.length ? '<div class="vvrows">' + r.map(([l, v]) => '<div class="vvrow"><span>' + H(l) + '</span><b>' + H(v) + '</b></div>').join('') + '</div>' : ''; };
    const sec = (t, body) => body ? '<div class="vvsec"><h3>' + H(t) + '</h3>' + body + '</div>' : '';
    let vote = '';
    if (st.voters) {
      const who = id => id === ME ? L('You', '나') : (pname(id) || '?');
      const dn = st.voters.filter(id => voteOf(id, o.k, st.round)), wt = st.voters.filter(id => !voteOf(id, o.k, st.round));
      vote = '<div class="vvwho">' + (pname(o.by) ? '<div>' + H(L('Sent by ', '보낸 사람: ')) + '<b>' + H(pname(o.by)) + '</b>' + (when(o.at) ? ' · ' + H(when(o.at)) : '') + '</div>' : '') +
        (st.open ? (dn.length ? '<div class="d">✓ ' + H(L('Voted: ', '투표함: ') + dn.map(who).join(', ')) + '</div>' : '') + (wt.length ? '<div class="w">' + H(L('Waiting for: ', '대기 중: ') + wt.map(who).join(', ')) + '</div>' : '') + (st.round > (o.base || 1) ? '<div class="w">' + H(L('Tie-breaker round', '타이브레이커 라운드')) + '</div>' : '')
          : '<div class="d">' + H(st.res === 'appr' ? L('Approved ', '승인 ') : L('Cancelled ', '취소 ')) + st.g + '–' + st.x + '</div>') + '</div>';
    }
    const notes = (d.nt || []).map(n => '<div class="vvnote"><b>' + H(n.p || '') + '</b> <small>· ' + H(when(n.at)) + '</small><br>' + H(n.t || '') + '</div>').join('');
    const can = st.open && st.voters && st.voters.includes(ME);
    const mine = VV.voted || (can ? st.mine : '');
    return '<button type="button" class="vvgrip" data-grip aria-label="' + H(L('Drag up for her details, down for only the photos', '위로 끌면 정보, 아래로 끌면 사진만')) + '"><i></i></button>' +
      '<div class="vvpeek">' + nm + ' <span>' + H(L('Swipe up for details', '위로 밀어 정보 보기')) + '</span></div>' +
      '<div class="vvscroll">' +
        '<div class="vvhd"><h2>' + (pg ? '<a class="vvnml" href="' + H(pg) + '" target="_blank" rel="noopener" title="' + H(L('Open her page on the agency\'s site', '에이전시 사이트의 모델 페이지 열기')) + '">' + nm + ICO + '</a>' : nm) + '</h2>' +
          (ag ? (agUrl ? '<a class="vvag" href="' + H(agUrl) + '" target="_blank" rel="noopener">' + H(ag) + ' ↗</a>' : '<div class="vvag">' + H(ag) + '</div>') : '') +
          (line ? '<p>' + H(line) + '</p>' : '') + '</div>' + ms +
        sec(L('The vote', '투표'), vote) +
        sec(L('Availability & guarantee', '가능 기간 · 개런티'), rows([[L('Available', '가능 시기'), d.av], [L('Stay', '체류'), d.stay], [L('Guarantee', '개런티'), d.gty]])) +
        sec(L('Profile', '프로필'), rows([[L('Nationality', '국적'), d.nat], [L('Hair', '머리'), d.hair], [L('Eye color', '눈 색'), d.eye], [L('Experience', '경력'), d.exp], [L('Countries worked in', '활동 국가'), d.ctry]])) +
        sec(L('Team notes', '팀 메모'), notes) +
      '</div>' +
      (can || VV.voted ? '<div class="vvvote"><button type="button" class="g' + (mine === 'g' ? ' on' : '') + '" data-vvv="g"' + (VV.voted || VV.busy ? ' disabled' : '') + '>✓ ' + H(L('Go', '찬성')) + '</button><button type="button" class="r' + (mine === 'r' ? ' on' : '') + '" data-vvv="r"' + (VV.voted || VV.busy ? ' disabled' : '') + '>✕ ' + H(L('Pass', '반대')) + '</button></div>' : '');
  }
  function vvOpen(h) {
    const o = OPEN.find(x => hash(x.k) === h); if (!o) return;
    const ss = srcsOf(h);
    VV = { h, o, src: ss.length ? ss[0].k : '', idx: {}, pos: 'mid', voted: '' };
    let v = document.getElementById('vv');
    if (!v) { v = document.createElement('div'); v.id = 'vv'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); document.body.appendChild(v); }
    v.setAttribute('aria-label', L('Slideshow', '슬라이드쇼') + ' · ' + (o.nm || ''));
    v.innerHTML = '<div class="vvshow"><div class="vvtop"><span class="vvct"></span><div class="vvsrc" role="group" aria-label="' + H(L('Which photos', '사진 종류')) + '"></div></div>' +
      '<button type="button" class="vvx" data-vvx aria-label="' + H(L('Close', '닫기')) + '">×</button>' +
      '<div class="vvpic" data-vvpic><div class="vvph"><span class="vvst" aria-hidden="true"></span><span class="vvtag"></span></div>' +
      '<button type="button" class="vvnav p" data-vvp aria-label="' + H(L('Previous photo', '이전 사진')) + '">‹</button><button type="button" class="vvnav n" data-vvn aria-label="' + H(L('Next photo', '다음 사진')) + '">›</button></div>' +
      '<div class="vvs"></div></div><aside class="vvpnl" id="vvpnl"></aside>';
    v.hidden = false; document.body.style.overflow = 'hidden';
    vvPanel(); vvShow(0); vvSheet();
    setTimeout(() => { const x = v.querySelector('.vvx'); if (x) x.focus({ preventScroll: true }); }, 30);
  }
  function vvPanel() {
    const p = document.getElementById('vvpnl'); if (!p || !VV) return;
    const sc = p.querySelector('.vvscroll'), top = sc ? sc.scrollTop : 0;
    p.innerHTML = panelHtml(VV.h);
    const sc2 = p.querySelector('.vvscroll'); if (sc2) sc2.scrollTop = top;
  }
  function vvShow(d) {
    const v = document.getElementById('vv'); if (!v || !VV) return;
    const ss = srcsOf(VV.h);
    let s = ss.find(x => x.k === VV.src); if (!s && ss.length) { s = ss[0]; VV.src = s.k; }
    v.querySelector('.vvsrc').innerHTML = ss.length > 1 || (ss[0] && ss[0].k !== 'p') ? ss.map(x => '<button type="button" data-vvsrc="' + x.k + '" aria-pressed="' + (x.k === VV.src) + '">' + H(x.l) + '<b>' + x.it.length + '</b></button>').join('') : '';
    const ph = v.querySelector('.vvph');
    const it = s ? s.it : [];
    if (!it.length) { v.querySelector('.vvct').textContent = ''; ph.querySelectorAll('img,video,.vvnone').forEach(x => x.remove()); ph.insertAdjacentHTML('afterbegin', '<p class="vvnone">' + H(L('No photos yet', '아직 사진이 없습니다')) + '</p>'); v.querySelectorAll('.vvnav').forEach(b => { b.hidden = true; }); v.querySelector('.vvs').innerHTML = ''; return; }
    const i = ((VV.idx[VV.src] || 0) + d + it.length) % it.length; VV.idx[VV.src] = i;
    const cur = it[i];
    v.querySelector('.vvct').textContent = (i + 1) + ' / ' + it.length;
    v.querySelectorAll('.vvnav').forEach(b => { b.hidden = it.length < 2; });
    const old = ph.querySelector('img,video,.vvnone');
    if (!old || old.dataset.u !== cur.u) {
      if (old) old.remove();
      if (cur.vid) { ph.insertAdjacentHTML('afterbegin', '<video controls playsinline preload="metadata"></video>'); const vd = ph.querySelector('video'); vd.dataset.u = cur.u; vd.src = cur.u; }
      else { ph.insertAdjacentHTML('afterbegin', '<img alt="" draggable="false">'); const im = ph.querySelector('img'); im.addEventListener('load', vvFit); setImg(im, cur.u, 1600); }
    }
    const strip = v.querySelector('.vvs'), sig = VV.src + '|' + it.map(x => x.u).join('|');
    if (strip.dataset.sig !== sig) {
      strip.dataset.sig = sig;
      strip.innerHTML = it.length > 1 ? it.map((x, n) => '<button type="button" data-vvt="' + n + '" class="' + (x.vid ? 'v' : '') + '" aria-label="' + H((x.vid ? L('Video ', '영상 ') : L('Photo ', '사진 ')) + (n + 1)) + '">' + (x.vid ? '' : '<img alt="" loading="lazy">') + '</button>').join('') : '';
      strip.querySelectorAll('[data-vvt]').forEach((b, n) => { const im = b.querySelector('img'); if (im) setImg(im, it[n].u, 160); });
    }
    strip.querySelectorAll('[data-vvt]').forEach((b, n) => b.classList.toggle('on', n === i));
    if (it.length > 1) { const nx = it[(i + 1) % it.length], pv = it[(i - 1 + it.length) % it.length]; if (!nx.vid) preload(nx.u); if (!pv.vid) preload(pv.u); }
    const on = strip.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    ph.classList.toggle('isvid', !!cur.vid);
    if (cur.vid) { ph.style.width = ph.style.height = ''; } else requestAnimationFrame(vvFit);
  }
  function vvClose() {
    const v = document.getElementById('vv'); if (v) { v.querySelectorAll('video').forEach(x => { try { x.pause(); } catch (e) {} }); v.hidden = true; v.innerHTML = ''; }
    document.body.style.overflow = ''; const had = VV; VV = null;
    if (had && had.flash) draw(had.flash);
  }
  /* the phone sheet: three resting places, follows the finger, snaps to the nearest */
  const SNAP = { low: 0.91, mid: 0.52, high: 0.07 };
  const isPhone = () => matchMedia('(max-width:760px)').matches;
  function vvPlace(p, pos) { const Hh = p.parentElement.offsetHeight; p.style.setProperty('--hh', ((1 - SNAP[pos]) * Hh) + 'px'); p.classList.toggle('low', pos === 'low'); }
  function vvSheet() {
    const p = document.getElementById('vvpnl'); if (!p || !VV) return;
    if (!isPhone()) { p.style.removeProperty('--hh'); p.classList.remove('low'); return; }
    vvPlace(p, VV.pos);
    if (p.dataset.on) return; p.dataset.on = '1';
    let s = null;
    p.addEventListener('pointerdown', e => {
      if (!isPhone() || !VV) return;
      if (!e.target.closest('[data-grip], .vvpeek') && !(VV.pos !== 'high' && e.target.closest('.vvhd') && !e.target.closest('a'))) return;
      const Hh = p.parentElement.offsetHeight; s = { y: e.clientY, base: SNAP[VV.pos] * Hh, Hh, moved: false };
      p.classList.add('drag'); try { p.setPointerCapture(e.pointerId); } catch (er) {}
    });
    p.addEventListener('pointermove', e => {
      if (!s) return; const dy = e.clientY - s.y; if (Math.abs(dy) > 4) s.moved = true;
      const y = Math.min(SNAP.low * s.Hh, Math.max(SNAP.high * s.Hh, s.base + dy)); p.style.setProperty('--hh', (s.Hh - y) + 'px'); p.classList.toggle('low', y > (SNAP.low - .08) * s.Hh);
    });
    const up = () => {
      if (!s || !VV) { s = null; return; } p.classList.remove('drag');
      if (!s.moved) VV.pos = VV.pos === 'high' ? 'mid' : VV.pos === 'mid' ? 'high' : 'mid';
      else { const y = 1 - parseFloat(p.style.getPropertyValue('--hh')) / s.Hh; VV.pos = Object.keys(SNAP).sort((a, b) => Math.abs(SNAP[a] - y) - Math.abs(SNAP[b] - y))[0]; }
      s = null; vvPlace(p, VV.pos);
    };
    p.addEventListener('pointerup', up); p.addEventListener('pointercancel', up);
    p.addEventListener('keydown', e => {
      if (!e.target.closest('[data-grip]') || !VV || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      e.preventDefault(); e.stopPropagation(); const o = ['low', 'mid', 'high']; VV.pos = o[Math.max(0, Math.min(2, o.indexOf(VV.pos) + (e.key === 'ArrowUp' ? 1 : -1)))]; vvPlace(p, VV.pos);
    });
  }
  /* the photo's frame hugs the photo, so the light and the stamp sit on her picture, not on empty space */
  function vvFit() {
    const v = document.getElementById('vv'); if (!v || !VV) return;
    const pic = v.querySelector('.vvpic'), im = v.querySelector('.vvph img'); if (!pic || !im || !im.naturalWidth) return;
    const cs = getComputedStyle(pic), aw = pic.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), ah = pic.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const k = Math.min(aw / im.naturalWidth, ah / im.naturalHeight);
    const ph = im.parentElement;
    if (k > 0) { const w = Math.floor(im.naturalWidth * k) + 'px', h = Math.floor(im.naturalHeight * k) + 'px'; im.style.width = ph.style.width = w; im.style.height = ph.style.height = h; }
  }
  addEventListener('resize', () => { if (VV) { vvSheet(); vvFit(); } });
  /* a mouse drag on the sheet must not start dragging a photo (it would cancel the slide) */
  document.addEventListener('dragstart', e => { if (e.target && e.target.closest && e.target.closest('#vv')) e.preventDefault(); }, true);
  /* the vote from the slideshow: the light runs around the photo and the stamp lands on it */
  function photoFx(v) {
    const ph = document.querySelector('#vv .vvph'); if (!ph) return;
    ph.style.setProperty('--c', v === 'r' ? '#E5484D' : '#2FBF4A');
    ph.querySelector('.vvst').textContent = v === 'r' ? '✕' : '✓';
    ph.querySelector('.vvtag').textContent = v === 'r' ? '✕ ' + L('Pass', '반대') : '✓ ' + L('Go', '찬성');
    ph.classList.remove('play'); void ph.offsetWidth; ph.classList.add('play', 'vvdone');
    setTimeout(() => ph.classList.remove('play'), 1400);
  }
  document.addEventListener('click', async e => {
    const t = e.target;
    const p = t.closest('[data-gp]'), n = t.closest('[data-gn]');
    if (p || n) { e.preventDefault(); step((p || n).dataset.gp || (p || n).dataset.gn, p ? -1 : 1); return; }
    if (t.closest('#vv')) {
      if (!VV) return;
      if (t.closest('[data-vvx]')) { vvClose(); return; }
      if (t.closest('[data-vvp]')) { vvShow(-1); return; }
      if (t.closest('[data-vvn]')) { vvShow(1); return; }
      const sr = t.closest('[data-vvsrc]'); if (sr) { VV.src = sr.dataset.vvsrc; vvShow(0); return; }
      const th = t.closest('[data-vvt]'); if (th) { VV.idx[VV.src] = +th.dataset.vvt; vvShow(0); return; }
      const vb = t.closest('[data-vvv]');
      if (vb) {
        if (VV.busy || VV.voted) return;
        const v = vb.dataset.vvv, h = VV.h; VV.busy = true; photoFx(v);
        vvPanel(); const pn = document.querySelector('#vvpnl .vvvote [data-vvv="' + v + '"]'); if (pn) pn.classList.add('on');
        const r = await castVote(h, v);
        if (!VV || VV.h !== h) return;
        VV.busy = false;
        if (r.ok) { VV.voted = v; VV.flash = r.flash; draw(r.flash); }
        else if (r.flash) { VV.voted = ''; VV.flash = r.flash; draw(r.flash); document.querySelector('#vv .vvph').classList.remove('vvdone'); }
        else { document.querySelector('#vv .vvph').classList.remove('vvdone'); }
        vvPanel();
        if (!r.ok && r.err) { const sc = document.querySelector('#vvpnl .vvscroll'); if (sc) sc.insertAdjacentHTML('afterbegin', '<p class="msg err">' + H(r.err) + '</p>'); }
        return;
      }
      if (t.closest('[data-vvpic]') && !t.closest('button,video,a') && !isPhone()) { vvShow(1); return; }
      return;
    }
    const im = t.closest('.vc .img'); if (im && !t.closest('a,button')) { const vc = im.closest('.vc'); if (vc) vvOpen(vc.dataset.h); }
  });
  addEventListener('keydown', e => {
    if (!VV) return;
    if (e.key === 'Escape') { vvClose(); return; }
    if (e.target && e.target.closest && e.target.closest('input,textarea,video,[data-grip]')) return;
    if (e.key === 'ArrowLeft') vvShow(-1); else if (e.key === 'ArrowRight') vvShow(1);
  });
  /* swipe on the card photo and on the slideshow's photo */
  let SW = null;
  document.addEventListener('touchstart', e => { const el = e.target.closest('.vc .img, #vv .vvpic'); if (!el || e.touches.length > 1 || e.target.closest('video')) { SW = null; return; } SW = { x: e.touches[0].clientX, y: e.touches[0].clientY, el }; }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!SW) return; const t = e.changedTouches[0], dx = t.clientX - SW.x, dy = t.clientY - SW.y, el = SW.el; SW = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    if (el.closest('#vv')) vvShow(dx < 0 ? 1 : -1); else { const vc = el.closest('.vc'); if (vc) step(vc.dataset.h, dx < 0 ? 1 : -1); }
  }, { passive: true });
  addEventListener('error', e => { const t = e.target; if (t && t.tagName === 'IMG' && (t.closest('.vc') || t.closest('#vv'))) {
      /* straight from the agency did not work: try once through the resizing service before giving up on the photo */
      const u0 = t.dataset.u; if (u0 && /^https?:\/\//i.test(u0) && !t.dataset.via) { t.dataset.via = '1'; t.src = small(u0, +t.dataset.w || 900); return; } if (t.closest('.vvs')) { const b = t.closest('button'); if (b) b.remove(); return; } bad(t); } }, true);
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
    /* 1.2.138 (user, 11 Nov 2026: "When I share a vote link, I also want to be able to put my USER name to cast a
       vote"): type your user name and PIN on one screen; the names below fill the name in with one tap */
    const all = (data || []).map(p => p.name);
    box.innerHTML = '<h2>' + H(L('Team Vote', '팀 투표')) + '</h2>' +
      '<form class="pin" id="uf"><label for="un">' + H(L('Your user name', '사용자 이름')) + '</label>' +
      '<input id="un" class="uname" type="text" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="' + H(L('e.g. DANIEL', '예: DANIEL')) + '">' +
      '<label for="pin">' + H(L('Your PIN (the password you sign in with)', 'PIN (로그인 비밀번호)')) + '</label>' +
      '<input id="pin" type="password" autocomplete="current-password" autocapitalize="off" spellcheck="false">' +
      '<p class="msg" id="perr">' + H(L('You type it once on this phone.', '이 기기에서는 한 번만 입력합니다.')) + '</p>' +
      '<button class="pri" id="go" type="submit">' + H(L('Sign in and vote', '로그인하고 투표')) + '</button></form>' +
      (ppl.length ? '<p class="msg">' + H(L('Or tap your name', '또는 이름을 누르세요')) + '</p><div class="people">' + ppl.map(n => '<button type="button" data-nm="' + H(n) + '"><span class="av">' + H(n.slice(0, 1).toUpperCase()) + '</span>' + H(n) + '</button>').join('') + '</div>' : '');
    box.querySelectorAll('[data-nm]').forEach(b => b.addEventListener('click', () => { $('#un').value = b.dataset.nm; box.querySelectorAll('[data-nm]').forEach(x => x.classList.toggle('on', x === b)); $('#pin').focus(); }));
    const last = LS.get('illum.vname'); if (ppl.length === 1 && SENT.length) $('#un').value = ppl[0]; else if (last && all.some(n => n.toLowerCase() === last.toLowerCase())) $('#un').value = last;
    setTimeout(() => ($('#un').value ? $('#pin') : $('#un')).focus(), 30);
    $('#uf').addEventListener('submit', async e => {
      e.preventDefault();
      const typed = $('#un').value.trim(), pw = $('#pin').value, er = $('#perr');
      const name = all.find(n => n.toLowerCase() === typed.toLowerCase());
      if (!typed) { $('#un').focus(); return; }
      if (!name) { er.className = 'msg err'; er.textContent = L('No team member is called "' + typed + '". Check the spelling.', '"' + typed + '" 이름의 팀원이 없습니다. 철자를 확인하세요.'); $('#un').select(); return; }
      if (!pw) { $('#pin').focus(); return; }
      $('#go').disabled = true; er.className = 'msg'; er.textContent = L('Signing in…', '로그인 중…');
      const { data: em, error: e1 } = await sb.rpc('login_email', { p_name: name });
      if (e1 || !em) { er.className = 'msg err'; er.textContent = errText(e1 || 'Invalid login'); $('#go').disabled = false; return; }
      const { data: ss, error: e2 } = await sb.auth.signInWithPassword({ email: em, password: pw });
      if (e2) { er.className = 'msg err'; er.textContent = errText(e2); $('#go').disabled = false; $('#pin').select(); return; }
      LS.set('illum.vname', name);
      start(ss.session);
    });
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
      '<div class="img">' + '<div class="nm"><b>' + H(o.nm || '') + '</b></div></div>' +
      /* 1.2.149: who has voted and who is still to vote (never how) */
      (st.open ? (() => { const nm = id => id === ME ? L('You', '나') : (pname(id) || '?'); const dn = st.voters.filter(id => voteOf(id, o.k, st.round)), wt = st.voters.filter(id => !voteOf(id, o.k, st.round));
        return '<div class="who">' + (dn.length ? '<span class="wd">✓ ' + H(L('Voted: ', '투표함: ') + dn.map(nm).join(', ')) + '</span>' : '') + (wt.length ? '<span class="ww">' + H(L('Waiting for: ', '대기 중: ') + wt.map(nm).join(', ')) + '</span>' : '') + '</div>'; })() : '') +
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
    /* 1.2.202 (user, 16 Nov 2026: "I only want to see votes that I haven't done. Apply this for all users"): cards I
       already voted on are not shown here - only a line saying how many are still waiting for the others */
    if (done.length) h += '<p class="msg">' + H(L(done.length + (done.length === 1 ? ' card you voted on is' : ' cards you voted on are') + ' waiting for the others.', '투표한 ' + done.length + '장은 다른 사람의 투표를 기다리는 중입니다.')) + '</p>';
    h += '<div class="foot"><a class="sec" href="../index.html">' + H(L('Open the full program', '전체 프로그램 열기')) + '</a></div>';
    box.innerHTML = h;
    box.querySelectorAll('.vc[data-h]').forEach(vc => paintImg(vc.dataset.h));
    window.scrollTo(0, 0);
  }
  const btns = (o, st) => '<div class="btns"><button type="button" class="vb g' + (st.mine === 'g' ? ' on' : '') + '" data-v="g" data-k="' + H(hash(o.k)) + '">✓ ' + H(L('Go', '찬성')) + '</button><button type="button" class="vb r' + (st.mine === 'r' ? ' on' : '') + '" data-v="r" data-k="' + H(hash(o.k)) + '">✕ ' + H(L('Pass', '반대')) + '</button></div>';

  /* 1.2.203 (user, 16 Nov 2026, Vote Animation #7): a light runs once around the card's frame while a ✓ / ✕ stamp
     lands on the photo. It plays on a copy of the card held in place, because the page redraws as soon as the vote is in. */
  function voteFx(card, v) {
    try {
      const r = card.getBoundingClientRect(); if (r.width < 40 || r.bottom < 0 || r.top > innerHeight) return;
      const im = card.querySelector('.img'), pr = im ? im.getBoundingClientRect() : r;
      const fx = document.createElement('div'); fx.className = 'vfx'; fx.setAttribute('aria-hidden', 'true');
      const copy = card.cloneNode(true); copy.style.cssText = 'position:absolute;inset:0;margin:0;width:100%;height:100%;pointer-events:none';
      fx.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;--c:' + (v === 'r' ? '#E5484D' : '#2FBF4A') + ';--r:' + (getComputedStyle(card).borderTopLeftRadius || '14px');
      fx.appendChild(copy);
      fx.insertAdjacentHTML('beforeend', '<span class="vfxring"></span><span class="vfxst" style="left:' + (pr.left - r.left + pr.width / 2) + 'px;top:' + (pr.top - r.top + pr.height / 2) + 'px">' + (v === 'r' ? '✕' : '✓') + '</span>');
      document.body.appendChild(fx);
      requestAnimationFrame(() => fx.classList.add('play'));
      setTimeout(() => fx.classList.add('out'), 1250); setTimeout(() => fx.remove(), 1600);
    } catch (er) {}
  }
  /* save one vote exactly as the program does; used by the card buttons and by the slideshow (1.2.204) */
  async function castVote(hk, v) {
    const o = OPEN.find(x => hash(x.k) === hk); if (!o) return { ok: false };
    try {
      /* read everything again first: someone may have voted, or the card may have left the vote */
      await loadAll();
      const o2 = OPEN.find(x => x.k === o.k); const st = o2 && stateOf(o2);
      if (!st || !st.open) return { ok: false, flash: { v, nm: o.nm, line: L('This vote has just closed, so your vote was not added.', '방금 투표가 끝나 반영되지 않았습니다.') } };
      if (!st.voters.includes(ME)) return { ok: false, flash: null, err: L('You are not one of the voters on this card.', '이 카드의 투표자가 아닙니다.') };
      const { data: cur, error: re } = await sb.from('docs').select('data').eq('path', 'vote/' + ME).maybeSingle();
      if (re) throw re;
      const d = (cur && cur.data) || {}; const ev = Object.assign({}, d.e || {}), tv = Object.assign({}, d.t || {});
      const r = String(st.round);
      ev[o.k] = Object.assign({}, ev[o.k] || {}, { [r]: v }); tv[o.k] = Object.assign({}, tv[o.k] || {}, { [r]: new Date().toISOString() });
      const body = Object.assign({}, d, { e: ev, t: tv, at: new Date().toISOString() });
      const { error: we } = await sb.from('docs').upsert({ path: 'vote/' + ME, coll: 'vote', id: ME, data: body, updated_at: new Date().toISOString() }, { onConflict: 'path' });
      if (we) throw we;
      VT.set(ME, { e: ev, t: tv });
      const after = stateOf(o2);
      const line = !after ? '' : after.open ? (after.round > st.round ? L('It was a tie, so a tie-breaker round has started.', '동점이라 타이브레이커 라운드가 시작됐습니다.') : L(after.n + ' of ' + after.of + ' have voted. The board in the program has updated.', after.of + '명 중 ' + after.n + '명 투표. 프로그램의 보드도 바뀌었습니다.'))
        : L('That was the last vote: ' + (after.res === 'appr' ? 'Approved ' : 'Cancelled ') + after.g + '–' + after.x + '.', '마지막 표였습니다: ' + (after.res === 'appr' ? '승인 ' : '취소 ') + after.g + '–' + after.x + '.');
      return { ok: true, flash: { v, nm: o.nm, line } };
    } catch (err) { return { ok: false, err: L('Could not save your vote. ', '투표를 저장하지 못했습니다. ') + errText(err) }; }
  }
  box.addEventListener('click', async e => {
    const b = e.target.closest('.vb[data-v]'); if (!b || !ME) return;
    { const card = box.querySelector('.vc[data-h="' + b.dataset.k + '"]'); if (card) voteFx(card, b.dataset.v); }
    box.querySelectorAll('.vb').forEach(x => { x.disabled = true; });
    const r = await castVote(b.dataset.k, b.dataset.v);
    if (r.ok || r.flash) { draw(r.flash); return; }
    if (r.err === undefined && !r.ok) { draw(); return; }
    box.querySelectorAll('.vb').forEach(x => { x.disabled = false; });
    const m = document.createElement('p'); m.className = 'msg err'; m.textContent = r.err; box.prepend(m);
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
  addEventListener('visibilitychange', async () => { if (!document.hidden && ME) { try { await loadAll(); draw(); if (VV) { vvPanel(); vvShow(0); } } catch (e) {} } });
  sb.auth.getSession().then(({ data }) => start(data && data.session), () => pickName());
})();
