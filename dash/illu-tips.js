/* ==================== Hover descriptions ====================
   A short line under the pointer, only where the label alone does not say what a thing
   does: the tabs in the left menu, and buttons that are only an icon (Refresh, Full
   screen, the camera, the lamps, the bell...). Buttons that already say what they do
   ("Open →", "Reset", a filter's name) get nothing extra.
   One listener for the whole page; nothing runs until the pointer rests on something for
   a moment, so it costs nothing while scrolling or working. */
(function(){
  const NAV = {
    en: {arr: 'Models that fit the height bands, 50 at a time', dir: 'Every agency, with its boards and models',
         atl: 'All agencies on a world map', bld: 'Boards the scan can’t read, to check by hand',
         ig: 'Model and agency accounts you follow', lit: 'Models you’ve lit, sorted by lamp',
         bk: 'Models in talks with their agency', com: 'Everyone’s lamps together',
         cmp: 'Build a composite card from photos', bkl: 'Every lamp anyone has set, in order',
         '404': 'Profiles agencies have taken down'},
    ko: {arr: '키 기준에 맞는 모델, 한 번에 50명', dir: '모든 에이전시와 보드, 모델',
         atl: '세계 지도 위의 모든 에이전시', bld: '스캔이 읽지 못한 보드 — 직접 확인',
         ig: '팔로우하는 모델·에이전시 계정', lit: '내가 램프를 켠 모델, 램프별로',
         bk: '에이전시와 협의 중인 모델', com: '모두의 램프를 한곳에',
         cmp: '사진으로 컴포지트 카드 만들기', bkl: '누가 언제 켠 램프인지, 순서대로',
         '404': '에이전시가 내린 프로필'}
  };
  const lang = () => (typeof LANG !== 'undefined' && LANG === 'ko') ? 'ko' : 'en';
  const ICONONLY = /[\s\d·.,:;+\-–—×✕✎⠿↑↓←→›‹▾▴▸◂♡♥⌄^()%/|]/g;
  const tip = document.createElement('div');
  tip.id = 'illutip'; tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);
  let cur = null, timer = 0, saved = '';

  /* what to say for this element, or nothing */
  function textFor(el){
    if(el.dataset.tip) return el.dataset.tip;
    const nv = el.id && /^v-/.test(el.id) && el.closest('#views, .viewbar, nav');
    if(nv){ const k = el.id.slice(2); const d = NAV[lang()][k]; if(d) return d; }
    const t = el.getAttribute('title') || el.dataset.illuTitle || '';
    if(!t) return '';
    if(el.querySelector('img, video, canvas')) return '';            // photo tiles: not here
    const vis = (el.textContent || '').replace(ICONONLY, '');              // textContent: no layout work on every pointer move
    if(vis.length > 1) return '';                                    // it says what it does
    return t;
  }
  function find(node){
    const el = node && node.closest ? node.closest('[data-tip], [id^="v-"], button[title], a[title], [role="button"][title], .mk i[title], .abon[title], [data-illu-title]') : null;
    if(!el || el === tip) return null;
    return el;
  }
  function show(){
    if(!cur || !cur.isConnected) return;
    const t = textFor(cur);
    if(!t){ return; }
    tip.textContent = t;
    tip.classList.add('on');
    const r = cur.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    let x = r.left + r.width / 2 - w / 2;
    x = Math.max(8, Math.min(innerWidth - w - 8, x));
    let y = r.bottom + 8;
    if(y + h > innerHeight - 6) y = r.top - h - 8;
    /* a tab in the left menu: beside it rather than under it */
    if(cur.id && /^v-/.test(cur.id) && r.right + w + 16 < innerWidth){ x = r.right + 10; y = r.top + r.height / 2 - h / 2; }
    tip.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
  }
  function hide(){
    clearTimeout(timer);
    tip.classList.remove('on');
    if(cur){
      /* the native tooltip was held back while ours showed; give the title back */
      if(saved && !cur.hasAttribute('title')) cur.setAttribute('title', saved);
      delete cur.dataset.illuTitle;
    }
    cur = null; saved = '';
  }
  document.addEventListener('pointerover', e => {
    if(e.pointerType === 'touch') return;
    const el = find(e.target);
    if(el === cur) return;
    hide();
    if(!el) return;
    const t = textFor(el);
    if(!t) return;
    cur = el;
    /* keep the browser's own slow grey tooltip from showing on top */
    saved = el.getAttribute('title') || '';
    if(saved){ el.dataset.illuTitle = saved; el.removeAttribute('title'); }
    timer = setTimeout(show, 450);
  }, {passive: true});
  document.addEventListener('pointerout', e => {
    if(!cur) return;
    const to = e.relatedTarget;
    if(to && cur.contains(to)) return;
    hide();
  }, {passive: true});
  for(const ev of ['pointerdown', 'keydown', 'wheel']) document.addEventListener(ev, hide, {passive: true, capture: true});
  addEventListener('scroll', hide, {passive: true, capture: true});
  addEventListener('blur', hide);

  const css = document.createElement('style');
  css.textContent = '#illutip{position:fixed;left:0;top:0;z-index:5000;max-width:280px;padding:5px 9px;border-radius:7px;' +
    'background:#2A2230;color:#fff;font:500 11.5px/1.35 var(--sans,Inter,sans-serif);letter-spacing:.01em;pointer-events:none;' +
    'box-shadow:0 6px 18px -6px rgba(20,14,22,.45);opacity:0;transition:opacity .12s ease;white-space:normal}' +
    '#illutip.on{opacity:1}';
  document.head.appendChild(css);
})();
