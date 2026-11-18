/* ILLUMÉNOCTIS 1.2.216 — download meter and brake (17 Nov 2026).
   On 16 Nov the program used up the free Supabase download allowance (5 GB a month) in one working day and the
   service was blocked. Every request this computer makes to Supabase now goes through here:
   - it is counted (this computer, this billing month) so the usage status can show the team's total;
   - if this computer downloads far more than normal (BRAKE_HOUR in an hour or BRAKE_DAY in a day), reading
     from Supabase pauses until someone presses Resume or restarts the program. Saving still works. A runaway
     loop is then stopped within minutes instead of using up the month.
   - when the whole team has used SAVER_AT of the month, reading pauses on every computer (the program keeps
     working from its own copy) so the allowance is never exceeded.
   Sizes are counted after unpacking, so the numbers are on the high side of what Supabase counts. */
(function () {
'use strict';
const LIMIT = 5 * 1024 ** 3;                 // Supabase free plan: 5 GB downloads a month
const BRAKE_HOUR = 80 * 1024 ** 2;           // one computer, one hour
const BRAKE_DAY = 250 * 1024 ** 2;           // one computer, one day
const SAVER_AT = 0.95;                       // team share of the month at which reading pauses everywhere
const LS = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};
const raw = window.fetch.bind(window);
let cid = LS.get('illu.cid');
if (!cid) { cid = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); LS.set('illu.cid', cid); }

/* The billing month starts on the day Supabase shows under Billing (owner sets it in the usage status). */
function cycleDay() { const d = +(LS.get('illu.usage.cycleDay') || 0); return d >= 1 && d <= 28 ? d : 1; }
function cycleStart(now) {
  const n = now || new Date(), d = cycleDay();
  let y = n.getUTCFullYear(), m = n.getUTCMonth();
  if (n.getUTCDate() < d) { m -= 1; if (m < 0) { m = 11; y -= 1; } }
  return new Date(Date.UTC(y, m, d));
}
function cycleEnd(now) { const s = cycleStart(now); return new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, s.getUTCDate())); }
const monthKey = (now) => cycleStart(now).toISOString().slice(0, 10);
const dayKey = () => new Date().toISOString().slice(0, 10);

const S = {
  month: monthKey(), bytes: 0, day: dayKey(), dayBytes: 0, win: [], braked: '', teamShare: 0, saver: false,
  reqs: 0, fns: new Set()
};
S.bytes = +(LS.get('illu.net.' + S.month) || 0);
S.dayBytes = +(LS.get('illu.netday.' + S.day) || 0);
let saveT = 0;
function persist() {
  clearTimeout(saveT);
  saveT = setTimeout(() => { LS.set('illu.net.' + S.month, String(S.bytes)); LS.set('illu.netday.' + S.day, String(S.dayBytes)); }, 2000);
}
function tell() { for (const fn of S.fns) { try { fn(stats()); } catch (e) {} } }
function brake(why) {
  if (S.braked) return;
  S.braked = why;
  try { console.warn('[illu] downloads paused:', why); } catch (e) {}
  tell();
}
function add(n) {
  if (!(n > 0)) return;
  const mk = monthKey(); if (mk !== S.month) { S.month = mk; S.bytes = 0; }
  const dk = dayKey(); if (dk !== S.day) { S.day = dk; S.dayBytes = 0; }
  S.bytes += n; S.dayBytes += n; S.reqs++;
  const now = Date.now();
  S.win.push([now, n]);
  while (S.win.length && now - S.win[0][0] > 3600e3) S.win.shift();
  const hour = S.win.reduce((s, x) => s + x[1], 0);
  if (hour > BRAKE_HOUR) brake('hour:' + Math.round(hour / 1048576) + 'MB');
  else if (S.dayBytes > BRAKE_DAY) brake('day:' + Math.round(S.dayBytes / 1048576) + 'MB');
  persist();
  if (S.reqs % 20 === 0) tell();
}
function hourBytes() { const now = Date.now(); return S.win.filter(x => now - x[0] <= 3600e3).reduce((s, x) => s + x[1], 0); }
/* reads are paused by the brake or saver; saving, signing in and the usage status still go through */
function isRead(url, init) {
  const m = String((init && init.method) || 'GET').toUpperCase();
  if (/\/auth\/v1\//.test(url) || /\/rpc\/illu_usage/.test(url)) return false;
  if (/\/rest\/v1\/docs\?[^#]*coll=eq\.usage/.test(url)) return false;
  return m === 'GET' || m === 'HEAD';
}
async function counted(input, init) {
  const url = typeof input === 'string' ? input : (input && input.url) || '';
  if ((S.braked || S.saver) && isRead(url, init)) {
    return new Response(JSON.stringify({ message: 'ILLUMENOCTIS: downloads paused (' + (S.braked || 'monthly allowance nearly used') + ')', code: 'ILLU_PAUSED' }),
      { status: 503, headers: { 'content-type': 'application/json' } });
  }
  const r = await raw(input, init);
  try {
    const len = +(r.headers.get('content-length') || 0);
    if (len) add(len);
    else r.clone().arrayBuffer().then(b => add(b.byteLength), () => {});
  } catch (e) {}
  return r;
}
function stats() {
  return { cid, month: S.month, monthEnd: cycleEnd().toISOString().slice(0, 10), bytes: S.bytes, dayBytes: S.dayBytes, hourBytes: hourBytes(),
    braked: S.braked, saver: S.saver, limit: LIMIT, brakeHour: BRAKE_HOUR, brakeDay: BRAKE_DAY, saverAt: SAVER_AT, cycleDay: cycleDay() };
}
window.IlluNet = Object.freeze({
  fetch: counted, add, stats,
  onChange(fn) { S.fns.add(fn); return () => S.fns.delete(fn); },
  resume() { S.braked = ''; S.win.length = 0; S.dayBytes = Math.min(S.dayBytes, BRAKE_DAY / 2); tell(); },
  /* the team's share of the month, from the usage status; at SAVER_AT reading pauses everywhere */
  setTeamShare(share) { S.teamShare = share; const was = S.saver; S.saver = share >= SAVER_AT; if (was !== S.saver) tell(); },
  setCycleDay(d) { LS.set('illu.usage.cycleDay', String(d)); S.month = monthKey(); S.bytes = +(LS.get('illu.net.' + S.month) || 0); tell(); },
  monthKey, cycleStart, cycleEnd, LIMIT
});
})();
