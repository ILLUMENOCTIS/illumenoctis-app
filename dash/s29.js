
/* ================= Model details: print, or save as one PDF =================
   Page 1 is the model: photograph, figures, profile, mother agency, booking, every
   measurement on the sheet and the ring sizes. Page 2 is the Measurement Detail sheet
   itself, drawings and hand / foot photographs. Printing goes to the computer's own
   printer through the browser's print window; the PDF is the same two pages. */
const MPCSS = `
.mp{box-sizing:border-box;width:794px;padding:38px 42px 30px;background:#fff;color:#1E2433;font-family:"IBM Plex Sans","Segoe UI","Malgun Gothic","Apple SD Gothic Neo",Arial,sans-serif;font-size:11.5px;line-height:1.35}
.mp *{box-sizing:border-box}
.mp a{color:inherit;text-decoration:none}
.mphd{display:flex;gap:18px;align-items:flex-start;padding-bottom:14px;border-bottom:2px solid #1C2B4A}
.mpph{width:96px;height:124px;border-radius:6px;background:#EEF0F4;flex:none;overflow:hidden;display:flex;align-items:center;justify-content:center;color:#8A90A0;font-size:26px;font-weight:600}
.mpph img{width:100%;height:100%;object-fit:cover;display:block}
.mpwho{flex:1;min-width:0}
.mpk{font-size:9px;letter-spacing:.22em;color:#8A90A0;text-transform:uppercase;font-weight:600}
.mpnm{font-size:28px;font-weight:600;letter-spacing:.01em;margin:4px 0 2px;color:#1C2B4A}
.mpag{font-size:12.5px;color:#5A2C57;font-weight:600;letter-spacing:.06em;text-transform:uppercase}
.mploc{font-size:12px;color:#5D6575;margin-top:2px}
.mpst{display:inline-block;margin-top:8px;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;background:#F3E9F2;color:#5A2C57}
.mpdate{font-size:10px;color:#8A90A0;text-align:right;white-space:nowrap}
.mpfig{display:grid;grid-template-columns:repeat(4,1fr);margin:14px 0 4px;border:1px solid #DCE3EC;border-radius:8px;overflow:hidden}
.mpfig div{padding:8px 10px;border-left:1px solid #DCE3EC;text-align:center}
.mpfig div:first-child{border-left:0}
.mpfig i{display:block;font-style:normal;font-size:8.5px;letter-spacing:.16em;color:#8A90A0;text-transform:uppercase}
.mpfig b{display:block;font-size:15px;font-weight:600;color:#1C2B4A;margin-top:2px}
.mpcols{column-count:2;column-gap:22px;margin-top:10px}
.mpsec{break-inside:avoid;margin:0 0 12px;border:1px solid #DCE3EC;border-radius:8px;overflow:hidden}
.mpsec h4{margin:0;padding:5px 10px;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;background:#F1F4F8;color:#3A465E}
.mpsec.fb h4{background:#E1EDF8;color:#1F4E79}.mpsec.ub h4{background:#F3E2EE;color:#7A2E5C}
.mpsec.ah h4,.mpsec.ring h4{background:#DFF1EF;color:#1F6B67}.mpsec.ft h4{background:#EAE6F6;color:#4B3F8A}
.mpr{display:flex;align-items:baseline;gap:8px;padding:4px 10px;border-top:1px solid #F1F3F7}
.mpr:first-of-type{border-top:0}
.mpr dt{flex:0 0 38%;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#8A90A0}
.mpr dd{margin:0;flex:1;min-width:0;font-size:11.5px;color:#1E2433}
.mpr .no{color:#B4BAC6}
.mpn{display:inline-flex;gap:2px;margin-right:6px}
.mpn i{font-style:normal;min-width:15px;height:15px;padding:0 3px;border-radius:8px;background:#2F6DB5;color:#fff;font-size:8.5px;font-weight:700;display:inline-flex;align-items:center;justify-content:center}
.mpv{margin-left:auto;font-weight:600;color:#1C2B4A}
.mpv s{text-decoration:none;font-weight:400;color:#8A90A0;font-size:9.5px;margin-left:3px}
.mpring{display:grid;grid-template-columns:1fr 60px 60px;padding:2px 10px 6px}
.mpring span{padding:3px 0;border-top:1px solid #F1F3F7}
.mpring .h{border-top:0;font-size:8.5px;letter-spacing:.12em;color:#8A90A0;text-transform:uppercase;text-align:center}
.mpring .c{text-align:center;font-weight:600}
.mpft{margin-top:6px;padding-top:8px;border-top:1px solid #DCE3EC;display:flex;justify-content:space-between;font-size:9px;letter-spacing:.14em;color:#8A90A0;text-transform:uppercase}
`;
function mpEsc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[ch]); }
/* the details panel, read as rows: [section title, [[label, value html]...]] */
function mpDetailRows(c){
  const box = document.createElement('div');
  box.innerHTML = bvDetailed(c);
  box.querySelectorAll('button,.bkuseg,.bvpuni,input,svg').forEach(x => x.remove());
  const out = [];
  let cur = null;
  for(const el of box.querySelectorAll('h4, .bvpr')){
    if(el.tagName === 'H4'){ cur = [el.textContent.trim(), []]; out.push(cur); continue; }
    if(!cur){ cur = ['', []]; out.push(cur); }
    const dt = el.querySelector('dt'), dd = el.querySelector('dd');
    if(!dt || !dd) continue;
    dd.querySelectorAll('a').forEach(a => { a.textContent = a.textContent.replace(/\s*↗\s*$/, ''); });
    cur[1].push([dt.textContent.trim(), dd.innerHTML]);
  }
  return out.filter(s => s[1].length);
}
function mpPage1(c, photo){
  const n = v => (v == null || String(v).trim() === '') ? '' : String(v);
  const lu = bkLU(c), wu = bkWU(c);
  const num = v => { const x = parseFloat(v); return isNaN(x) ? null : x; };
  const len = v => { const x = num(v); return x == null ? '' : (lu === 'in' ? cmToIn(x) : x); };
  const g = c.g === 'M' ? 'M' : 'F';
  const bwh = [c.bu, c.wa, c.hp].some(v => num(v) != null) ? [c.bu, c.wa, c.hp].map(v => len(v) === '' ? '–' : len(v)).join(' – ') + ' ' + lu : '–';
  const kg = num(c.wt);
  const fig = [['Height', num(c.ht) != null ? len(c.ht) + ' ' + lu : '–'], [(g === 'M' ? 'C' : 'B') + ' – W – H', bwh],
    ['Shoes', num(c.eu) != null ? c.eu + ' EU' : (n(c.us) ? c.us + ' US' : '–')],
    ['Weight', kg != null ? (wu === 'lb' ? Math.round(kg / 0.45359237) + ' lb' : kg + ' kg') : '–']];
  const st = (BKST.find(x => x[0] === bkStOf(c)) || [])[1] || '';
  const ini = String(c.nm || '?').trim().split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
  const sec = (cls, title, rows) => '<section class="mpsec ' + cls + '"><h4>' + mpEsc(bvT(title)) + '</h4><dl style="margin:0">' + rows + '</dl></section>';
  const det = mpDetailRows(c).filter(([t]) => !/^(figures|measurements)$/i.test(t))
    .map(([t, rows]) => sec('', t, rows.map(([k, v]) => '<div class="mpr"><dt>' + mpEsc(k) + '</dt><dd>' + (v && v.replace(/<[^>]+>/g, '').trim() ? v : '<span class="no">–</span>') + '</dd></div>').join(''))).join('');
  const md = bvMdRows(c).map(([key, title, rows]) => sec(key, title, rows.map(([nums, nm, v, u]) =>
    '<div class="mpr"><dd style="display:flex;align-items:center"><span class="mpn">' + nums.map(x => '<i>' + x + '</i>').join('') + '</span>' + mpEsc(bvT(nm)) +
    '<span class="mpv">' + (v ? mpEsc(v) + '<s>' + mpEsc(u) + '</s>' : '<span class="no">–</span>') + '</span></dd></div>').join(''))).join('');
  const rg = (c.ring && typeof c.ring === 'object') ? c.ring : {};
  const RF = [['t', 'Thumb'], ['i', 'Index'], ['m', 'Middle'], ['r', 'Ring'], ['p', 'Little']];
  const ru = ({us: 'US', eu: 'EU', jp: 'JP', uk: 'UK', mm: 'mm'})[c.ringu] || 'US';
  const ring = sec('ring', bvT('Ring size') + ' (' + ru + ')', '<div class="mpring"><span class="h"></span><span class="h">' + mpEsc(bvT('Left')) + '</span><span class="h">' + mpEsc(bvT('Right')) + '</span>' +
    RF.map(([k, l]) => '<span>' + mpEsc(bvT(l)) + '</span><span class="c">' + mpEsc((rg.L || {})[k] || '–') + '</span><span class="c">' + mpEsc((rg.R || {})[k] || '–') + '</span>').join('') + '</div>');
  const day = new Date(); const dd = String(day.getDate()).padStart(2, '0') + '/' + String(day.getMonth() + 1).padStart(2, '0') + '/' + day.getFullYear();
  return '<div class="mp">' +
    '<div class="mphd"><div class="mpph">' + (photo ? '<img src="' + mpEsc(photo) + '" alt=""/>' : mpEsc(ini)) + '</div>' +
      '<div class="mpwho"><div class="mpk">' + mpEsc(bvT('Model details')) + '</div><div class="mpnm">' + mpEsc(c.nm || '') + '</div>' +
        (c.ag ? '<div class="mpag">' + mpEsc(c.ag) + '</div>' : '') +
        '<div class="mploc">' + mpEsc([c.city, c.country].filter(Boolean).join(', ')) + '</div>' +
        (st ? '<span class="mpst">' + mpEsc(bvT(st)) + '</span>' : '') + '</div>' +
      '<div class="mpdate">' + mpEsc(dd) + '</div></div>' +
    '<div class="mpfig">' + fig.map(([k, v]) => '<div><i>' + mpEsc(bvT(k)) + '</i><b>' + mpEsc(v) + '</b></div>').join('') + '</div>' +
    '<div class="mpcols">' + det + md + ring + '</div>' +
    '<div class="mpft"><span>Illuménoctis</span><span>' + mpEsc(c.nm || '') + (c.ag ? ' · ' + mpEsc(c.ag) : '') + '</span></div></div>';
}
async function mpPhoto(c){
  const src = (function(){ try{ return bkPhoto(c); }catch(e){ return ''; } })();
  if(!src) return '';
  if(/^data:/.test(src)) return src;
  if(!/^\/_blob\//.test(src) && !/^blob:/.test(src)) return '';   // an agency's own server cannot be read from here
  /* only a real picture: a photo that cannot be read leaves the initials, not a broken image */
  try{ const du = await bvDataURL(src); return /^data:image\//.test(du) ? du : ''; }catch(e){ return ''; }
}
/* page 1 laid out at A4 width; if it runs long it is scaled down to fit one page */
function mpMeasure(html){
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;visibility:hidden';
  host.innerHTML = '<style>' + MPCSS + '</style>' + html;
  document.body.appendChild(host);
  const hgt = host.querySelector('.mp').getBoundingClientRect().height;
  host.remove();
  return Math.min(1, 1123 / Math.max(1, hgt));
}
async function mpPage1Png(c){
  const photo = await mpPhoto(c);
  const html = mpPage1(c, photo), k = mpMeasure(html);
  const holder = document.createElement('div');
  holder.innerHTML = '<style>' + MPCSS + '</style><div style="width:794px;height:1123px;background:#fff;overflow:hidden"><div style="zoom:' + k + '">' + html + '</div></div>';
  const xhtml = new XMLSerializer().serializeToString(holder);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123"><foreignObject x="0" y="0" width="794" height="1123">' + xhtml + '</foreignObject></svg>';
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('page 1 could not be drawn')); img.src = url; });
  const S = 2, cv = document.createElement('canvas'); cv.width = 794 * S; cv.height = 1123 * S;
  const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
  return {cv, html, k, photo};
}
async function mpSheetPng(c){
  const [svg, W, H] = await bvMdSheetSvg(c);
  const url = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml'}));
  try{
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('the sheet could not be drawn')); img.src = url; });
    const S = 2, cv = document.createElement('canvas'); cv.width = W * S; cv.height = H * S;
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
    return {cv, W, H};
  } finally { URL.revokeObjectURL(url); }
}
function mpSay(t, ms){
  let el = document.querySelector('.mpsay');
  if(!el){ el = document.createElement('div'); el.className = 'mpsay'; document.body.appendChild(el); }
  el.textContent = t; clearTimeout(mpSay.t);
  mpSay.t = setTimeout(() => el.remove(), ms || 2600);
}
let mpBusy = false;
async function mpPdf(c){
  if(mpBusy || !c) return; mpBusy = true;
  const KOV = LANG === 'ko';
  mpSay(KOV ? 'PDF 만드는 중…' : 'Making the PDF…', 60000);
  try{
    const [p1, p2] = await Promise.all([mpPage1Png(c), mpSheetPng(c)]);
    const J = (await bvLib('mkpdf')).jsPDF;
    const doc = new J({orientation: 'portrait', unit: 'pt', format: 'a4'});
    doc.addImage(p1.cv.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 595.28, 841.89);
    doc.addPage('a4', 'landscape');
    const pw = 841.89, ph = 595.28, m = 18, fit = Math.min((pw - 2 * m) / p2.W, (ph - 2 * m) / p2.H);
    doc.addImage(p2.cv.toDataURL('image/jpeg', 0.92), 'JPEG', (pw - p2.W * fit) / 2, (ph - p2.H * fit) / 2, p2.W * fit, p2.H * fit);
    const base = (bvFolderName(c) || c.nm || 'model') + ' - ' + (KOV ? '모델 상세' : 'Model Details');
    try{ doc.setProperties({title: base}); }catch(e){}
    const blob = doc.output('blob');
    if(!DOWN) throw Object.assign(new Error('no downloads'), {code: 'nodown'});
    mpSay(KOV ? '저장 확인 창에서 저장을 누르세요' : 'Confirm the save…', 60000);
    await DOWN.save({filename: base + '.pdf', data: blob});
    mpSay(KOV ? 'PDF로 저장됨' : 'Saved as PDF');
  }catch(e){
    const msg = String((e && (e.code || e.message)) || '');
    mpSay(/declin|cancel/i.test(msg) ? (KOV ? '취소됨' : 'Cancelled') : (KOV ? 'PDF를 만들지 못했습니다' : 'The PDF could not be made'), 3600);
  }finally{ mpBusy = false; }
}
async function mpPrint(c){
  if(mpBusy || !c) return; mpBusy = true;
  const KOV = LANG === 'ko';
  mpSay(KOV ? '인쇄 준비 중…' : 'Getting the pages ready…', 60000);
  try{
    const photo = await mpPhoto(c);
    const html = mpPage1(c, photo), k = mpMeasure(html);
    const [svg] = await bvMdSheetSvg(c);
    let root = document.getElementById('mdprint');
    if(root) root.remove();
    root = document.createElement('div'); root.id = 'mdprint';
    root.innerHTML = '<style>' + MPCSS + '</style>' +
      '<div class="mppg"><div style="width:794px;zoom:' + (k * 0.995).toFixed(4) + '">' + html + '</div></div>' +
      '<div class="mppg land"><img alt="" src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) + '"></div>';
    document.body.appendChild(root);
    await Promise.all([...root.querySelectorAll('img')].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
    const clear = () => { const r = document.getElementById('mdprint'); if(r) r.remove(); removeEventListener('afterprint', clear); };
    addEventListener('afterprint', clear);
    document.querySelector('.mpsay') && document.querySelector('.mpsay').remove();
    window.print();
    setTimeout(() => { if(!matchMedia('print').matches) clear(); }, 1500);
  }catch(e){
    mpSay(KOV ? '인쇄 창을 열 수 없습니다 — PDF로 저장한 뒤 인쇄하세요' : 'The print window could not open here — save as PDF and print that', 5000);
  }finally{ mpBusy = false; }
}
/* the two buttons sit in the side panel's header, in every view */
const MPPRN = '<svg viewBox="0 0 24 24"><path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/></svg>';
const MPPDF = '<svg viewBox="0 0 24 24"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/><path d="M9 14h6M9 17h4"/></svg>';
function mpButtons(){
  const hd = bvSide && bvSide.querySelector('.bvsh');
  if(!hd || hd.querySelector('.mpbtns') || bvSide.classList.contains('bvside--note')) return;
  const ko = LANG === 'ko';
  const box = document.createElement('span'); box.className = 'mpbtns';
  box.innerHTML = '<button type="button" class="mpbtn" data-mprint title="' + (ko ? '모델 상세 인쇄' : 'Print the model details') + '" aria-label="Print">' + MPPRN + '</button>' +
    (DOWN ? '<button type="button" class="mpbtn" data-mpdf title="' + (ko ? '모델 상세를 PDF로 저장' : 'Save the model details as a PDF') + '" aria-label="Save as PDF">' + MPPDF + 'PDF</button>' : '');
  const w = hd.querySelector('.bvsw');
  if(w) hd.insertBefore(box, w); else hd.appendChild(box);
}
new MutationObserver(mpButtons).observe(bvSide, {childList: true});
try{ mpButtons(); }catch(e){}
document.addEventListener('click', e => {
  const p = e.target.closest && e.target.closest('[data-mprint],[data-mpdf]');
  if(!p) return;
  e.preventDefault(); e.stopPropagation();
  const c = bv && BOOK.get(bv.id); if(!c) return;
  if(p.hasAttribute('data-mpdf')) mpPdf(c); else mpPrint(c);
}, true);
