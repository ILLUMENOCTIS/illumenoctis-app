
document.addEventListener('input', function(e){
  var t = e.target; if(!t || !t.classList || !t.classList.contains('bvwt')) return;
  var c = t.closest('.bvpwt'); if(c) c.classList.toggle('no', !String(t.value || '').trim());
}, true);
