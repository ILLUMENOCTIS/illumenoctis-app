
/* ---- a booking card's lower half folds away under a tab in its action bar ----
   Folded, the card is the face, the figures and the bar; the tab opens the rest - the
   status, what is left to fill in, travel and the five stages - downward. Each card is
   remembered open or shut in this browser. */
function bkFoldSet(){ try{ return new Set(JSON.parse(localStorage.getItem('illum.bkopen') || '[]')); }catch(e){ return new Set(); } }
function bkFoldOpen(id){ return bkFoldSet().has(id); }
function bkFoldTab(c){
  const open = bkFoldOpen(c.id);
  return '<button type="button" class="bkfoldtab" data-bkfold="' + esc(c.id) + '" aria-expanded="' + open + '" title="' +
    (open ? 'Fold the details away' : 'Show the details') + '"><i aria-hidden="true"></i></button>';
}
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('.bkfoldtab[data-bkfold]');
  if(!t) return;
  e.preventDefault(); e.stopPropagation();
  const id = t.dataset.bkfold, card = t.closest('.bkcard');
  const s = bkFoldSet(), open = !s.has(id);
  if(open) s.add(id); else s.delete(id);
  try{ localStorage.setItem('illum.bkopen', JSON.stringify([...s])); }catch(_){}
  t.setAttribute('aria-expanded', String(open));
  t.title = open ? 'Fold the details away' : 'Show the details';
  if(card){
    card.dataset.bkfold = open ? '0' : '1';
    if(open){ card.classList.remove('bkunfold'); void card.offsetWidth; card.classList.add('bkunfold'); }
  }
}, true);
