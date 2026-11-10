
/* lines the clock row up with the page's own columns, whenever they are columns */
(function(){
  function fit(){
    const row = document.querySelector('.ckrow'), side = document.querySelector('.side'),
          shell = document.querySelector('.shell');
    if(!row) return;
    const wide = window.matchMedia('(min-width:881px)').matches;
    const sr = side ? side.getBoundingClientRect() : null;
    const cs = side ? getComputedStyle(side) : null;
    const col = wide && sr && sr.width > 120 && cs && cs.position === 'sticky' &&
      shell && Math.abs(sr.left - shell.getBoundingClientRect().left) < 2 &&
      getComputedStyle(shell).gridTemplateColumns.split(' ').length >= 2;
    if(!col){ row.classList.remove('ckalign'); row.style.gridTemplateColumns = ''; return; }
    const n = document.querySelectorAll('#clocks>.clk').length;
    const g = parseFloat(getComputedStyle(shell).columnGap) || 26;
    document.documentElement.style.setProperty('--ckgap', g + 'px');
    row.classList.add('ckalign');
    row.style.gridTemplateColumns = sr.width.toFixed(2) + 'px 0px repeat(' + Math.max(1, n - 1) +
      ',minmax(0,1fr)) minmax(0,1.35fr)';
  }
  let t = 0;
  const later = () => { clearTimeout(t); t = setTimeout(fit, 60); };
  addEventListener('load', () => { fit(); setTimeout(fit, 700); });
  addEventListener('resize', later);
  try{ new MutationObserver(later).observe(document.getElementById('clocks'), {childList: true}); }catch(e){}
  try{ new ResizeObserver(later).observe(document.querySelector('.side')); }catch(e){}
})();
