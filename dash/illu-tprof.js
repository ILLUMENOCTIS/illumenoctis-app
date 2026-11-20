/* 1.2.268 (user, 20 Nov 2026: "The program is also lagging a little and there some delays"): a stopwatch on the
   program's own timers. Every repeating or delayed job (timers, animation frames, page watchers) is timed; any run
   longer than 8 ms is added up under the job's name. The speed report (illu-perf.js, already sent every few minutes)
   carries the top ten, so the real cause of a freeze can be seen instead of guessed. Nothing extra is sent. */
(function(){
  if(window.__illuTProf) return;
  const T = new Map(), names = new WeakMap(), now = () => performance.now();
  function label(fn, kind){
    let n = names.get(fn); if(n) return n;
    try{
      let src = '';
      try{ throw new Error(); }catch(e){ const ln = String(e.stack || '').split('\n').slice(3).find(l => /\.js/.test(l) && !/illu-tprof/.test(l)) || ''; const m = ln.match(/([\w\-.]+\.js)(?:\?[^:\s]*)?:(\d+)/); if(m) src = m[1] + ':' + m[2]; }
      n = kind + ' ' + (src || (fn.name || String(fn).slice(0, 40).replace(/\s+/g, ' ')));
    }catch(e){ n = kind + ' ?'; }
    names.set(fn, n); return n;
  }
  function note(n, ms){ if(ms < (window.__illuTProfMin != null ? window.__illuTProfMin : 8)) return; let r = T.get(n); if(!r){ r = {n: 0, ms: 0, worst: 0}; T.set(n, r); } r.n++; r.ms += ms; if(ms > r.worst) r.worst = ms; }
  function wrap(fn, kind){
    if(typeof fn !== 'function') return fn;
    const n = label(fn, kind);
    return function(){ const t = now(); try{ return fn.apply(this, arguments); }finally{ note(n, now() - t); } };
  }
  const sI = window.setInterval, sT = window.setTimeout, rAF = window.requestAnimationFrame;
  window.setInterval = function(fn, ms){ const a = Array.prototype.slice.call(arguments, 2); return sI.call(window, wrap(fn, 'every' + (ms | 0)), ms, ...a); };
  window.setTimeout = function(fn, ms){ const a = Array.prototype.slice.call(arguments, 2); return sT.call(window, wrap(fn, 'after'), ms, ...a); };
  if(rAF) window.requestAnimationFrame = function(fn){ return rAF.call(window, wrap(fn, 'frame')); };
  const MO = window.MutationObserver;
  if(MO){ window.MutationObserver = function(cb){ return new MO(wrap(cb, 'watch')); }; window.MutationObserver.prototype = MO.prototype; }
  window.__illuTProf = {
    top(k){ return [...T.entries()].sort((a, b) => b[1].ms - a[1].ms).slice(0, k || 10).map(([n, r]) => ({j: n.slice(0, 70), n: r.n, ms: Math.round(r.ms), worst: Math.round(r.worst)})); },
    reset(){ T.clear(); }
  };
})();
