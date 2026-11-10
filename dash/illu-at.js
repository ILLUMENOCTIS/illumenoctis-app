/* Agency type, as Agencies & Co labels agencies: shown as small chips on each Directory row
   and used by the Directory's "Agency type" filter. a.at is e.g. 'modeling,mother'. */
(function () {
  const LAB = { modeling: 'Modeling / Booking', mother: 'Mother Agency', talent: 'Talent Agency' };
  window.ILLU_AT = LAB;
  const types = a => String((a && a.at) || '').split(',').map(t => t.trim()).filter(t => LAB[t]);
  /* the ticked boxes are read once per redraw, not once per agency: reading them for each of
     1,000 agencies searched the whole page 1,000 times and made every redraw take a second */
  let WANT = null;
  const wantNow = () => {
    if (WANT === null) {
      WANT = Array.from(document.querySelectorAll('input[data-f="atype"]:checked')).map(i => i.value);
      queueMicrotask(() => { WANT = null; });
    }
    return WANT;
  };
  window.illuAtOk = function (a) {
    const want = wantNow();
    if (!want.length) return true;
    const have = types(a);
    return want.some(t => have.includes(t));
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  window.illuAtChips = function (a) {
    const t = types(a);
    return t.length ? '<span class="atchips">' + t.map(x => '<span class="atchip" data-at="' + x + '">' + esc(LAB[x]) + '</span>').join('') + '</span>' : '';
  };
})();
