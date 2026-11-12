
/* ================= The model's room: a booking card, opened wide =================
   Press a booking card's photograph and everything kept for that model opens across the
   screen: figures along the top, the eight working folders as tabs, the picture or film
   as large as the screen allows, and an index down the side.
   Where the files come from:
   - This computer: the booker points the page at the model's folder (or the whole
     BOOKING folder - the right model is found by name). The files are read where they
     are; nothing is uploaded anywhere. A browser forgets that choice when the page is
     reloaded, so it is asked again after a reload.
   - Dropbox: viewing copies of /ILLUMENOCTIS/BOOKING/<model> kept in this page's own
     store (bvmirror/<card id>), opened inside the viewer - never on dropbox.com. */
const BVFOLD = ['1. BOOK', '2. SNAPS', '3. VIDEOS', '4. PASSPORT', '5. CONTRACT',
                '6. VISA', '7. AIRLINE TICKET', '8. STATEMENT'];
const BVONLY = {'1. BOOK': ['img', 'heic'], '2. SNAPS': ['img', 'heic'], '3. VIDEOS': ['vid']};
const BVSKIP = /^(\.keep|_info\.txt|desktop\.ini|thumbs\.db|\.ds_store)$/i;
const BVIMG = /\.(jpe?g|png|webp|gif|avif|bmp)$/i;
const BVHEIC = /\.(heic|heif)$/i;
const BVVID = /\.(mp4|mov|m4v|webm|ogv)$/i;
const BVDROP = 'https://www.dropbox.com/home/ILLUMENOCTIS/BOOKING';
let BVROOT = null;            // everything picked from this computer this visit
const BVLOAD = new Map();    // card id -> {folder, groups: Map(tab -> [File])}
const BVTHUMB = new WeakMap(); // File -> canvas thumbnail (or false when it cannot draw)
let bv = null;               // {id, tab, i}
let bvURL = '';              // the object URL on screen now, freed when it changes

const bvNorm = s => String(s || '').normalize('NFC').toLowerCase()
  .replace(/[‐-―]/g, '-').replace(/\s+/g, ' ').trim();
