
(function(){
  const lh = document.querySelector('#home .lh');
  if(!lh || lh.parentElement.classList.contains('lhwrap')) return;
  const w = document.createElement('span'); w.className = 'lhwrap'; w.setAttribute('aria-hidden', 'true');
  lh.parentNode.insertBefore(w, lh); w.appendChild(lh);
  w.insertAdjacentHTML('beforeend', '<i class="lhbeam"></i><i class="lhglow"></i>');
})();
