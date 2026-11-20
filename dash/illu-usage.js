/* ILLUMÉNOCTIS 1.2.216 — Supabase usage status (user, 17 Nov 2026: "make sure I can see some sort of status to see
   how much of the supabase storage is being used"; "something like this can never happen again").
   - A chip in the top bar: the share of the month's free download allowance the whole team has used, green / amber / red.
   - Clicking it opens the status: downloads this month (all computers together, and each one), the database and file
     storage against the free plan's limits, the photos and videos in Dropbox, this computer's last hour, and the brake.
   - A banner appears for everyone at 50% (amber) and 80% (red) of any limit; at 95% of downloads every program stops
     reading from Supabase until the month resets (it keeps working from its own copy), so the limit is never crossed.
   Each computer writes what it downloaded to docs usage/<month>_<computer> every 5 minutes; the database size comes
   from the illu_usage() function. Free plan limits (Supabase, Nov 2026): 5 GB downloads a month, 500 MB database,
   1 GB file storage. */
(function () {
'use strict';
if (window.__illuUsage) return;
const NET = window.IlluNet;
if (!NET) return;
const KO = (() => { try { return localStorage.getItem('illum.lang') === 'ko'; } catch (e) { return false; } })();
const T = (en, ko) => KO ? ko : en;
const LIM = { egress: 5 * 1024 ** 3, db: 500 * 1024 ** 2, files: 1024 ** 3 };
const fmt = b => b >= 1024 ** 3 ? (b / 1024 ** 3).toFixed(2) + ' GB' : b >= 1024 ** 2 ? (b / 1024 ** 2).toFixed(b >= 100 * 1024 ** 2 ? 0 : 1) + ' MB' : Math.round(b / 1024) + ' KB';
const pct = (a, b) => b ? Math.min(999, Math.round(a / b * 100)) : 0;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const col = p => p >= 80 ? 'red' : p >= 50 ? 'amber' : 'green';
const S = { team: new Map(), store: null, media: null, mainDays: {}, cycleDay: NET.stats().cycleDay, admin: false, me: '', people: new Map() };
let DB = null;

function myBytes() {
  const st = NET.stats(), start = NET.cycleStart().toISOString().slice(0, 10);
  let main = 0; for (const [d, n] of Object.entries(S.mainDays || {})) if (d >= start) main += n;
  return st.bytes + main;
}
function teamBytes() {
  const m = NET.monthKey(); let sum = 0;
  for (const [id, u] of S.team) if (u && u.m === m && id !== m + '_' + NET.stats().cid) sum += +u.b || 0;
  return sum + myBytes();
}
async function report() {
  if (!DB) return;
  try { if (window.illu && window.illu.netMain) S.mainDays = await window.illu.netMain(); } catch (e) {}
  const st = NET.stats(), m = NET.monthKey(), b = myBytes();
  const prev = S.team.get(m + '_' + st.cid);
  if (prev && prev.b === b && prev.brake === (st.braked || '') && Date.now() - Date.parse(prev.at || 0) < 30 * 60e3) return;
  let ver = ''; try { ver = window.illu && window.illu.info ? (await window.illu.info()).version : ''; } catch (e) {}
  const row = { m, b, cid: st.cid, who: S.me || '', at: new Date().toISOString(), ver, brake: st.braked || '', hour: st.hourBytes, day: st.dayBytes };
  S.team.set(m + '_' + st.cid, row);
  try { await DB.doc('usage/' + m + '_' + st.cid).set(row); } catch (e) {}
}
async function readStore() {
  try {
    const sb = window.__illuSb; if (!sb) return;
    const { data, error } = await sb.rpc('illu_usage');
    if (!error && data) S.store = data;
  } catch (e) {}
  try { if (window.illu && window.illu.mediaUsage) S.media = await window.illu.mediaUsage(); } catch (e) {}
  paint();
}

/* ---------- the chip, the banner and the panel ---------- */
const css = document.createElement('style');
css.textContent = `
#illuusage{display:inline-flex;align-items:center;gap:5px;margin:0 6px;align-self:center;white-space:nowrap;padding:2px 8px;border-radius:10px;font:600 10.5px/1.6 system-ui,-apple-system,sans-serif;letter-spacing:.02em;cursor:pointer;border:1px solid transparent;vertical-align:middle;user-select:none}
#illuusage i{width:7px;height:7px;border-radius:50%;display:inline-block}
#illuusage.green{background:#EAF6EE;color:#25613A;border-color:#CFE8D7}#illuusage.green i{background:#3DA35D}
#illuusage.amber{background:#FFF4E0;color:#7A4B00;border-color:#F3D9A6}#illuusage.amber i{background:#E39B1B}
#illuusage.red{background:#FDE8E8;color:#8A1C1C;border-color:#F3C2C2}#illuusage.red i{background:#D33A3A}
#illuusage.float{position:fixed;left:84px;bottom:12px;z-index:2147483000;box-shadow:0 2px 8px rgba(0,0,0,.12)}@media (max-width:760px){#illuusage.float{left:10px;bottom:70px}}
/* 1.2.266: while all is well (green) the floating status is only its dot, so it never covers a card; the words show on hover, and it is still a click away */
#illuusage.float.green{padding:4px;gap:0;opacity:.8}#illuusage.float.green .t{display:none}
#illuusage.float.green:hover,#illuusage.float.green:focus-visible{padding:2px 8px;gap:5px;opacity:1}#illuusage.float.green:hover .t,#illuusage.float.green:focus-visible .t{display:inline}
#illuubar{position:fixed;left:50%;transform:translateX(-50%);top:8px;z-index:2147483001;max-width:min(760px,calc(100vw - 32px));padding:9px 14px;border-radius:10px;font:500 13px/1.45 system-ui,-apple-system,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.18);display:flex;gap:12px;align-items:center}
#illuubar.amber{background:#FFF4E0;color:#5C3A00;border:1px solid #F3D9A6}#illuubar.red{background:#FDE8E8;color:#701515;border:1px solid #F3C2C2}
#illuubar button{font:600 12px system-ui,sans-serif;border-radius:7px;padding:4px 10px;cursor:pointer;border:1px solid currentColor;background:transparent;color:inherit;white-space:nowrap}
#illuupanel{position:fixed;inset:0;z-index:2147483002;background:rgba(20,12,24,.35);display:flex;align-items:flex-start;justify-content:center;padding:60px 16px;overflow:auto}
#illuupanel .iu-box{background:#fff;color:#211C26;border-radius:14px;max-width:560px;width:100%;padding:18px 20px 16px;box-shadow:0 18px 60px rgba(0,0,0,.3);font:13px/1.5 system-ui,-apple-system,sans-serif}
#illuupanel h3{margin:0 0 2px;font:600 16px/1.3 system-ui,sans-serif;color:#5A2C57}#illuupanel .iu-sub{color:#777;font-size:12px;margin-bottom:12px}
#illuupanel .iu-row{margin:10px 0}#illuupanel .iu-lab{display:flex;justify-content:space-between;gap:10px;font-weight:600}#illuupanel .iu-lab span{font-weight:500;color:#555}
#illuupanel .iu-bar{height:8px;border-radius:5px;background:#EEE9F1;overflow:hidden;margin-top:4px}#illuupanel .iu-bar b{display:block;height:100%;border-radius:5px}
#illuupanel .iu-bar b.green{background:#3DA35D}#illuupanel .iu-bar b.amber{background:#E39B1B}#illuupanel .iu-bar b.red{background:#D33A3A}
#illuupanel .iu-note{color:#777;font-size:11.5px;margin-top:3px}#illuupanel table{width:100%;border-collapse:collapse;font-size:12px;margin-top:4px}#illuupanel td{padding:2px 0;border-bottom:1px solid #F1EDF3}#illuupanel td:last-child{text-align:right}
#illuupanel .iu-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}#illuupanel button,#illuupanel select{font:600 12px system-ui,sans-serif;border-radius:8px;padding:5px 12px;cursor:pointer;border:1px solid #CDBFD3;background:#fff;color:#5A2C57}
#illuupanel button.pri{background:#5A2C57;color:#fff;border-color:#5A2C57}#illuupanel .iu-warn{background:#FDE8E8;color:#701515;border-radius:8px;padding:8px 10px;margin:8px 0}
html[data-theme="dim"] #illuupanel .iu-box{background:#2E2836;color:#EEE9F3}html[data-theme="dim"] #illuupanel .iu-bar{background:#463E51}html[data-theme="dim"] #illuupanel td{border-color:#463E51}
`;
document.head.appendChild(css);

let chip = null, bar = null, panel = null, dismissed = '';
function placeChip() {
  /* a small pill at the bottom left, beside the side bar: always in view, never in the way */
  if (chip && document.body.contains(chip)) return;
  chip = document.createElement('span'); chip.id = 'illuusage'; chip.title = T('Supabase usage - click for the status', 'Supabase 사용량 - 클릭하면 상태를 봅니다');
  chip.addEventListener('click', openPanel);
  chip.classList.add('float'); document.body.appendChild(chip);
}
function levels() {
  const team = teamBytes(), st = S.store || {};
  return {
    team, egress: pct(team, LIM.egress),
    db: st.db_bytes != null ? pct(st.db_bytes, LIM.db) : 0,
    files: st.files_bytes != null ? pct(st.files_bytes, LIM.files) : 0
  };
}
function paint() {
  placeChip();
  const L = levels(), worst = Math.max(L.egress, L.db, L.files), st = NET.stats();
  NET.setTeamShare(L.team / LIM.egress);
  chip.className = (chip.classList.contains('float') ? 'float ' : '') + (st.braked || st.saver ? 'red' : col(worst));
  chip.innerHTML = '<i></i><span class="t">' + esc(T('Supabase ', 'Supabase ') + worst + '%') + '</span>';
  /* banner */
  let msg = '', cls = '', key = '', resume = false;
  if (st.braked) { cls = 'red'; key = 'brake'; resume = true; msg = T('Downloads from Supabase are paused on this computer: it downloaded far more than normal (' + esc(st.braked.replace(/^(hour|day):/, '')) + ' in the last ' + (/^day/.test(st.braked) ? 'day' : 'hour') + '). The program keeps working from its own copy.', '이 컴퓨터의 Supabase 다운로드가 일시 중지되었습니다: 평소보다 훨씬 많이 다운로드했습니다 (' + esc(st.braked.replace(/^(hour|day):/, '')) + '). 프로그램은 저장된 사본으로 계속 작동합니다.'); }
  else if (st.saver) { cls = 'red'; key = 'saver'; msg = T('95% of this month’s free Supabase downloads are used. Every program now works from its own copy and stops reading from Supabase until ' + st.monthEnd + ', so the limit is never crossed. Changes you save still go through.', '이번 달 Supabase 무료 다운로드의 95%를 사용했습니다. ' + st.monthEnd + '까지 모든 프로그램은 저장된 사본으로 작동합니다. 저장은 계속됩니다.'); }
  else if (worst >= 80) { cls = 'red'; key = 'r80'; msg = T('Supabase free plan: ' + worst + '% used (' + (L.egress >= 80 ? 'downloads' : L.db >= 80 ? 'database' : 'file storage') + '). Open the status to see what is using it.', 'Supabase 무료 한도 ' + worst + '% 사용. 상태를 열어 확인하세요.'); }
  else if (worst >= 50) { cls = 'amber'; key = 'a50'; msg = T('Supabase free plan: ' + worst + '% used this month.', 'Supabase 무료 한도: 이번 달 ' + worst + '% 사용.'); }
  const dk = key + '|' + NET.monthKey();
  if (msg && !(key === 'a50' && dismissed === dk)) {
    if (!bar) { bar = document.createElement('div'); bar.id = 'illuubar'; document.body.appendChild(bar); }
    bar.className = cls;
    bar.innerHTML = '<span>' + msg + '</span>' + (resume ? '<button data-u="resume">' + T('Resume', '다시 시작') + '</button>' : '') +
      '<button data-u="open">' + T('Status', '상태') + '</button>' + (key === 'a50' ? '<button data-u="hide">' + T('Hide', '숨기기') + '</button>' : '');
    bar.onclick = e => { const u = e.target && e.target.dataset && e.target.dataset.u; if (u === 'resume') { NET.resume(); paint(); } else if (u === 'open') openPanel(); else if (u === 'hide') { dismissed = dk; try { localStorage.setItem('illu.usage.hide', dk); } catch (x) {} paint(); } };
    notifyOnce(key, msg);
  } else if (bar) { bar.remove(); bar = null; }
  if (panel) fillPanel();
}
function notifyOnce(key, msg) {
  if (!/^(r80|saver|brake)$/.test(key)) return;
  const k = 'illu.usage.told.' + key + '.' + NET.monthKey() + (key === 'brake' ? '.' + new Date().toISOString().slice(0, 13) : '');
  try { if (localStorage.getItem(k)) return; localStorage.setItem(k, '1'); } catch (e) { return; }
  try { new Notification('ILLUMÉNOCTIS', { body: msg.replace(/<[^>]+>/g, '') }); } catch (e) {}
}
function line(label, used, limit, note) {
  const p = pct(used, limit);
  return '<div class="iu-row"><div class="iu-lab">' + esc(label) + '<span>' + fmt(used) + ' ' + T('of', '/') + ' ' + fmt(limit) + ' · ' + p + '%</span></div>' +
    '<div class="iu-bar"><b class="' + col(p) + '" style="width:' + Math.min(100, p) + '%"></b></div>' + (note ? '<div class="iu-note">' + note + '</div>' : '') + '</div>';
}
function fillPanel() {
  const st = NET.stats(), L = levels(), s = S.store || {}, m = NET.monthKey(), lv = window.__illuLive && window.__illuLive.stats ? window.__illuLive.stats() : null;
  const rows = [...S.team.values()].filter(u => u && u.m === m).sort((a, b) => (b.b || 0) - (a.b || 0));
  const who = u => (S.people.get(u.who) || u.who || '?') + (u.cid === st.cid ? T(' (this computer)', ' (이 컴퓨터)') : '');
  let h = '<h3>' + T('Supabase usage', 'Supabase 사용량') + '</h3><div class="iu-sub">' + T('Free plan · billing month ' + m + ' to ' + st.monthEnd, '무료 플랜 · 청구 기간 ' + m + ' ~ ' + st.monthEnd) + '</div>';
  if (st.braked) h += '<div class="iu-warn">' + T('Downloads are paused on this computer (unusual traffic: ' + esc(st.braked) + ').', '이 컴퓨터의 다운로드가 일시 중지되었습니다 (' + esc(st.braked) + ').') + '</div>';
  if (st.saver) h += '<div class="iu-warn">' + T('95% of the month’s downloads used: reading from Supabase is paused on every computer until ' + st.monthEnd + '.', '이번 달 다운로드 95% 사용: ' + st.monthEnd + '까지 모든 컴퓨터에서 읽기가 중지됩니다.') + '</div>';
  h += line(T('Downloads this month (all computers)', '이번 달 다운로드 (모든 컴퓨터)'), L.team, LIM.egress, T('Counted by each computer; slightly above what Supabase counts. Reading pauses everywhere at 95%.', '각 컴퓨터가 집계합니다. 95%에서 모든 컴퓨터의 읽기가 중지됩니다.'));
  if (rows.length) h += '<table>' + rows.map(u => '<tr><td>' + esc(who(u)) + (u.brake ? ' ⏸' : '') + (u.ver ? ' <span style="color:#999">' + esc(u.ver) + '</span>' : '') + '</td><td>' + fmt(u.b || 0) + '</td></tr>').join('') + '</table>';
  h += line(T('Database', '데이터베이스'), s.db_bytes || 0, LIM.db);
  h += line(T('Files in Supabase', 'Supabase 파일'), s.files_bytes || 0, LIM.files, T('Older update files and photos saved before 1.2.216 (being moved to Dropbox). New photos and videos go to Dropbox.', '1.2.216 이전에 저장된 업데이트 파일과 사진 (Dropbox로 옮기는 중). 새 사진과 동영상은 Dropbox에 저장됩니다.'));
  const md = S.media;
  h += '<div class="iu-row"><div class="iu-lab">' + T('Photos & videos in Dropbox', 'Dropbox 사진·동영상') + '<span>' + (md && md.ok ? md.files + T(' files · ', '개 · ') + fmt(md.bytes) : esc((md && md.why) || '…')) + '</span></div>' +
    (md && md.pending ? '<div class="iu-note">' + md.pending + T(' waiting to be sent to Dropbox from this computer', '개가 이 컴퓨터에서 Dropbox로 전송 대기 중') + '</div>' : '') + '</div>';
  h += '<div class="iu-row"><div class="iu-lab">' + T('This computer', '이 컴퓨터') + '<span>' + T('last hour ', '최근 1시간 ') + fmt(st.hourBytes) + ' · ' + T('today ', '오늘 ') + fmt(st.dayBytes) + '</span></div>' +
    '<div class="iu-note">' + T('Automatic brake: ' + fmt(st.brakeHour) + ' in an hour or ' + fmt(st.brakeDay) + ' in a day.', '자동 제동: 1시간 ' + fmt(st.brakeHour) + ' 또는 하루 ' + fmt(st.brakeDay)) +
    (lv ? ' · ' + T('Live connection ', '실시간 연결 ') + (lv.up ? T('on', '켜짐') : T('reconnecting', '재연결 중')) + (lv.restarts ? ' (' + lv.restarts + T(' restarts', '회 재시작') + ')' : '') : '') + '</div></div>';
  if (S.admin) {
    h += '<div class="iu-row"><div class="iu-lab">' + T('Billing month starts on day', '청구 기간 시작일') + '<span><select data-u="day">' + Array.from({ length: 28 }, (_, i) => '<option' + (i + 1 === st.cycleDay ? ' selected' : '') + '>' + (i + 1) + '</option>').join('') + '</select></span></div>' +
      '<div class="iu-note">' + T('Use the date Supabase shows under Organization → Billing → Upcoming Invoice.', 'Supabase → Organization → Billing → Upcoming Invoice에 표시된 날짜를 사용하세요.') + '</div></div>';
  }
  if (S.admin) {
    const fb = (s.files_by_bucket || {});
    h += '<div class="iu-row"><div class="iu-lab">' + T('Owner: free up Supabase storage', '관리자: Supabase 저장 공간 정리') + '</div>' +
      '<div class="iu-note">' + T('Older photos and videos (' + fmt(fb.assets || 0) + ') are copied into Dropbox MEDIA and then removed from Supabase. Older update files (' + fmt(fb.releases || 0) + '): only the newest three are kept.', '이전 사진·동영상(' + fmt(fb.assets || 0) + ')을 Dropbox MEDIA로 복사한 뒤 Supabase에서 삭제합니다. 이전 업데이트 파일(' + fmt(fb.releases || 0) + '): 최신 3개만 남깁니다.') + '</div>' +
      (MOVE.msg ? '<div class="iu-note"><b>' + esc(MOVE.msg) + '</b></div>' : '') +
      '<div class="iu-btns" style="justify-content:flex-start">' + (MOVE.busy ? '<button data-u="stop">' + T('Stop', '중지') + '</button>' : '<button data-u="move">' + T('Move older photos to Dropbox', '이전 사진 Dropbox로 옮기기') + '</button><button data-u="prune">' + T('Remove older updates', '이전 업데이트 삭제') + '</button>') + '</div></div>';
  }
  h += '<div class="iu-btns">' + (st.braked ? '<button data-u="resume" class="pri">' + T('Resume downloads', '다운로드 다시 시작') + '</button>' : '') + '<button data-u="again">' + T('Check again', '다시 확인') + '</button><button data-u="close">' + T('Close', '닫기') + '</button></div>';
  panel.querySelector('.iu-box').innerHTML = h;
}
function openPanel() {
  if (panel) return;
  panel = document.createElement('div'); panel.id = 'illuupanel'; panel.innerHTML = '<div class="iu-box"></div>';
  panel.addEventListener('click', async e => {
    if (e.target === panel) { closePanel(); return; }
    const u = e.target && e.target.dataset && e.target.dataset.u;
    if (u === 'close') closePanel();
    else if (u === 'resume') { NET.resume(); paint(); }
    else if (u === 'again') { await report(); await readStore(); }
    else if (u === 'move') moveOld();
    else if (u === 'stop') { MOVE.stop = true; }
    else if (u === 'prune') pruneReleases();
  });
  panel.addEventListener('change', e => {
    if (e.target && e.target.dataset.u === 'day') {
      const d = +e.target.value; NET.setCycleDay(d);
      if (DB && S.admin) DB.doc('cfg/usage').set({ day: d, by: S.me, at: new Date().toISOString() }).catch(() => {});
      paint();
    }
  });
  addEventListener('keydown', escClose);
  document.body.appendChild(panel); fillPanel(); readStore();
}
function escClose(e) { if (e.key === 'Escape') closePanel(); }
function closePanel() { if (panel) panel.remove(); panel = null; removeEventListener('keydown', escClose); }

/* ---------- owner: move older Supabase files to Dropbox, remove older update files ---------- */
const MOVE = { busy: false, stop: false, msg: '' };
async function moveOld() {
  const sb = window.__illuSb;
  if (MOVE.busy || !sb || !S.admin || !(window.illu && window.illu.mediaMigrate)) return;
  MOVE.busy = true; MOVE.stop = false; MOVE.msg = T('Listing the older files…', '이전 파일 목록을 읽는 중…'); paint();
  try {
    const ids = [];
    for (let off = 0; ; off += 1000) {
      const { data, error } = await sb.storage.from('assets').list('', { limit: 1000, offset: off });
      if (error) throw new Error(error.message);
      for (const f of data || []) if (f && f.id && f.name) ids.push(f.name);
      if (!data || data.length < 1000) break;
    }
    /* the ids model photos use (docs photos/*) go to MODEL PHOTOS, everything else to BOOKING FILES */
    const model = new Set();
    try { const snap = await DB.collection('photos').get(); for (const d of snap.docs) { const v = d.data() || {}; for (const x of Object.values(v.e || {})) if (typeof x === 'string') model.add(x.replace(/^\/_blob\//, '')); } } catch (e) {}
    let done = 0, failed = 0; const moved = [];
    for (const id of ids) {
      if (MOVE.stop) break;
      const r = await window.illu.mediaMigrate(id, model.has(id) ? 'model' : 'booking');
      if (r && r.ok) { moved.push(id); done++; } else failed++;
      if (moved.length >= 50) { await sb.storage.from('assets').remove(moved.splice(0)); }
      MOVE.msg = T('Moved ' + done + ' of ' + ids.length + (failed ? ' · ' + failed + ' not moved' : ''), ids.length + '개 중 ' + done + '개 이동' + (failed ? ' · ' + failed + '개 실패' : '')); if (panel) fillPanel();
    }
    if (moved.length) await sb.storage.from('assets').remove(moved.splice(0));
    MOVE.msg = (MOVE.stop ? T('Stopped. ', '중지됨. ') : T('Done. ', '완료. ')) + MOVE.msg;
  } catch (e) { MOVE.msg = T('Could not finish: ', '완료하지 못함: ') + String(e && e.message || e); }
  MOVE.busy = false; await readStore();
}
async function pruneReleases() {
  const sb = window.__illuSb; if (!sb || !S.admin) return;
  try {
    const { data, error } = await sb.from('app_releases').select('version,path');
    if (error) throw new Error(error.message);
    const cmpv = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
    const all = (data || []).filter(x => /^\d+\.\d+\.\d+$/.test(x.version)).sort((a, b) => cmpv(b.version, a.version)), old = all.slice(3);
    if (!old.length) { MOVE.msg = T('Only the newest three updates are online already.', '이미 최신 3개만 있습니다.'); paint(); return; }
    if (!confirm(T('Remove ' + old.length + ' older update files from Supabase? The newest three (' + all.slice(0, 3).map(x => x.version).join(', ') + ') stay.', '이전 업데이트 파일 ' + old.length + '개를 삭제할까요? 최신 3개(' + all.slice(0, 3).map(x => x.version).join(', ') + ')는 남습니다.'))) return;
    const paths = old.map(x => x.path).filter(Boolean);
    for (let i = 0; i < paths.length; i += 100) await sb.storage.from('releases').remove(paths.slice(i, i + 100));
    await sb.from('app_releases').delete().in('version', old.map(x => x.version));
    MOVE.msg = T('Removed ' + old.length + ' older updates.', '이전 업데이트 ' + old.length + '개 삭제.');
  } catch (e) { MOVE.msg = T('Could not remove: ', '삭제하지 못함: ') + String(e && e.message || e); }
  await readStore();
}

/* ---------- start ---------- */
async function start() {
  try { dismissed = localStorage.getItem('illu.usage.hide') || ''; } catch (e) {}
  try { DB = await window.claude.use('db'); } catch (e) { DB = null; }
  try { S.me = localStorage.getItem('illum.me') || ''; } catch (e) {}
  S.admin = !!(S.me && window.__ILLU_ADMIN && S.me === window.__ILLU_ADMIN);
  if (DB) {
    DB.collection('usage').onSnapshot(snap => { S.team.clear(); for (const d of snap.docs) S.team.set(d.id, d.data()); paint(); }, () => {});
    DB.doc('cfg/usage').onSnapshot(s => { const v = s && s.exists ? s.data() : null; if (v && v.day && v.day !== NET.stats().cycleDay) { NET.setCycleDay(v.day); paint(); } }, () => {});
    DB.collection('people').onSnapshot(snap => { for (const d of snap.docs) { const v = d.data() || {}; if (v.n) S.people.set(d.id, v.n); } }, () => {});
  }
  NET.onChange(() => paint());
  paint();
  setTimeout(report, 30e3); setInterval(report, 5 * 60e3);
  setTimeout(readStore, 20e3); setInterval(readStore, 30 * 60e3);
  setInterval(paint, 60e3);
  addEventListener('pagehide', () => { report(); });
}
window.__illuUsage = { open: openPanel, paint, report, stats: () => ({ team: teamBytes(), mine: myBytes(), store: S.store, media: S.media }) };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
