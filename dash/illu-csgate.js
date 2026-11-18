/* 1.2.261: loaded first, so that while cards are being chosen to send (illu-cardsend.js) a tap on a card only ticks it -
   these listeners run before every other one on the page */
['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'dblclick', 'touchstart', 'touchend'].forEach(ev => window.addEventListener(ev, e => { const f = window.__illuCSendGate; if(f) f(e); }, {capture: true, passive: false}));