function bvFolderName(c){
  return [String(c.nm || '').trim(), String(c.ag || '').trim()].filter(Boolean).join(' - ');
}
/* "1. BOOK", "1.BOOK", "BOOK" and "book" are all the first tab */
function bvTabOf(seg){
  const bare = bvNorm(seg).replace(/^\d+\s*\.?\s*/, '');
  return BVFOLD.find(f => bvNorm(f).replace(/^\d+\.\s*/, '') === bare) || null;
}
function bvSize(n){
  if(!(n >= 0)) return '';
  return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB'
       : n >= 1024 ? Math.round(n / 1024) + ' KB' : n + ' B';
}
function bvKind(f){
  const n = f.name || '';
  if(BVHEIC.test(n)) return 'heic';
  if(BVIMG.test(n) || /^image\//.test(f.type || '')) return 'img';
  if(BVVID.test(n) || /^video\//.test(f.type || '')) return 'vid';
  if(/\.pdf$/i.test(n)) return 'pdf';
  if(/\.docx$/i.test(n)) return 'docx';
  if(/\.(xlsx|xlsm|xlsb|xls|ods|csv)$/i.test(n)) return 'sheet';
  if(/\.pptx$/i.test(n)) return 'pptx';
  if(/\.(txt|md|json|log|rtf)$/i.test(n)) return 'text';
  return 'doc';
}
/* ---- reading every kind of file, not only pictures ----
   The readers are fetched only when a file of that kind is first opened, from a pinned
   version, so the page itself stays light. Everything happens in this browser: the
   file is read here and drawn here, nothing is sent anywhere. */
const BVCDN = '../vendor/lib/';
const BVLIBS = {
  heic: [['heic2any@0.0.4/dist/heic2any.min.js'], 'heic2any'],
  docx: [['jszip@3.10.1/dist/jszip.min.js', 'docx-preview@0.3.7/dist/docx-preview.min.js'], 'docx'],
  sheet: [['xlsx@0.18.5/dist/xlsx.full.min.js'], 'XLSX'],
  /* the worker goes in as a plain script: this page may not start a worker from
     another site, and pdf.js then reads on the page itself */
  pdf: [['pdfjs-dist@3.11.174/build/pdf.min.js', 'pdfjs-dist@3.11.174/build/pdf.worker.min.js'],
        'pdfjsLib'],
  pptx: [['pptx-preview@1.0.7/dist/pptx-preview.umd.js'], 'pptxPreview'],
  mkpdf: [['jspdf@2.5.2/dist/jspdf.umd.min.js'], 'jspdf']
};
const BVPDFSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
  'stroke-linejoin="round"><path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 ' +
  '1.5-1.5V8z"/><path d="M14 3v5h5"/><text x="12" y="17.2" text-anchor="middle" font-size="5.6" ' +
  'font-weight="700" fill="currentColor" stroke="none" font-family="Arial,sans-serif">PDF</text></svg>';
const BVDLSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
  'stroke-linecap="round" stroke-linejoin="round"><path d="M7 18.5H6a4 4 0 0 1-.6-7.96A6 6 0 0 1 17 ' +
  '8.6a4.5 4.5 0 0 1 .5 8.97"/><path d="M12 11v9"/><path d="m8.8 17 3.2 3.2 3.2-3.2"/></svg>';
const BVMAXSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
  'stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
const BVMINSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
  'stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
const BVZINSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
  'stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20M10.5 7.5v6M7.5 10.5h6"/></svg>';
const BVZOUTSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
  'stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20M7.5 10.5h6"/></svg>';
const BVGRIDSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">' +
  '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/>' +
  '<rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/></svg>';
/* ---- files added from this screen ----
   A file dropped or pasted onto the viewer is kept in this page's own store at once, so
   everyone sees it straight away, and listed in bvadd/<card id>. Each row waits there
   (pc: 0) until it is copied into the model's BOOKING folder on the computer. */
const BVADD = new Map();             // card id -> rows
const BVADDF = new Map();            // asset id -> stand-in file, and 'F'+id -> real File
let bvMsgNext = '';
async function bvAddLoad(id, force){
  if(BVADD.has(id) && !force) return;
  let d = null;
  try{ d = DB ? docOf(await DB.doc('bvadd/' + id).get()) : null; }catch(e){ d = null; }
  const rows = (d && Array.isArray(d.e)) ? d.e.filter(r => r && r.i && r.tab && r.n) : [];
  const had = BVADD.has(id);
  BVADD.set(id, rows);
  if(rows.length && !had && bv && bv.id === id && !bv.choose && BVLOAD.has(id) &&
     bvDragFrom == null) bvDraw();
}
function bvAddFile(r){
  if(!BVADDF.has(r.i)) BVADDF.set(r.i, {name: r.n, size: r.s || 0, type: r.t || '',
                                        lastModified: 0, _add: r});
  return BVADDF.get(r.i);
}
function bvWithAdds(raw, tab){
  const rows = bv ? (BVADD.get(bv.id) || []).filter(r => r.tab === tab) : [];
  if(!rows.length) return raw;
  const have = new Set(raw.map(f => String(f.name).toLowerCase()));
  return raw.concat(rows.filter(r => !have.has(String(r.n).toLowerCase())).map(bvAddFile));
}
const BVONESVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">' +
  '<rect x="6" y="3.5" width="12" height="17" rx="1.2"/></svg>';
const BVROTLSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
  'stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>' +
  '<path d="M3 3v5h5"/></svg>';
const BVROTRSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
  'stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>' +
  '<path d="M21 3v5h-5"/></svg>';
/* ---- order and turn ----
   How the files in each folder are ordered and turned, per model: bvarr/<card id> in the
   page's store (so the whole team sees the same book), with a copy in this browser.
   Kept by file name, so it holds for the Dropbox copy and the folder on this computer
   alike; files added later simply join at the end. Nothing in the files themselves is
   changed - a download is still the original. */
const BVARR = new Map();             // card id -> {tab: {o: [names], r: {name: degrees}}}
function bvTabArr(id, tab){
  let a = BVARR.get(id);
  if(!a){ a = {}; BVARR.set(id, a); }
  if(!a[tab]) a[tab] = {o: [], r: {}};
  return a[tab];
}
function bvRot(f){
  if(!bv || !f) return 0;
  const a = BVARR.get(bv.id), t = a && a[bv.tab];
  return (t && t.r && +t.r[f.name]) || 0;
}
/* stored as lists, not as objects keyed by folder and file names */
function bvArrPack(a){
  return {v: 1, at: Date.now(), t: Object.entries(a).map(([tab, x]) =>
    ({tab: tab, o: x.o || [], r: Object.entries(x.r || {})}))};
}
function bvArrUnpack(d){
  const a = {};
  if(!d || !Array.isArray(d.t)) return a;
  for(const x of d.t){
    if(!x || typeof x.tab !== 'string') continue;
    const r = {};
    for(const p of (Array.isArray(x.r) ? x.r : [])) if(p && +p[1]) r[p[0]] = +p[1];
    a[x.tab] = {o: Array.isArray(x.o) ? x.o.map(String) : [], r: r};
  }
  return a;
}
async function bvArrLoad(id){
  if(BVARR.has(id)) return;
  let d = null;
  try{ d = DB ? docOf(await DB.doc('bvarr/' + id).get()) : null; }catch(e){ d = null; }
  if(!d || !Array.isArray(d.t)){
    try{ d = JSON.parse(localStorage.getItem('illum.bvarr.' + id) || 'null'); }catch(e){ d = null; }
  }
  if(BVARR.has(id)) return;          // changed here while the store was answering
  const a = bvArrUnpack(d);
  BVARR.set(id, a);
  if(Object.keys(a).length && bv && bv.id === id && !bv.choose && BVLOAD.has(id) &&
     bvDragFrom == null){
    const c = BOOK.get(id);
    if(c) bvDrawStage(c, BVLOAD.get(id));
  }
}
let bvArrT = 0;
function bvArrSave(id){
  const a = BVARR.get(id);
  if(!a) return;
  LIVE.arr.set(id, Date.now());
  const doc = bvArrPack(a);
  try{ localStorage.setItem('illum.bvarr.' + id, JSON.stringify(doc)); }catch(e){}
  if(!DB || !SIGNED()) return;
  clearTimeout(bvArrT);
  bvArrT = setTimeout(() => {
    try{ Promise.resolve(DB.doc('bvarr/' + id).set(doc)).catch(() => {}); }catch(e){}
  }, 400);
}
/* the folder's files in the saved order: those placed by hand first, in that order,
   then any the order has never seen, as the folder lists them */
function bvArrange(raw){
  const a = bv && BVARR.get(bv.id), t = a && a[bv.tab];
  if(!t || !t.o || !t.o.length) return raw;
  const rank = new Map(t.o.map((n, i) => [n, i]));
  return raw.map((f, i) => [f, rank.has(f.name) ? rank.get(f.name) : 1e6 + i])
    .sort((x, y) => x[1] - y[1]).map(x => x[0]);
}
let bvDragFrom = null, bvDropAt = null;
/* ---- bigger and smaller ----
   A photo can be zoomed (buttons, wheel, double-click, + and - keys) and dragged about
   once it is larger than the stage; the maximize button gives the whole screen to the
   file, and Esc or the same button brings the panels back. */
let bvZ = {k: 1, x: 0, y: 0};
const BVZMAX = 8;
const bvPhotoEl = () => bvStage.querySelector('.bvmedia > img, .bvmedia > canvas');
function bvZoomApply(){
  const el = bvPhotoEl();
  if(el){
    const r = bvRot(bvList()[bv ? bv.i : 0]);
    bvZ.fit = bvFit(el, r);
    el.style.transform = 'translate(' + bvZ.x + 'px,' + bvZ.y + 'px) scale(' +
      (bvZ.k * bvZ.fit) + ')' + (r ? ' rotate(' + r + 'deg)' : '');
    el.classList.toggle('bvzoomed', bvZ.k > 1);
  }
  const lab = bvStage.querySelector('.bvzlab');
  if(lab) lab.textContent = Math.round(bvZ.k * 100) + '%';
  const zo = bvStage.querySelector('[data-bvzoom="out"]');
  if(zo) zo.disabled = bvZ.k <= 1;
  const zi = bvStage.querySelector('[data-bvzoom="in"]');
  if(zi) zi.disabled = bvZ.k >= BVZMAX;
}
function bvZoomTo(k, cx, cy){
  const el = bvPhotoEl();
  if(!el) return;
  k = Math.max(1, Math.min(BVZMAX, k));
  const r = el.getBoundingClientRect();
  const C = {x: r.left + r.width / 2 - bvZ.x, y: r.top + r.height / 2 - bvZ.y};
  if(cx == null){ cx = C.x + bvZ.x; cy = C.y + bvZ.y; }
  const ux = (cx - C.x - bvZ.x) / bvZ.k, uy = (cy - C.y - bvZ.y) / bvZ.k;
  bvZ.k = k;
  bvZ.x = k === 1 ? 0 : cx - C.x - k * ux;
  bvZ.y = k === 1 ? 0 : cy - C.y - k * uy;
  bvZoomClamp(el);
  bvZoomApply();
}
/* A photo turned on its side is scaled so the turned picture fits the stage the way the
   upright one did - never past its own size. */
function bvFit(el, r){
  if(!(r % 180)) return 1;
  const box = el.parentElement;
  if(!box) return 1;
  const cs = getComputedStyle(box);
  const bw = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const bh = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const w = el.offsetWidth, h = el.offsetHeight;
  if(!w || !h || bw <= 0 || bh <= 0) return 1;
  const nw = el.naturalWidth || el.width || w;
  return Math.min(bw / h, bh / w, Math.max(1, nw / w));
}
function bvZoomClamp(el){
  const turned = bvRot(bvList()[bv ? bv.i : 0]) % 180 !== 0, f = bvZ.fit || 1;
  const w = (turned ? el.offsetHeight : el.offsetWidth) * f,
        h = (turned ? el.offsetWidth : el.offsetHeight) * f;
  const mx = Math.max(0, w * (bvZ.k - 1) / 2), my = Math.max(0, h * (bvZ.k - 1) / 2);
  bvZ.x = Math.max(-mx, Math.min(mx, bvZ.x));
  bvZ.y = Math.max(-my, Math.min(my, bvZ.y));
}
function bvMaxSet(on){
  bvEl.classList.toggle('bvmax', on);
  const b = bvStage.querySelector('[data-bvmax]');
  if(b){ b.innerHTML = on ? BVMINSVG : BVMAXSVG;
         b.title = on ? 'Restore (Esc)' : 'Maximize'; b.setAttribute('aria-label', b.title); }
  /* the real full screen where the browser allows it; the page-filling view either way */
  try{
    if(on && !document.fullscreenElement && bvEl.requestFullscreen)
      bvEl.requestFullscreen().catch(() => {});
    if(!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }catch(e){}
  if(bvZ.k > 1){ const el = bvPhotoEl(); if(el){ bvZoomClamp(el); bvZoomApply(); } }
}
window.addEventListener('resize', () => {
  if(bv && !bvEl.hidden && !bv.grid && bvPhotoEl()) bvZoomApply();
});
document.addEventListener('fullscreenchange', () => {
  if(!document.fullscreenElement && bvEl.classList.contains('bvmax')) bvMaxSet(false);
});
/* The PDF button: the pictures in the open folder, two to a page, under the model's
   name and figures - the sheet an agency sends a client. Made here, saved here. */
async function bvMakePdf(btn){
  const c = bv && BOOK.get(bv.id);
  if(!c || !DOWN) return;
  let pics = bvList().filter(f => { const k = bvKind(f); return k === 'img' || k === 'heic'; });
  try{ pics = await Promise.all(pics.map(bvReal)); }catch(e){}
  const say = t => { const m = bvStage.querySelector('.bvmsg'); if(m) m.textContent = t; };
  if(!pics.length){ say('No photos in ' + bv.tab.replace(/^\d+\.\s*/, '') + ' to put in a PDF'); return; }
  if(btn.dataset.busy) return;
  btn.dataset.busy = '1'; btn.classList.add('busy');
  try{
    say('Making the PDF\u2026');
    const J = (await bvLib('mkpdf')).jsPDF;
    const doc = new J({orientation: 'landscape', unit: 'pt', format: 'a4'});
    const W = 842, H = 595, M = 28, TOP = 78, GAP = 14;
    const n = v => (v == null || String(v).trim() === '') ? '' : String(v).trim();
    let age = ''; try{ age = ageFrom(c.dob); }catch(e){}
    if(age === '' || age == null) age = n(c.age);
    const shoe = n(c.eu) ? c.eu + ' EU' : (n(c.us) ? c.us + ' US' : '');
    const figs = [['Height', n(c.ht) && c.ht + ' cm'], ['Bust', n(c.bu) && c.bu + ' cm'],
      ['Waist', n(c.wa) && c.wa + ' cm'], ['Hips', n(c.hp) && c.hp + ' cm'], ['Shoes', shoe],
      ['Hair', n(c.hcol)], ['Eyes', n(c.ecol)], ['Age', age === '' ? '' : String(age)]]
      .filter(x => x[1]).map(x => x[0] + ' ' + x[1]).join('    ');
    const head = () => {
      doc.setFont('helvetica', 'normal'); doc.setTextColor(27, 23, 36);
      doc.setFontSize(22); doc.text(String(c.nm || ''), M, M + 14);
      doc.setFontSize(9); doc.setTextColor(90, 44, 87);
      doc.text(String([c.ag, [c.city, c.country].filter(Boolean).join(', ')].filter(Boolean)
        .join('  \u00b7  ')).toUpperCase(), M, M + 30);
      doc.setFontSize(10); doc.setTextColor(73, 65, 84);
      if(figs) doc.text(figs, M, M + 46);
    };
    const slotW = (W - 2 * M - GAP) / 2, slotH = H - TOP - M;
    for(let i = 0; i < pics.length; i++){
      say('Making the PDF\u2026 ' + (i + 1) + ' / ' + pics.length);
      if(i % 2 === 0){ if(i) doc.addPage(); head(); }
      let src = pics[i];
      const rot = bvRot(src);
      if(bvKind(src) === 'heic') src = await bvHeic(src);
      const bmp = await createImageBitmap(src);
      const k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
      const cv = document.createElement('canvas');
      const dw = Math.round(bmp.width * k), dh = Math.round(bmp.height * k);
      const side = rot % 180 !== 0;
      cv.width = side ? dh : dw; cv.height = side ? dw : dh;
      const g2 = cv.getContext('2d');
      g2.translate(cv.width / 2, cv.height / 2);
      if(rot) g2.rotate(rot * Math.PI / 180);
      g2.drawImage(bmp, -dw / 2, -dh / 2, dw, dh);
      bmp.close && bmp.close();
      const fit = Math.min(slotW / cv.width, slotH / cv.height);
      const w = cv.width * fit, h = cv.height * fit;
      const x = M + (i % 2) * (slotW + GAP) + (slotW - w) / 2, y = TOP + (slotH - h) / 2;
      doc.addImage(cv.toDataURL('image/jpeg', 0.86), 'JPEG', x, y, w, h);
    }
    const name = bvFolderName(c) + ' - ' + bv.tab.replace(/^\d+\.\s*/, '') + '.pdf';
    await DOWN.save({filename: name, data: doc.output('blob')});
    say('PDF ready \u2014 ' + pics.length + ' photo' + (pics.length === 1 ? '' : 's'));
  }catch(e){
    say('The PDF could not be made' + (e && e.message ? ' \u2014 ' + e.message : ''));
  }finally{
    delete btn.dataset.busy; btn.classList.remove('busy');
  }
}
const BVLIBP = {};
const bvScript = src => new Promise((res, rej) => {
  if(document.querySelector('script[data-bvlib="' + src + '"]')){ res(); return; }
  const el = document.createElement('script');
  el.src = BVCDN + src; el.async = false; el.dataset.bvlib = src;
  el.onload = () => res();
  el.onerror = () => { el.remove(); rej(new Error('could not load ' + src)); };
  document.head.appendChild(el);
});
function bvLib(k){
  if(BVLIBP[k]) return BVLIBP[k];
  const [srcs, g] = BVLIBS[k];
  BVLIBP[k] = (async () => {
    for(const src of srcs) await bvScript(src);
    if(!window[g]) throw new Error('reader missing: ' + g);
    return window[g];
  })();
  BVLIBP[k].catch(() => { delete BVLIBP[k]; });
  return BVLIBP[k];
}
const BVCONV = new WeakMap();   // HEIC file -> converted JPEG blob
async function bvHeic(f){
  if(BVCONV.has(f)) return BVCONV.get(f);
  const h = await bvLib('heic');
  let out = await h({blob: f, toType: 'image/jpeg', quality: 0.9});
  if(Array.isArray(out)) out = out[0];
  BVCONV.set(f, out);
  return out;
}
/* a white sheet over the dark stage, for anything that reads like paper */
function bvSheet(box, cls){
  box.innerHTML = '';
  const d = document.createElement('div');
  d.className = 'bvdoc' + (cls ? ' ' + cls : '');
  box.appendChild(d);
  return d;
}
async function bvRenderDoc(kd, f, box, seq){
  const live = () => seq === bvSeq && box.isConnected;
  if(kd === 'pdf'){
    const lib = await bvLib('pdf');
    const doc = await lib.getDocument({data: new Uint8Array(await f.arrayBuffer())}).promise;
    if(!live()) return;
    const d = bvSheet(box, 'bvdoc--pdf');
    const w = Math.max(320, Math.min(1100, d.clientWidth - 32));
    const pages = Math.min(doc.numPages, 60);
    for(let n = 1; n <= pages; n++){
      const pg = await doc.getPage(n);
      if(!live()) return;
      const v1 = pg.getViewport({scale: 1});
      const Zd = Math.max(0.5, Math.min(4, window.__bvDZ || 1)), k = w * Zd / v1.width, dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1, 4096 / (w * Zd)));
      const vp = pg.getViewport({scale: k * dpr});
      const cv = document.createElement('canvas');
      cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
      cv.style.width = Math.round(vp.width / dpr) + 'px';
      d.appendChild(cv);
      await pg.render({canvasContext: cv.getContext('2d'), viewport: vp}).promise;
    }
    if(doc.numPages > pages){
      const m = document.createElement('p');
      m.className = 'bvdocmore';
      m.textContent = 'Showing the first ' + pages + ' of ' + doc.numPages +
        ' pages \u2014 download the file for the rest.';
      d.appendChild(m);
    }
    return;
  }
  if(kd === 'docx'){
    const lib = await bvLib('docx');
    const buf = await f.arrayBuffer();
    if(!live()) return;
    const d = bvSheet(box, 'bvdoc--docx');
    await lib.renderAsync(buf, d, null, {inWrapper: true, ignoreLastRenderedPageBreak: true,
      experimental: false, useBase64URL: true});
    return;
  }
  if(kd === 'sheet'){
    const X = await bvLib('sheet');
    const wb = X.read(new Uint8Array(await f.arrayBuffer()), {type: 'array', cellDates: true});
    if(!live()) return;
    const d = bvSheet(box, 'bvdoc--sheet');
    const tabs = document.createElement('div');
    tabs.className = 'bvsheettabs';
    const body = document.createElement('div');
    body.className = 'bvsheetbody';
    const show = name => {
      body.innerHTML = X.utils.sheet_to_html(wb.Sheets[name], {editable: false});
      tabs.querySelectorAll('button').forEach(b =>
        b.setAttribute('aria-pressed', String(b.dataset.sh === name)));
    };
    wb.SheetNames.forEach(name => {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.sh = name; b.textContent = name;
      b.addEventListener('click', ev => { ev.stopPropagation(); show(name); });
      tabs.appendChild(b);
    });
    if(wb.SheetNames.length > 1) d.appendChild(tabs);
    d.appendChild(body);
    show(wb.SheetNames[0]);
    return;
  }
  if(kd === 'pptx'){
    const P = await bvLib('pptx');
    const buf = await f.arrayBuffer();
    if(!live()) return;
    const d = bvSheet(box, 'bvdoc--pptx');
    const holder = document.createElement('div');
    d.appendChild(holder);
    const w = Math.max(320, Math.min(1000, d.clientWidth - 32));
    const pv = P.init(holder, {width: w, height: Math.round(w * 9 / 16), mode: 'list'});
    await pv.preview(buf);
    return;
  }
  if(kd === 'text'){
    const t = await f.text();
    if(!live()) return;
    const d = bvSheet(box, 'bvdoc--text');
    const pre = document.createElement('pre');
    pre.textContent = t.slice(0, 400000);
    d.appendChild(pre);
    return;
  }
}
function bvDropURL(c, tab){
  return BVDROP + '/' + encodeURIComponent(bvFolderName(c)) +
    (tab ? '/' + encodeURIComponent(tab) : '');
}

/* ---- reading a picked folder ---- */
const bvInput = document.createElement('input');
bvInput.type = 'file';
bvInput.multiple = true;
bvInput.hidden = true;
try{ bvInput.webkitdirectory = true; bvInput.setAttribute('webkitdirectory', ''); }catch(e){}
document.body.appendChild(bvInput);
bvInput.addEventListener('change', () => {
  const files = bvInput.files ? [...bvInput.files] : [];
  bvInput.value = '';
  if(!bv || !files.length) return;
  BVROOT = files;
  const c = BOOK.get(bv.id);
  if(!c) return;
  const got = bvSort(c, files);
  if(!got){
    bvNoteOnly('<h3>That folder isn’t ' + esc(c.nm || 'this model') + '’s</h3>' +
      'Looked for a folder called <code>' + esc(bvFolderName(c)) + '</code> in what you ' +
      'picked and did not find it.<div class="bvbtns">' +
      '<button type="button" class="bvbtn bvbtn--acc" data-bvpick>Choose another folder' +
      '</button></div>');
    return;
  }
  BVLOAD.set(c.id, got);
  const first = BVFOLD.find(t => (got.groups.get(t) || []).length) || BVFOLD[0];
  bv.tab = first; bv.i = 0; bv.choose = false;
  bvDraw();
});
/* Finds the model's folder in whatever was picked: the model's folder itself, the
   BOOKING folder above it, or anything higher up. */
function bvSort(c, files){
  const want = bvNorm(bvFolderName(c));
  const paths = files.map(f => String(f.webkitRelativePath || f.name).split('/'));
  let at = -1;
  for(const p of paths){
    const k = p.findIndex(seg => bvNorm(seg) === want);
    if(k >= 0){ at = k; break; }
  }
  /* a folder named a little differently (an agency spelled out another way) is still
     taken when it carries the model's own first name and is laid out like a model's
     folder - but never another model's folder by mistake */
  let loose = false;
  if(at < 0){
    const first = bvNorm(c.nm).split(/[\s-]+/)[0] || '';
    const top = bvNorm(paths[0][0]);
    const tabbed = paths.filter(p => p.length > 2 && bvTabOf(p[1])).length;
    if(!tabbed || first.length < 2 || !top.split(/[\s-]+/).includes(first)) return null;
    at = 0; loose = true;
  }
  const groups = new Map(BVFOLD.map(t => [t, []]));
  const other = [];
  files.forEach((f, n) => {
    const p = paths[n];
    if(loose ? false : bvNorm(p[at]) !== want) return;
    const rest = p.slice(at + 1);
    if(!rest.length || BVSKIP.test(rest[rest.length - 1])) return;
    const tab = rest.length > 1 ? bvTabOf(rest[0]) : null;
    /* BOOK and SNAPS are pictures, VIDEOS is video: anything else filed there is not shown */
    if(tab && BVONLY[tab] && !BVONLY[tab].includes(bvKind(f))) return;
    (tab ? groups.get(tab) : other).push(f);
  });
  for(const [t, arr] of groups){
    arr.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
  }
  const total = [...groups.values()].reduce((s, a) => s + a.length, 0) + other.length;
  return {folder: paths[0].slice(0, at + 1).join('/'), groups: groups, other: other,
          total: total, at: new Date()};
}

/* ---- drawing pictures without depending on how the page may load them ----
   An object URL in an <img> is the quick way. If the page's own rules refuse it, the
   picture is decoded in the browser and painted onto a canvas instead. */
function bvPaint(f, box, maxEdge){
  return new Promise(res => {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.decoding = 'async';
    img.alt = f.name;
    img.onload = () => res({el: img, url: url});
    img.onerror = async () => {
      URL.revokeObjectURL(url);
      try{
        const bmp = await createImageBitmap(f);
        const k = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
        cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
        bmp.close && bmp.close();
        res({el: cv, url: ''});
      }catch(e){ res(null); }
    };
    img.src = url;
  });
}
/* small pictures for the index are made one at a time, so a sixty-photo book does not
   stall the page while it decodes */
const bvQ = [];
let bvQRun = false;
function bvThumb(f, slot){
  if(BVTHUMB.has(f)){ bvPutThumb(slot, BVTHUMB.get(f)); return; }
  bvQ.push([f, slot]);
  if(!bvQRun) bvQNext();
}
async function bvQNext(){
  const job = bvQ.shift();
  if(!job){ bvQRun = false; return; }
  bvQRun = true;
  const [f, slot] = job;
  if(!BVTHUMB.has(f)){
    let cv = false;
    try{
      const bmp = await createImageBitmap(f, {resizeWidth: 240, resizeQuality: 'medium'});
      cv = document.createElement('canvas');
      cv.width = bmp.width; cv.height = bmp.height;
      cv.getContext('2d').drawImage(bmp, 0, 0);
      bmp.close && bmp.close();
    }catch(e){
      const p = await bvPaint(f, null, 240);
      if(p){
        if(p.url){
          try{
            const cvs = document.createElement('canvas');
            const k = 240 / Math.max(p.el.naturalWidth, 1);
            cvs.width = 240; cvs.height = Math.round(p.el.naturalHeight * k);
            cvs.getContext('2d').drawImage(p.el, 0, 0, cvs.width, cvs.height);
            cv = cvs;
          }catch(e2){ cv = false; }
          URL.revokeObjectURL(p.url);
        } else cv = p.el;
      }
    }
    BVTHUMB.set(f, cv);
  }
  bvPutThumb(slot, BVTHUMB.get(f));
  setTimeout(bvQNext, 0);
}
function bvPutThumb(slot, cv){
  if(!slot || !slot.isConnected) return;
  if(!cv){ slot.dataset.nothumb = '1'; return; }
  const copy = document.createElement('canvas');
  copy.width = cv.width; copy.height = cv.height;
  copy.getContext('2d').drawImage(cv, 0, 0);
  slot.prepend(copy);
}

const BVFILESVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="1.4"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/>' +
  '<path d="M14 3v5h5"/></svg>';
const BVPLAY = '<svg viewBox="0 0 24 24" width="12" height="12"><path d="M8 5v14l11-7z" ' +
  'fill="#1B1724"/></svg>';

/* ---- the room itself ---- */
const bvEl = document.createElement('div');
bvEl.className = 'bv';
bvEl.hidden = true;
bvEl.setAttribute('role', 'dialog');
bvEl.setAttribute('aria-modal', 'true');
bvEl.innerHTML = '<div class="bvp"><div class="bvhd"></div><div class="bvsteps"></div><div class="bvtabs" ' +
  'role="tablist"></div><div class="bvbody"><div class="bvstage"><div class="bvmedia">' +
  '</div></div><aside class="bvside"></aside></div></div>';
document.body.appendChild(bvEl);
const bvSteps = bvEl.querySelector('.bvsteps');
const bvHd = bvEl.querySelector('.bvhd'), bvTabs = bvEl.querySelector('.bvtabs'),
      bvStage = bvEl.querySelector('.bvstage'), bvSide = bvEl.querySelector('.bvside');

/* The Dropbox copy: every file in the model's Dropbox folder, kept as a viewing copy in
   this page's own store (photos at screen size, videos as H.264) and indexed in
   bvmirror/<card id>. Nothing is picked or uploaded by hand - the files arrive one at
   a time as you step to them. */
const BVREM = new Map();            // stored id -> File, once fetched
async function bvReal(f){
  if(f && f._add){
    const r = f._add;
    if(BVADDF.has('F' + r.i)) return BVADDF.get('F' + r.i);
    const u8 = await attGet(r);
    const file = new File([u8], r.n, {type: r.t || ''});
    BVADDF.set('F' + r.i, file);
    return file;
  }
  if(!f || !f._rid) return f;
  if(BVREM.has(f._rid)) return BVREM.get(f._rid);
  const r = await fetch('/_blob/' + f._rid);
  if(!r.ok) throw new Error('HTTP ' + r.status);
  const b = await r.blob();
  const file = new File([b], f.name, {type: f.type || b.type});
  BVREM.set(f._rid, file);
  return file;
}
const RFGLYPH = '<svg class="bvrfi" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>';
/* the model's folder as the program reads it: src 'pc' (Desktop/ILLUMENOCTIS/BOOKING) or
   'dbx' (the Dropbox on this computer). Returns the sorted folder, or {miss: why}. */
async function bvLocal(c, src){
  if(!(window.illu && window.illu.bookingFiles)) return null;
  let r = null;
  try{ r = await window.illu.bookingFiles(src, bvFolderName(c), String(c.nm || '').trim()); }catch(e){ r = null; }
  if(!r || !r.ok) return {miss: (r && r.why) || 'not available', noroot: true};
  if(!r.found) return {miss: 'no folder', root: r.root, want: r.want};
  const files = r.files.map(x => ({name: x.rel.split('/').pop(), size: x.size, type: '', lastModified: x.mtime,
    webkitRelativePath: r.folder + '/' + x.rel, _rid: x.rid}));
  const got = (files.length && bvSort(c, files)) || {folder: r.folder, groups: new Map(BVFOLD.map(t => [t, []])),
    other: [], total: 0};
  got.folder = r.folder; got.src = src; got.from = src; got.loc = src; got.at = new Date().toISOString(); got.root = r.root;
  return got;
}
/* opens the folder from one place; a tab that still has files stays where it was */
async function bvOpenSrc(c, src, keepTab){
  if(!(window.illu && window.illu.bookingFiles)){ if(src === 'dbx') return bvLoadDbx(c); bvInput.click(); return; }
  if(!keepTab) bvNoteOnly('<h3>' + esc(c.nm || 'This model') + '</h3>' + (src === 'dbx'
    ? 'Opening the Dropbox folder\u2026' : 'Opening the folder on this computer\u2026'));
  let got = await bvLocal(c, src);
  if(!bv || bv.id !== c.id) return;
  /* 1.2.142 (user, 12 Nov: "what happened to the material in Malika A's folder?"): her Dropbox folder had the 8 empty
     subfolders only - the files are in the folder on this computer. An empty Dropbox copy never hides them: the folder
     on this computer opens instead. */
  const nOf = g => g && g.groups ? [...g.groups.values()].reduce((a, x) => a + x.length, 0) + ((g.other || []).length) : 0;
  if(src === 'dbx' && !nOf(got)){ const pc = await bvLocal(c, 'pc'); if(!bv || bv.id !== c.id) return; if(nOf(pc)){ got = pc; got.dbxEmpty = true; } }
  if(got && got.groups){
    BVLOAD.set(c.id, got);
    const n = t => (got.groups.get(t) || []).length;
    if(!(keepTab && n(bv.tab))){ bv.tab = BVFOLD.find(x => n(x)) || BVFOLD[0]; bv.i = 0; }
    bv.choose = false;
    bvDraw();
    return;
  }
  const where = src === 'dbx' ? 'Dropbox \u203a ILLUMENOCTIS \u203a BOOKING' : 'Desktop \u203a ILLUMENOCTIS \u203a BOOKING';
  bvNoteOnly('<h3>' + esc(c.nm || 'This model') + '</h3>' + (got && got.noroot
      ? (src === 'dbx' ? 'The Dropbox folder could not be found on this computer (' + esc(got.miss) + ').'
                       : 'The BOOKING folder could not be read (' + esc(got.miss) + ').')
      : 'There is no folder called <code>' + esc(bvFolderName(c)) + '</code> in ' + where + ' yet.') +
    '<div class="bvbtns">' + (src === 'dbx'
      ? '<button type="button" class="bvbtn" data-bvpick>On this computer</button>'
      : '<button type="button" class="bvbtn" data-bvdbx>In Dropbox</button>' +
        '<button type="button" class="bvbtn" data-bvpick data-bvnew>Choose a folder\u2026</button>') +
    '<button type="button" class="bvbtn bvrf" data-bvrefresh data-bvsrc="' + src + '">' + RFGLYPH + 'Refresh</button></div>');
}
/* how many files each place holds, shown on the "where to look" buttons */
async function bvCounts(c){
  if(!(window.illu && window.illu.bookingFiles)) return;
  /* in the program both places are read directly: no folder to pick, nothing to upload */
  const sm = bvEl.querySelector('.bvchoose ~ small');
  if(sm) sm.innerHTML = LANG === 'ko'
    ? '<b>이 컴퓨터에서</b>는 바탕화면 › ILLUMENOCTIS › BOOKING › <code>' + esc(bvFolderName(c)) + '</code>을, <b>Dropbox에서</b>는 Dropbox의 같은 폴더를 바로 엽니다. 폴더에 파일을 옮긴 뒤에는 <b>새로고침</b>을 누르세요.'
    : '<b>On this computer</b> opens Desktop › ILLUMENOCTIS › BOOKING › <code>' + esc(bvFolderName(c)) + '</code>; <b>In Dropbox</b> opens the same folder in Dropbox. After moving files into the folder, press <b>Refresh</b>.';
  const fill = (src, got) => {
    const el = bvEl.querySelector('[data-bvcnt="' + src + '"]'); if(!el) return;
    const n = got && got.groups ? [...got.groups.values()].reduce((a, x) => a + x.length, 0) + ((got.other || []).length) : null;
    el.textContent = n == null ? '\u2013' : String(n);
    el.title = n == null ? (got && got.noroot ? 'Not found on this computer' : 'No folder for this model yet') : n + ' file' + (n === 1 ? '' : 's');
    el.dataset.n = n == null ? '' : String(n);
  };
  const [pc, dbx] = await Promise.all([bvLocal(c, 'pc'), bvLocal(c, 'dbx')]);
  if(!bv || bv.id !== c.id || !bv.choose) return;
  fill('pc', pc); fill('dbx', dbx);
  /* "Continue with ..." shows the folder as it is now */
  const cur = BVLOAD.get(c.id);
  if(cur && cur.loc){ const fresh = cur.loc === 'dbx' ? dbx : pc; if(fresh && fresh.groups) BVLOAD.set(c.id, fresh); }
  const st = bvEl.querySelector('.bvrfst');
  if(st){ const d = new Date(); st.textContent = 'Checked ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0'); }
}
/* Refresh: read the folder again from wherever it was opened */
async function bvRefresh(btn){
  const c = bv && BOOK.get(bv.id); if(!c) return;
  bvEl.querySelectorAll('[data-bvrefresh]').forEach(b => { b.classList.add('spin'); b.disabled = true; });
  const t0 = Date.now();
  try{
    if(bv.choose) await bvCounts(c);
    else{
      const cur = BVLOAD.get(c.id);
      const src = (btn && btn.dataset.bvsrc) || (cur && cur.loc) || '';
      if(src) await bvOpenSrc(c, src, true);
      else bvDraw();
    }
  }catch(e){}
  await new Promise(r => setTimeout(r, Math.max(0, 450 - (Date.now() - t0))));   // long enough to see it turn
  bvEl.querySelectorAll('[data-bvrefresh]').forEach(b => { b.classList.remove('spin'); b.disabled = false; });
}
window.__bvRefresh = bvRefresh;
async function bvLoadDbx(c){
  bvNoteOnly('<h3>' + esc(c.nm || 'This model') + '</h3>Opening the Dropbox folder\u2026');
  let d = null;
  try{ d = DB ? docOf(await DB.doc('bvmirror/' + c.id).get()) : null; }catch(e){ d = null; }
  if(!bv || bv.id !== c.id) return;
  if(!d || !d.g) d = {g: {}, folder: bvFolderName(c), src: 'dbx'};
  const TYPE = {img: 'image/jpeg', vid: 'video/mp4'};
  const groups = new Map();
  for(const t of BVFOLD) groups.set(t, []);
  for(const [t, rows] of Object.entries(d.g)){
    const tab = bvTabOf(t) || t;
    if(!groups.has(tab)) groups.set(tab, []);
    for(const r of rows) groups.get(tab).push({name: r.n, size: r.z || 0, _rid: r.i,
      type: TYPE[r.k] || '', lastModified: 0});
  }
  const got = {folder: d.folder || bvFolderName(c), groups: groups, src: 'dbx', at: d.at,
               from: d.src || 'dbx'};
  BVLOAD.set(c.id, got);
  bv.tab = BVFOLD.find(x => (groups.get(x) || []).length) || BVFOLD[0];
  bv.i = 0; bv.choose = false;
  bvDraw();
}
function bvOpenFor(id){
  const c = BOOK.get(id);
  if(!c) return false;
  const got = BVLOAD.get(id);
  bv = {id: id, tab: got ? (BVFOLD.find(t => (got.groups.get(t) || []).length) || BVFOLD[0])
                         : BVFOLD[0], i: 0, choose: true};
  bv.grid = bvGridPref();
  bvArrLoad(id);
  bvAddLoad(id, true);
  bvEl.hidden = false;
  document.documentElement.style.overflow = 'hidden';
  bvDraw();
  if(!got && !(window.illu && window.illu.bookingFiles)) bvLoadDbx(c);   // the program reads the folders itself: it asks where to look
  setTimeout(() => { const x = bvEl.querySelector('.bvx'); if(x) x.focus(); }, 0);
  return true;
}
function bvClose(){
  if(bvEl.classList.contains('bvmax')) bvMaxSet(false);
  bvEl.hidden = true;
  document.documentElement.style.overflow = '';
  bvStopMedia();
  bv = null;
}
function bvStopMedia(){
  const v = bvStage.querySelector('video');
  if(v){ try{ v.pause(); v.removeAttribute('src'); v.load(); }catch(e){} }
  if(bvURL){ URL.revokeObjectURL(bvURL); bvURL = ''; }
  if(bvURL2){ URL.revokeObjectURL(bvURL2); bvURL2 = ''; }
}
function bvList(){
  const got = bv && BVLOAD.get(bv.id);
  return got ? bvArrange(bvWithAdds(got.groups.get(bv.tab) || [], bv.tab)) : [];
}
function bvFigures(c){
  const n = v => (v == null || v === '') ? null : v;
  let age = '';
  try{ age = ageFrom(c.dob); }catch(e){}
  if(age === '' || age == null) age = n(c.age);
  /* the same figures, in the same units, as the profile panel shows */
  let pm = {};
  try{
    const box = document.createElement('div');
    box.innerHTML = bvProfile(c);
    box.querySelectorAll('.bvpmx > span:not(.bvpwt), .bvpmx > span.bvpmxe').forEach(sp => {
      const k = sp.querySelector('i').textContent, v = sp.querySelector('b').textContent;
      pm[k] = v === '\u2013' ? null : v;
    });
  }catch(e){ pm = {}; }
  const row = [['Height', pm.Height, ''], ['Bust', pm.Bust !== undefined ? pm.Bust : pm.Chest, ''],
    ['Waist', pm.Waist, ''], ['Hips', pm.Hips, ''], ['Shoes', pm.Shoes, ''],
    ['Weight', (function(){ const k = parseFloat(c.wt); if(isNaN(k)) return null;
       return bvWU(c) === 'lb' ? Math.round(k / 0.45359237) + ' lb' : k + ' kg'; })(), ''],
    ['Age', age === '' ? null : age, '']];
  return row.filter(([k, v]) => v != null).map(([k, v, u]) => '<span>' + k +
    '<b>' + esc(v) + u + '</b></span>').join('');
}
function bvDraw(){
  if(!bv) return;
  const c = BOOK.get(bv.id);
  if(!c){ bvClose(); return; }
  const got = BVLOAD.get(c.id);
  const src = bkPhoto(c);
  const place = [c.city, c.country].filter(Boolean).join(', ');
  bvHd.innerHTML =
    '<span class="bvface">' + (src ? '<img src="' + esc(src) + '" alt="">' : '') + '</span>' +
    '<div class="bvwho"><h2 class="bvnm">' + esc(c.nm || 'Unnamed') + '</h2>' +
    '<div class="bvag">' + esc([c.ag, place].filter(Boolean).join(' · ')) + '</div>' +
    '<div class="bvmx">' + bvFigures(c) + '</div></div>' +
    '<div class="bvact">' +
      '<span class="bvlang" role="group" aria-label="Language" title="Switch between English and Korean">' +
        '<button type="button" data-bvlang="en" aria-pressed="' + (LANG !== 'ko') + '">EN</button>' +
        '<button type="button" data-bvlang="ko" aria-pressed="' + (LANG === 'ko') + '">한</button>' +
        '<button type="button" data-bvlang="more" class="bvlmore" aria-pressed="' + (LANG !== 'en' && LANG !== 'ko') +
          '" title="All languages">' + LANGGLOBE + (LANG !== 'en' && LANG !== 'ko' ? '<em>' + esc(langNative(LANG)) + '</em>' : '') +
          '</button>' +
      '</span>' +
      '<button type="button" class="bvbtn" data-bvpick title="Show the files kept in ' +
      'this model’s folder on this computer">' +
      (got && got.src !== 'dbx' ? 'Reload folder' : 'Open folder on this computer') + '</button>' +
      '<button type="button" class="bvbtn" data-bvdbx title="Show this model\u2019s Dropbox ' +
      'folder right here">Dropbox</button>' +
      '<button type="button" class="bvx" aria-label="Close" title="Close (Esc)">×' +
      '</button></div>';
  bvTabs.innerHTML = BVFOLD.map(t => {
    const k = got ? bvWithAdds(got.groups.get(t) || [], t).length : 0;
    const sk = BVTABSTAGE[t], pv = sk ? bvStageOf(c, sk).pv : '';
    return '<button type="button" class="bvtab' + (got && !k ? ' empty' : '') +
      '" role="tab" data-bvtab="' + esc(t) + '" aria-selected="' + (t === bv.tab) + '">' +
      esc(t) + (got ? '<s>' + k + '</s>' : '') +
      (sk ? '<i class="bvtdot" data-p="' + pv + '" title="' + (pv === 'g' ? 'Completed'
        : pv === 'y' ? 'In process' : 'Not started') + '"></i>' : '') + '</button>';
  }).join('');
  bvSteps.innerHTML = bvStepBar(c);
  bvDrawSide(c, got);
  bvDrawStage(c, got);
}
/* The panel beside the files is the model's profile: what a client asks before they ask
   for the book. Figures, age, experience, countries and availability come off the card;
   hair, eyes and nationality are typed here and kept on the card. */
