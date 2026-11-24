/* 1.2.141: the start-up screen in the app's own colours from the first paint (the same choice s01.js makes later) */
try{var t=localStorage.getItem('illum.theme');if(t==='dark')t='dim';if(t==='dim'||t==='sepia')document.documentElement.dataset.theme=t;}catch(e){}

/* 1.2.281 (user, 22 Nov 2026, phone: "loading error before actually loading up to the current layout"; the old "Recommended
   for the Korean market" layout showing while loading): the start-up screen used to lift by itself after 45 seconds even when
   the app was still downloading (a slow connection right after an update downloads every file again), so the half-built page
   showed. Now it stays until the whole page has loaded; a slow start says so on the start-up screen, with a Reload button if
   it takes far too long. If the page has loaded and the app still has not shown itself, it is shown 4 seconds later. */
(function(){
  var ko = false; try{ ko = (localStorage.getItem('illum.lang') || '') === 'ko'; }catch(e){}
  var t0 = Date.now(), step = 0;
  function ready(){ return document.documentElement.classList.contains('shready'); }
  function msg(n, h){ if(step === n) return; var m = document.getElementById('illubootmsg'); if(!m) return; step = n; m.innerHTML = h;
    var b = m.querySelector('button'); if(b) b.addEventListener('click', function(){ location.reload(); }); }
  var iv = setInterval(function(){
    if(ready()){ clearInterval(iv); return; }
    var s = (Date.now() - t0) / 1000;
    if(s > 120) msg(2, '<span>' + (ko ? '연결이 매우 느립니다.' : 'The connection is very slow.') + '</span><button type="button">' + (ko ? '다시 불러오기' : 'Reload') + '</button>');
    else if(s > 12) msg(1, ko ? '불러오는 중… 연결이 느립니다' : 'Still loading… slow connection');
  }, 1000);
  addEventListener('load', function(){ setTimeout(function(){ if(!ready()){ document.documentElement.classList.add('shready'); setTimeout(function(){ var b = document.getElementById('illuboot'); if(b) b.remove(); }, 400); } }, 4000); });
})();
