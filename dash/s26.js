
(function(){
  var CFG=[
    {box:'bkmain',sec:'section.bkband',hd:'.bkbhd',ls:'illum.bkorder',key:function(s){return s.getAttribute('data-bkdrop')||'';}},
    {box:'lmain',sec:'section.litsec',hd:'.lithd',ls:'illum.litorder',key:function(s){var m=/litsec--(\w)/.exec(s.className);return m?m[1]:'';}}
  ];
  function rd(k){try{var v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v:[];}catch(e){return [];}}
  function wr(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
  function secs(c,box){return Array.prototype.filter.call(box.children,function(n){return n.matches&&n.matches(c.sec);});}
  function apply(c,box){
    var list=secs(c,box); if(!list.length) return;
    list.forEach(function(s){var h=s.querySelector(c.hd);
      if(h&&!h.querySelector('.secgrip')){var g=document.createElement('span');g.className='secgrip';
        g.setAttribute('aria-hidden','true');g.textContent='⠇⠇';h.insertBefore(g,h.firstChild);
        h.title='Click to show or hide this row · drag to move it up or down';}});
    var ord=rd(c.ls); if(!ord.length) return;
    var pos=function(s){var i=ord.indexOf(c.key(s));return i<0?99:i;};
    var want=list.slice().sort(function(a,b){return pos(a)-pos(b)||list.indexOf(a)-list.indexOf(b);});
    if(want.every(function(s,i){return s===list[i];})) return;
    var anchor=list[0].previousSibling, after=list[list.length-1].nextSibling;
    want.forEach(function(s){box.insertBefore(s,after);});
  }
  function hook(c){
    var box=document.getElementById(c.box); if(!box) return;
    var drag=null, eat=false;
    apply(c,box);
    new MutationObserver(function(){ if(!(drag&&drag.on)) apply(c,box);}).observe(box,{childList:true});
    box.addEventListener('pointerdown',function(e){
      if(e.button!==0) return;
      var h=e.target.closest&&e.target.closest(c.hd); if(!h||!box.contains(h)) return;
      var s=h.closest(c.sec); if(!s||s.parentNode!==box) return;
      drag={s:s,h:h,y:e.clientY,id:e.pointerId,on:false};
    });
    window.addEventListener('pointermove',function(e){
      if(!drag||e.pointerId!==drag.id) return;
      if(!drag.on){ if(Math.abs(e.clientY-drag.y)<6) return;
        drag.on=true; drag.off=drag.y-drag.s.getBoundingClientRect().top; var t0=drag.h.getBoundingClientRect().top; box.style.minHeight=box.offsetHeight+'px';
        drag.s.classList.add('sordrag'); document.body.classList.add('sordragging');
        var t1=drag.h.getBoundingClientRect().top; if(t1!==t0) window.scrollBy(0,t1-t0);
        try{drag.h.setPointerCapture(e.pointerId);}catch(x){} }
      e.preventDefault();
      var list=secs(c,box), s=drag.s;
      for(var i=0;i<list.length;i++){var o=list[i]; if(o===s) continue;
        var r=o.getBoundingClientRect(), hr=(o.querySelector(c.hd)||o).getBoundingClientRect();
        var mid=Math.min(r.top+r.height/2, hr.bottom);
        var st0=s.style.transform; s.style.transform=''; var sr=s.getBoundingClientRect(); s.style.transform=st0;
        if(sr.top>r.top && e.clientY<mid){box.insertBefore(s,o);break;}
        if(sr.top<r.top && e.clientY>mid && e.clientY>r.top+Math.min(r.height/2,hr.height)){box.insertBefore(s,o.nextSibling);break;}
      }
      s.style.transform=''; var nt=s.getBoundingClientRect().top;
      s.style.transform='translateY('+Math.round(e.clientY-drag.off-nt)+'px)';
      var vh=window.innerHeight; if(e.clientY<60) window.scrollBy(0,-14); else if(e.clientY>vh-60) window.scrollBy(0,14);
    },{passive:false});
    function end(e){
      if(!drag||(e&&e.pointerId!==drag.id)) return;
      var d=drag; drag=null;
      if(!d.on) return;
      d.s.style.transform=''; var u0=d.h.getBoundingClientRect().top;
      d.s.classList.remove('sordrag'); document.body.classList.remove('sordragging'); box.style.minHeight='';
      var u1=d.h.getBoundingClientRect().top; if(u1!==u0) window.scrollBy(0,u1-u0);
      var ord=secs(c,box).map(c.key), old=rd(c.ls);
      old.forEach(function(k){ if(ord.indexOf(k)<0) ord.push(k); });
      wr(c.ls,ord); eat=true; setTimeout(function(){eat=false;},350);
    }
    window.addEventListener('pointerup',end); window.addEventListener('pointercancel',end);
    box.addEventListener('click',function(e){ if(eat&&e.target.closest&&e.target.closest(c.hd)){e.stopImmediatePropagation();e.preventDefault();eat=false;} },true);
  }
  function go(){CFG.forEach(hook);}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',go); else go();
})();