/* kilograms or pounds, as this browser last chose */
function bvWU(c){ if(c) return bkWU(c);
  try{ return localStorage.getItem('illum.wtu') === 'lb' ? 'lb' : 'kg'; }
                 catch(e){ return 'kg'; } }
/* Every figure in every unit at once: 177 cm · 5' 9.7" · 69.7 in, and so on. */
function bvConv(c){
  const num = v => { const x = parseFloat(v); return isNaN(x) ? null : x; };
  const g = (c.g === 'M' || c.g === 'F') ? c.g : (function(){
    try{ return bkFacts(c).g; }catch(e){ return ''; } })();
  const ftin = cm => { const i = cm / 2.54, f = Math.floor(i / 12);
    const r = Math.round((i - f * 12) * 10) / 10;
    return r >= 12 ? (f + 1) + '\u2032 0\u2033' : f + '\u2032 ' + r + '\u2033'; };
  const L = v => { const x = num(v); return x == null ? null : x + ' cm \u00b7 ' + cmToIn(x) + ' in'; };
  const ht = num(c.ht), eu = num(c.eu), kg = num(c.wt);
  const usv = (c.us != null && String(c.us).trim() !== '') ? c.us + ' US'
    : eu != null ? '\u2248' + (Math.round((eu - (g === 'M' ? 33 : 31)) * 10) / 10) + ' US' : null;
  const shoe = [eu != null ? eu + ' EU' : '', usv || '', eu != null ? euToMm(eu) + ' mm' : '']
    .filter(Boolean).join(' \u00b7 ');
  return {g: g,
    ht: ht == null ? null : ht + ' cm \u00b7 ' + ftin(ht) + ' \u00b7 ' + cmToIn(ht) + ' in',
    bu: L(c.bu), wa: L(c.wa), hp: L(c.hp), shoe: shoe || null,
    wt: kg == null ? null : kg + ' kg \u00b7 ' + Math.round(kg / 0.45359237) + ' lb'};
}
function bvProfile(c){
  const n = v => (v == null || String(v).trim() === '') ? null : String(v);
  const g = (c.g === 'M' || c.g === 'F') ? c.g : (function(){
    try{ return bkFacts(c).g; }catch(e){ return ''; } })();
  /* the figures read in the card's own units - switch them here or on the card */
  const lu = bkLU(c), su = bkSU(c);
  const len = v => {
    if(n(v) == null) return null;
    const cm = parseFloat(v);
    if(isNaN(cm)) return String(v);
    return lu === 'in' ? cmToIn(cm) + ' in' : cm + ' cm';
  };
  const tall = v => {
    if(n(v) == null) return null;
    const cm = parseFloat(v);
    if(isNaN(cm)) return String(v);
    if(lu !== 'in') return cm + ' cm';
    const inch = cm / 2.54, ft = Math.floor(inch / 12);
    let rest = Math.round((inch - ft * 12) * 10) / 10;
    return rest >= 12 ? (ft + 1) + '\u2032 0\u2033' : ft + '\u2032 ' + rest + '\u2033';
  };
  const eu = n(c.eu) != null ? parseFloat(c.eu) : null;
  const shoe = su === 'mm'
    ? (eu != null && !isNaN(eu) ? euToMm(eu) + ' mm' : null)
    : su === 'us'
    ? (n(c.us) != null ? c.us + ' US'
       : eu != null && !isNaN(eu) ? '\u2248' + (Math.round((eu - (g === 'M' ? 33 : 31)) * 10) / 10) + ' US'
       : null)
    : (eu != null ? c.eu + ' EU' : (n(c.us) != null ? c.us + ' US' : null));
  const mx = [['Height', tall(c.ht), ''], [g === 'M' ? 'Chest' : 'Bust', len(c.bu), ''],
    ['Waist', len(c.wa), ''], ['Hips', len(c.hp), ''], ['Shoes', shoe, '']];
  const useg = (which, opts, now) =>
    '<span class="bkuseg" data-bku="' + esc(c.id) + '|' + which + '">' +
    opts.map(([u, l]) => '<button type="button" data-u="' + u + '" aria-pressed="' +
      (u === now) + '" title="Read these figures in ' + BKUNAME[u] + '">' + l +
      '</button>').join('') + '</span>';
  let age = '';
  try{ age = ageFrom(c.dob); }catch(e){}
  if(age === '' || age == null) age = n(c.age) || '';
  let dobTxt = '';
  try{ const p = dobParse(c.dob); dobTxt = p ? dobWords(p) : (n(c.dob) || ''); }catch(e){}
  const ro = !SIGNED();
  const inp = (f, ph) => '<input class="bvin" data-bk="' + esc(c.id) + '" data-bf="' + f +
    '" placeholder="' + esc(ph) + '" value="' + esc(n(c[f]) || '') + '"' +
    (ro ? ' readonly title="Sign in to edit"' : '') + '>';
  const row = (label, val) => '<div class="bvpr"><dt>' + label + '</dt><dd>' + val + '</dd></div>';
  /* two short fields share a line */
  const pair = (l1, v1, l2, v2) => '<div class="bvpr2"><div class="bvpc"><dt>' + l1 + '</dt><dd>' + v1 +
    '</dd></div><div class="bvpc"><dt>' + l2 + '</dt><dd>' + v2 + '</dd></div></div>';
  const inpw = (f, ph) => '<input class="bvin" data-bk="' + esc(c.id) + '" data-bf="' + f +
    '" placeholder="' + esc(ph) + '" value="' + esc(capWord(n(c[f]) || '')) + '"' +
    (ro ? ' readonly title="Sign in to edit"' : '') + '>';
  const none = '<span class="bvpno">–</span>';
  const ctry = beenList(c);
  const avd = n(c.avd), avf = n(c.avf);
  const wu = bvWU(c);
  const kg = n(c.wt) != null ? parseFloat(c.wt) : null;
  const wv = kg == null || isNaN(kg) ? '' : (wu === 'lb' ? Math.round(kg / 0.45359237) : kg);
  const wcell = '<span class="bvpwt' + (wv === '' ? ' no' : '') + '"><i>Weight</i>' +
    '<span class="bvwtv"><input class="bvin bvwt" inputmode="decimal" data-bk="' + esc(c.id) + '" data-bf="wt" ' +
    'data-wu="' + wu + '" placeholder="–" value="' + esc(String(wv)) + '"' +
    (ro ? ' readonly title="Sign in to edit"' : '') + ' aria-label="Weight in ' + wu + '">' +
    '<u class="bvwtu">' + wu + '</u></span>' +
    '<em class="bvwu">' + ['kg', 'lb'].map(u => '<button type="button" data-bvwu="' + u +
      '" aria-pressed="' + (u === wu) + '" title="Type the weight in ' +
      (u === 'kg' ? 'kilograms' : 'pounds') + '">' + u + '</button>').join('') +
    '</em></span>';
  return '<div class="bvprof">' +
    '<div class="bvpuni">' + useg('lu', [['cm', 'cm'], ['in', 'ft / in']], lu) +
      useg('su', [['eu', 'EU'], ['us', 'US'], ['mm', 'mm']], su) +
      useg('wu', [['kg', 'kg'], ['lb', 'lb']], wu) + '</div>' +
    /* the figures are read from the header line; the grid stays as data only */
    '<div class="bvpmx" hidden>' + (function(){
      const cell = ([k, v, u]) => '<span' + (v == null ? ' class="no"' : '') +
        '><i>' + k + '</i><b>' + (v == null ? '–' : esc(v) + u) + '</b></span>';
      /* each figure is a box to type in (in the units chosen above); the hidden <b> keeps the header line */
      const num = v => { const x = parseFloat(v); return isNaN(x) ? '' : x; };
      const lv = f => { const x = num(c[f]); return x === '' ? '' : (lu === 'in' ? cmToIn(x) : x); };
      const sh = su === 'mm' ? ['mm', (function(){ const x = num(c.eu); return x === '' ? '' : euToMm(x); })(), 'mm']
               : su === 'us' ? ['us', n(c.us) || '', 'US'] : ['eu', n(c.eu) || '', 'EU'];
      const ed = ([k, v, u], f, val, unit) => '<span class="bvpwt bvpmxe' + (String(val) === '' ? ' no' : '') + '"><i>' + k + '</i>' +
        '<span class="bvwtv"><input class="bvin bvwt bvmxin" inputmode="decimal" autocomplete="off" data-bk="' + esc(c.id) + '" data-bf="' + f + '" placeholder="\u2013" value="' + esc(String(val)) + '"' +
        (ro ? ' readonly title="Sign in to edit"' : '') + ' aria-label="' + k + ' in ' + unit + '"><u class="bvwtu">' + unit + '</u></span>' +
        '<b hidden>' + (v == null ? '\u2013' : esc(v) + u) + '</b></span>';
      const U = lu === 'in' ? 'in' : 'cm';
      return ed(mx[0], 'ht', lv('ht'), U) + ed(mx[4], sh[0], sh[1], sh[2]) + wcell + ed(mx[1], 'bu', lv('bu'), U) + ed(mx[2], 'wa', lv('wa'), U) + ed(mx[3], 'hp', lv('hp'), U);
    })() +
    '</div><dl class="bvpl">' +
    pair('Name', inp('nm', 'Name'), 'Agency', inp('ag', 'Agency')) +
    pair('City', inp('city', 'City'), 'Country', inp('country', 'Country')) +
    row('Sex', '<span class="bvsex" role="group">' + [['F', 'Female'], ['M', 'Male']].map(([v, l]) => '<button type="button" data-bvsex="' + v + '" aria-pressed="' + (c.g === v) + '"' + (ro ? ' disabled' : '') + '>' + l + '</button>').join('') + '</span>') +
    (function(){
      /* with a date of birth the age works itself out; without one it is typed */
      let fromDob = '';
      try{ fromDob = dobParse(c.dob) ? ageFrom(c.dob) : ''; }catch(e){}
      const a = '<input class="bvin bvage" inputmode="numeric" data-bk="' + esc(c.id) +
        '" data-bf="age" placeholder="Age" value="' + esc(fromDob !== '' && fromDob != null
          ? String(fromDob) : (n(c.age) || '')) + '"' +
        (ro ? ' readonly title="Sign in to edit"'
         : fromDob !== '' && fromDob != null
         ? ' readonly title="Worked out from the date of birth \u2014 change the date to change it"'
         : '') + '>';
      const d = '<input class="bvin bvdob" data-bk="' + esc(c.id) + '" data-bf="dob" ' +
        'placeholder="DD/MM/YYYY" value="' + esc(n(c.dob) || '') + '"' +
        (dobTxt ? ' title="' + esc(dobTxt) + '"' : '') +
        (ro ? ' readonly title="Sign in to edit"' : '') + '>';
      /* age and date of birth read as one pair, the same shape as every field under them */
      return pair('Age', '<span class="bvage2 bvage2a">' + a + '</span>', 'Date of birth', '<span class="bvage2 bvage2d">' + d + '</span>');
    })() +
    pair('Nationality', inpw('nat', 'Romanian'), 'Experience', inpw('exp', '2 years')) +
    pair('Hair color', inpw('hcol', 'Dark brown'), 'Hair type', inpw('htyp', 'Wavy, long')) +
    pair('Eye color', inpw('ecol', 'Green'), 'Weight', wcell) +
    /* how many on the left, where on the right - the same pair shape as age and date of birth */
    pair('Tattoos', bvTatCnt(c, ro), 'Where', bvTatLoc(c, ro)) +
    row('Piercings', bvPierHtml(c, ro)) +
    row('Countries', ctry.length ? '<span class="bvpch">' + ctry.map(x =>
      '<span>' + esc(x.c) + (x.t ? ' · ' + esc(x.t) : '') + '</span>').join('') +
      '</span>' : none) +
    row('Availability', '<span class="bvtrv bvavl">' +
      '<input class="bvin bvavd" inputmode="numeric" data-bk="' + esc(c.id) + '" data-bf="avd" placeholder="Days" value="' + esc(avd || '') + '"' + (ro ? ' readonly title="Sign in to edit"' : '') + ' aria-label="Number of days available">' +
      '<input class="bvin" data-bk="' + esc(c.id) + '" data-bf="avf" placeholder="From DD/MM/YYYY" value="' + esc(avf || '') + '"' + (ro ? ' readonly title="Sign in to edit"' : '') + ' aria-label="Available from">' +
      '</span>') +
    [['Entry', 'ind', 'inf'], ['Departure', 'outd', 'outf']].map(([lab, fd, ff]) =>
      row(lab, '<span class="bvtrv">' +
        '<input class="bvin" data-bk="' + esc(c.id) + '" data-bf="' + fd + '" placeholder="DD/MM/YYYY" value="' +
          esc(n(c[fd]) || '') + '"' + (ro ? ' readonly title="Sign in to edit"' : '') + '>' +
        '<input class="bvin bvfl" data-bk="' + esc(c.id) + '" data-bf="' + ff + '" placeholder="Flight #" value="' +
          esc(n(c[ff]) || '') + '"' + (ro ? ' readonly title="Sign in to edit"' : '') + '>' +
      '</span>')).join('') +
    '</dl>' +
    '</div>';
}
/* Everything the card knows, read-only and in every unit at once - the sheet to read
   from on a call. Editing stays on the Profile view. */
function bvDetailed(c){
  const n = v => (v == null || String(v).trim() === '') ? null : String(v);
  const num = v => { const x = parseFloat(v); return isNaN(x) ? null : x; };
  const g = (c.g === 'M' || c.g === 'F') ? c.g : (function(){
    try{ return bkFacts(c).g; }catch(e){ return ''; } })();
  const ftin = cm => { const i = cm / 2.54, f = Math.floor(i / 12);
    const r = Math.round((i - f * 12) * 10) / 10;
    return r >= 12 ? (f + 1) + '\u2032 0\u2033' : f + '\u2032 ' + r + '\u2033'; };
  const L = v => { const x = num(v); return x == null ? null : x + ' cm \u00b7 ' + cmToIn(x) + ' in'; };
  const ht = num(c.ht), eu = num(c.eu), kg = num(c.wt);
  const usv = n(c.us) != null ? c.us + ' US'
    : eu != null ? '\u2248' + (Math.round((eu - (g === 'M' ? 33 : 31)) * 10) / 10) + ' US' : null;
  let age = ''; try{ age = ageFrom(c.dob); }catch(e){}
  if(age === '' || age == null) age = n(c.age) || '';
  let dobTxt = ''; try{ const p = dobParse(c.dob); dobTxt = p ? dobWords(p) : (n(c.dob) || ''); }catch(e){}
  const st = (BKST.find(x => x[0] === bkStOf(c)) || [])[1] || '';
  const dom = (function(){ try{ return domOf(c.ag); }catch(e){ return ''; } })();
  const ig = (function(){ try{ return igClean(c.ig); }catch(e){ return ''; } })();
  const link = (href, txt) => '<a href="' + esc(href) + '" target="_blank" rel="noopener ' +
    'noreferrer">' + esc(txt) + ' \u2197</a>';
  const row = (k, v) => '<div class="bvpr"><dt>' + k + '</dt><dd>' +
    (v == null || v === '' ? '<span class="bvpno">\u2013</span>' : v) + '</dd></div>';
  const T = v => v == null ? null : esc(v);
  const sec = (h, rows) => '<h4 class="bvdh">' + h + '</h4><dl class="bvpl">' + rows + '</dl>';
  const ctry = beenList(c);
  const avd = n(c.avd), avf = n(c.avf);
  return '<div class="bvprof bvdet">' +
    /* the converter: the same unit switches as the Profile view and the card, so all
       three read alike; bust, waist and hips are said together on one line */
    '<div class="bvdhrow"><h4 class="bvdh">Measurements</h4>' + bvMdUnits(c) + '</div><dl class="bvpl">' +
      (function(){
        const num = v => { const x = parseFloat(v); return isNaN(x) ? null : x; };
        const lu = bkLU(c), su = bkSU(c), wu = bkWU(c);
        const ht = num(c.ht), bu = num(c.bu), wa = num(c.wa), hp = num(c.hp), eu = num(c.eu), kg = num(c.wt);
        const inch = v => Math.round(v / 2.54 * 10) / 10;
        const ftin = cm => { const i = cm / 2.54, f = Math.floor(i / 12); const r = Math.round((i - f * 12) * 10) / 10;
          return r >= 12 ? (f + 1) + '\u2032 0\u2033' : f + '\u2032 ' + r + '\u2033'; };
        const htv = ht == null ? null : lu === 'in' ? ftin(ht) + ' <span class="bvpsub2">' + inch(ht) + ' in</span>' : ht + ' cm';
        const one = v => v == null ? '\u2013' : (lu === 'in' ? inch(v) : v);
        const bwh = (bu == null && wa == null && hp == null) ? null
          : '<span class="bvbwh">' + one(bu) + '<i>\u2013</i>' + one(wa) + '<i>\u2013</i>' + one(hp) + '</span> ' + (lu === 'in' ? 'in' : 'cm');
        const shoe = su === 'mm' ? (eu != null ? euToMm(eu) + ' mm' : null)
          : su === 'us' ? ((c.us != null && String(c.us).trim() !== '') ? esc(String(c.us)) + ' US'
              : eu != null ? '\u2248' + (Math.round((eu - (g === 'M' ? 33 : 31)) * 10) / 10) + ' US' : null)
          : (eu != null ? eu + ' EU' : (c.us != null && String(c.us).trim() !== '' ? esc(String(c.us)) + ' US' : null));
        const wt = kg == null ? null : wu === 'lb' ? Math.round(kg / 0.45359237) + ' lb' : kg + ' kg';
        return row('Height', htv) +
          row('<span title="' + (g === 'M' ? 'Chest' : 'Bust') + ' \u2013 Waist \u2013 Hips">' + (g === 'M' ? 'C' : 'B') + ' \u2013 W \u2013 H</span>', bwh) +
          row('Shoes', shoe) + row('Weight', wt);
      })() + '</dl>' +
    sec('Model',
      row('Name', T(n(c.nm))) +
      row('Sex', g === 'F' ? 'Female' : g === 'M' ? 'Male' : null) +
      row('Age', age !== '' ? '<b>' + esc(age) + '</b>' + (dobTxt ? '<span class="bvpsub">' +
        esc(dobTxt) + '</span>' : '') : null) +
      row('Nationality', T(n(c.nat) ? capWord(n(c.nat)) : null)) +
      row('Hair', T([capWord(n(c.hcol)), capWord(n(c.htyp))].filter(Boolean).join(', ') || null)) +
      row('Eyes', T(n(c.ecol) ? capWord(n(c.ecol)) : null)) +
      row('Tattoos', bvTatText(c)) +
      row('Piercings', bvPierText(c)) +
      row('Experience', T(n(c.exp))) +
      row('Countries', ctry.length ? esc(ctry.map(x => x.c + (x.t ? ' (' + x.t + ')' : ''))
        .join(', ')) : null) +
      row('Availability', (avd || avf) ? esc([avd ? avd + ' days' : '',
        avf ? 'from ' + dmy(avf) : ''].filter(Boolean).join(' \u00b7 ')) : null)) +
    sec('Mother agency',
      row('Agency', n(c.ag) ? (dom ? link('https://' + dom, c.ag) : esc(c.ag)) : null) +
      row('Based in', T([c.city, c.country].filter(Boolean).join(', ') || null)) +
      row('Profile', n(c.k) && /^https?:/i.test(c.k)
        ? link(c.k, String(c.k).replace(/^https?:\/\/(www\.)?/, '').slice(0, 42)) : null) +
      row('Instagram', ig ? link(igURL(ig), igHandle(ig)) : null)) +
    sec('Booking',
      row('Status', T(st || null)) +
      row('Handled by', c.by && PEOPLE.has(c.by) ? esc(PEOPLE.get(c.by).n) : null) +
      row('Card opened', n(c.at) ? esc(dmy(c.at)) : null) +
      row('Flight', c.ft === 'rt' ? 'Round trip' : c.ft === 'ow' ? 'One way' : null) +
      row('Entry', T([n(c.ind), n(c.inf) ? String(c.inf).toUpperCase() : ''].filter(Boolean).join(' \u00b7 ') || null)) +
      row('Departure', T([n(c.outd), n(c.outf) ? String(c.outf).toUpperCase() : ''].filter(Boolean).join(' \u00b7 ') || null))) +
    '</div>';
}
/* folder tabs that belong to a booking stage carry that stage's light */
const BVTABSTAGE = {'5. CONTRACT': 'contract', '6. VISA': 'visa', '7. AIRLINE TICKET': 'flight'};
/* the five stages as one slim bar under the header: the booking's state at a glance.
   The name opens that stage's notes and files in the panel; the light sets its state. */
function bvStepBar(c){
  return BKSEC.map(([k, label], i) => {
    const o = bvStageOf(c, k);
    return '<div class="bvstp" data-p="' + o.pv + '"' + (bv && bv.pane === k ? ' aria-current="true"' : '') + '>' +
      '<button type="button" class="bvstpl" data-bvsec="' + k + '" title="' + esc(bvL('Open ' + label, bvT(label) + ' 열기')) + '"><em>' + (i + 1) + '</em><b>' + esc(label) + '</b>' +
      (o.nf ? '<s>' + o.nf + '</s>' : '') + (k === 'contract' && bvCtMiss(c) ? '<span class="bvstm" title="' + esc(bvL(bvCtMiss(c) + ' contract parts to fill in', '계약서 채울 항목 ' + bvCtMiss(c) + '개')) + '">' + bvCtMiss(c) + '</span>' : '') + '</button>' + bvDot(c, k, label, o.pv) + '</div>';
  }).join('<i class="bvstpj" aria-hidden="true"></i>');
}
bvSteps.addEventListener('click', e => {
  const t = e.target.closest ? e.target : null;
  if(!t || !bv || t.closest('[data-bkstage]')) return;
  const go = t.closest('[data-bvsec]');
  if(!go) return;
  e.stopPropagation();
  bv.pane = bv.pane === go.dataset.bvsec ? '' : go.dataset.bvsec;
  bvSideRefresh(true);
  const ta = bvSide.querySelector('.bvntext');
  if(ta){ ta.focus({preventScroll: true}); const n = ta.value.length; try{ ta.setSelectionRange(n, n); }catch(err){} }
});
/* The five stages under the profile: one row each, its light on the right and how
   many files it holds. Pressing a row turns the whole panel over to that stage. */
