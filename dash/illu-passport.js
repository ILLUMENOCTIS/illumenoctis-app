/* ==================== 1.2.140: the passport on the booking card's Profile ====================
   Passport number, issued and expires typed here (the contract's Model part and the visa read them), and
   "Read the passport": the newest picture in her 4. PASSPORT folder is read on this computer (illu-mrz.js +
   vendor/tess). Nothing is filled in by itself - what was read is shown line by line; Use these puts the ticked
   lines on her card. */
(function(){
  const isKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const L = (en, ko) => isKO() ? ko : en;
  const H = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const RD = new Map();            // card id -> {busy, err, r, file}
  const IMG = /\.(jpe?g|png|webp|bmp|tiff?|heic)$/i;
  const VD = (() => { try{ return new URL('../vendor/tess/', document.currentScript ? document.currentScript.src : location.href).href; }catch(e){ return '../vendor/tess/'; } })();
  let T = null, W = null;
  function loadLib(){
    if(T) return T;
    T = new Promise((ok, no) => { if(window.Tesseract) return ok(window.Tesseract); const s = document.createElement('script'); s.src = VD + 'tesseract.min.js'; s.onload = () => ok(window.Tesseract); s.onerror = () => no(new Error('reader missing')); document.head.appendChild(s); });
    return T;
  }
  async function worker(){
    if(W) return W;
    const TS = await loadLib();
    W = TS.createWorker('eng', 1, {workerPath: VD + 'worker.min.js', corePath: VD, langPath: VD.replace(/\/$/, ''), gzip: true, cacheMethod: 'none', workerBlobURL: false});
    return W;
  }
  /* the bottom part of the page, larger and in grey, for the two lines */
  async function bottomOf(blob){
    const bm = await createImageBitmap(blob);
    const sc = Math.max(1, 1600 / bm.width), w = Math.round(bm.width * sc), h0 = Math.round(bm.height * 0.32), top = Math.round(bm.height * 0.68);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = Math.round(h0 * sc);
    const g = cv.getContext('2d'); g.filter = 'grayscale(1) contrast(1.4)'; g.drawImage(bm, 0, top, bm.width, h0, 0, 0, cv.width, cv.height);
    return await new Promise(r => cv.toBlob(r, 'image/png'));
  }
  async function readBlob(blob){
    const w = await worker();
    const full = (await w.recognize(blob)).data.text;
    await w.setParameters({tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<', tessedit_pageseg_mode: '6'});
    let mrz = '';
    try{ mrz = (await w.recognize(await bottomOf(blob))).data.text; } finally { await w.setParameters({tessedit_char_whitelist: '', tessedit_pageseg_mode: '3'}); }
    let r = window.__illuMRZ.fromText(full, mrz);
    /* sideways or upside-down pictures: try the other ways round */
    if(!r){ for(const deg of [90, 180, 270]){ const b2 = await turn(blob, deg); const f2 = (await w.recognize(b2)).data.text; r = window.__illuMRZ.fromText(f2, f2); if(r) break; } }
    return r;
  }
  async function turn(blob, deg){
    const bm = await createImageBitmap(blob), cv = document.createElement('canvas'), q = deg % 180 !== 0;
    cv.width = q ? bm.height : bm.width; cv.height = q ? bm.width : bm.height;
    const g = cv.getContext('2d'); g.translate(cv.width / 2, cv.height / 2); g.rotate(deg * Math.PI / 180); g.drawImage(bm, -bm.width / 2, -bm.height / 2);
    return await new Promise(r => cv.toBlob(r, 'image/png'));
  }
  /* the newest picture in her 4. PASSPORT folder (Dropbox on this computer first, then the BOOKING folder) */
  async function passportFile(c){
    if(!(window.illu && window.illu.bookingFiles)) return null;
    let files = [];
    for(const src of ['dbx', 'pc']){
      let r = null; try{ r = await window.illu.bookingFiles(src, bvFolderName(c), String(c.nm || '').trim()); }catch(e){}
      if(r && r.ok && r.found) files = files.concat((r.files || []).filter(f => /^4\.\s*PASSPORT\//i.test(f.rel) && IMG.test(f.rel)));
      if(files.length) break;
    }
    files.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
    return files[0] || null;
  }
  async function run(id){
    const c = BOOK.get(id); if(!c) return;
    RD.set(id, {busy: true}); paint();
    try{
      const f = window.__illuPPTestFile ? await window.__illuPPTestFile(c) : await passportFile(c);
      if(!f){ RD.set(id, {err: L('No picture in 4. PASSPORT yet. Put a photo or scan of her passport photo page there, then press Read again.', '4. PASSPORT 폴더에 사진이 없습니다. 여권 사진면을 넣고 다시 읽기를 누르세요.')}); paint(); return; }
      const blob = f.blob || await (await fetch('/_blob/' + encodeURIComponent(f.rid))).blob();
      const r = await readBlob(blob);
      if(!r){ RD.set(id, {err: L('Could not find the two lines of letters and numbers at the bottom of the photo page. Try a sharper, straight picture of the whole photo page.', '사진면 아래쪽 두 줄을 찾지 못했습니다. 사진면 전체를 선명하고 똑바로 찍은 사진으로 다시 해 보세요.'), file: f.rel}); paint(); return; }
      RD.set(id, {r, file: f.rel || f.name || ''}); paint();
    }catch(e){ console.error(e); RD.set(id, {err: L('The passport could not be read: ', '여권을 읽지 못했습니다: ') + (e && e.message || e)}); paint(); }
  }
  const FIELDS = r => [['ctfn', L('Full name (as in the passport)', '여권상 이름'), r.name, true],
    ['ppn', L('Passport number', '여권 번호'), r.ppn, r.checks.ppn], ['nat', L('Country of origin', '국적'), r.nat, true],
    ['dob', L('Date of birth', '생년월일'), r.dob, r.checks.dob], ['ppi', L('Passport issued', '여권 발급일'), r.ppi, r.ppiSure], ['ppe', L('Passport expires', '여권 만료일'), r.ppe, r.checks.ppe]];
  /* the Read button (and what was read) sit right under Passport issued / expires in the side panel */
  function block(c, ro){
    const st = RD.get(c.id) || {};
    let h = '<div class="bvppw"><button type="button" class="bvppbtn" data-bvppread="' + H(c.id) + '"' + (ro || st.busy ? ' disabled' : '') + '>' + (st.busy ? L('Reading…', '읽는 중…') : L('Read the passport', '여권 읽기')) + '</button>' +
      '<span>' + L('from her picture in 4. PASSPORT', '4. PASSPORT 폴더의 사진에서') + '</span></div>';
    if(st.err) h += '<div class="bvpprd err">' + H(st.err) + '</div>';
    if(st.r){
      const rows = FIELDS(st.r).filter(x => x[2]);
      h += '<div class="bvpprd" data-bvppbox="' + H(c.id) + '"><b>' + L('Read from ', '읽은 파일: ') + H(String(st.file || '').split('/').pop()) + '</b><span>' + L('Check each line — untick anything that is wrong — then Use these.', '한 줄씩 확인하고 틀린 항목은 체크를 빼고 적용하세요.') + '</span>' +
        rows.map(([k, lab, v, sure]) => { const now = String(c[k] || '').trim();
          return '<label class="bvpprow' + (sure ? '' : ' chk') + '"><input type="checkbox" data-bvppk="' + k + '" checked><span>' + H(lab) + '</span><b>' + H(v) + '</b>' +
            (sure ? '' : '<em>' + L('check', '확인') + '</em>') + (now && now !== v ? '<s title="' + H(L('On the card now', '현재 카드 값')) + '">' + H(now) + '</s>' : '') + '</label>'; }).join('') +
        '<div class="bvppact"><button type="button" class="bvppx" data-bvppx="' + H(c.id) + '">' + L('Cancel', '취소') + '</button><button type="button" class="bvppuse" data-bvppuse="' + H(c.id) + '">' + L('Use these', '적용') + '</button></div>' +
        '<small>' + L('Goes into the Contract (stage 3) and the Visa (stage 4).', '계약서(3단계)와 비자(4단계)에 들어갑니다.') + '</small></div>';
    }
    return h;
  }
  function decorate(){
    if(window.illu && window.illu.web) return;
    const e = document.querySelector('.bvside input[data-bf="ppe"]'); if(!e) return;
    /* after the Travel part's list (inside the list the rows are laid out on a grid) */
    const dl = e.closest('dl'), row = dl || e.closest('.bvpr2') || e.parentNode; const id = e.dataset.bk, c = BOOK.get(id); if(!c || !row) return;
    const html = block(c, e.readOnly);
    let box = row.nextElementSibling && row.nextElementSibling.classList.contains('bvppbox') ? row.nextElementSibling : null;
    if(!box){ box = document.createElement('div'); box.className = 'bvppbox'; row.after(box); }
    if(box.__h !== html){ box.__h = html; box.innerHTML = html; }
  }
  new MutationObserver(() => { clearTimeout(decorate.t); decorate.t = setTimeout(decorate, 30); }).observe(document.documentElement, {childList: true, subtree: true});
  window.__illuPPBlock = block;
  function paint(){ try{ if(typeof bvSideRefresh === 'function') bvSideRefresh(true); }catch(e){} setTimeout(decorate, 0); }
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-bvppread],[data-bvppuse],[data-bvppx]'); if(!t) return;
    e.preventDefault(); e.stopPropagation();
    if(t.dataset.bvppread){ run(t.dataset.bvppread); return; }
    if(t.dataset.bvppx){ RD.delete(t.dataset.bvppx); paint(); return; }
    const id = t.dataset.bvppuse, c = BOOK.get(id), st = RD.get(id); if(!c || !st || !st.r) return;
    const box = t.closest('[data-bvppbox]'), want = new Set([...box.querySelectorAll('[data-bvppk]:checked')].map(x => x.dataset.bvppk));
    for(const [k, , v] of FIELDS(st.r)) if(v && want.has(k)) c[k] = v;
    if(want.has('dob') && st.r.dob) c.age = '';
    if(st.r.sex && !c.g) c.g = st.r.sex;
    try{ saveBook(id, true); }catch(er){ console.error(er); }
    RD.delete(id); paint();
    try{ window.__illuToast && window.__illuToast(L('Passport details are on her card — the contract and visa use them.', '여권 정보가 카드에 들어갔습니다 — 계약서와 비자에 사용됩니다.')); }catch(er){}
  }, true);
  const st = document.createElement('style');
  st.textContent = `
.bvppbtn{height:32px;border-radius:9px;border:1px solid var(--acc,#5A2C57);background:var(--acc,#5A2C57);color:#fff;font:600 12.5px var(--sans);padding:0 12px;cursor:pointer;white-space:nowrap}
.bvppbtn:disabled{opacity:.55;cursor:default}
.bvppw{display:flex;align-items:center;gap:8px;padding:8px 0 4px;font-size:11.5px;color:var(--mut)}
.bvppbox{padding:0 12px 10px}
.bvppnat{font-size:13px}
.bvpprd{margin:6px 0 10px;border:1px solid var(--line);border-radius:12px;background:var(--surf2,#FAF8FB);padding:10px 12px;display:flex;flex-direction:column;gap:6px;font-size:12.5px}
.bvpprd.err{color:#9A2F2F;background:#FDF2F2;border-color:#F1C9C9}
.bvpprd > span,.bvpprd > small{color:var(--mut);line-height:1.4}
.bvpprow{display:grid;grid-template-columns:18px minmax(0,1fr) auto;gap:4px 8px;align-items:center;padding:6px 0;border-top:1px solid var(--line)}
.bvpprow > span{color:var(--mut)}
.bvpprow > b{grid-column:2/4;font-size:13.5px;color:var(--ink);word-break:break-word}
.bvpprow em{grid-column:3;grid-row:1;font-style:normal;font-size:10.5px;font-weight:700;color:#8A5A00;background:#FFF1D6;border-radius:999px;padding:2px 7px}
.bvpprow s{grid-column:2/4;font-size:11.5px;color:var(--mut)}
.bvppact{display:flex;gap:8px;justify-content:flex-end;padding-top:4px}
.bvppact button{height:34px;border-radius:9px;padding:0 14px;font:600 13px var(--sans);cursor:pointer;border:1px solid var(--line);background:var(--surf,#fff);color:var(--ink)}
.bvppact .bvppuse{background:var(--acc,#5A2C57);border-color:var(--acc,#5A2C57);color:#fff}`;
  document.head.appendChild(st);
})();
