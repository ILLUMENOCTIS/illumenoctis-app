/* <app>/dbx/: Dropbox sends the phone back here after the person pressed Allow; finish the sign-in and go back */
(async function () {
  const m = document.getElementById('msg');
  const ko = /^ko/i.test(navigator.language || '') || (function () { try { return localStorage.getItem('illum.lang') === 'ko'; } catch (e) { return false; } })();
  try {
    if (!window.__illuDbxFinish) throw new Error('the app did not load');
    const r = await window.__illuDbxFinish(new URLSearchParams(location.search));
    m.textContent = ko ? 'Dropbox가 연결되었습니다. 돌아가는 중…' : 'Dropbox is connected. Going back…';
    setTimeout(() => location.replace(r.back), 600);
  } catch (e) {
    m.className = 'err';
    m.textContent = (ko ? 'Dropbox가 연결되지 않았습니다: ' : 'Dropbox was not connected: ') + (e && e.message || e);
    const a = document.createElement('a'); a.href = '../dash/index.html'; a.textContent = ko ? '앱으로 돌아가기' : 'Back to the app';
    m.after(document.createElement('br'), a);
  }
})();
