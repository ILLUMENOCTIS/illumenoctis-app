/* 1.2.203 (user, 16 Nov 2026, demo "Vote Animation Options" #7: "2 + 6 without the flash passing through the photo"):
   when a vote is cast, a light runs once around the card's frame while a round ✓ (Go, green) or ✕ (Pass, red) stamp
   lands on the photo and fades. The card often leaves the list at once (Waiting for my vote -> I voted), so the effect
   plays on a copy of the card held in place for a moment, then fades away. Plain colour change when the device asks
   for reduced motion. */
(function(){
  'use strict';
  if(window.__illuVoteFx) return;
  let LAST = null;                                      // the card the last press was on
  ['pointerdown', 'keydown'].forEach(t => window.addEventListener(t, e => {
    const c = e.target && e.target.closest && e.target.closest('.vmk[data-mk], .mx[data-mxk]');
    if(c) LAST = {el: c, at: Date.now()};
  }, true));
  const cardOf = k => {
    if(LAST && Date.now() - LAST.at < 3000 && LAST.el.isConnected){
      const m = LAST.el.closest('.vmk[data-mk]') || LAST.el;
      if(!m.dataset.mk || m.dataset.mk === k) return m.closest('.uc, article') || m;
    }
    const all = [...document.querySelectorAll('.vmk[data-mk]')].filter(x => x.dataset.mk === k && x.offsetParent);
    return all.length ? (all[0].closest('.uc, article') || all[0]) : null;
  };
  const photoOf = el => {
    const c = el.querySelector('.ucov, .ucph, .uimg, .img, img');
    const r = c && c.getBoundingClientRect();
    return r && r.width > 60 && r.height > 60 ? r : null;
  };
  window.__illuVoteFx = (k, v, el) => {
    try{
      let card = el || cardOf(k); if(!card) return;
      /* 1.2.305 (user, 27 Nov 2026: "when selecting go or pass, when the panel lights up momentarily, I want it to circle around
         the whole side panel"): a vote cast in a model's side panel lights the whole panel (the part on screen), not the vote box */
      const pnl = card.closest && (card.closest('.mx.pn2') || (card.matches && card.matches('.mx.pn2') ? card : null));
      if(pnl){ let box = pnl; for(let p = pnl; p && p !== document.body; p = p.parentElement){ const o = getComputedStyle(p).overflowY; if(o === 'auto' || o === 'scroll'){ box = p; break; } }
        const r = box.getBoundingClientRect(), top = Math.max(r.top, 0), bot = Math.min(r.bottom, innerHeight);
        if(r.width < 40 || bot - top < 40) return;
        const col = v === 'r' ? '#E5484D' : '#2FBF4A', rad = getComputedStyle(box).borderTopLeftRadius;
        const fx = document.createElement('div'); fx.className = 'vfx vfxpn'; fx.setAttribute('aria-hidden', 'true');
        fx.style.cssText = 'left:' + r.left + 'px;top:' + top + 'px;width:' + r.width + 'px;height:' + (bot - top) + 'px;--c:' + col + ';--r:' + (rad && rad !== '0px' ? rad : '12px');
        fx.innerHTML = '<span class="vfxring"></span>';
        document.body.appendChild(fx);
        requestAnimationFrame(() => fx.classList.add('play'));
        setTimeout(() => fx.classList.add('out'), 1250);
        setTimeout(() => fx.remove(), 1600);
        return; }
      const r = card.getBoundingClientRect(); if(r.width < 40 || r.height < 40 || r.bottom < 0 || r.top > innerHeight) return;
      const pr = photoOf(card) || r;
      const col = v === 'r' ? '#E5484D' : '#2FBF4A';
      const rad = getComputedStyle(card).borderTopLeftRadius || '14px';
      const fx = document.createElement('div'); fx.className = 'vfx'; fx.setAttribute('aria-hidden', 'true');
      const copy = card.cloneNode(true);
      copy.querySelectorAll('[id]').forEach(n => n.removeAttribute('id')); copy.removeAttribute('id');
      copy.style.cssText = 'position:absolute;inset:0;margin:0;width:100%;height:100%;pointer-events:none';
      fx.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;--c:' + col + ';--r:' + rad;
      fx.appendChild(copy);
      fx.insertAdjacentHTML('beforeend', '<span class="vfxring"></span><span class="vfxst" style="left:' + (pr.left - r.left + pr.width / 2) + 'px;top:' + (pr.top - r.top + pr.height / 2) + 'px">' + (v === 'r' ? '✕' : '✓') + '</span>');
      document.body.appendChild(fx);
      requestAnimationFrame(() => fx.classList.add('play'));
      setTimeout(() => fx.classList.add('out'), 1250);
      setTimeout(() => fx.remove(), 1600);
    }catch(e){}
  };
  const st = document.createElement('style');
  st.textContent = `
.vfx{position:fixed;z-index:2147482000;pointer-events:none;border-radius:var(--r);transition:opacity .3s}
.vfx.out{opacity:0}
.vfx .vfxring{position:absolute;inset:-3px;border-radius:calc(var(--r) + 3px);padding:3px;background:conic-gradient(from var(--vfxa,0deg),transparent 0 70%,color-mix(in srgb,var(--c) 30%,#fff) 80%,var(--c) 88%,#fff 90%,transparent 96%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:0}
.vfx::after{content:'';position:absolute;inset:0;border-radius:var(--r);box-shadow:0 0 0 2px var(--c),0 0 18px 2px color-mix(in srgb,var(--c) 35%,transparent);opacity:0;transition:opacity .3s .5s}
.vfx.play::after{opacity:1}
@property --vfxa{syntax:'<angle>';inherits:false;initial-value:0deg}
.vfx.play .vfxring{animation:vfxsweep 1.2s cubic-bezier(.4,0,.2,1)}
@keyframes vfxsweep{0%{--vfxa:0deg;opacity:1}85%{opacity:1}100%{--vfxa:360deg;opacity:0}}
.vfx .vfxst{position:absolute;width:72px;height:72px;margin:-36px 0 0 -36px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--c) 92%,transparent);color:#fff;font:800 36px/1 system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.28);opacity:0}
.vfx.play .vfxst{animation:vfxstamp 1.1s .15s cubic-bezier(.2,1.4,.4,1) forwards}
@keyframes vfxstamp{0%{opacity:0;transform:scale(2.2)}25%{opacity:1;transform:scale(.92)}40%{transform:scale(1)}75%{opacity:1}100%{opacity:0;transform:scale(1)}}
.vfx.vfxpn .vfxring{inset:0;border-radius:var(--r)}.vfx.vfxpn::after{inset:3px;border-radius:calc(var(--r) - 3px)}
@media (prefers-reduced-motion:reduce){.vfx .vfxring,.vfx .vfxst{animation:none!important}.vfx::after{transition:none}}
`;
  document.head.appendChild(st);
})();
