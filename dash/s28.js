
/* The top bar is painted with exactly the page's own background (the same fixed gradients),
   so it reads as one surface with the page and nothing scrolling underneath shows through. */
(function(){
  function paint(){
    var bars = [document.getElementById('appbar')];
    document.querySelectorAll('.w > header').forEach(function(x){ if(getComputedStyle(x).position === 'sticky') bars.push(x); });
    var s = getComputedStyle(document.body);
    bars.forEach(function(bar){ if(!bar) return;
    bar.style.setProperty('background-image', s.backgroundImage, 'important');
    bar.style.setProperty('background-attachment', 'fixed', 'important');
    bar.style.setProperty('background-size', s.backgroundSize, 'important');
    bar.style.setProperty('background-position', s.backgroundPosition, 'important');
    bar.style.setProperty('background-repeat', s.backgroundRepeat, 'important');
    bar.style.setProperty('background-color', getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || 'transparent', 'important');
    });
  }
  function go(){
    paint();
    var mo = new MutationObserver(function(){ requestAnimationFrame(paint); });
    mo.observe(document.documentElement, {attributes: true, attributeFilter: ['class', 'data-theme', 'style']});
    mo.observe(document.body, {attributes: true, attributeFilter: ['class', 'data-theme']});
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
