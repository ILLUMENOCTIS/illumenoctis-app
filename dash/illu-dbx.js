/* Dropbox without the Dropbox app (user, 2026-11-05). When this computer has no Dropbox folder,
   the Booking window offers "Connect Dropbox": the person's browser opens dropbox.com, they sign
   in themselves and press Allow, and from then on the folders are read and saved over the web. */
(function(){
  'use strict';
  if(!(window.illu && window.illu.dropboxConnect) || typeof bvNoteOnly !== 'function') return;
  const ko = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const T = (en, k) => ko() ? k : en;
  const oldNote = bvNoteOnly;
  window.bvNoteOnly = function(html){
    if(/Dropbox folder could not be found on this computer/.test(html) && !/data-bvdbxweb/.test(html)){
      html = html.replace(/(<div class="bvbtns">)/, '<p class="dbxw">' + T('Dropbox is not installed here. You can still use the Dropbox folders over the web: press <b>Connect Dropbox</b>, sign in to Dropbox in your browser and press <b>Allow</b>.',
        '이 컴퓨터에 Dropbox 앱이 없습니다. 웹으로 Dropbox 폴더를 사용할 수 있습니다: <b>Dropbox 연결</b>을 누르고 브라우저에서 Dropbox에 로그인한 뒤 <b>허용</b>을 누르세요.') + '</p>$1' +
        '<button type="button" class="bvbtn dbxwb" data-bvdbxweb>' + T('Connect Dropbox', 'Dropbox 연결') + '</button>');
    }
    return oldNote.call(this, html);
  };
  let busy = false;
  document.addEventListener('click', async e => {
    const b = e.target.closest && e.target.closest('[data-bvdbxweb]');
    if(!b || busy) return;
    e.preventDefault(); e.stopPropagation();
    busy = true;
    const c = bv && BOOK.get(bv.id);
    b.disabled = true; b.textContent = T('Waiting for Dropbox in your browser…', '브라우저에서 Dropbox를 기다리는 중…');
    let r = null;
    try{ r = await illu.dropboxConnect(); }catch(err){ r = {ok: false, why: String(err && err.message || err)}; }
    busy = false;
    if(r && r.ok){
      try{ bvMsgNext = T('Dropbox connected', 'Dropbox 연결됨') + (r.name ? ' · ' + r.name : ''); }catch(err){}
      if(c && bv && bv.id === c.id) bvOpenSrc(c, 'dbx');
    } else {
      b.disabled = false; b.textContent = T('Connect Dropbox', 'Dropbox 연결');
      const p = b.parentNode && b.parentNode.parentNode && b.parentNode.parentNode.querySelector('.dbxw');
      if(p) p.textContent = T('Dropbox was not connected', 'Dropbox가 연결되지 않았습니다') + (r && r.why ? ' (' + r.why + ')' : '') + '. ' + T('Press Connect Dropbox to try again.', '다시 시도하려면 Dropbox 연결을 누르세요.');
    }
  }, true);
  const st = document.createElement('style');
  st.textContent = '.bv .dbxw{margin:10px 0 0;font-size:13px;opacity:.85;max-width:52ch}.bv .dbxwb{font-weight:600}';
  document.head.appendChild(st);
})();
