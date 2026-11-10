/* ILLUMÉNOCTIS phone app: turning on push alerts on this phone (or browser), and opening the page an
   alert points to (#team, #arrd). Web only — the computer program has its own alerts. */
(function () {
  'use strict';
  if (!window.illu || !window.illu.web || window.__illuWebPush) return; window.__illuWebPush = true;
  const VAPID = window.ILLU_VAPID || '';
  const isKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const L = (en, ko) => isKO() ? ko : en;
  const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const canPush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const sb = () => window.__illuSb;
  const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, c => c.charCodeAt(0)); };

  /* an alert opens the page it is about */
  function route() { const h = (location.hash || '').slice(1); if (/^(team|arrd|today|appr|arr)$/.test(h) && window.__illuGo) { try { window.__illuGo(h); } catch (e) {} } }
  addEventListener('hashchange', route);
  setTimeout(route, 2500);

  async function save(sub) {
    const j = sub.toJSON();
    const { error } = await sb().rpc('push_subscribe', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_ua: navigator.userAgent });
    if (error) throw error;
    LS.set('illu.push.saved', j.endpoint + '|' + (typeof ME !== 'undefined' ? ME : ''));
  }
  async function turnOn(btn) {
    try {
      if (btn) { btn.disabled = true; btn.textContent = L('Turning on…', '켜는 중…'); }
      const p = await Notification.requestPermission();
      if (p !== 'granted') throw new Error(L('Alerts were not allowed. Allow them for ILLUMÉNOCTIS in the phone\'s Settings, then try again.', '알림이 허용되지 않았습니다. 설정에서 ILLUMÉNOCTIS 알림을 허용한 뒤 다시 시도하세요.'));
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID) });
      await save(sub);
      try { await sb().functions.invoke('illu-push', { body: { kind: 'test' } }); } catch (e) {}
      done(L('Alerts are on for this device. A test alert is on its way.', '이 기기에 알림이 켜졌습니다. 테스트 알림을 보냈습니다.'));
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = L('Turn on alerts', '알림 켜기'); }
      say(String(e.message || e));
    }
  }

  /* ---------- the bar at the bottom of the screen ---------- */
  let bar = null;
  function say(t) { if (!bar) return; const m = bar.querySelector('.wpmsg'); m.textContent = t; m.hidden = false; }
  function done(t) { if (!bar) return; bar.querySelector('.wpact').hidden = true; say(t); setTimeout(() => { bar && bar.remove(); bar = null; }, 5000); }
  function show(kind) {
    if (bar || LS.get('illu.push.later') > String(Date.now())) return;
    bar = document.createElement('div'); bar.id = 'illuwp'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', L('Alerts on this device', '이 기기의 알림'));
    const iosHint = '<ol class="wpsteps"><li>' + L('Tap <b>Share</b> <span class="wpshare">⬆︎</span> at the bottom of Safari', 'Safari 아래쪽 <b>공유</b> <span class="wpshare">⬆︎</span> 버튼을 누르세요') + '</li><li>' + L('Choose <b>Add to Home Screen</b>', '<b>홈 화면에 추가</b>를 고르세요') + '</li><li>' + L('Open ILLUMÉNOCTIS from the Home Screen and turn on alerts there', '홈 화면의 ILLUMÉNOCTIS를 열고 알림을 켜세요') + '</li></ol>';
    bar.innerHTML = '<div class="wpin"><span class="wpico" aria-hidden="true">🔔</span><div class="wptx"><b>' + (kind === 'ios' ? L('Get alerts on this iPhone', '이 iPhone에서 알림 받기') : L('Get alerts on this device', '이 기기에서 알림 받기')) + '</b>' +
      '<span>' + L('Votes waiting for you, and who arrives or departs each morning at 7:00 — even when the app is closed.', '내 투표가 필요한 모델, 매일 아침 7시 입국·출국 소식 — 앱이 닫혀 있어도 받습니다.') + '</span>' + (kind === 'ios' ? iosHint : '') + '<span class="wpmsg" hidden></span></div>' +
      '<div class="wpact">' + (kind === 'ios' ? '' : '<button type="button" class="wpon">' + L('Turn on alerts', '알림 켜기') + '</button>') + '<button type="button" class="wplater">' + L('Later', '나중에') + '</button></div></div>';
    bar.addEventListener('click', e => {
      if (e.target.closest('.wpon')) turnOn(e.target.closest('.wpon'));
      if (e.target.closest('.wplater')) { LS.set('illu.push.later', String(Date.now() + 3 * 864e5)); bar.remove(); bar = null; }
    });
    document.body.appendChild(bar);
  }
  async function check() {
    if ([...document.querySelectorAll('.idlg, .d2card, #illufv')].some(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden')) { setTimeout(check, 3000); return; }   // never over an open dialog or card
    try { if (typeof SIGNED !== 'function' || !SIGNED()) return; } catch (e) { return; }
    if (!canPush) { if (ios && !standalone) show('ios'); return; }
    if (ios && !standalone) { show('ios'); return; }
    if (Notification.permission === 'denied') return;
    const reg = await navigator.serviceWorker.ready.catch(() => null); if (!reg) return;
    const sub = await reg.pushManager.getSubscription().catch(() => null);
    if (sub && Notification.permission === 'granted') {
      if (LS.get('illu.push.saved') !== sub.endpoint + '|' + (typeof ME !== 'undefined' ? ME : '')) { try { await save(sub); } catch (e) {} }
      return;
    }
    show('push');
  }
  setTimeout(check, 6000);
  window.__illuPushOn = () => turnOn(null);

  const css = document.createElement('style');
  css.textContent = `
#illuwp{position:fixed;left:max(10px,env(safe-area-inset-left,0px));right:max(10px,env(safe-area-inset-right,0px));bottom:calc(10px + env(safe-area-inset-bottom,0px));z-index:9400;display:flex;justify-content:center;pointer-events:none}
#illuwp .wpin{pointer-events:auto;max-width:560px;width:100%;display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;background:var(--surf,#fff);color:var(--ink,#1b1724);border:1px solid var(--line,#e6e0ea);border-radius:16px;box-shadow:0 18px 44px -16px rgba(40,10,50,.5);padding:14px 14px 12px}
#illuwp .wpico{font-size:22px;line-height:1}
#illuwp .wptx{flex:1;min-width:200px;display:flex;flex-direction:column;gap:3px;font-size:13px;line-height:1.45}
#illuwp .wptx>b{font-size:14.5px}
#illuwp .wptx>span{color:var(--faint,#6c6875)}
#illuwp .wpsteps{margin:6px 0 0;padding-left:20px;display:flex;flex-direction:column;gap:3px;color:var(--ink,#1b1724)}
#illuwp .wpshare{display:inline-block;border:1px solid var(--line,#e6e0ea);border-radius:5px;padding:0 4px;font-size:11px}
#illuwp .wpmsg{color:#1F8A55!important;font-weight:600}
#illuwp .wpact{display:flex;gap:8px;align-items:center;margin-left:auto}
#illuwp button{min-height:42px;border-radius:999px;padding:8px 16px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;border:1px solid var(--line,#e6e0ea);background:var(--surf,#fff);color:inherit}
#illuwp .wpon{background:var(--acc,#5A2C57);border-color:var(--acc,#5A2C57);color:#fff}
#illuwp button:disabled{opacity:.6}
`;
  document.head.appendChild(css);
})();