function bvStageOf(c, k){
  const st = (c.s && c.s[k]) || {};
  const pv = (st.p === 'g' || st.p === 'y') ? st.p : (st.d ? 'g' : '');
  const nf = (Array.isArray(st.f) ? st.f : []).filter(a => a && attOK(a.i)).length;
  return {st: st, pv: pv, nf: nf};
}
function bvDot(c, k, label, pv){
  const dtit = pv === 'g' ? 'Completed \u2014 press to put the light out'
    : pv === 'y' ? 'In process \u2014 press to mark completed'
    : 'Not started \u2014 press to mark in process';
  return '<button type="button" class="bkdot" data-bkstage="' + esc(c.id) + '|' + k +
    '" title="' + dtit + '" aria-label="' + esc(label) + ': ' + dtit + '">' +
    '<i>' + (pv === 'g' ? 'done' : pv === 'y' ? 'in process' : '') + '</i><s></s></button>';
}
function bvStageList(c){
  return '<div class="bvstages" data-bkid="' + esc(c.id) + '"><div class="bksecs">' +
    BKSEC.map(([k, label]) => {
      const o = bvStageOf(c, k);
      const note = String(o.st.t || '').trim();
      return '<div class="bksec bvsrow" data-open="0" data-p="' + o.pv + '">' +
        '<div class="bksh" role="button" tabindex="0" data-bvsec="' + k + '" ' +
        'title="Open the ' + esc(label.toLowerCase()) + ' notes and files">' +
        '<span class="bkcar">\u203A</span><b>' + esc(label) + '</b>' +
        (o.nf ? '<em class="bvsn">' + (LANG === 'ko' ? '파일 ' + o.nf
          : o.nf + ' file' + (o.nf === 1 ? '' : 's')) + '</em>' : '') +
        (note ? '<em class="bvsn" title="Has notes">notes</em>' : '') +
        bvDot(c, k, label, o.pv) + '</div></div>';
    }).join('') + '</div></div>';
}
/* One stage given the whole panel: its notes fill it, its files sit underneath. */
function bvStagePane(c, k){
  const label = (BKSEC.find(x => x[0] === k) || [k, k])[1];
  const o = bvStageOf(c, k);
  return '<div class="bvnotep bvstages" data-bkid="' + esc(c.id) + '">' +
    '<div class="bksec bvnsec" data-open="1" data-p="' + o.pv + '">' +
    '<span hidden data-bksec="' + esc(c.id) + '|' + k + '"></span>' +
    '<div class="bvnbar"><button type="button" class="bvback" data-bvback ' +
      'title="Back to the profile">\u2039 Profile</button>' +
      '<b class="bvnlab">' + esc(label) + '</b>' + bvDot(c, k, label, o.pv) + '</div>' +
    '<div class="bvnchips">' + BKSEC.map(([kk, ll]) => {
      const oo = bvStageOf(c, kk);
      return '<button type="button" class="bvnchip" data-bvsec="' + kk + '" data-p="' +
        oo.pv + '" aria-pressed="' + (kk === k) + '">' + esc(ll) + '</button>'; }).join('') +
    '</div>' +
    '<textarea class="bvntext" data-bk="' + esc(c.id) + '" data-sec="' + k +
      '" placeholder="' + esc(BKHINT[k]) + '"' + (SIGNED() ? '' : ' readonly') + '>' +
      esc(o.st.t || '') + '</textarea>' +
    '<div class="bvnfiles"><div class="bvnfl">Files' + (o.nf ? ' <s>' + o.nf + '</s>' : '') +
      '<span>drop files anywhere here to upload</span></div>' +
      bkAttTray(c, k, o.st) +
      (k === 'flight'
        ? '<div class="bkrow"><span class="bkseg" data-bkft="' + esc(c.id) + '">' +
          '<button type="button" data-ft="rt" aria-pressed="' + (c.ft === 'rt') +
          '">round trip</button><button type="button" data-ft="ow" aria-pressed="' +
          (c.ft === 'ow') + '">one way</button></span></div>' : '') +
    '</div></div></div>';
}
function bvDrawSide(c, got){
  const keep = bvSide.querySelector('.bvprof');
  const top = keep ? keep.scrollTop : 0;
  const sk = bv && bv.pane && BKSEC.some(x => x[0] === bv.pane) ? bv.pane : '';
  /* 1.2.120 (user, 9 Nov 2026): the five stages have a tab of their own - Profile · MD · Stages · Details.
     An open stage (from Open <stage>, the 1-5 circles or the left column) always shows inside it. */
  bvSide.classList.remove('bvside--note');
  if(sk) bv.view = 's';
  const lst = bvSide.querySelector('.stgl'), ltop = lst ? lst.scrollTop : 0;
  const pf = bvProfile(c);
  const uni = (pf.match(/<div class="bvpuni">[\s\S]*?<\/span><\/div>/) || [''])[0];
  const vw = (bv.view === 'd' || bv.view === 'm' || bv.view === 's') ? bv.view : 'p';
  const det = vw === 'd', md = vw === 'm', stg = vw === 's';
  const vbtn = (k, l, t) => '<button type="button" class="bvvw" data-bvview="' + k + '" ' +
    'aria-pressed="' + (k === vw) + '"' + (t ? ' title="' + t + '"' : '') + '>' + l + '</button>';
  const nMiss = bvCtMiss(c);
  bvSide.innerHTML = '<h3 class="bvsh"><span class="bvvws">' + vbtn('p', 'Profile') +
    vbtn('m', 'MD', 'Measurement Detail') +
    vbtn('s', bvL('Stages', '단계') + (nMiss ? '<i class="bvvwn" title="' + bvL(nMiss + ' contract parts to fill in', '계약서 채울 항목 ' + nMiss + '개') + '">' + nMiss + '</i>' : ''), bvL('Email, Guarantee Type, Contract, Visa, Flight', '이메일, 개런티 유형, 계약서, 비자, 항공권')) +
    vbtn('d', 'Details') + '</span>' +
    (md ? bvMdUnits(c) : (det || stg) ? '' : uni) + bvSideWBtn() + '</h3>' +
    (stg ? bvStageList(c, sk) : md ? bvMeasure(c) : det ? bvDetailed(c) : pf) +
    '<div class="bvsrc">' + (got && got.src === 'dbx'
      ? 'Showing <b>' + esc(got.folder) + '</b> ' + (got.from === 'pc'
          ? 'as copied from the BOOKING folder on your computer' : 'from Dropbox') +
        (got.at ? ' \u00b7 updated ' +
        esc(dmy(got.at)) : '')
      : got
      ? 'Showing <b>' + esc(got.folder) + '</b> from this computer' + (got.dbxEmpty ? ' \u2014 her Dropbox folder has no files yet.' : '. Nothing has been uploaded.')
      : 'Files are kept in <b>BOOKING / ' + esc(bvFolderName(c)) +
        '</b>, on your computer and in Dropbox.') + '</div>';
  const pr = bvSide.querySelector('.bvprof');
  if(pr && top) pr.scrollTop = top;
  const nl = bvSide.querySelector('.stgl');
  if(nl){ const op = sk && nl.querySelector('.stgi.open');
    if(nl.classList.contains('stgone')){ const cur = (nl.querySelector('.stgi.open') || {}).dataset; const kk = cur ? cur.stg : ''; if(bv.stjump !== kk){ nl.scrollTop = 0; const sc = nl.closest('.bvprof, .bvside'); if(sc && sc !== nl) sc.scrollTop = 0; bv.stjump = kk; } else nl.scrollTop = ltop; }
    else if(op && bv.stjump !== sk){ nl.scrollTop = Math.max(0, op.offsetTop - nl.offsetTop - 6); bv.stjump = sk; }
    else nl.scrollTop = ltop;
    if(!sk) bv.stjump = ''; }
}
const bvKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
const bvL = (en, ko) => bvKO() ? ko : en;
/* how many contract parts are still to fill in (0 when there is no contract yet) */
function bvCtMiss(c){
  try{ const C = window.__illuContract; if(!C || !c.gty) return 0; const b = C.build(c); return b && b.R ? b.R.filter(r => b.bad.has(r.k)).length : 0; }catch(e){ return 0; }
}
/* one line under each stage's name: what it says so far */
function bvStageSum(c, k, o){
  const C = window.__illuContract || {};
  const nm = (L, v) => ((L || []).find(x => x[0] === v) || [])[1] || '';
  const first = String((o.st && o.st.t) || '').split('\n').map(x => x.trim()).filter(Boolean)[0] || '';
  const nf = o.nf ? bvL(o.nf + (o.nf === 1 ? ' file' : ' files'), '파일 ' + o.nf + '개') : '';
  let s = '';
  if(k === 'guar') s = c.gty ? bvT(nm(C.GTY, c.gty)) : bvL('Type not chosen', '유형 미선택');
  else if(k === 'visa') s = c.vty ? bvT(nm(C.VTY, c.vty)) : bvL('Type not chosen', '유형 미선택');
  else if(k === 'contract'){ const m = bvCtMiss(c); s = !c.gty ? bvL('Choose the Guarantee Type first', '먼저 개런티 유형을 선택하세요') : m ? bvL(m + (m === 1 ? ' part to fill in' : ' parts to fill in'), '채울 항목 ' + m + '개') : bvL('Ready to make', '만들 준비 완료'); }
  else s = first;
  return [s, nf].filter(Boolean).join(' \u00b7 ') || bvL('No notes yet', '아직 메모 없음');
}
const BVSTCHEV = '<svg class="stgc" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
function bvStageList(c, open){
  /* 1.2.140 (user, 11 Nov 2026: "Stages individually on the right panel"): the stages are listed once, in the left
     column; here ONE stage has the whole panel - ‹ › step through them, its status sits beside its name. With no
     stage chosen it shows the first one not done yet. */
  if(!open){ const nd = BKSEC.find(([k]) => bvStageOf(c, k).pv !== 'g'); open = (nd || BKSEC[0])[0]; }
  const i0 = Math.max(0, BKSEC.findIndex(x => x[0] === open)), k0 = BKSEC[i0][0], l0 = BKSEC[i0][1], o0 = bvStageOf(c, k0);
  const prv = BKSEC[(i0 + BKSEC.length - 1) % BKSEC.length][0], nxt = BKSEC[(i0 + 1) % BKSEC.length][0];
  return '<div class="stgl stgone">' +
    '<div class="stgnav" data-p="' + o0.pv + '"><button type="button" class="stgar" data-bvsec="' + prv + '" aria-label="' + esc(bvL('Previous stage', '이전 단계')) + '">\u2039</button>' +
      '<span class="stgnt"><small>' + esc(bvL('Stage ' + (i0 + 1) + ' of ' + BKSEC.length, (i0 + 1) + ' / ' + BKSEC.length + ' 단계')) + '</small><b>' + esc(bvT(l0)) + '</b></span>' +
      '<button type="button" class="stgar" data-bvsec="' + nxt + '" aria-label="' + esc(bvL('Next stage', '다음 단계')) + '">\u203a</button></div>' +
    '<div class="stgsw stgsw1" role="radiogroup" aria-label="' + esc(bvL('Status of ' + l0, bvT(l0) + ' 상태')) + '">' +
      [['', bvL('Not started', '시작 전')], ['y', bvL('In process', '진행 중')], ['g', bvL('Done', '완료')]].map(([v, t]) =>
      '<button type="button" role="radio" class="stgsb' + (v ? ' ' + v : ' o') + '" aria-checked="' + (o0.pv === v) + '" data-bpset="' + esc(c.id + '|' + k0 + '|' + v) + '"><i></i>' + t + '</button>').join('') + '</div>' +
    '<section class="stgi open" data-p="' + o0.pv + '" data-stg="' + k0 + '"><div class="stgb">' + bvStagePane(c, k0) + '</div></section></div>';
}
function bvStageListAll(c, open){
  return '<div class="stgl">' + BKSEC.map(([k, label], i) => {
    const o = bvStageOf(c, k), on = k === open, miss = k === 'contract' ? bvCtMiss(c) : 0;
    const st = o.pv === 'g' ? bvL('Done', '완료') : o.pv === 'y' ? bvL('In process', '진행 중') : bvL('Not started', '시작 전');
    return '<section class="stgi' + (on ? ' open' : '') + '" data-p="' + o.pv + '">' +
      '<button type="button" class="stgh" data-bvsec="' + k + '" aria-expanded="' + on + '">' +
      '<span class="stgn">' + (o.pv === 'g' ? '\u2713' : (i + 1)) + '</span>' +
      '<span class="stgt"><b>' + esc(bvT(label)) + '</b><small>' + esc(bvStageSum(c, k, o)) + '</small></span>' +
      (miss ? '<span class="stgp miss">' + bvL(miss + ' missing', miss + '개 누락') + '</span>' : '<span class="stgp">' + st + '</span>') + BVSTCHEV + '</button>' +
      (on ? '<div class="stgb"><div class="stgsw" role="radiogroup" aria-label="' + esc(bvL('Status of ' + label, bvT(label) + ' 상태')) + '">' +
        [['', bvL('Not started', '시작 전')], ['y', bvL('In process', '진행 중')], ['g', bvL('Done', '완료')]].map(([v, t]) =>
          '<button type="button" role="radio" class="stgsb' + (v ? ' ' + v : ' o') + '" aria-checked="' + (o.pv === v) + '" data-bpset="' + esc(c.id + '|' + k + '|' + v) + '"><i></i>' + t + '</button>').join('') +
        '</div>' + bvStagePane(c, k) + '</div>' : '') + '</section>';
  }).join('') + '</div>';
}

/* ---- MD: Measurement Detail ----
   The tailoring measurements, in the side panel like the profile: each part of the
   body has its drawing (from the studio's own measurement form; the foot redrawn
   cleanly) and under it the rows to fill in, numbered as the drawing is. Where the
   form numbers one measurement twice - bust 4 and chest 22, say - it is one row
   with both numbers. Height, weight, bust, waist, full hip and shoe ARE the card's
   own figures; everything else is kept on the card under "md", in centimetres. */
/* the form's drawings, cleaned and sharpened at 3x, with every number and word taken
   off; the numbers and words are put back here as live text, so they stay crisp and
   follow the page's language */
const BVMDIMG = {"full": {"src": "md/full.png", "w": 565, "h": 576, "fs": 7.8, "labs": [{"n": 1, "cx": 18.3, "cy": 29.0, "r": 6.9, "x": 27.1, "y": 30.8, "en": ["Height"], "ko": ["\ud0a4"]}, {"n": 5, "cx": 474.0, "cy": 119.0, "r": 7.0, "x": 483.0, "y": 121.0, "en": ["Back width"], "ko": ["\ub4f1 \ub108\ube44"]}, {"n": 2, "cx": 46.7, "cy": 102.9, "r": 6.8, "x": 55.6, "y": 104.6, "en": ["Shoulder"], "ko": ["\uc5b4\uae68"]}, {"n": 6, "cx": 468.2, "cy": 158.0, "r": 6.9, "x": 477.1, "y": 159.3, "en": ["Shoulder to waist", "(back)"], "ko": ["\uc5b4\uae68~\ud5c8\ub9ac", "(\ub4a4)"]}, {"n": 3, "cx": 46.6, "cy": 245.0, "r": 6.8, "x": 55.4, "y": 246.8, "en": ["Full hip"], "ko": ["\uc5c9\ub369\uc774"]}, {"n": 8, "cx": 468.7, "cy": 304.5, "r": 6.9, "x": 477.6, "y": 306.3, "en": ["Waist to floor"], "ko": ["\ud5c8\ub9ac~\ubc14\ub2e5"]}, {"n": 7, "cx": 43.0, "cy": 556.1, "r": 6.9, "x": 51.9, "y": 558.6, "en": ["Weight"], "ko": ["\ubab8\ubb34\uac8c"]}, {"n": 4, "cx": 46.7, "cy": 420.0, "r": 6.8, "x": 55.6, "y": 421.9, "en": ["Inseam"], "ko": ["\uc778\uc2ec"]}], "extra": []}, "upper": {"src": "md/upper.png", "w": 333, "h": 301, "fs": 7.9, "labs": [{"n": 9, "cx": 19.7, "cy": 72.5, "r": 6.8, "x": 28.6, "y": 74.6, "en": ["Neck", "circumference"], "ko": ["\ubaa9", "\ub458\ub808"]}, {"n": 10, "cx": 234.5, "cy": 82.5, "r": 6.7, "x": 243.1, "y": 84.6, "en": ["Shoulder length"], "ko": ["\uc5b4\uae68 \uae38\uc774"]}, {"n": 11, "cx": 255.9, "cy": 172.5, "r": 6.6, "x": 264.6, "y": 174.6, "en": ["Chest", "(fullest part)"], "ko": ["\uac00\uc2b4\ub458\ub808", "(\ucd5c\ub300)"]}, {"n": 12, "cx": 256.0, "cy": 254.2, "r": 6.6, "x": 264.6, "y": 256.4, "en": ["Waist (natural)"], "ko": ["\ud5c8\ub9ac (\uc790\uc5f0)"]}], "extra": []}, "arm": {"src": "md/arm.png", "w": 354, "h": 161, "fs": 6.9, "labs": [], "extra": []}};
const BVMDFOOT = "<svg class=\"mdsvg \" viewBox=\"140 30 152 194\" xmlns=\"http://www.w3.org/2000/svg\" role=\"img\"><path class=\"mdfig\" d=\"M178.0 196.0 C182.7 196.3 189.3 193.2 193.0 188.0 C196.7 182.8 198.7 173.0 200.0 165.0 C201.3 157.0 200.3 148.8 201.0 140.0 C201.7 131.2 203.0 120.7 204.0 112.0 C205.0 103.3 207.0 95.3 207.0 88.0 C207.0 80.7 205.7 74.0 204.0 68.0 C202.3 62.0 200.0 56.3 197.0 52.0 C194.0 47.7 189.8 44.3 186.0 42.0 C182.2 39.7 178.0 38.3 174.0 38.0 C170.0 37.7 165.3 38.0 162.0 40.0 C158.7 42.0 156.0 45.7 154.0 50.0 C152.0 54.3 150.3 59.7 150.0 66.0 C149.7 72.3 150.3 80.3 152.0 88.0 C153.7 95.7 158.7 103.7 160.0 112.0 C161.3 120.3 159.8 129.2 160.0 138.0 C160.2 146.8 160.2 157.0 161.0 165.0 C161.8 173.0 162.2 180.8 165.0 186.0 C167.8 191.2 173.3 195.7 178.0 196.0Z\"/><ellipse class=\"mdin\" cx=\"160\" cy=\"47\" rx=\"6.5\" ry=\"7.5\"/><ellipse class=\"mdin\" cx=\"173\" cy=\"43\" rx=\"5.0\" ry=\"5.8\"/><ellipse class=\"mdin\" cx=\"184\" cy=\"46\" rx=\"4.5\" ry=\"5.2\"/><ellipse class=\"mdin\" cx=\"193\" cy=\"52\" rx=\"4.0\" ry=\"4.6\"/><ellipse class=\"mdin\" cx=\"200\" cy=\"61\" rx=\"3.5\" ry=\"4.0\"/><path class=\"mdm\" d=\"M222.0 38.0 L222.0 196.0\"/><path class=\"mdk\" d=\"M226.0 38.0 L218.0 38.0 M226.0 196.0 L218.0 196.0\"/><path class=\"mdm\" d=\"M150.0 78.0 L207.0 78.0\"/><path class=\"mdk\" d=\"M150.0 74.0 L150.0 82.0 M207.0 74.0 L207.0 82.0\"/><path class=\"mdlead\" d=\"M222.0 66.0 L208.0 76.0\"/><g class=\"mdb\" data-mdk=\"15\"><circle cx=\"234.0\" cy=\"66.0\" r=\"8.5\"/><text x=\"234.0\" y=\"69.6\">15</text></g><text class=\"mdt\" x=\"247.0\" y=\"64.0\" text-anchor=\"start\">Foot</text><text class=\"mdt\" x=\"247.0\" y=\"76.0\" text-anchor=\"start\">width</text><g class=\"mdb\" data-mdk=\"14\"><circle cx=\"234.0\" cy=\"112.0\" r=\"8.5\"/><text x=\"234.0\" y=\"115.6\">14</text></g><text class=\"mdt\" x=\"247.0\" y=\"110.0\" text-anchor=\"start\">Foot</text><text class=\"mdt\" x=\"247.0\" y=\"122.0\" text-anchor=\"start\">length</text><g class=\"mdb\" data-mdk=\"16\"><circle cx=\"234.0\" cy=\"158.0\" r=\"8.5\"/><text x=\"234.0\" y=\"161.6\">16</text></g><text class=\"mdt\" x=\"247.0\" y=\"156.0\" text-anchor=\"start\">Shoe</text><text class=\"mdt\" x=\"247.0\" y=\"168.0\" text-anchor=\"start\">size</text><text class=\"mdcap\" x=\"178\" y=\"216\" text-anchor=\"middle\">SOLE</text></svg>";
/* Sixteen measurements, numbered in the order the eye meets them on the sheet:
   the full figure first (1-8), then the upper body close-up (9-12), the arm (13)
   and the foot (14-16). Figures typed under measurements no longer on the sheet stay
   on the card - they are simply not asked for any more. */
