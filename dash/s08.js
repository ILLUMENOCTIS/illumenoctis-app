
(function(){
  /* ---- About this page: the long explanation, folded shut at the foot of it ---- */
  const note = document.querySelector('p.note');
  let howHTML = '';
  if(note){
    const raw = note.innerHTML.replace(/^\s*<b>How this fits together\.<\/b>\s*/, '')
      .replace('on the right', '(the notebook at the top right)');
    /* one paragraph per tab rather than one block, so it can be read in pieces */
    howHTML = raw.split(/(?=<b>(?:Directory|Lumen|Communicatus)<\/b>)|(?=Everything you open on this page)/)
      .map(x => '<p>' + x.trim() + '</p>').join('');
  }
  const isKo = () => typeof LANG !== 'undefined' && LANG === 'ko';
  function addHow(){
    const tip = document.getElementById('abtip');
    if(!tip || tip.hidden || !howHTML || tip.querySelector('.abhow')) return;
    const d = document.createElement('details');
    d.className = 'abhow';
    d.innerHTML = '<summary>' + (isKo() ? '페이지 구성 안내' : 'How this fits together') + '</summary>' +
      '<div class="abhowt">' + howHTML + '</div>';
    tip.appendChild(d);
  }
  document.addEventListener('click', e => {
    if(e.target.closest && e.target.closest('#ababout')) setTimeout(addHow, 0);
  });

  /* ---- fold the clocks and the map away ---- */
  const KEY = 'illum.ckmin';
  /* a plain clock with a small arrow under it: the arrow points the way the clocks will
     go - up to fold them away, down to bring them back */
  const UP = '<svg class="ckico" viewBox="0 0 24 24" aria-hidden="true">' +
    '<circle cx="12" cy="10" r="6.6"/><path d="M12 10V6.6M12 10l2.4 1.4"/>' +
    '<circle class="ckpin" cx="12" cy="10" r="1"/><path class="ckchv" d="M8.6 20.6l3.4-2.4 3.4 2.4"/></svg>';
  function set(min){
    document.body.classList.toggle('ckmin', min);
    const b = document.getElementById('abck');
    if(b){
      const t = min ? (isKo() ? '시계와 지도 보이기' : 'Show the clocks and map')
                    : (isKo() ? '시계와 지도 숨기기' : 'Hide the clocks and map');
      b.title = t; b.setAttribute('aria-label', t); b.setAttribute('aria-pressed', String(min));
    }
    try{ localStorage.setItem(KEY, min ? '1' : '0'); }catch(e){}
    setTimeout(() => window.dispatchEvent(new Event('resize')), 30);
  }
  function mount(){
    const r = document.querySelector('#appbar .abr');
    if(!r || document.getElementById('abck')) return !!r;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'abib'; b.id = 'abck'; b.innerHTML = UP;
    b.addEventListener('click', () => set(!document.body.classList.contains('ckmin')));
    const sep = document.createElement('span'); sep.className = 'absep';
    r.insertBefore(sep, r.firstChild); r.insertBefore(b, r.firstChild);
    let min = false;
    try{ min = localStorage.getItem(KEY) === '1'; }catch(e){}
    set(min);
    return true;
  }
  if(!mount()){
    const t = setInterval(() => { if(mount()) clearInterval(t); }, 300);
    setTimeout(() => clearInterval(t), 15000);
  }
})();
