
/* ================= Arm & hand: two photographs and the ring sizes =================
   The Arm & hand panel on the Measurement Detail sheet holds a photograph of each hand,
   left hand on the left, right on the right - dropped, pasted or picked from the computer
   and kept in the page's own store. Under each one, that hand's ring size finger by
   finger, typed in the list beside the sheet. The drawing is still one click away
   (the enlarge button). */
const RINGF = [['t', 'Thumb'], ['i', 'Index'], ['m', 'Middle'], ['r', 'Ring'], ['p', 'Little']];
const RINGU = [['us', 'US'], ['eu', 'EU'], ['jp', 'JP'], ['uk', 'UK'], ['mm', 'mm']];
const ringOf = c => (c.ring && typeof c.ring === 'object') ? c.ring : {};
const ringU = c => RINGU.some(u => u[0] === c.ringu) ? c.ringu : 'us';
const handOf = c => (c.hph && typeof c.hph === 'object') ? c.hph : {};
const footOf = c => (c.fph && typeof c.fph === 'object') ? c.fph : {};
/* one slot per photograph: l / lb / r / rb are the hands (front, back), fl / fr the feet */
const phFoot = side => side[0] === 'f';
const phGet = (c, side) => phFoot(side) ? footOf(c)[side.slice(1)] : handOf(c)[side];
function phSet(c, side, id){
  if(phFoot(side)){ const o = Object.assign({}, footOf(c)); if(id) o[side.slice(1)] = id; else delete o[side.slice(1)]; c.fph = o; }
  else { const o = Object.assign({}, handOf(c)); if(id) o[side] = id; else delete o[side]; c.hph = o; }
}
const PHWORD = {l: 'Left', lb: 'Left', r: 'Right', rb: 'Right', fl: '', fr: ''};
const PHLONG = {l: 'left hand, front', lb: 'left hand, back', r: 'right hand, front', rb: 'right hand, back', fl: 'left foot', fr: 'right foot'};
const HANDPRE = new Map();      // card|side -> local preview while uploading
let handNote = '';
function handSlot(c, side){
  const id = phGet(c, side), pre = HANDPRE.get(c.id + '|' + side);
  const src = pre || (id ? '/_blob/' + id : '');
  const word = PHWORD[side], long = PHLONG[side];
  const can = SIGNED();   // the store is asked for on the first drop or click
  return '<div class="hslot" data-hand="' + esc(c.id) + '|' + side + '"' + (can ? ' tabindex="0" role="button" title="Drop, paste or click to choose the photo of the ' + long + '"' : '') + '>' +
    (word ? '<b class="hslab">' + word + '</b>' : '') +
    (src ? '<img src="' + esc(src) + '" alt="' + long + '"' + (pre ? ' class="hsup"' : '') + '>' +
        (can && !pre ? '<button type="button" class="hsx" data-handdel="' + esc(c.id) + '|' + side + '" title="Remove this photo" aria-label="Remove the photo of the ' + long + '">×</button>' : '') +
        (pre ? '<s class="hsbusy">Saving…</s>' : '')
      : '<span class="hsempty"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/></svg>' +
        (can ? 'Drop, paste<br>or click' : 'Sign in to add a photo') + '</span>') +
    '</div>';
}
/* the hands by view: the fronts together, the backs together, left before right */
function handGroup(c, view){
  const f = view === 'front';
  return '<div class="hgrp"><b class="hglab">' + (f ? 'Front' : 'Back') + '</b>' +
    '<div class="hgslots">' + handSlot(c, f ? 'l' : 'lb') + handSlot(c, f ? 'r' : 'rb') + '</div></div>';
}
/* the ring sizes, once for each hand, under both views */
function handRings(c){
  const u = RINGU.find(x => x[0] === ringU(c))[1];
  const one = s => { const r = ringOf(c)[s] || {};
    const sizes = RINGF.filter(([k]) => r[k] != null && String(r[k]).trim() !== '');
    return '<span class="hsrside"><b>' + (s === 'L' ? 'Left' : 'Right') + '</b>' +
      (sizes.length ? sizes.map(([k, n]) => '<i><em>' + n + '</em>' + esc(String(r[k])) + '</i>').join('') + '<u>' + u + '</u>'
        : '<i class="none">—</i>') + '</span>'; };
  const any = ['L', 'R'].some(s => RINGF.some(([k]) => { const r = ringOf(c)[s] || {}; return r[k] != null && String(r[k]).trim() !== ''; }));
  return '<span class="hsring hsringall"><b class="hsrhd">Ring size</b>' +
    (any ? one('L') + one('R') : '<i class="none">Fill them in beside the sheet</i>') + '</span>';
}
/* a foot: one photograph */
function footGroup(c, s){
  return '<div class="hgrp"><b class="hglab">' + (s === 'l' ? 'Left foot' : 'Right foot') + '</b>' +
    '<div class="hgslots one">' + handSlot(c, 'f' + s) + '</div></div>';
}
/* the foot figures, once, under both feet */
function footInfo(c){
  const md = (c.md && typeof c.md === 'object') ? c.md : {};
  const has = v => v != null && String(v).trim() !== '';
  const lu = bkLU(c);
  const len = v => { const x = parseFloat(v); return isNaN(x) ? String(v) : String(lu === 'in' ? cmToIn(x) : x) + ' ' + lu; };
  const bits = [];
  if(has(md.fl)) bits.push(['Length', len(md.fl)]);
  if(has(md.fw)) bits.push(['Width', len(md.fw)]);
  if(has(c.eu)) bits.push(['Shoe', String(c.eu) + ' EU']);
  return '<span class="hsring hsringall"><b class="hsrhd">Foot</b>' + (bits.length ? bits.map(([k, v]) => '<i><em>' + k + '</em>' + esc(v) + '</i>').join('')
      : '<i class="none">Length, width and shoe size — beside the sheet</i>') + '</span>';
}
(function(){
  const o = bvMdStage;
  bvMdStage = function(c){
    const r = o.apply(this, arguments);
    try{
      const p = bvStage.querySelector('.mdpanel.mdsec--ah .mdpic');
      if(p){ p.className = 'mdpic hands'; p.innerHTML = handGroup(c, 'front') + handGroup(c, 'back') + handRings(c) +
        (handNote ? '<p class="hsnote">' + esc(handNote) + '</p>' : ''); }
      const fp = bvStage.querySelector('.mdpanel.mdsec--fp .mdpic');
      if(fp){ fp.className = 'mdpic hands feet'; fp.innerHTML = footGroup(c, 'l') + footGroup(c, 'r') + footInfo(c); }
      /* the photographs are the panel now: no drawing to enlarge */
      bvStage.querySelectorAll('.mdpanel.mdsec--ah .mdenl').forEach(b => b.remove());
      const h4 = bvStage.querySelector('.mdpanel.mdsec--ah h4');
      if(h4){ h4.firstChild.textContent = 'Hands';
        if(!h4.querySelector('.hsdraw')) h4.firstChild.after(Object.assign(document.createElement('span'), {className: 'hsdraw', textContent: '· photos'})); }
      if(LANG !== 'en') try{ langWalk(p); }catch(e){}
    }catch(e){}
    return r;
  };
  const om = bvMeasure;
  bvMeasure = function(c){
    let html = om.apply(this, arguments);
    const ro = !SIGNED(), R = ro ? ' readonly title="Sign in to edit"' : '';
    const rg = ringOf(c), u = ringU(c);
    /* its own section, in the same shape as every other one in the list */
    const block = '<section class="mdsec mdsec--ah mdsec--ring" data-mdsk="ring"><h4>Ring size<span class="bkuseg mdringu">' +
      RINGU.map(([k, l]) => '<button type="button" data-ringu="' + esc(c.id) + '|' + k + '" aria-pressed="' + (k === u) + '"' + (ro ? ' disabled' : '') + '>' + l + '</button>').join('') +
      '</span></h4><div class="mdrows"><div class="mdrow mdringhd"><span></span><b>Left</b><b>Right</b></div>' +
      RINGF.map(([k, n]) => '<div class="mdrow mdringrow"><label class="mdnm">' + n + '</label>' + ['L', 'R'].map(s =>
        '<input class="mdin2 mdringin" data-ring="' + esc(c.id) + '|' + s + '|' + k + '" value="' + esc(String((rg[s] || {})[k] || '')) +
        '" placeholder="—" autocomplete="off" aria-label="' + (s === 'L' ? 'Left ' : 'Right ') + n.toLowerCase() + ' ring size"' + R + '>').join('') + '</div>').join('') +
      '</div></section>';
    /* straight after the Arm & hand section */
    const at = html.indexOf('data-mdsk="ah"');
    if(at >= 0){
      const end = html.indexOf('</section>', at);
      if(end >= 0) html = html.slice(0, end + 10) + block + html.slice(end + 10);
    }
    return html;
  };
})();
function handRedraw(c){
  try{ if(bv && bv.view === 'm' && bv.id === c.id) bvMdStage(c); }catch(e){}
}
async function handPut(bid, side, file){
  const c = BOOK.get(bid);
  if(!c || !file) return;
  if(!SIGNED()){ try{ nudgeSignIn(); }catch(e){} return; }
  if(!/^image\//i.test(file.type || '')){ handNote = 'That is not an image file.'; handRedraw(c); return; }
  if(!ASSETS){ try{ ASSETS = await use('assets'); }catch(e){} }
  if(!ASSETS){ handNote = 'Photographs need this page’s own store, which is not available in this view.'; handRedraw(c); return; }
  const key = bid + '|' + side;
  const old = HANDPRE.get(key); if(old) try{ URL.revokeObjectURL(old); }catch(e){}
  HANDPRE.set(key, URL.createObjectURL(file)); handNote = ''; handRedraw(c);
  try{
    const res = await ASSETS.upload(typeof picShrink === 'function' ? await picShrink(file) : file);
    if(!res || !res.id) throw new Error('no id');
    const prevId = phGet(c, side);
    phSet(c, side, res.id);
    saveBook(bid, true);
    const keep = HANDPRE.get(key), im = new Image();
    im.onload = im.onerror = () => { if(HANDPRE.get(key) === keep){ HANDPRE.delete(key); try{ URL.revokeObjectURL(keep); }catch(e){} handRedraw(c); } };
    im.src = '/_blob/' + res.id;
    if(prevId && prevId !== res.id){ try{ await ASSETS.delete(prevId); }catch(e){} }
  }catch(err){
    const p = HANDPRE.get(key); HANDPRE.delete(key); if(p) try{ URL.revokeObjectURL(p); }catch(e){}
    const code = err && err.code;
    handNote = code === 'not_granted' ? 'Claude needs your permission to store photographs on this page.'
      : code === 'quota_or_state' ? 'The page’s photo storage is full — remove an old photograph first.'
      : 'That upload did not go through. Try again, or a smaller file.';
    handRedraw(c);
  }
}
const handInput = Object.assign(document.createElement('input'), {type: 'file', accept: 'image/*', hidden: true});
document.body.appendChild(handInput);
let handFor = null;
handInput.addEventListener('change', () => { const f = handInput.files && handInput.files[0]; const k = handFor; handInput.value = ''; handFor = null;
  if(k && f){ const [b, s] = k.split('|'); handPut(b, s, f); } });
document.addEventListener('click', async e => {
  const del = e.target.closest && e.target.closest('[data-handdel]');
  if(del){
    e.preventDefault(); e.stopPropagation();
    if(!SIGNED()) return;
    const [bid, side] = del.dataset.handdel.split('|'), c = BOOK.get(bid); if(!c) return;
    const id = phGet(c, side);
    phSet(c, side, null);
    saveBook(bid, true); handRedraw(c);
    if(id && ASSETS){ try{ await ASSETS.delete(id); }catch(_){} }
    return;
  }
  const slot = e.target.closest && e.target.closest('.hslot[data-hand]');
  if(slot){
    e.preventDefault(); e.stopPropagation();
    if(!SIGNED()){ try{ nudgeSignIn(slot); }catch(_){} return; }
    handFor = slot.dataset.hand; handInput.click();
    return;
  }
  const u = e.target.closest && e.target.closest('[data-ringu]');
  if(u){
    e.preventDefault(); e.stopPropagation();
    if(!SIGNED()) return;
    const [bid, k] = u.dataset.ringu.split('|'), c = BOOK.get(bid); if(!c) return;
    c.ringu = k; saveBook(bid);
    u.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === u)));
    handRedraw(c);
  }
}, true);
document.addEventListener('keydown', e => {
  if(e.key !== 'Enter' && e.key !== ' ') return;
  const slot = e.target.closest && e.target.closest('.hslot[data-hand]');
  if(slot && e.target === slot){ e.preventDefault(); slot.click(); }
}, true);
/* drop a file on a hand, or paste while pointing at one */
let HANDHOVER = null;
document.addEventListener('pointerover', e => { const s = e.target.closest && e.target.closest('.hslot[data-hand]'); HANDHOVER = s ? s.dataset.hand : null; });
document.addEventListener('dragover', e => {
  const s = e.target.closest && e.target.closest('.hslot[data-hand]');
  if(!s) return;
  e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy';
  document.querySelectorAll('.hslot.over').forEach(x => x !== s && x.classList.remove('over')); s.classList.add('over');
}, true);
document.addEventListener('dragleave', e => { const s = e.target.closest && e.target.closest('.hslot'); if(s && !s.contains(e.relatedTarget)) s.classList.remove('over'); }, true);
document.addEventListener('drop', e => {
  const s = e.target.closest && e.target.closest('.hslot[data-hand]');
  if(!s) return;
  e.preventDefault(); e.stopPropagation(); s.classList.remove('over');
  const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if(f){ const [b, side] = s.dataset.hand.split('|'); handPut(b, side, f); }
}, true);
document.addEventListener('paste', e => {
  if(!HANDHOVER) return;
  const ae = document.activeElement; if(ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName)) return;
  for(const it of (e.clipboardData && e.clipboardData.items) || []){
    if(it.kind === 'file' && /^image\//i.test(it.type)){ const f = it.getAsFile(); if(!f) continue;
      e.preventDefault(); e.stopImmediatePropagation(); const [b, side] = HANDHOVER.split('|'); handPut(b, side, f); return; }
  }
}, true);
/* ring sizes are kept as typed - a size is a label, not a length to convert */
document.addEventListener('input', e => {
  const el = e.target;
  if(!el || !el.dataset || !el.dataset.ring) return;
  e.stopImmediatePropagation();
  const [bid, s, k] = el.dataset.ring.split('|'), c = BOOK.get(bid); if(!c) return;
  if(!SIGNED()){ try{ nudgeSignIn(); }catch(_){} return; }
  const rg = JSON.parse(JSON.stringify(ringOf(c)));
  rg[s] = rg[s] || {};
  const v = el.value.trim().slice(0, 12);
  if(v) rg[s][k] = v; else delete rg[s][k];
  c.ring = rg; saveBook(bid);
  const old = bvStage.querySelector('.mdpic.hands:not(.feet) .hsringall');
  if(old){ const tmp = document.createElement('div'); tmp.innerHTML = handRings(c); old.replaceWith(tmp.firstChild); }
}, true);