const BVMDSEC = [
  ['fb', 'Full body (front & back)', 'full', [
    [[1], 'Height', 'ht'], [[2], 'Shoulder width', 'shw'], [[3], 'Hip (fullest)', 'hp'],
    [[4], 'Inseam', 'ins'], [[5], 'Back width', 'bw'], [[6], 'Shoulder to waist (back)', 'stw'],
    [[7], 'Weight', 'wt'], [[8], 'Waist to floor', 'wtf']]],
  ['ub', 'Upper body', 'upper', [
    [[9], 'Neck circumference', 'neck'], [[10], 'Shoulder length', 'shl'], [[11], 'Bust (fullest part)', 'bu'],
    [[12], 'Waist (natural)', 'wa']]],
  ['ah', 'Arm & hand', 'arm', [
    [[13], 'Arm length', 'arml']]],
  ['ft', 'Foot', 'foot', [
    [[14], 'Foot length', 'fl'], [[15], 'Foot width', 'fw'], [[16], 'Shoe size', 'eu']]]
];
const BVMDCARD = {ht: 1, wt: 1, bu: 1, wa: 1, hp: 1, eu: 1};   // the card's own figures
function bvMdUnits(c){
  const seg = (which, opts, now) => '<span class="bkuseg" data-bku="' + esc(c.id) + '|' + which + '">' +
    opts.map(([u, l]) => '<button type="button" data-u="' + u + '" aria-pressed="' + (u === now) +
      '">' + l + '</button>').join('') + '</span>';
  return '<div class="bvpuni">' + seg('lu', [['cm', 'cm'], ['in', 'ft / in']], bkLU(c)) +
    seg('su', [['eu', 'EU'], ['us', 'US'], ['mm', 'mm']], bkSU(c)) +
    seg('wu', [['kg', 'kg'], ['lb', 'lb']], bkWU(c)) + '</div>';
}
function bvMdPic(key){
  if(key === 'foot') return BVMDFOOT;
  const d = BVMDIMG[key], ko = LANG === 'ko';
  const lines = (L, x, y, fs, mid) => L.map((t, i) => '<text class="mdl2" x="' + x + '" y="' +
    (y + i * fs * 1.28).toFixed(1) + '"' + (mid ? ' text-anchor="middle"' : '') + ' style="font-size:' + fs +
    'px">' + esc(t) + '</text>').join('');
  let g = '';
  for(const b of d.labs){
    if(b.en) g += lines(ko ? b.ko : b.en, b.x, b.y, d.fs);
    g += '<g class="mdb2"><circle cx="' + b.cx + '" cy="' + b.cy + '" r="' + b.r + '"/><text x="' + b.cx +
      '" y="' + (b.cy + b.r * 0.42).toFixed(1) + '" style="font-size:' + (b.r * 1.15).toFixed(1) + 'px">' +
      b.n + '</text></g>';
  }
  for(const e of d.extra) g += lines(ko ? e.ko : e.en, e.x, e.y, d.fs, e.mid);
  return '<svg class="mdimg" viewBox="0 0 ' + d.w + ' ' + d.h + '" role="img">' +
    '<image href="' + d.src + '" width="' + d.w + '" height="' + d.h + '"/>' + g + '</svg>';
}
function bvMdStage(c){
  const sec = k => BVMDSEC.find(x => x[0] === k);
  const panel = k => { const [key, title, pic] = sec(k);
    return '<section class="mdpanel mdsec--' + key + '" data-mdsk="' + key + '" title="Fill in ' +
      esc(title) + '"><h4>' + title + '<button type="button" class="mdenl" data-mdbig="' + key +
      '" title="Enlarge" aria-label="Enlarge">' + BVMAXSVG + '</button></h4><div class="mdpic">' + bvMdPic(pic) +
      '</div></section>'; };
  bvStage.innerHTML = '<div class="mdstage"><div class="mdsheet" style="--mdz:' + bvMdZ() + '">' +
    '<div class="mdshd"><h3>Measurement Detail</h3><span class="mdrule"></span>' +
      '<span class="mdwho">' + esc(c.nm || '') + (c.ag ? ' \u00b7 ' + esc(c.ag) : '') + '</span>' +
      '<span class="mdtools"><button type="button" class="mdtb" data-mdz="-1" title="Smaller" aria-label="Smaller">' +
        BVZOUTSVG + '</button><span class="mdzl">' + Math.round(bvMdZ() * 100) + '%</span>' +
        '<button type="button" class="mdtb" data-mdz="1" title="Larger" aria-label="Larger">' + BVZINSVG + '</button>' +
        '<button type="button" class="mdtb" data-mdmax title="' + (bvEl.classList.contains('bvmax') ? 'Restore (Esc)' : 'Full screen') +
        '" aria-label="Full screen">' + (bvEl.classList.contains('bvmax') ? BVMINSVG : BVMAXSVG) + '</button></span>' +
      (DOWN ? '<span class="mdsavew"><button type="button" class="mdback mdsave" data-mdsave>Save as\u2026</button></span>' : '') +
      '<button type="button" class="mdback" data-mdback>Back to files</button></div>' +
    '<div class="mdsgrid"><div class="mdscol">' + panel('fb') + '</div>' +
      '<div class="mdscol">' + panel('ub') + panel('ft') + '</div></div>' +
    '<div class="mdsphotos">' + panel('ah') +
      '<section class="mdpanel mdsec--fp" data-mdsk="fp"><h4>Feet<span class="hsdraw">· photos</span></h4>' +
      '<div class="mdpic"></div></section></div>' +
    '</div></div>';
  if(LANG !== 'en') try{ langWalk(bvStage); }catch(e){}
}
function bvMeasure(c){
  const lu = bkLU(c), wu = bkWU(c), ro = !SIGNED();
  const md = (c.md && typeof c.md === 'object') ? c.md : {};
  const has = v => v != null && String(v).trim() !== '';
  const len = v => { if(!has(v)) return ''; const x = parseFloat(v);
    return isNaN(x) ? String(v) : String(lu === 'in' ? cmToIn(x) : x); };
  const roA = ro ? ' readonly title="Sign in to edit"' : '';
  let filled = 0, total = 0;
  const body = BVMDSEC.map(([key, title, pic, list]) =>
    '<section class="mdsec mdsec--' + key + '" data-mdsk="' + key + '"><h4>' + title + '</h4>' +
    '<div class="mdrows">' +
    list.map(([nums, nm0, f]) => {
      const nm = (f === 'bu' && c.g === 'M') ? 'Chest (fullest part)' : nm0;
      let val, unit = lu, attrs;
      if(f === 'wt'){
        const kg = parseFloat(c.wt);
        val = isNaN(kg) ? '' : String(wu === 'lb' ? Math.round(kg / 0.45359237) : kg);
        unit = wu;
        attrs = 'data-bk="' + esc(c.id) + '" data-bf="wt" data-wu="' + wu + '"';
      } else if(f === 'eu'){
        const su = bkSU(c), eu = has(c.eu) ? parseFloat(c.eu) : NaN;
        if(su === 'us'){ val = has(c.us) ? String(c.us) : ''; unit = 'US';
          attrs = 'data-bk="' + esc(c.id) + '" data-bf="us"'; }
        else if(su === 'mm'){ val = isNaN(eu) ? '' : String(euToMm(eu)); unit = 'mm';
          attrs = 'data-bk="' + esc(c.id) + '" data-bf="mm"'; }
        else { val = has(c.eu) ? String(c.eu) : ''; unit = 'EU';
          attrs = 'data-bk="' + esc(c.id) + '" data-bf="eu"'; }
      } else if(BVMDCARD[f]){
        val = len(c[f]);
        attrs = 'data-bk="' + esc(c.id) + '" data-bf="' + f + '"';
      } else {
        val = len(md[f]);
        attrs = 'data-mdbk="' + esc(c.id) + '" data-mdk="' + f + '"';
      }
      total++; if(val !== '') filled++;
      return '<div class="mdrow' + (BVMDCARD[f] ? ' mdlink' : '') + '"><span class="mdno">' +
        nums.map(n => '<i>' + n + '</i>').join('') + '</span><label class="mdnm" for="md-' + f + '">' + nm +
        (BVMDCARD[f] ? '<b title="Also on the profile">●</b>' : '') + '</label>' +
        '<span class="mdv"><input class="mdin2" id="md-' + f + '" inputmode="decimal" autocomplete="off" ' +
        attrs + ' value="' + esc(val) + '" placeholder="—"' + roA + '><s>' + unit + '</s></span></div>';
    }).join('') + '</div></section>').join('');
  return '<div class="bvprof bvmdwrap"><div class="mdtop"><b>' + filled + ' / ' + total +
    '</b> filled · ' + (ro ? 'Sign in to fill this in' : 'Saved as you type') +
    ' · <span class="mdkey">● also on the profile</span></div>' + body + '</div>';
}
/* typing into an MD-only row keeps the value on the card, in centimetres */
document.addEventListener('input', e => {
  const el = e.target;
  if(!el || !el.dataset || !el.dataset.mdk) return;
  const bid = el.dataset.mdbk, c = BOOK.get(bid);
  if(!c) return;
  if(!SIGNED()){ nudgeSignIn(); return; }
  const k = el.dataset.mdk, raw = el.value.trim();
  const md = Object.assign({}, (c.md && typeof c.md === 'object') ? c.md : {});
  if(raw === '') delete md[k];
  else {
    const n = bkNum(raw);
    md[k] = n == null ? raw.slice(0, 20) : (bkLU(c) === 'in' ? inToCm(n) : n);
  }
  c.md = md;
  saveBook(bid);
});
/* the figures under the name and the count follow the rows as they are typed */
document.addEventListener('input', e => {
  const el = e.target;
  if(!el || !el.closest || !el.closest('.bvmdwrap')) return;
  const c = bv && BOOK.get(bv.id);
  if(!c) return;
  const mx = bvHd.querySelector('.bvmx');
  if(mx && el.dataset.bf) mx.innerHTML = bvFigures(c);
  const wrap = el.closest('.bvmdwrap'), b = wrap.querySelector('.mdtop b');
  if(b){
    const ins = [...wrap.querySelectorAll('.mdin2')];
    b.textContent = ins.filter(x => x.value.trim() !== '').length + ' / ' + ins.length;
  }
});
bvStage.addEventListener('click', e => {
  if(!bv || bv.view !== 'm') return;
  const t = e.target.closest ? e.target : null;
  if(!t) return;
  if(t.closest('[data-mdback]')){
    bv.view = 'p'; bvSideRefresh(true);
    const cc = BOOK.get(bv.id); if(cc) bvDrawStage(cc, BVLOAD.get(bv.id));
    return;
  }
  const sv = t.closest('[data-mdsave]');
  if(sv){ bvMdSaveMenu(sv); return; }
  const fk = t.closest('[data-mdfmt]');
  if(fk){ const m = bvStage.querySelector('.mdsavem'); if(m) m.remove(); bvMdExport(fk.dataset.mdfmt); return; }
  { const m = bvStage.querySelector('.mdsavem'); if(m && !t.closest('.mdsavem')) m.remove(); }
  const zb = t.closest('[data-mdz]');
  if(zb){ bvMdZoom(+zb.dataset.mdz); return; }
  if(t.closest('[data-mdmax]')){
    bvMaxSet(!bvEl.classList.contains('bvmax'));
    const cc = BOOK.get(bv.id); if(cc) bvMdStage(cc);
    return;
  }
  const bg = t.closest('[data-mdbig]');
  if(bg){ bvMdBig(bg.dataset.mdbig); return; }
  const pn = t.closest('.mdpanel');
  if(!pn) return;
  const sec = bvSide.querySelector('.mdsec[data-mdsk="' + pn.dataset.mdsk + '"]');
  if(!sec) return;
  sec.scrollIntoView({block: 'start', behavior: 'smooth'});
  const ins = [...sec.querySelectorAll('.mdin2')];
  const go = ins.find(x => x.value.trim() === '') || ins[0];
  if(go) setTimeout(() => { go.focus({preventScroll: true}); try{ go.select(); }catch(err){} }, 250);
});
bvSide.addEventListener('focusin', e => {
  const inp = e.target.closest && e.target.closest('.mdin2');
  if(!inp) return;
  const sec = inp.closest('.mdsec');
  const k = sec && sec.dataset.mdsk;
  bvStage.querySelectorAll('.mdpanel.on').forEach(x => { if(x.dataset.mdsk !== k) x.classList.remove('on'); });
  const pn = k && bvStage.querySelector('.mdpanel[data-mdsk="' + k + '"]');
  if(pn && !pn.classList.contains('on')){ pn.classList.add('on'); pn.scrollIntoView({block: 'nearest', behavior: 'smooth'}); }
});

/* ---- room to look: a wider side panel, a larger sheet, one drawing on its own ---- */
const BVSWSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
  'stroke-linecap="round" stroke-linejoin="round"><path d="M10 7 5 12l5 5M5 12h9M19 5v14"/></svg>';
const BVSNSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
  'stroke-linecap="round" stroke-linejoin="round"><path d="M9 7l5 5-5 5M14 12H5M19 5v14"/></svg>';
function bvSideWBtn(){
  const on = bvEl.classList.contains('bvsidewide');
  return '<button type="button" class="bvsw" data-bvsidew title="' + (on ? 'Narrow the panel' : 'Widen the panel') +
    '" aria-label="' + (on ? 'Narrow the panel' : 'Widen the panel') + '" aria-pressed="' + on + '">' +
    (on ? BVSNSVG : BVSWSVG) + '</button>';
}
function bvSideWide(on){
  bvEl.classList.toggle('bvsidewide', !!on);
  try{ localStorage.setItem('illum.bvsidew', on ? '1' : '0'); }catch(e){}
  bvSideRefresh(true);
  if(bv && bv.view !== 'm' && bvPhotoEl()) setTimeout(bvZoomApply, 60);
}
try{ if(localStorage.getItem('illum.bvsidew') === '1') bvEl.classList.add('bvsidewide'); }catch(e){}
function bvMdZ(){
  let z = 1;
  try{ z = parseFloat(localStorage.getItem('illum.mdz')) || 1; }catch(e){}
  return Math.max(0.8, Math.min(2, z));
}
function bvMdZoom(d){
  const z = Math.round(Math.max(0.8, Math.min(2, bvMdZ() + d * 0.2)) * 10) / 10;
  try{ localStorage.setItem('illum.mdz', String(z)); }catch(e){}
  const sh = bvStage.querySelector('.mdsheet');
  if(sh) sh.style.setProperty('--mdz', z);
  const lb = bvStage.querySelector('.mdzl'); if(lb) lb.textContent = Math.round(z * 100) + '%';
  const lo = bvStage.querySelector('[data-mdz="-1"]'), hi = bvStage.querySelector('[data-mdz="1"]');
  if(lo) lo.disabled = z <= 0.8;
  if(hi) hi.disabled = z >= 2;
}
/* one drawing, as large as the window allows; a click or Esc closes it */
function bvMdBig(key){
  const sec = BVMDSEC.find(x => x[0] === key);
  if(!sec) return;
  const old = bvEl.querySelector('.mdbig'); if(old) old.remove();
  const big = document.createElement('div');
  big.className = 'mdbig';
  big.innerHTML = '<div class="mdbigin mdsec--' + key + '"><h4>' + sec[1] + '<span>Click anywhere or press Esc to close</span></h4>' +
    bvMdPic(sec[2]) + '</div>';
  big.addEventListener('click', ev => { ev.stopPropagation(); big.remove(); });
  bvEl.appendChild(big);
  if(LANG !== 'en') try{ langWalk(big); }catch(e){}
}

/* ---- saving the sheet: PNG, JPEG or PDF ----
   The drawings, their numbers and words in the page's language, and the figures typed
   in so far, laid out as one sheet and drawn at twice screen size. */
