/* ==================== Colour schemes (1.2.96) ====================
   The user asked for a simple all-white page and interface (6 Nov 2026), and to see several
   colour schemes. Each scheme keeps every page white and changes only the accent colour (buttons,
   the selected menu icon, tabs, links) and its pale tint. The lamps keep their own green, amber
   and red in every scheme. Sepia and dim modes are not touched.
   The scheme is kept per computer (localStorage illu.scheme). */
(function(){
  const S = {
    graphite: {acc: '#111111', wash: '#F1F1F2', name: ['Graphite', '그래파이트']},
    plum:     {acc: '#6A2C66', wash: '#F6EEF5', name: ['Plum', '플럼']},
    cobalt:   {acc: '#2451D6', wash: '#EDF2FE', name: ['Cobalt', '코발트']},
    emerald:  {acc: '#0D7A5F', wash: '#E8F5F0', name: ['Emerald', '에메랄드']},
    coral:    {acc: '#E0533A', wash: '#FDEEEA', name: ['Coral', '코랄']},
    navy:     {acc: '#1F2D4D', wash: '#EEF1F6', name: ['Navy', '네이비']}
  };
  let css = '';
  for(const [k, v] of Object.entries(S)){
    css += `html:not([data-theme])[data-scheme="${k}"]{--paper:#FFFFFF!important;--surf:#FFFFFF!important;--surf2:#F6F6F7!important;--line:#EAEAEC!important;--line2:#F1F1F3!important;` +
      `--ink:#111114!important;--ink2:#38383E!important;--mut:#5F5F68!important;--faint:#8E8E96!important;--acc:${v.acc}!important;--wash:${v.wash}!important;--on-acc:#FFFFFF!important;` +
      `--stagebg:#F6F6F7!important;--cardbg:#FFFFFF!important;--frost:rgba(255,255,255,.86)!important}\n` +
      `html:not([data-theme])[data-scheme="${k}"] body{background:#FFFFFF!important}\n`;
  }
  const st = document.createElement('style'); st.id = 'illu-schemes'; st.textContent = css; document.head.appendChild(st);
  function set(k){ if(!S[k]) k = 'plum'; document.documentElement.dataset.scheme = k; try{ localStorage.setItem('illu.scheme', k); }catch(e){} }
  let k0 = 'plum'; try{ k0 = localStorage.getItem('illu.scheme') || 'plum'; }catch(e){}
  set(k0);
  window.__illuScheme = {set, list: S, get: () => document.documentElement.dataset.scheme};
})();