function bvMdSaveMenu(btn){
  const had = bvStage.querySelector('.mdsavem');
  if(had){ had.remove(); return; }
  const m = document.createElement('div');
  m.className = 'mdsavem';
  m.innerHTML = [['png', 'PNG image', 'Sharp, for screens and messages'],
    ['jpg', 'JPEG image', 'Smaller file, for email'], ['pdf', 'PDF', 'A4 page, for printing and sending']]
    .map(([k, a, b]) => '<button type="button" data-mdfmt="' + k + '"><b>' + a + '</b><span>' + b + '</span></button>').join('');
  btn.parentElement.appendChild(m);
  if(LANG !== 'en') try{ langWalk(m); }catch(e){}
}
function bvMdRows(c){
  const lu = bkLU(c), wu = bkWU(c), su = bkSU(c), md = (c.md && typeof c.md === 'object') ? c.md : {};
  const has = v => v != null && String(v).trim() !== '';
  const len = v => { if(!has(v)) return ''; const x = parseFloat(v); return isNaN(x) ? String(v) : String(lu === 'in' ? cmToIn(x) : x); };
  return BVMDSEC.map(([key, title, pic, list]) => [key, title, list.map(([nums, nm, f]) => {
    let v = '', u = lu === 'in' ? 'in' : 'cm';
    if(f === 'wt'){ const kg = parseFloat(c.wt); v = isNaN(kg) ? '' : String(wu === 'lb' ? Math.round(kg / 0.45359237) : kg); u = wu; }
    else if(f === 'eu'){ const eu = has(c.eu) ? parseFloat(c.eu) : NaN;
      if(su === 'us'){ v = has(c.us) ? String(c.us) : ''; u = 'US'; }
      else if(su === 'mm'){ v = isNaN(eu) ? '' : String(euToMm(eu)); u = 'mm'; }
      else { v = has(c.eu) ? String(c.eu) : ''; u = 'EU'; } }
    else if(BVMDCARD[f]) v = len(c[f]);
    else v = len(md[f]);
    if(f === 'bu' && c.g === 'M') nm = 'Chest (fullest part)';
    return [nums, nm, v, u];
  })]);
}
const bvT = t => { const D = curDict(); return (D && D[t]) ? D[t] : t; };
async function bvDataURL(src){
  const r = await fetch(src); const b = await r.blob();
  return await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(b); });
}
async function bvMdSheetSvg(c){
  const W = 1600, M = 28, G = 14;
  const C1 = 640, C2 = 420, TX = M + C1 + G + C2 + G, TW = W - TX - M;
  const head = (x, y, w, key, title) => {
    const col = {fb: ['#E1EDF8', '#1F4E79'], nc: ['#E1EDF8', '#1F4E79'], ub: ['#F3E2EE', '#7A2E5C'], lb: ['#E1F1E5', '#2D6A40'],
                 ah: ['#DFF1EF', '#1F6B67'], ft: ['#EAE6F6', '#4B3F8A'], fp: ['#F6ECD9', '#8A5A12'], ring: ['#DFF1EF', '#1F6B67']}[key];
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="24" fill="' + col[0] + '"/>' +
      '<text x="' + (x + 10) + '" y="' + (y + 16.5) + '" class="sh" fill="' + col[1] + '">' + esc(bvT(title).toUpperCase()) + '</text>';
  };
  const imgs = {};
  for(const k of Object.keys(BVMDIMG)) imgs[k] = await bvDataURL(BVMDIMG[k].src);
  const ko = LANG === 'ko';
  const pic = (key, x, y, w) => {
    if(key === 'foot'){
      /* drawn at its own size and centred, so its type matches the rest of the sheet */
      const w2 = Math.min(w, 190); x += (w - w2) / 2; w = w2;
      const h = w * 194 / 152;
      return [BVMDFOOT.replace(/^<svg[^>]*>/, '<svg x="' + x + '" y="' + y + '" width="' + w + '" height="' + h.toFixed(1) +
        '" viewBox="140 30 152 194">'), h];
    }
    const d = BVMDIMG[key], h = w * d.h / d.w, k = w / d.w;
    let g = '<g transform="translate(' + x + ' ' + y + ') scale(' + k.toFixed(5) + ')"><image href="' + imgs[key] +
      '" width="' + d.w + '" height="' + d.h + '"/>';
    const ln = (L, tx, ty, mid) => L.map((t, i) => '<text class="l2" x="' + tx + '" y="' + (ty + i * d.fs * 1.28).toFixed(1) + '"' +
      (mid ? ' text-anchor="middle"' : '') + ' style="font-size:' + d.fs + 'px">' + esc(t) + '</text>').join('');
    for(const b of d.labs){
      if(b.en) g += ln(ko ? b.ko : b.en, b.x, b.y);
      g += '<circle cx="' + b.cx + '" cy="' + b.cy + '" r="' + b.r + '" fill="#2F6DB5"/><text class="bn" x="' + b.cx + '" y="' +
        (b.cy + b.r * 0.42).toFixed(1) + '" style="font-size:' + (b.r * 1.15).toFixed(1) + 'px">' + b.n + '</text>';
    }
    for(const e of d.extra) g += ln(ko ? e.ko : e.en, e.x, e.y, e.mid);
    return [g + '</g>', h];
  };
  const box = (key, title, x, y, w, picKey) => {
    const [g, h] = pic(picKey, x + 6, y + 30, w - 12);
    return ['<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + (h + 38) + '" rx="6" fill="#fff" stroke="#DCE3EC"/>' +
      head(x + 0.5, y + 0.5, w - 1, key, title) + g, h + 38];
  };
  let y0 = 86, body = '';
  const T = k => BVMDSEC.find(x => x[0] === k);
  let [g1, h1] = box('fb', T('fb')[1], M, y0, C1, 'full'); body += g1;
  let cy = y0, x2 = M + C1 + G;
  for(const [k, pk] of [['ub', 'upper'], ['ft', 'foot']]){
    const [g, h] = box(k, T(k)[1], x2, cy, C2, pk); body += g; cy += h + G;
  }
  /* the photographs: both hands front and back, both feet */
  const PY = Math.max(y0 + h1, cy - G) + G, PW = C1 + G + C2, HW = Math.round((PW - G) * 0.64), FW = PW - G - HW;
  const SH = 210;
  const photo = async (id, x, y, w, word) => {
    let g = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + SH + '" rx="5" fill="#F7F9FB" stroke="#DCE3EC"/>';
    if(id){ try{ const du = await bvDataURL('/_blob/' + id);
      g += '<image href="' + du + '" x="' + (x + 2) + '" y="' + (y + 2) + '" width="' + (w - 4) + '" height="' + (SH - 4) + '" preserveAspectRatio="xMidYMid meet"/>'; }catch(e){} }
    else g += '<text x="' + (x + w / 2) + '" y="' + (y + SH / 2 + 4) + '" text-anchor="middle" style="font-size:11px;fill:#A3A9B4">' + esc(bvT('No photo')) + '</text>';
    return g + '<text x="' + (x + 8) + '" y="' + (y + 16) + '" style="font-size:9.5px;font-weight:600;letter-spacing:1.2px;fill:#1F6B67">' + esc(bvT(word).toUpperCase()) + '</text>';
  };
  const hp = (c.hph && typeof c.hph === 'object') ? c.hph : {}, fpx = (c.fph && typeof c.fph === 'object') ? c.fph : {};
  body += '<rect x="' + M + '" y="' + PY + '" width="' + HW + '" height="' + (SH + 38) + '" rx="6" fill="#fff" stroke="#DCE3EC"/>' + head(M + 0.5, PY + 0.5, HW - 1, 'ah', 'Hands');
  const sw = (HW - 12 - 3 * 8) / 4;
  const hs = [['l', 'Front · left'], ['r', 'Front · right'], ['lb', 'Back · left'], ['rb', 'Back · right']];
  for(let i = 0; i < 4; i++) body += await photo(hp[hs[i][0]], M + 6 + i * (sw + 8), PY + 30, sw, hs[i][1]);
  const FX = M + HW + G;
  body += '<rect x="' + FX + '" y="' + PY + '" width="' + FW + '" height="' + (SH + 38) + '" rx="6" fill="#fff" stroke="#DCE3EC"/>' + head(FX + 0.5, PY + 0.5, FW - 1, 'fp', 'Feet');
  const fw2 = (FW - 12 - 8) / 2;
  body += await photo(fpx.l, FX + 6, PY + 30, fw2, 'Left foot') + await photo(fpx.r, FX + 6 + fw2 + 8, PY + 30, fw2, 'Right foot');
  const PB = PY + SH + 38;
  // the figures
  let ty = y0, tb = '';
  const lu = bkLU(c);
  tb += '<rect x="' + TX + '" y="' + ty + '" width="' + TW + '" height="26" fill="#F1F4F8"/>' +
    '<text class="th" x="' + (TX + 10) + '" y="' + (ty + 17) + '">' + esc(bvT('No.')) + '</text>' +
    '<text class="th" x="' + (TX + 78) + '" y="' + (ty + 17) + '">' + esc(bvT('Measurement')) + '</text>' +
    '<text class="th" x="' + (TX + TW - 10) + '" y="' + (ty + 17) + '" text-anchor="end">' + (lu === 'in' ? 'in' : 'cm') + '</text>';
  ty += 26;
  for(const [key, title, rows] of bvMdRows(c)){
    tb += head(TX, ty, TW, key, title); ty += 24;
    for(const [nums, nm, v, u] of rows){
      tb += '<line x1="' + TX + '" x2="' + (TX + TW) + '" y1="' + (ty + 22.5) + '" y2="' + (ty + 22.5) + '" stroke="#EEF1F5"/>';
      nums.forEach((n, i) => { const nx = TX + 18 + i * 22;
        tb += '<circle cx="' + nx + '" cy="' + (ty + 11.5) + '" r="8.5" fill="#2F6DB5"/><text class="bn" x="' + nx + '" y="' +
          (ty + 15) + '" style="font-size:9.5px">' + n + '</text>'; });
      tb += '<text class="tr" x="' + (TX + 78) + '" y="' + (ty + 16) + '">' + esc(bvT(nm)) + '</text>';
      tb += '<text class="tv" x="' + (TX + TW - 44) + '" y="' + (ty + 16) + '" text-anchor="end">' + esc(v || '—') + '</text>' +
        '<text class="tu" x="' + (TX + TW - 10) + '" y="' + (ty + 16) + '" text-anchor="end">' + esc(u) + '</text>';
      ty += 23;
    }
  }
  /* ring sizes, under the figures */
  { const rg = (c.ring && typeof c.ring === 'object') ? c.ring : {}, RF = [['t', 'Thumb'], ['i', 'Index'], ['m', 'Middle'], ['r', 'Ring'], ['p', 'Little']];
    const ru = ({us: 'US', eu: 'EU', jp: 'JP', uk: 'UK', mm: 'mm'})[c.ringu] || 'US';
    if(RF.some(([k]) => (rg.L && rg.L[k]) || (rg.R && rg.R[k]))){
      tb += head(TX, ty, TW, 'ring', bvT('Ring size') + ' (' + ru + ')'); ty += 24;
      tb += '<text class="th" x="' + (TX + TW - 110) + '" y="' + (ty + 16) + '" text-anchor="middle">' + esc(bvT('Left')) + '</text>' +
        '<text class="th" x="' + (TX + TW - 40) + '" y="' + (ty + 16) + '" text-anchor="middle">' + esc(bvT('Right')) + '</text>'; ty += 23;
      for(const [k, n] of RF){
        tb += '<line x1="' + TX + '" x2="' + (TX + TW) + '" y1="' + (ty + 22.5) + '" y2="' + (ty + 22.5) + '" stroke="#EEF1F5"/>' +
          '<text class="tr" x="' + (TX + 18) + '" y="' + (ty + 16) + '">' + esc(bvT(n)) + '</text>' +
          '<text class="tv" x="' + (TX + TW - 110) + '" y="' + (ty + 16) + '" text-anchor="middle">' + esc(String((rg.L || {})[k] || '—')) + '</text>' +
          '<text class="tv" x="' + (TX + TW - 40) + '" y="' + (ty + 16) + '" text-anchor="middle">' + esc(String((rg.R || {})[k] || '—')) + '</text>';
        ty += 23;
      }
    }
  }
  const H = Math.ceil(Math.max(PB, ty) + M);
  const who = [c.nm, c.ag].filter(Boolean).join(' · ');
  const day = new Date().toISOString().slice(0, 10);
  const style = '<style>text{font-family:"IBM Plex Sans","Segoe UI","Malgun Gothic","Apple SD Gothic Neo",Arial,sans-serif}' +
    '.sh{font-size:11.5px;font-weight:600;letter-spacing:1.4px}.l2{fill:#2A2F3A;font-weight:500}.bn{fill:#fff;font-weight:700;text-anchor:middle}' +
    '.th{font-size:11.5px;font-weight:600;fill:#3A465E}.tr{font-size:12.5px;fill:#1F2A44}.tv{font-size:13px;font-weight:600;fill:#1C2B4A}' +
    '.tu{font-size:10.5px;fill:#8A90A0}.mdfig{fill:#fff;stroke:#3B3F4A;stroke-width:1.15;stroke-linejoin:round}' +
    '.mdin{fill:none;stroke:#A3A9B4;stroke-width:.8}.mdm{fill:none;stroke:#2F6DB5;stroke-width:1.3;stroke-dasharray:4 3}' +
    '.mdk{stroke:#2F6DB5;stroke-width:1.2}.mdlead{stroke:#93B2D9;stroke-width:.9;stroke-dasharray:1.5 2.5}' +
    '.mdb circle{fill:#2F6DB5}.mdb text{fill:#fff;font-size:9px;font-weight:700;text-anchor:middle}.mdt{font-size:11px;fill:#2A2F3A}' +
    '.mdcap{font-size:9px;letter-spacing:1.3px;fill:#8A90A0}</style>';
  let foot = BVMDFOOT;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + W + '" height="' + H +
    '" viewBox="0 0 ' + W + ' ' + H + '">' + style + '<rect width="' + W + '" height="' + H + '" fill="#fff"/>' +
    '<text x="' + M + '" y="52" style="font-size:26px;font-weight:600;letter-spacing:3.6px;fill:#1C2B4A">' +
      esc(bvT('Measurement Detail').toUpperCase()) + '</text>' +
    '<line x1="' + (M + 400) + '" x2="' + (W - M - 360) + '" y1="44" y2="44" stroke="#1C2B4A" stroke-width="1"/>' +
    '<text x="' + (W - M) + '" y="40" text-anchor="end" style="font-size:13px;letter-spacing:1.2px;fill:#5A2C57">' + esc(who.toUpperCase()) + '</text>' +
    '<text x="' + (W - M) + '" y="58" text-anchor="end" style="font-size:11px;fill:#8A90A0">' + day + '</text>' +
    body + tb + '</svg>';
  return [svg, W, H];
}
let bvMdSaving = false;
async function bvMdExport(fmt){
  if(!bv || bvMdSaving || !DOWN) return;
  const c = BOOK.get(bv.id); if(!c) return;
  const btn = bvStage.querySelector('[data-mdsave]');
  const say = t => { if(btn) btn.textContent = t; };
  const KOV = LANG === 'ko';
  bvMdSaving = true; say(KOV ? '만드는 중…' : 'Making…');
  try{
    const [svg, W, H] = await bvMdSheetSvg(c);
    const url = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml'}));
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('the sheet could not be drawn')); img.src = url; });
    const k = 2, cv = document.createElement('canvas');
    cv.width = W * k; cv.height = H * k;
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    g.drawImage(img, 0, 0, cv.width, cv.height);
    URL.revokeObjectURL(url);
    const base = (bvFolderName(c) || 'model') + ' - ' + (KOV ? '상세 사이즈' : 'Measurement Detail');
    let blob, name;
    if(fmt === 'pdf'){
      const J = (await bvLib('mkpdf')).jsPDF;
      const land = W > H, pw = land ? 842 : 595, ph = land ? 595 : 842, m = 16;
      const doc = new J({orientation: land ? 'landscape' : 'portrait', unit: 'pt', format: 'a4'});
      const fit = Math.min((pw - 2 * m) / W, (ph - 2 * m) / H);
      doc.addImage(cv.toDataURL('image/jpeg', 0.93), 'JPEG', (pw - W * fit) / 2, (ph - H * fit) / 2, W * fit, H * fit);
      try{ doc.setProperties({title: base}); }catch(e){}
      blob = doc.output('blob'); name = base + '.pdf';
    } else {
      blob = await new Promise(r => cv.toBlob(r, fmt === 'jpg' ? 'image/jpeg' : 'image/png', 0.93));
      name = base + (fmt === 'jpg' ? '.jpg' : '.png');
    }
    say(KOV ? '저장 확인 창에서 저장을 누르세요' : 'Confirm the save…');
    await DOWN.save({filename: name, data: blob});
    say(KOV ? '저장됨' : 'Saved');
  }catch(e){
    say(e && /declin/i.test(String(e.code || e.message || '')) ? (KOV ? '취소됨' : 'Cancelled') : (KOV ? '저장 실패' : 'Could not save'));
  }finally{
    bvMdSaving = false;
    setTimeout(() => { const b = bvStage.querySelector('[data-mdsave]'); if(b) b.textContent = KOV ? '다른 이름으로 저장…' : 'Save as…'; }, 2600);
  }
}
/* Enter moves down the rows, as in a spreadsheet */
bvSide.addEventListener('keydown', e => {
  if(e.key !== 'Enter') return;
  const inp = e.target.closest && e.target.closest('.mdin2');
  if(!inp) return;
  e.preventDefault();
  const all = [...bvSide.querySelectorAll('.mdin2')];
  const nx = all[all.indexOf(inp) + (e.shiftKey ? -1 : 1)];
  if(nx){ nx.focus(); try{ nx.select(); }catch(err){} }
});
/* a drawing opens large over the viewer; a click anywhere closes it */
bvSide.addEventListener('click', e => {
  const pic = e.target.closest && e.target.closest('.mdpic');
  if(!pic || !bvSide.contains(pic)) return;
  const big = document.createElement('div');
  big.className = 'mdbig';
  big.innerHTML = '<div class="mdbigin">' + pic.innerHTML + '</div>';
  big.addEventListener('click', ev => { ev.stopPropagation(); big.remove(); });
  bvEl.appendChild(big);
});
/* The card list redraws itself whenever a booking changes; the viewer's side panel
   follows, unless someone is typing in it at that moment. */
function bvSideRefresh(force){
  if(typeof bv === 'undefined' || !bv || bvEl.hidden) return;
  const a = document.activeElement;
  if(!force && a && bvSide.contains(a) && /^(INPUT|TEXTAREA)$/.test(a.tagName)) return;
  const c = BOOK.get(bv.id);
  if(c){
    bvDrawSide(c, BVLOAD.get(c.id));
    bvSteps.innerHTML = bvStepBar(c);
    bvTabs.querySelectorAll('[data-bvtab]').forEach(b => {
      const sk = BVTABSTAGE[b.dataset.bvtab], d = b.querySelector('.bvtdot');
      if(sk && d) d.dataset.p = bvStageOf(c, sk).pv; });
    if(LANG !== 'en') try{ langWalk(bvSteps); }catch(e){}
    const mx = bvHd.querySelector('.bvmx');
    if(mx) mx.innerHTML = bvFigures(c);
    if(LANG !== 'en') try{ langWalk(bvEl); }catch(e){}
  }
}
bvSide.addEventListener('click', e => {
  const t = e.target.closest ? e.target : null;
  if(!t || !bv) return;
  if(t.closest('[data-bkstage]')) return;          // the light answers on its own
  const go = t.closest('[data-bvsec]');
  if(go){ e.stopPropagation(); bv.pane = go.classList.contains('stgh') && bv.pane === go.dataset.bvsec ? '' : go.dataset.bvsec; bv.view = 's'; bvSideRefresh(true);
          if(!bv.pane) return;
          const ta = bvSide.querySelector('.bvntext');
          if(ta){ ta.focus({preventScroll: true}); const n = ta.value.length; try{ ta.setSelectionRange(n, n); }catch(err){}
                  ta.scrollTop = ta.scrollHeight; }
          return; }
  if(t.closest('[data-bvsidew]')){ e.stopPropagation(); bvSideWide(!bvEl.classList.contains('bvsidewide')); return; }
  const vw = t.closest('[data-bvview]');
  if(vw){ e.stopPropagation();
          const was = bv.view;
          bv.view = ['d', 'm', 's'].includes(vw.dataset.bvview) ? vw.dataset.bvview : 'p';
          if(bv.view === 's'){ const cs = BOOK.get(bv.id); const cur = cs && BKSEC.find(([k]) => bvStageOf(cs, k).pv !== 'g'); bv.pane = cur ? cur[0] : ''; }
          else bv.pane = '';
          if((was === 'm') !== (bv.view === 'm')){
            const cc = BOOK.get(bv.id); if(cc) bvDrawStage(cc, BVLOAD.get(bv.id)); }
          bvSideRefresh(true); return; }
  const wub = t.closest('[data-bvwu]');
  if(wub){ e.stopPropagation();
    const c = BOOK.get(bv.id);
    if(c && SIGNED()){ c.wu = wub.dataset.bvwu === 'lb' ? 'lb' : 'kg'; saveBook(c.id, true);
                       renderBook(); }
    else try{ localStorage.setItem('illum.wtu', wub.dataset.bvwu); }catch(err){}
    const mx = bvHd.querySelector('.bvmx'); if(mx && c) mx.innerHTML = bvFigures(c);
    bvSideRefresh(true); return; }
  if(t.closest('[data-bvback]')){ e.stopPropagation(); bv.pane = '';
                                   bvSideRefresh(true); return; }
}, true);
bvSide.addEventListener('click', bkMainClick);
bvSide.addEventListener('focusout', e => {
  if(e.target && e.target.dataset && e.target.dataset.bf === 'dob')
    setTimeout(() => {
      bvSideRefresh();
      const c = bv && BOOK.get(bv.id);
      if(!c) return;
      let a = ''; try{ a = ageFrom(c.dob); }catch(err){}
      const ai = bvSide.querySelector('.bvage');
      if(ai && a !== '' && a != null){ ai.value = a; ai.readOnly = true; }
      const mx = bvHd.querySelector('.bvmx'); if(mx) mx.innerHTML = bvFigures(c);
    }, 0);
});
bvSide.addEventListener('keydown', e => {
  if(e.key !== 'Enter' && e.key !== ' ') return;
  const go = e.target.closest && e.target.closest('.bksh[data-bvsec]');
  if(go){ e.preventDefault(); go.click(); }
});
bvSide.addEventListener('keydown', bkMainKey);
bkDrops(bvSide);
function bvNoteOnly(html){
  bvStopMedia();
  bvStage.innerHTML = '<div class="bvnote">' + html + '</div>';
}
let bvSeq = 0;
async function bvDrawStage(c, got){
  bvStopMedia();
  const seq = ++bvSeq;
  bvZ = {k: 1, x: 0, y: 0};
  if(bv && bv.view === 'm' && c){ bvMdStage(c); return; }
  /* Every time the room opens it asks where to look - this computer, Dropbox, or the
     folder already opened earlier, if there is one. */
  if(bv.choose){
    const KOV = LANG === 'ko';
    bvNoteOnly('<h3>' + (KOV ? esc(c.nm || '이 모델') + '의 파일을 어디에서 볼까요?'
      : 'Where would you like to view ' + esc(c.nm || 'this model') + '\u2019s files?') + '</h3>' +
      '<div class="bvbtns bvchoose">' +
      '<button type="button" class="bvbtn bvbtn--acc" data-bvpick>On this computer<s class="bvcnt" data-bvcnt="pc"></s></button>' +
      (BVROOT ? '<button type="button" class="bvbtn" data-bvpick data-bvnew>Pick a different ' +
        'folder</button>' : '') +
      '<button type="button" class="bvbtn" data-bvdbx>In Dropbox<s class="bvcnt" data-bvcnt="dbx"></s></button>' +
      (got ? '<button type="button" class="bvbtn" data-bvkeep>Continue with ' +
        esc(got.folder) + '</button>' : '') + '</div>' +
      (window.illu && window.illu.bookingFiles ? '<div class="bvrfrow"><button type="button" class="bvbtn bvrf" data-bvrefresh ' +
        'title="Look in the folders again for files added since">' + RFGLYPH + 'Refresh</button><span class="bvrfst"></span></div>' : '') +
      '<small>' + (KOV ? (BVROOT && bvSort(c, BVROOT)
        ? '이번 방문에서 BOOKING 폴더가 이미 열려 있습니다 \u2014 <b>이 컴퓨터에서</b>를 누르면 ' +
          esc(c.nm || '이 모델') + '의 파일이 바로 보입니다. '
        : '이 컴퓨터에서: <b>BOOKING</b> 폴더 전체를 한 번만 선택하면, 이번 방문 동안 모든 모델이 ' +
          '바로 열립니다 \u2014 페이지가 그 안에서 <code>' + esc(bvFolderName(c)) + '</code> 폴더를 찾습니다. ') +
        'Chrome이 파일을 \u201c업로드\u201d한다고 물을 수 있지만, 여기서 읽기만 하고 어디에도 보내지 않습니다. ' +
        '드롭박스 파일은 이 화면에서 바로 열립니다.' : (BVROOT && bvSort(c, BVROOT) ? 'Your BOOKING folder is already open this ' +
        'visit \u2014 <b>On this computer</b> shows ' + esc(c.nm || 'this model') +
        '\u2019s files straight away. ' : 'On this computer: pick the whole <b>BOOKING</b> ' +
      'folder once and every model opens straight away for the rest of this visit \u2014 the ' +
      'page finds <code>' + esc(bvFolderName(c)) + '</code> inside it. ') +
      'Chrome may ask to \u201cupload\u201d the files; they are only read here, nothing ' +
      'is sent anywhere. Dropbox files open right here.') + '</small>');
    bvCounts(c);
    return;
  }
  if(!got){
    bvNoteOnly('<h3>' + esc(c.nm || 'This model') + '’s files</h3>' +
      'Choose this model’s folder, or the whole <b>BOOKING</b> folder — the page ' +
      'finds <code>' + esc(bvFolderName(c)) + '</code> inside it.' +
      '<div class="bvbtns"><button type="button" class="bvbtn bvbtn--acc" data-bvpick>' +
      'Open folder on this computer</button><button type="button" class="bvbtn" data-bvdbx>' +
      'In Dropbox</button></div><small>Chrome may ask to “upload” the files. They are only ' +
      'read on this computer to show them here — nothing is sent anywhere.</small>');
    return;
  }
  const list = bvList();
  if(!list.length){
    const any = got && [...got.groups.values()].some(x => x.length);
    bvNoteOnly('<h3>' + esc(bv.tab) + '</h3>' + (any
      ? 'Nothing in this folder yet. Pick another folder above.'
      : 'This model\u2019s Dropbox folder <code>' + esc(bvFolderName(c)) + '</code> has no ' +
        'files yet. As soon as photos, videos or documents are added and synced, they open ' +
        'right here.') +
      '<div class="bvbtns"><button type="button" class="bvbtn bvrf" data-bvrefresh>' + RFGLYPH + 'Refresh</button>' +
      '<button type="button" class="bvbtn" data-bvpick>Open folder on this computer</button></div>');
    return;
  }
  if(bv.i >= list.length) bv.i = list.length - 1;
  if(bv.i < 0) bv.i = 0;
  if(bv.grid){ bvDrawGrid(list, seq); return; }
  let f = list[bv.i];
  if(f && ((f._rid && !BVREM.has(f._rid)) || (f._add && !BVADDF.has('F' + f._add.i)))){
    bvStage.innerHTML = '<div class="bvmedia"><div class="bvnote">Loading ' + esc(f.name) +
      '\u2026</div></div>';
    try{ f = await bvReal(f); }catch(e){
      if(seq !== bvSeq) return;
      bvNoteOnly('<h3>' + esc(f.name) + '</h3>This file could not be loaded just now.' +
        '<div class="bvbtns"><button type="button" class="bvbtn" data-bvdbx>Try again</button></div>');
      return;
    }
    if(seq !== bvSeq) return;
  } else if(f && f._rid) f = BVREM.get(f._rid);
  else if(f && f._add) f = BVADDF.get('F' + f._add.i);
  const kd = bvKind(f);
  /* two portraits side by side, the way a book is read, when there is room for it */
  const j = (bv.i + 1) % list.length;
  const two = bvTwoPref() && kd === 'img' && list.length > 1 && bvKind(list[j]) === 'img' &&
    bvStage.clientWidth >= 760;
  bvStage.innerHTML = '<div class="bvmedia"></div>' +
    '<button type="button" class="bvnav bvnav--p" data-bvstep="-1" aria-label="Previous"' +
    (list.length > 1 ? '' : ' disabled') + '>‹</button>' +
    '<button type="button" class="bvnav bvnav--n" data-bvstep="1" aria-label="Next"' +
    (list.length > 1 ? '' : ' disabled') + '>›</button>' +
    '<div class="bvtool"><span class="bvcount">' + (two ? (bv.i + 1) + '\u2013' + (j + 1) : (bv.i + 1)) +
      '/' + list.length + '</span><i class="bvsep"></i>' +
    '<button type="button" class="bvtb" data-bvmax title="' +
      (bvEl.classList.contains('bvmax') ? 'Restore (Esc)' : 'Maximize') + '" aria-label="' +
      (bvEl.classList.contains('bvmax') ? 'Restore (Esc)' : 'Maximize') + '">' +
      (bvEl.classList.contains('bvmax') ? BVMINSVG : BVMAXSVG) + '</button>' +
    '<button type="button" class="bvtb" data-bvgrid title="Show all as a grid (G)" ' +
      'aria-label="Show all as a grid">' + BVGRIDSVG + '</button>' +
    (list.length > 1 ? '<button type="button" class="bvtb" data-bv2 aria-pressed="' + bvTwoPref() +
      '" title="' + (bvTwoPref() ? 'Show one photo (2)' : 'Show two photos side by side (2)') + '" ' +
      'aria-label="Two photos side by side">' + BVTWOSVG + '</button>' : '') + '<i class="bvsep"></i>' +
    ((kd === 'img' || kd === 'heic')
      ? '<button type="button" class="bvtb" data-bvrot="-90" title="Rotate left (Shift+R)" ' +
        'aria-label="Rotate left">' + BVROTLSVG + '</button>' +
        '<button type="button" class="bvtb" data-bvrot="90" title="Rotate right (R)" ' +
        'aria-label="Rotate right">' + BVROTRSVG + '</button><i class="bvsep"></i>' : '') +
    ((kd === 'img' || kd === 'heic') && !two
      ? '<button type="button" class="bvtb" data-bvzoom="in" title="Zoom in (+)" ' +
        'aria-label="Zoom in">' + BVZINSVG + '</button><span class="bvzlab">100%</span>' +
        '<button type="button" class="bvtb" data-bvzoom="out" title="Zoom out (\u2212)" ' +
        'aria-label="Zoom out" disabled>' + BVZOUTSVG + '</button><i class="bvsep"></i>' : '') +
    (DOWN && bv.tab !== '3. VIDEOS' ? '<button type="button" class="bvtb" data-bvpdf ' +
      'title="Make a PDF of the photos in ' + esc(bv.tab.replace(/^\d+\.\s*/, '')) +
      '" aria-label="Make a PDF">' + BVPDFSVG + '</button>' : '') +
    (DOWN ? '<button type="button" class="bvtb" data-bvdl title="Download this file" ' +
      'aria-label="Download this file">' + BVDLSVG + '</button>' : '') + '</div>' +
    '<div class="bvcap"><b' + (two && bv.sel === 1 ? ' class="off"' : '') + '>' + esc(f.name) + '</b><span>' + bvSize(f.size) + '</span>' +
    (two ? '<b' + (bv.sel === 0 ? ' class="off"' : '') + '>' + esc(list[j].name) + '</b><span>' + bvSize(list[j].size) + '</span>' : '') +
    '<em class="bvmsg" role="status">' + esc(bvMsgNext) + '</em></div>' + bvStripHTML(list);
  bvMsgNext = '';
  bvTips();
  bvStage.classList.toggle('bvtwo', two);
  bvStripFill(list, seq);
  const box = bvStage.querySelector('.bvmedia');
  const fileCard = (why) => '<div class="bvfile">' + BVFILESVG + '<b>' + esc(f.name) +
    '</b><span>' + bvSize(f.size) + (why ? ' · ' + why : '') + '</span></div>';
  if(kd === 'img' && two){
    box.innerHTML = '<div class="bvspread"><div class="bvsp"><div class="bvnote">Loading\u2026</div></div>' +
      '<div class="bvsp"><div class="bvnote">Loading\u2026</div></div></div>';
    const slots = box.querySelectorAll('.bvsp');
    let g = list[j];
    try{
      if(g && ((g._rid && !BVREM.has(g._rid)) || (g._add && !BVADDF.has('F' + g._add.i)))) g = await bvReal(g);
      else if(g && g._rid) g = BVREM.get(g._rid);
      else if(g && g._add) g = BVADDF.get('F' + g._add.i);
    }catch(e){ g = null; }
    if(seq !== bvSeq) return;
    const ps = await Promise.all([bvPaint(f, slots[0], 2600), g ? bvPaint(g, slots[1], 2600) : null]);
    if(seq !== bvSeq){ ps.forEach(p => { if(p && p.url) URL.revokeObjectURL(p.url); }); return; }
    slots.forEach((sl, k) => { sl.dataset.bvsel = k; sl.classList.toggle('on', k === bv.sel);
      sl.title = 'Pick this photo'; });
    [0, 1].forEach(k => {
      const p = ps[k], slot = slots[k];
      if(!p){ slot.innerHTML = fileCard('could not be opened'); return; }
      slot.innerHTML = ''; slot.appendChild(p.el);
      const r = bvRot(list[k ? j : bv.i]);
      if(r) p.el.style.transform = 'scale(' + bvFit(p.el, r) + ') rotate(' + r + 'deg)';
    });
    bvURL = ps[0] && ps[0].url;
    bvURL2 = ps[1] && ps[1].url;
  } else if(kd === 'img'){
    box.innerHTML = '<div class="bvnote">Loading…</div>';
    const p = await bvPaint(f, box, 2600);
    if(seq !== bvSeq) { if(p && p.url) URL.revokeObjectURL(p.url); return; }
    if(!p){ box.innerHTML = fileCard('this picture could not be opened'); return; }
    box.innerHTML = '';
    box.appendChild(p.el);
    bvZoomApply();
    bvURL = p.url;
  } else if(kd === 'vid'){
    const url = URL.createObjectURL(f);
    bvURL = url;
    const v = document.createElement('video');
    v.controls = true; v.playsInline = true; v.preload = 'metadata';
    v.onerror = () => {
      if(seq !== bvSeq) return;
      box.innerHTML = fileCard('this browser could not play it. Phone videos are often ' +
        'HEVC (H.265), which Chrome plays only where the computer supports it \u2014 ' +
        'saving it as an H.264 MP4 plays everywhere');
    };
    v.src = url;
    box.innerHTML = '';
    box.appendChild(v);
  } else if(kd === 'heic'){
    box.innerHTML = '<div class="bvnote">Loading\u2026</div>';
    try{
      const jpg = await bvHeic(f);
      if(seq !== bvSeq) return;
      const p = await bvPaint(jpg, box, 2600);
      if(seq !== bvSeq) { if(p && p.url) URL.revokeObjectURL(p.url); return; }
      if(!p) throw new Error('no picture');
      box.innerHTML = '';
      box.appendChild(p.el);
    bvZoomApply();
      bvURL = p.url;
    }catch(e){
      if(seq !== bvSeq) return;
      box.innerHTML = fileCard('this iPhone photo could not be opened here \u2014 use Download');
    }
  } else if(kd === 'pdf' || kd === 'docx' || kd === 'sheet' || kd === 'pptx' || kd === 'text'){
    box.innerHTML = '<div class="bvnote">Opening ' + esc(f.name) + '\u2026</div>';
    try{
      await bvRenderDoc(kd, f, box, seq);
    }catch(e){
      if(seq !== bvSeq) return;
      box.innerHTML = fileCard('could not be shown here \u2014 use Download');
    }
  } else {
    box.innerHTML = fileCard(/\.(doc|ppt)$/i.test(f.name)
      ? 'older Word / PowerPoint format \u2014 use Download, or save it as .docx / .pptx to see it here'
      : 'use Download to open it');
  }
  /* the neighbours are decoded ahead, so the arrow keys feel instant */
  [list[(bv.i + 1) % list.length], list[(bv.i - 1 + list.length) % list.length]].forEach(n => {
    if(n && (n._rid || n._add)){ if(bvKind(n) === 'img') bvReal(n).catch(() => {}); return; }
    if(n && bvKind(n) === 'img' && !BVTHUMB.has(n)) bvThumb(n, null);
  });
}
function bvStep(d){
  const list = bvList();
  const n = list.length;
  if(!n) return;
  /* past the last picture it wraps to the first, and before the first to the last */
  if(!bv.grid && bvStage.querySelector('.bvspread')) d = d * 2;
  const i = ((bv.i + d) % n + n) % n;
  bv.sel = null;
  if(i === bv.i) return;
  bv.i = i;
  if(bv.grid && bvStage.querySelector('.bvgall')){ bvGridMark(); return; }
  const c = BOOK.get(bv.id), got = BVLOAD.get(bv.id);
  bvDrawStage(c, got);
  bvStripMark();
  bvSide.querySelectorAll('.bvth').forEach(b =>
    b.setAttribute('aria-current', String(+b.dataset.bvi === bv.i)));
  const on = bvSide.querySelector('.bvth[aria-current="true"]');
  if(on) on.scrollIntoView({block: 'nearest'});
}
/* ---- two photos side by side ---- */
let bvURL2 = '';
const BVTWOSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">' +
  '<rect x="3" y="5" width="8" height="14" rx="1"/><rect x="13" y="5" width="8" height="14" rx="1"/></svg>';
function bvTwoPref(){ try{ return localStorage.getItem('illum.bv2') !== '0'; }catch(e){ return true; } }
/* which file the tools act on: in a pair, the one picked */
function bvCur(){
  if(!bv) return 0;
  const n = bvList().length;
  return (!bv.grid && bv.sel === 1 && n && bvStage.querySelector('.bvspread')) ? (bv.i + 1) % n : bv.i;
}
/* pressing a photo picks it; pressing it again - or anywhere else - lets it go */
function bvPick(k, keep){
  if(!bv) return;
  const want = (k === null || k === undefined) ? null : (k ? 1 : 0);
  bv.sel = (!keep && want !== null && bv.sel === want) ? null : want;
  bvStage.querySelectorAll('.bvsp[data-bvsel]').forEach(sl => sl.classList.toggle('on', +sl.dataset.bvsel === bv.sel));
  const bs = bvStage.querySelectorAll('.bvcap > b');
  if(bs.length === 2){ bs[0].classList.toggle('off', bv.sel === 1); bs[1].classList.toggle('off', bv.sel === 0); }
  bvStripMark();
}
function bvTwoSet(on){
  if(!on && bv){ bv.i = bvCur(); bv.sel = null; }
  try{ localStorage.setItem('illum.bv2', on ? '1' : '0'); }catch(e){}
  const c = bv && BOOK.get(bv.id);
  if(c && !bv.choose && !bv.grid) bvDrawStage(c, BVLOAD.get(bv.id));
}
/* every toolbar button says its name the moment the pointer is on it */
function bvTips(){
  bvStage.querySelectorAll('.bvtool .bvtb[title]').forEach(b => {
    b.dataset.tip = b.getAttribute('title'); b.removeAttribute('title'); });
}
/* ---- the strip of small pictures under the stage ---- */
function bvStripHTML(list){
  if(list.length < 2) return '';
  const ext = f => (String(f.name).match(/\.([a-z0-9]{1,5})$/i) || ['', ''])[1];
  const lo = bv.i, hi = bvStage.classList.contains('bvtwo') || bvTwoPref() ? (bv.i + 1) % list.length : bv.i;
  return '<div class="bvstrip" role="listbox" aria-label="All files in this folder">' + list.map((f, i) =>
    '<button type="button" class="bvst" data-bvi="' + i + '" aria-current="' + (i === bv.i) + '" title="' +
      esc(f.name) + '">' + (bvIsPic(f) ? '' : '<span class="bvsti">' + esc(ext(f) || 'file') + '</span>') +
      '<em>' + (i + 1) + '</em></button>').join('') + '</div>';
}
function bvStripMark(){
  const two = !!bvStage.querySelector('.bvspread'), n = bvList().length;
  bvStage.querySelectorAll('.bvst').forEach(b => {
    const i = +b.dataset.bvi;
    b.setAttribute('aria-current', String(i === bv.i || (two && i === (bv.i + 1) % n)));
    b.classList.toggle('sel', i === (two ? bvCur() : bv.i));
  });
  const on = bvStage.querySelector('.bvst[aria-current="true"]');
  if(on) on.scrollIntoView({block: 'nearest', inline: 'nearest'});
}
let bvStripLeft = 0;
function bvStripFill(list, seq){
  const st = bvStage.querySelector('.bvstrip');
  if(!st) return;
  st.scrollLeft = bvStripLeft;
  st.addEventListener('scroll', () => { bvStripLeft = st.scrollLeft; }, {passive: true});
  requestAnimationFrame(bvStripMark);
  (async () => {
    await new Promise(r => setTimeout(r, 60));          // the big picture goes first
    const tiles = [...st.querySelectorAll('.bvst')];
    for(let i = 0; i < list.length; i++){
      if(seq !== bvSeq || !st.isConnected) return;
      const f0 = list[i];
      if(!bvIsPic(f0)) continue;
      let f = f0;
      try{ f = await bvReal(f0); }catch(e){ continue; }
      if(seq !== bvSeq) return;
      if(bvKind(f) === 'heic'){
        if(!BVHEICJ.has(f)){ try{ BVHEICJ.set(f, await bvHeic(f)); }catch(e){ BVHEICJ.set(f, null); } }
        f = BVHEICJ.get(f);
        if(!f) continue;
      }
      const slot = tiles[i];
      if(!slot || slot.querySelector('canvas')) continue;
      await new Promise(res => {
        if(BVTHUMB.has(f)){ bvPutThumb(slot, BVTHUMB.get(f)); res(); return; }
        bvQ.push([f, slot]);
        if(!bvQRun) bvQNext();
        const t0 = Date.now();
        (function wait(){
          if(BVTHUMB.has(f) || Date.now() - t0 > 15000 || seq !== bvSeq) res();
          else setTimeout(wait, 30);
        })();
      });
    }
  })();
}
/* ---- the grid ---- */
function bvGridPref(){ try{ return localStorage.getItem('illum.bvgall') === '1'; }catch(e){ return false; } }
function bvGsz(){
  let n = 170;
  try{ n = +localStorage.getItem('illum.bvgsz') || 170; }catch(e){}
  return Math.max(110, Math.min(320, n));
}
function bvSetGrid(on){
  if(!bv) return;
  bv.grid = !!on;
  try{ localStorage.setItem('illum.bvgall', on ? '1' : '0'); }catch(e){}
  const c = BOOK.get(bv.id);
  if(c && !bv.choose) bvDrawStage(c, BVLOAD.get(bv.id));
}
function bvGsize(d){
  const n = Math.max(110, Math.min(320, bvGsz() + d * 30));
  try{ localStorage.setItem('illum.bvgsz', String(n)); }catch(e){}
  const g = bvStage.querySelector('.bvgall');
  if(g) g.style.setProperty('--bvg', n + 'px');
  const zi = bvStage.querySelector('[data-bvgz="in"]'), zo = bvStage.querySelector('[data-bvgz="out"]');
  if(zi) zi.disabled = n >= 320;
  if(zo) zo.disabled = n <= 110;
}
const bvIsPic = f => { const k = f && bvKind(f); return k === 'img' || k === 'heic'; };
const BVHEICJ = new Map();           // HEIC file -> its JPEG, for the grid's small pictures
function bvDrawGrid(list, seq){
  const old = bvStage.querySelector('.bvgall');
  const keepTop = old ? old.scrollTop : 0;
  const sz = bvGsz();
  const rotBtns = (i) => '<div class="bvgrot">' +
    '<button type="button" data-bvrot="-90" data-bvgi="' + i + '" title="Rotate left" ' +
    'aria-label="Rotate left">' + BVROTLSVG + '</button>' +
    '<button type="button" data-bvrot="90" data-bvgi="' + i + '" title="Rotate right" ' +
    'aria-label="Rotate right">' + BVROTRSVG + '</button></div>';
  const ext = f => (String(f.name).match(/\.([a-z0-9]{1,5})$/i) || ['', ''])[1];
  const cur = list[bv.i];
  bvStage.innerHTML = '<div class="bvgall" style="--bvg:' + sz + 'px" role="listbox" ' +
    'aria-label="Files">' +
    '<div class="bvghint">Drag to change the order \u00b7 double-click to open</div>' +
    list.map((f, i) => {
      const pic = bvIsPic(f), r = bvRot(f);
      return '<div class="bvgt" role="option" draggable="true" data-bvg="' + i + '" ' +
        'aria-current="' + (i === bv.i) + '" title="' + esc(f.name) + '">' +
        '<div class="bvgimg"' + (r ? ' style="--r:' + r + 'deg"' : '') + '>' +
        (pic ? '' : '<div class="bvgic">' + (bvKind(f) === 'vid'
          ? '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>'
          : BVFILESVG) + '<span>' + esc(ext(f)) + '</span></div>') + '</div>' +
        (pic ? rotBtns(i) : '') +
        (f._add && !f._add.pc ? '<i class="bvgpend" title="Added here \u00b7 waiting to be ' +
          'copied to the BOOKING folder"></i>' : '') +
        '<span class="bvgn">' + (i + 1) + '</span>' +
        '<span class="bvgnm">' + esc(f.name) + '</span></div>';
    }).join('') + '</div>' +
    '<div class="bvtool"><span class="bvcount">' + (bv.i + 1) + '/' + list.length + '</span>' +
    '<button type="button" class="bvtb" data-bvmax title="' +
      (bvEl.classList.contains('bvmax') ? 'Restore (Esc)' : 'Maximize') + '" aria-label="' +
      (bvEl.classList.contains('bvmax') ? 'Restore (Esc)' : 'Maximize') + '">' +
      (bvEl.classList.contains('bvmax') ? BVMINSVG : BVMAXSVG) + '</button>' +
    '<button type="button" class="bvtb" data-bvgrid title="Show one at a time (G)" ' +
      'aria-label="Show one at a time">' + BVONESVG + '</button>' +
    '<button type="button" class="bvtb" data-bvrot="-90" title="Rotate left (Shift+R)" ' +
      'aria-label="Rotate left"' + (bvIsPic(cur) ? '' : ' disabled') + '>' + BVROTLSVG + '</button>' +
    '<button type="button" class="bvtb" data-bvrot="90" title="Rotate right (R)" ' +
      'aria-label="Rotate right"' + (bvIsPic(cur) ? '' : ' disabled') + '>' + BVROTRSVG + '</button>' +
    '<button type="button" class="bvtb" data-bvgz="in" title="Larger thumbnails" ' +
      'aria-label="Larger thumbnails"' + (sz >= 320 ? ' disabled' : '') + '>' + BVZINSVG + '</button>' +
    '<button type="button" class="bvtb" data-bvgz="out" title="Smaller thumbnails" ' +
      'aria-label="Smaller thumbnails"' + (sz <= 110 ? ' disabled' : '') + '>' + BVZOUTSVG + '</button>' +
    (DOWN && bv.tab !== '3. VIDEOS' ? '<button type="button" class="bvtb" data-bvpdf ' +
      'title="Make a PDF of the photos in ' + esc(bv.tab.replace(/^\d+\.\s*/, '')) +
      '" aria-label="Make a PDF">' + BVPDFSVG + '</button>' : '') +
    (DOWN ? '<button type="button" class="bvtb" data-bvdl title="Download this file" ' +
      'aria-label="Download this file">' + BVDLSVG + '</button>' : '') + '</div>' +
    '<div class="bvcap"><b>' + esc(cur ? cur.name : '') + '</b><span>' +
      (cur ? bvSize(cur.size) : '') + '</span><em class="bvmsg" role="status">' +
      esc(bvMsgNext) + '</em></div>';
  bvMsgNext = '';
  bvTips();
  bvStage.classList.remove('bvtwo');
  const g = bvStage.querySelector('.bvgall');
  g.scrollTop = keepTop;
  const on = g.querySelector('.bvgt[aria-current="true"]');
  if(on && !keepTop) on.scrollIntoView({block: 'nearest'});
  /* the small pictures arrive one by one, in the order shown */
  (async () => {
    const tiles = [...g.querySelectorAll('.bvgt')];
    for(let i = 0; i < list.length; i++){
      if(seq !== bvSeq) return;
      const f0 = list[i];
      if(!bvIsPic(f0)) continue;
      let f = f0;
      try{ f = await bvReal(f0); }catch(e){ continue; }
      if(seq !== bvSeq) return;
      if(bvKind(f) === 'heic'){
        if(!BVHEICJ.has(f)){ try{ BVHEICJ.set(f, await bvHeic(f)); }catch(e){ BVHEICJ.set(f, null); } }
        f = BVHEICJ.get(f);
        if(!f) continue;
      }
      const slot = tiles[i] && tiles[i].querySelector('.bvgimg');
      if(!slot || slot.querySelector('canvas')) continue;
      await new Promise(res => {
        if(BVTHUMB.has(f)){ bvPutThumb(slot, BVTHUMB.get(f)); res(); return; }
        bvQ.push([f, slot]);
        if(!bvQRun) bvQNext();
        const t0 = Date.now();
        (function wait(){
          if(BVTHUMB.has(f) || Date.now() - t0 > 15000 || seq !== bvSeq) res();
          else setTimeout(wait, 30);
        })();
      });
    }
  })();
}
/* the pick moved: outline, counter, caption and the turn buttons follow it */
function bvGridMark(){
  const g = bvStage.querySelector('.bvgall');
  if(!g) return;
  const list = bvList(), cur = list[bv.i];
  g.querySelectorAll('.bvgt').forEach(t =>
    t.setAttribute('aria-current', String(+t.dataset.bvg === bv.i)));
  const on = g.querySelector('.bvgt[aria-current="true"]');
  if(on) on.scrollIntoView({block: 'nearest'});
  const ct = bvStage.querySelector('.bvcount');
  if(ct) ct.textContent = (bv.i + 1) + '/' + list.length;
  const b = bvStage.querySelector('.bvcap b'), sp = bvStage.querySelector('.bvcap span');
  if(b) b.textContent = cur ? cur.name : '';
  if(sp) sp.textContent = cur ? bvSize(cur.size) : '';
  bvStage.querySelectorAll('.bvtool [data-bvrot]').forEach(x => { x.disabled = !bvIsPic(cur); });
}
function bvRotate(i, d){
  if(!bv) return;
  const list = bvList(), f = list[i];
  if(!bvIsPic(f)) return;
  const t = bvTabArr(bv.id, bv.tab);
  const r = ((((+t.r[f.name] || 0) + d) % 360) + 360) % 360;
  if(r) t.r[f.name] = r; else delete t.r[f.name];
  bvArrSave(bv.id);
  if(bv.grid){
    const slot = bvStage.querySelector('.bvgt[data-bvg="' + i + '"] .bvgimg');
    if(slot) slot.style.setProperty('--r', r + 'deg');
    return;
  }
  bvZ.k = 1; bvZ.x = 0; bvZ.y = 0;
  if(bvStage.querySelector('.bvspread')){ const cc = BOOK.get(bv.id);
    if(cc) bvDrawStage(cc, BVLOAD.get(bv.id)); return; }
  bvZoomApply();
}
/* moves the file at "from" to "to" and keeps the pick on it */
function bvMove(from, to){
  if(!bv) return;
  const list = bvList();
  if(from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return;
  const names = list.map(f => f.name);
  const [m] = names.splice(from, 1);
  names.splice(to, 0, m);
  bvTabArr(bv.id, bv.tab).o = names;
  bvArrSave(bv.id);
  bv.i = to;
  const c = BOOK.get(bv.id);
  if(c) bvDrawStage(c, BVLOAD.get(bv.id));
}
function bvGridCols(){
  const g = bvStage.querySelector('.bvgall');
  const t = g && g.querySelector('.bvgt');
  if(!t) return 1;
  return Math.max(1, Math.round(g.clientWidth / (t.offsetWidth + 14)) ||
    getComputedStyle(g).gridTemplateColumns.split(' ').length);
}
const BVOBJURL = new WeakMap();
function bvMime(n){
  const x = (String(n).match(/\.([a-z0-9]+)$/i) || ['', ''])[1].toLowerCase();
  return ({jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    gif: 'image/gif', heic: 'image/heic', mp4: 'video/mp4', mov: 'video/quicktime',
    pdf: 'application/pdf'})[x] || 'application/octet-stream';
}
/* the address the file can be fetched from as it is: a Dropbox copy or a file added
   here whole come from this page's store; a file from the folder on this computer is
   handed over directly. A file stored in parts has no single address. */
function bvDragURL(f){
  if(!f) return '';
  if(f._rid) return new URL('/_blob/' + encodeURIComponent(f._rid), location.href).href;
  if(f._add) return f._add.w ? '' : new URL('/_blob/' + encodeURIComponent(f._add.i), location.href).href;
  if(typeof File !== 'undefined' && f instanceof Blob){
    if(!BVOBJURL.has(f)) BVOBJURL.set(f, URL.createObjectURL(f));
    return BVOBJURL.get(f);
  }
  return '';
}
const bvDropClear = () => bvStage.querySelectorAll('.dropa,.dropb').forEach(x =>
  x.classList.remove('dropa', 'dropb'));
bvStage.addEventListener('dragstart', e => {
  const t = e.target.closest && e.target.closest('.bvgt');
  if(!t) return;
  bvDragFrom = +t.dataset.bvg; bvDropAt = null;
  t.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  try{ e.dataTransfer.setData('text/plain', String(bvDragFrom)); }catch(err){}
  /* No drag-out to the desktop: the claude.ai frame does not allow a page to start a
     download itself, and Chrome showed such drops as blocked. Files leave through the
     download button, which asks the viewer first. */
});
bvStage.addEventListener('dragover', e => {
  if(bvDragFrom == null) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const g = bvStage.querySelector('.bvgall');
  if(g){
    const gr = g.getBoundingClientRect();
    if(e.clientY < gr.top + 60) g.scrollTop -= 16;
    else if(e.clientY > gr.bottom - 60) g.scrollTop += 16;
  }
  const t = e.target.closest && e.target.closest('.bvgt');
  if(!t) return;
  const r = t.getBoundingClientRect(), after = e.clientX > r.left + r.width / 2;
  const at = +t.dataset.bvg + (after ? 1 : 0);
  if(at === bvDropAt && t.classList.contains(after ? 'dropa' : 'dropb')) return;
  bvDropClear();
  t.classList.add(after ? 'dropa' : 'dropb');
  bvDropAt = at;
});
bvStage.addEventListener('drop', e => {
  if(bvDragFrom == null) return;
  e.preventDefault();
  const from = bvDragFrom;
  let to = bvDropAt;
  bvDragFrom = null; bvDropAt = null;
  bvDropClear();
  if(to == null) return;
  if(to > from) to -= 1;
  bvMove(from, to);
});
bvStage.addEventListener('dragend', () => {
  bvDragFrom = null; bvDropAt = null;
  bvDropClear();
  bvStage.querySelectorAll('.bvgt.dragging').forEach(x => x.classList.remove('dragging'));
});
/* ---- print ----
   The claude.ai frame this page lives in does not allow a print dialog, so a print is
   made as a PDF - one photo to a page, in this folder's order, turned as set here - and
   opened in a tab of its own, where Print offers every printer this computer or phone
   can reach. Where no tab can be opened the PDF is saved instead. */
const bvSay = t => { const m = bvStage.querySelector('.bvmsg'); if(m) m.textContent = t; };
async function bvPrintPdf(pics, title){
  const KOV = LANG === 'ko';
  const J = (await bvLib('mkpdf')).jsPDF;
  let doc = null;
  for(let i = 0; i < pics.length; i++){
    bvSay((KOV ? 'PDF 만드는 중\u2026 ' : 'Making the PDF\u2026 ') + (i + 1) + ' / ' + pics.length);
    const rot = bvRot(pics[i]);
    let src = await bvReal(pics[i]);
    if(bvKind(src) === 'heic') src = await bvHeic(src);
    const bmp = await createImageBitmap(src);
    const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    const dw = Math.round(bmp.width * k), dh = Math.round(bmp.height * k), side = rot % 180 !== 0;
    const cv = document.createElement('canvas');
    cv.width = side ? dh : dw; cv.height = side ? dw : dh;
    const g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    g.translate(cv.width / 2, cv.height / 2);
    if(rot) g.rotate(rot * Math.PI / 180);
    g.drawImage(bmp, -dw / 2, -dh / 2, dw, dh);
    bmp.close && bmp.close();
    const land = cv.width > cv.height, o = land ? 'landscape' : 'portrait';
    if(!doc) doc = new J({orientation: o, unit: 'pt', format: 'a4'}); else doc.addPage('a4', o);
    const W = land ? 842 : 595, H = land ? 595 : 842, M = 24;
    const fit = Math.min((W - 2 * M) / cv.width, (H - 2 * M) / cv.height);
    const w = cv.width * fit, h = cv.height * fit;
    doc.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', (W - w) / 2, (H - h) / 2, w, h);
  }
  try{ doc.setProperties({title: title || 'Print'}); }catch(e){}
  return doc.output('blob');
}
let bvFulling = false;
/* one photo to a full page, in this folder's order and turned as set here - the
   copy for a printer */
async function bvFullPdf(btn){
  if(!bv || bvFulling || !DOWN) return;
  const KOV = LANG === 'ko';
  const pics = bvList().filter(bvIsPic);
  if(!pics.length){ bvSay(KOV ? '이 폴더에는 PDF로 만들 사진이 없습니다'
                              : 'No photos in this folder to put in a PDF'); return; }
  bvFulling = true; btn.classList.add('busy');
  try{
    const c = BOOK.get(bv.id);
    const name = (c ? bvFolderName(c) + ' - ' : '') + bv.tab.replace(/^\d+\.\s*/, '') +
      ' (full page).pdf';
    const blob = await bvPrintPdf(pics, name.replace(/\.pdf$/, ''));
    bvSay(KOV ? '저장 확인 창에서 저장을 누르세요' : 'Confirm the save to get the PDF');
    await DOWN.save({filename: name, data: blob});
    bvSay((KOV ? 'PDF 저장됨 \u2014 ' : 'PDF saved \u2014 ') + pics.length +
      (KOV ? '장, 1장씩' : (pics.length === 1 ? ' photo, one per page' : ' photos, one per page')));
  }catch(e){
    bvSay(e && /declin/i.test(String(e.code || e.message || ''))
      ? (KOV ? '저장을 취소했습니다' : 'Save cancelled')
      : (KOV ? 'PDF를 만들지 못했습니다' : 'The PDF could not be made') +
        (e && e.message ? ' \u2014 ' + e.message : ''));
  }finally{ bvFulling = false; btn.classList.remove('busy'); }
}
/* the PDF button asks which kind */
function bvPdfMenu(open){
  const had = bvStage.querySelector('.bvpdfm');
  if(had) had.remove();
  if(open === false || had) return;
  const btn = bvStage.querySelector('[data-bvpdf]');
  if(!btn || btn.classList.contains('busy')) return;
  const m = document.createElement('div');
  m.className = 'bvpdfm';
  m.setAttribute('role', 'menu');
  m.innerHTML = '<button type="button" role="menuitem" data-bvpdfk="2"><b>2 per page with details</b>' +
    '<span>Name and measurements on top \u2014 for clients</span></button>' +
    '<button type="button" role="menuitem" data-bvpdfk="1"><b>1 per page, full size</b>' +
    '<span>Each photo fills an A4 page \u2014 for printing</span></button>';
  const sr = bvStage.getBoundingClientRect(), br = btn.getBoundingClientRect();
  m.style.top = Math.max(8, br.top - sr.top) + 'px';
  m.style.right = (sr.right - br.left + 8) + 'px';
  bvStage.appendChild(m);
  if(LANG !== 'en') try{ langWalk(m); }catch(e){}
  const first = m.querySelector('button'); if(first) first.focus();
}
/* ---- adding files by dropping or pasting them onto the viewer ---- */
let bvAdding = false;
async function bvFlatten(ens, plain){
  if(!ens.some(e => e && e.isDirectory)) return plain;
  const out = [];
  for(const en of ens){
    if(en.isFile){ try{ out.push(await entryFile(en)); }catch(e){} }
    else if(en.isDirectory){
      const got = [], guard = {n: 0};
      await dirWalk(en, '', got, guard);
      for(const g of got) if(g.file && !/^\./.test(g.file.name)) out.push(g.file);
    }
  }
  return out.length ? out : plain;
}
async function bvAddFiles(files){
  if(!bv || !files || !files.length) return;
  const KOV = LANG === 'ko';
  if(bvAdding){ bvSay(KOV ? '앞의 파일을 아직 추가하는 중입니다' : 'Still adding the last files'); return; }
  if(!SIGNED()){ bvSay(KOV ? '파일을 추가하려면 먼저 로그인하세요' : 'Sign in to add files'); return; }
  if(!ASSETS || !DB){
    bvSay(KOV ? '이 화면에서는 파일을 저장할 수 없습니다 (보기 전용)'
              : 'This view cannot store files (view only)');
    return;
  }
  const id = bv.id, tab = bv.tab;
  if(!BOOK.get(id)) return;
  bvAdding = true;
  const taken = new Set(bvList().map(f => String(f.name).toLowerCase()));
  const added = [];
  let failed = '';
  for(let k = 0; k < files.length; k++){
    let f = files[k];
    let nm = String(f.name || 'file').replace(/[\\/:*?"<>|]/g, '_').slice(0, 120) || 'file';
    if(taken.has(nm.toLowerCase())){
      const m = nm.match(/^(.*?)(\.[^.]*)?$/), base = m[1], ext = m[2] || '';
      let j = 2;
      while(taken.has((base + ' (' + j + ')' + ext).toLowerCase())) j++;
      nm = base + ' (' + j + ')' + ext;
    }
    taken.add(nm.toLowerCase());
    if(nm !== f.name) f = new File([f], nm, {type: f.type, lastModified: f.lastModified});
    bvSay((KOV ? '추가하는 중\u2026 ' : 'Adding\u2026 ') + (k + 1) + ' / ' + files.length + ' \u2014 ' + nm);
    try{
      const rec = await attPut(f, f.size > 19.5 * 1024 * 1024 ? 2 : 1);
      const row = {tab: tab, n: nm, s: f.size || 0, t: f.type || rec.t || '', i: rec.i,
                   at: new Date().toISOString(), by: ME || '', pc: 0};
      if(rec.w) row.w = rec.w;
      if(rec.ids) row.ids = rec.ids;
      added.push(row);
    }catch(err){ failed = nm + (err && err.message ? ' (' + err.message + ')' : ''); }
  }
  let saved = false;
  if(added.length){
    let rows = null;
    try{
      const d = docOf(await DB.doc('bvadd/' + id).get());
      rows = (d && Array.isArray(d.e)) ? d.e : [];
    }catch(e){ rows = (BVADD.get(id) || []).slice(); }
    rows = rows.concat(added);
    LIVE.add.set(id, Date.now());
    try{ await DB.doc('bvadd/' + id).set({e: rows, at: Date.now()}); saved = true; }
    catch(e){ failed = failed || (KOV ? '목록 저장 실패' : 'the list could not be saved'); }
    BVADD.set(id, rows);
  }
  bvAdding = false;
  if(!bv || bv.id !== id) return;
  if(added.length && bv.tab === tab){
    const L = bvList();
    const j = L.findIndex(f => f._add && f._add.i === added[0].i);
    if(j >= 0) bv.i = j;
  }
  bvMsgNext = added.length
    ? (KOV ? added.length + '개 추가됨 \u00b7 노란 점 = BOOKING 폴더로 복사 대기'
           : added.length + ' added \u00b7 yellow dot = waiting to be copied to the BOOKING folder') +
      (failed ? (KOV ? ' \u00b7 실패: ' : ' \u00b7 failed: ') + failed : '') +
      (saved ? '' : (KOV ? ' \u00b7 다른 사람에게는 아직 안 보임' : ' \u00b7 not yet visible to others'))
    : (KOV ? '추가하지 못했습니다: ' : 'Could not add: ') + failed;
  bvDraw();
}
bvStage.addEventListener('dragover', e => {
  if(bvDragFrom != null || !bv || bv.choose) return;
  const dt = e.dataTransfer;
  if(!dt || ![...(dt.types || [])].includes('Files')) return;
  e.preventDefault();
  dt.dropEffect = 'copy';
  bvStage.dataset.drop = (LANG === 'ko' ? bv.tab + ' 폴더에 추가하려면 놓으세요'
                                         : 'Drop to add to ' + bv.tab);
  bvStage.classList.add('bvdropin');
});
bvStage.addEventListener('dragleave', e => {
  if(!e.relatedTarget || !bvStage.contains(e.relatedTarget)) bvStage.classList.remove('bvdropin');
});
bvStage.addEventListener('drop', e => {
  bvStage.classList.remove('bvdropin');
  if(bvDragFrom != null || !bv || bv.choose) return;
  const dt = e.dataTransfer;
  if(!dt) return;
  const plain = dt.files ? [...dt.files] : [];
  const ens = dropEntries(dt);
  if(!plain.length && !ens.length) return;
  e.preventDefault();
  bvFlatten(ens, plain).then(bvAddFiles);
});
/* a pasted screenshot or copied file lands in the open folder; this runs before the
   booking page's own paste handler so it cannot become a card photo by accident */
document.addEventListener('paste', e => {
  if(!bv || bvEl.hidden || bv.choose) return;
  const ae = document.activeElement;
  if(ae && (/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) || ae.isContentEditable)) return;
  const fs = [];
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  for(const it of ((e.clipboardData && e.clipboardData.items) || [])){
    if(it.kind !== 'file') continue;
    let f = it.getAsFile();
    if(!f) continue;
    if(/^image\.(png|jpe?g|gif|webp)$/i.test(f.name || '') || !f.name){
      const ext = ((f.type || '').split('/')[1] || 'png').replace('jpeg', 'jpg');
      f = new File([f], 'pasted-' + stamp + (fs.length ? '-' + (fs.length + 1) : '') + '.' + ext,
                   {type: f.type});
    }
    fs.push(f);
  }
  if(!fs.length) return;
  e.preventDefault(); e.stopPropagation();
  if(e.stopImmediatePropagation) e.stopImmediatePropagation();
  bvAddFiles(fs);
}, true);
bvStage.addEventListener('dblclick', e => {
  const t = e.target.closest && e.target.closest('.bvgt');
  if(!t || e.target.closest('[data-bvrot]')) return;
  bv.i = +t.dataset.bvg;
  bvSetGrid(false);
});
bvEl.addEventListener('click', e => {
  if(e.target === bvEl){ bvClose(); return; }
  const t = e.target.closest ? e.target : null;
  if(!t) return;
  if(t.closest('.bvx')){ bvClose(); return; }
  if(t.closest('[data-bvpick]')){
    /* the BOOKING folder picked once this visit already holds every model's folder */
    const c = BOOK.get(bv.id);
    if(c && !t.closest('[data-bvnew]') && window.illu && window.illu.bookingFiles){ bvOpenSrc(c, 'pc'); return; }
    const got = (c && BVROOT && !t.closest('[data-bvnew]')) ? bvSort(c, BVROOT) : null;
    if(got){
      BVLOAD.set(c.id, got);
      bv.tab = BVFOLD.find(x => (got.groups.get(x) || []).length) || BVFOLD[0];
      bv.i = 0; bv.choose = false;
      bvDraw();
      return;
    }
    bvInput.click(); return;
  }
  const lg = t.closest('[data-bvlang]');
  if(lg){
    const want = lg.dataset.bvlang === 'ko' ? 'ko' : 'en';
    if(lg.dataset.bvlang === 'more'){ langPick(); return; }
    if(LANG !== want) setLang(want);
    bvEl.querySelectorAll('[data-bvlang]').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.bvlang === LANG)));
    if(bv.choose) bvDraw(); else bvSideRefresh(true);
    if(bv.view === 'm'){ const cc = BOOK.get(bv.id); if(cc) bvMdStage(cc); }
    return;
  }
  const rfb = t.closest('[data-bvrefresh]');
  if(rfb){ bvRefresh(rfb); return; }
  if(t.closest('[data-bvdbx]')){
    const c = BOOK.get(bv.id);
    if(c) bvOpenSrc(c, 'dbx');
    return;
  }
  if(t.closest('[data-bvkeep]')){ bv.choose = false; bvDraw(); return; }
  if(t.closest('[data-bvmax]')){ bvMaxSet(!bvEl.classList.contains('bvmax')); return; }
  const zb = t.closest('[data-bvzoom]');
  if(zb){ bvZoomTo(zb.dataset.bvzoom === 'in' ? bvZ.k * 1.5 : bvZ.k / 1.5); return; }
  if(t.closest('[data-bvpdf]')){ bvPdfMenu(); return; }
  if(t.closest('[data-bvdl]')){
    const L = bvList(), nn = L.length;
    const both = bv.sel == null && !bv.grid && nn > 1 && bvStage.querySelector('.bvspread');
    const pick = both ? [L[bv.i], L[(bv.i + 1) % nn]] : [L[bvCur()]];
    if(DOWN) (async () => { for(const f0 of pick){ if(!f0) continue;
      try{ const f = await bvReal(f0); await DOWN.save({filename: f.name, data: f}); }catch(e){} } })();
    return;
  }
  const tab = t.closest('[data-bvtab]');
  if(tab){ bv.tab = tab.dataset.bvtab; bv.i = 0; if(bv.view === 'm') bv.view = 'p'; bvDraw(); return; }
  const pk = t.closest('[data-bvpdfk]');
  if(pk){
    const btn = bvStage.querySelector('[data-bvpdf]');
    bvPdfMenu(false);
    if(btn){ if(pk.dataset.bvpdfk === '1') bvFullPdf(btn); else bvMakePdf(btn); }
    return;
  }
  if(!t.closest('.bvpdfm')) bvPdfMenu(false);
  if(t.closest('[data-bvgrid]')){ bvSetGrid(!bv.grid); return; }
  const rb = t.closest('[data-bvrot]');
  if(rb){
    if(rb.disabled) return;
    if(rb.dataset.bvgi != null){ bvRotate(+rb.dataset.bvgi, +rb.dataset.bvrot); return; }
    const nn = bvList().length;
    if(bv.sel == null && !bv.grid && nn > 1 && bvStage.querySelector('.bvspread')){
      const a = bv.i, b2 = (bv.i + 1) % nn, dd = +rb.dataset.bvrot;
      Promise.resolve(bvRotate(a, dd)).then(() => bvRotate(b2, dd));
      return;
    }
    bvRotate(bvCur(), +rb.dataset.bvrot); return; }
  const gz = t.closest('[data-bvgz]');
  if(gz){ bvGsize(gz.dataset.bvgz === 'in' ? 1 : -1); return; }
  const gt = t.closest('[data-bvg]');
  if(gt){ bv.i = +gt.dataset.bvg; bvGridMark(); return; }
  const th = t.closest('[data-bvi]');
  const spk = t.closest('.bvsp[data-bvsel]');
  if(spk && t.closest('img, canvas, video, .bvfile')){ bvPick(+spk.dataset.bvsel); return; }
  if(th){ bv.i = +th.dataset.bvi; bv.sel = null; const cc = BOOK.get(bv.id);
           if(cc) bvDrawStage(cc, BVLOAD.get(bv.id)); return; }
  if(t.closest('[data-bv2]')){ bvTwoSet(!bvTwoPref()); return; }
  const st = t.closest('[data-bvstep]');
  if(st){ bvStep(+st.dataset.bvstep); return; }
});
document.addEventListener('keydown', e => {
  if(!bv || bvEl.hidden) return;
  if(e.key === 'Escape'){
    e.preventDefault();
    const big = bvEl.querySelector('.mdbig');
    if(big){ big.remove(); return; }
    if(bvStage.querySelector('.bvpdfm')){ bvPdfMenu(false); return; }
    if(bvEl.classList.contains('bvmax')) bvMaxSet(false); else bvClose();
    return;
  }
  if(e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  if(e.target && e.target.tagName === 'VIDEO') return;
  if((e.key === '+' || e.key === '=') && bvPhotoEl()){ e.preventDefault(); bvZoomTo(bvZ.k * 1.5); return; }
  if((e.key === '-' || e.key === '_') && bvPhotoEl()){ e.preventDefault(); bvZoomTo(bvZ.k / 1.5); return; }
  if(e.key === '0' && bvPhotoEl()){ e.preventDefault(); bvZoomTo(1); return; }
  if(bv.choose) return;
  if(!e.ctrlKey && !e.metaKey && !e.altKey){
    if(e.key === 'g' || e.key === 'G'){ e.preventDefault(); bvSetGrid(!bv.grid); return; }
    if(e.key === '2' && !bv.grid){ e.preventDefault(); bvTwoSet(!bvTwoPref()); return; }
    if(e.key === 'r' || e.key === 'R'){ e.preventDefault(); bvRotate(bv.grid ? bv.i : bvCur(), e.shiftKey ? -90 : 90); return; }
  }
  if(bv.grid && bvStage.querySelector('.bvgall')){
    if(e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')){
      e.preventDefault(); bvMove(bv.i, bv.i + (e.key === 'ArrowRight' ? 1 : -1)); return;
    }
    if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
      e.preventDefault();
      const j = bv.i + (e.key === 'ArrowDown' ? 1 : -1) * bvGridCols();
      if(j >= 0 && j < bvList().length){ bv.i = j; bvGridMark(); }
      return;
    }
    if(e.key === 'Enter'){ e.preventDefault(); bvSetGrid(false); return; }
  }
  if(e.key === 'ArrowRight'){ e.preventDefault(); bvStep(1); }
  else if(e.key === 'ArrowLeft'){ e.preventDefault(); bvStep(-1); }
});
bvStage.addEventListener('wheel', e => {
  const el = bvPhotoEl();
  if(!el) return;
  e.preventDefault();
  bvZoomTo(bvZ.k * (e.deltaY < 0 ? 1.18 : 1 / 1.18), e.clientX, e.clientY);
}, {passive: false});
bvStage.addEventListener('dblclick', e => {
  const sp = e.target.closest && e.target.closest('.bvsp[data-bvsel]');
  if(sp){ bvPick(+sp.dataset.bvsel, true); bvTwoSet(false); return; }
  const el = bvPhotoEl();
  if(!el || !el.contains(e.target)) return;
  bvZoomTo(bvZ.k > 1 ? 1 : 2.5, e.clientX, e.clientY);
});
/* dragging a zoomed photo moves it about */
(function(){
  let drag = null;
  bvStage.addEventListener('pointerdown', e => {
    const el = bvPhotoEl();
    if(!el || bvZ.k <= 1 || !el.contains(e.target)) return;
    drag = {x: e.clientX, y: e.clientY, bx: bvZ.x, by: bvZ.y, id: e.pointerId};
    try{ el.setPointerCapture(e.pointerId); }catch(err){}
    el.classList.add('bvgrab');
    e.preventDefault();
  });
  bvStage.addEventListener('pointermove', e => {
    if(!drag || e.pointerId !== drag.id) return;
    const el = bvPhotoEl();
    if(!el){ drag = null; return; }
    bvZ.x = drag.bx + e.clientX - drag.x; bvZ.y = drag.by + e.clientY - drag.y;
    bvZoomClamp(el); bvZoomApply();
  });
  const end = () => { if(!drag) return; drag = null;
    const el = bvPhotoEl(); if(el) el.classList.remove('bvgrab'); };
  bvStage.addEventListener('pointerup', end);
  bvStage.addEventListener('pointercancel', end);
})();
/* a sideways swipe on a phone moves through the pictures */
(function(){
  let x0 = null, y0 = 0;
  bvStage.addEventListener('pointerdown', e => {
    if(e.pointerType === 'mouse' || bvZ.k > 1) return;
    x0 = e.clientX; y0 = e.clientY;
  });
  bvStage.addEventListener('pointerup', e => {
    if(x0 == null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    x0 = null;
    if(Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) bvStep(dx < 0 ? 1 : -1);
  });
})();
