
    // ————————————————
    // Helpers
    // ————————————————
    const $ = (sel, root=document) => root.querySelector(sel);
    const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

    function detectType(url) {
      if (!url) return 'video/mp4';
      const u = url.toLowerCase();
      if (/\.m3u8(\?|$)/.test(u)) return 'application/x-mpegURL'; // HLS
      if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(u)) return 'video/youtube';
      if (/\.(mp4|m4v|mov)(\?|$)/.test(u)) return 'video/mp4';
      if (/\.(webm)(\?|$)/.test(u)) return 'video/webm';
      if (/\.(mp3|m4a|aac)(\?|$)/.test(u)) return 'audio/mpeg';
      if (/\.mpd(\?|$)/.test(u)) return 'application/dash+xml'; // non garanti
      return 'video/mp4';
    }

    function prettyUrl(url, max=88){
      if (!url) return '';
      try { const u = new URL(url); return u.origin + u.pathname + (u.search ? '…' : ''); } catch { return url.length>max ? url.slice(0,max)+'…' : url; }
    }

    function normalizeYouTubeUrl(u){
  if (!u) return '';
  try{
    const s = String(u).trim();

    // yt://ID ou yt://watch/ID
    if (/^yt:\/\//i.test(s)){
      const id = s.replace(/^yt:\/\//i,'').replace(/^watch\//i,'');
      return 'https://www.youtube.com/watch?v=' + id;
    }

    // youtu.be/ID
    let m = s.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/i);
    if (m) return 'https://www.youtube.com/watch?v=' + m[1];

    // youtube.com/shorts/ID
    m = s.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/i);
    if (m) return 'https://www.youtube.com/watch?v=' + m[1];

    // youtube.com/live/ID
    m = s.match(/youtube\.com\/live\/([A-Za-z0-9_-]{6,})/i);
    if (m) return 'https://www.youtube.com/watch?v=' + m[1];

    // plugin://…?video_id=ID
    m = s.match(/plugin:\/\/(?:plugin\.video\.youtube|youtube)\/\?video_id=([A-Za-z0-9_-]{6,})/i);
    if (m) return 'https://www.youtube.com/watch?v=' + m[1];

    return s; // ← pas YouTube : on ne change rien
  }catch{ return u; }
}

    // ————————————————
    // ✅ Fit viewport: calcule les variables CSS dynamiques
    // ————————————————
    function updateViewportVars(){
      const nav  = document.querySelector('.navbar');
      const main = document.querySelector('main.container');
      const bar  = document.getElementById('zapbar');

      const navH = nav ? Math.round(nav.getBoundingClientRect().height) : 0;
      const cs   = main ? getComputedStyle(main) : null;
      const padY = cs ? (parseFloat(cs.paddingTop) || 0) : 0;

      const barRect = bar ? bar.getBoundingClientRect() : null;
      const tipH  = barRect ? Math.round(barRect.height) : 0;
      const tipMT = bar ? (parseFloat(getComputedStyle(bar).marginTop) || 0) : 0;

      document.documentElement.style.setProperty('--navH',  navH + 'px');
      document.documentElement.style.setProperty('--padY',  padY + 'px');
      document.documentElement.style.setProperty('--tipH',  tipH + 'px');
      document.documentElement.style.setProperty('--tipMT', tipMT + 'px');
      document.documentElement.style.setProperty('--availH',
        `calc(100svh - ${navH}px - ${(padY*2)}px - ${tipH}px - ${tipMT}px)`
      );
    }

    window.addEventListener('resize',            updateViewportVars, { passive: true });
    window.addEventListener('orientationchange', updateViewportVars, { passive: true });
    document.addEventListener('DOMContentLoaded', updateViewportVars);
    window.addEventListener('load',               updateViewportVars);

    // --- Centre nav
    function syncNavEdges(){
      const L = document.querySelector('.nav-left');
      const R = document.querySelector('.nav-right');
      const lw = L ? Math.ceil(L.getBoundingClientRect().width) : 0;
      const rw = R ? Math.ceil(R.getBoundingClientRect().width) : 0;
      const edge = Math.max(lw, rw);
      document.documentElement.style.setProperty('--edgeW', edge + 'px');
    }
    window.addEventListener('resize', syncNavEdges, { passive: true });
    document.addEventListener('DOMContentLoaded', syncNavEdges);
    window.addEventListener('load', syncNavEdges);
// ===== Apparence: thème & contraste =====
(() => {
  const THEME_KEY = 'ui:theme';       // 'auto' | 'light' | 'dark'
  const CONTR_KEY = 'ui:contrast';    // 'normal' | 'high'
  const $id = (x)=>document.getElementById(x);

  function get(k, d){ try{ return localStorage.getItem(k) ?? d; }catch{ return d; } }
  function set(k, v){ try{ localStorage.setItem(k, v); }catch{} }

  function effectiveTheme(pref){
    if (pref === 'auto'){
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return (pref==='light' || pref==='dark') ? pref : 'dark';
  }

  function applyAppearance(){
    const pref = get(THEME_KEY, 'dark');
    const contrast = get(CONTR_KEY, 'normal');
    const mode = effectiveTheme(pref);
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    root.setAttribute('data-contrast', contrast === 'high' ? 'high' : 'normal');

    // sync UI
    const map = { auto: $id('thAuto'), light: $id('thLight'), dark: $id('thDark') };
    Object.values(map).forEach(el => el && (el.checked = false));
    if (map[pref]) map[pref].checked = true;
    const hc = $id('hcToggle');
    if (hc) hc.checked = (contrast === 'high');
  }

  // Init at start
  applyAppearance();

  // Listen system changes (only when auto)
  try{
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', () => {
      if (get(THEME_KEY,'auto')==='auto') applyAppearance();
    });
  }catch(_){}

  // Wire controls if present
  document.addEventListener('DOMContentLoaded', () => {
    ['thAuto','thLight','thDark'].forEach(id=>{
      const el = $id(id);
      el?.addEventListener('change', (e)=>{
        if (!e.target.checked) return;
        set(THEME_KEY, e.target.value);
        applyAppearance();
      });
    });
    $id('hcToggle')?.addEventListener('change', (e)=>{
      set(CONTR_KEY, e.target.checked ? 'high' : 'normal');
      applyAppearance();
    });
    // 1er rendu cohérent si le dropdown a été injecté après
    applyAppearance();
  });
})();

    // ————————————————
    // Video.js init
    // ————————————————
   
    // — Video.js init
   const player = videojs('player', {
   fill: true,
   controls: true,
   preload: 'auto',
   inactivityTimeout: 2500,
   playbackRates: [0.75, 1, 1.25, 1.5, 2],
   techOrder: ['youtube','html5'],
   youtube: { playsinline: 1, iv_load_policy: 3, ytControls: 2 }
});

    player.on('userinactive', () => $('.player-wrap').classList.add('user-inactive'));
    player.on('useractive',   () => $('.player-wrap').classList.remove('user-inactive'));
    // ==============================
    // Mini-player dock (aperçu au survol des listes)
    // ==============================
    let miniPlayer = null;
    const miniDock = document.getElementById('miniDock');

    function ensureMiniPlayer(){
      if (miniPlayer) return miniPlayer;
      try{
        miniPlayer = videojs('miniPlayer', {
          fill: true,
          controls: false,
          preload: 'auto',
          autoplay: true,
          muted: true,
          loop: true,
          inactivityTimeout: 0
        });
      }catch(_){}
      return miniPlayer;
    }

    let __hideMiniTO = null;
    function showMiniPreview(url){
      if (!url || !miniDock) return;
      clearTimeout(__hideMiniTO);
      const mp = ensureMiniPlayer();
      try{
        const t = detectType(url);
        mp.pause();
        mp.muted(true);
        mp.src({ src: url, type: t });
        mp.play()?.catch(()=>{});
      }catch(_){}
      miniDock.classList.remove('d-none');
      requestAnimationFrame(()=> miniDock.classList.add('visible'));
    }
    function hideMiniPreview(){
      if (!miniDock) return;
      miniDock.classList.remove('visible');
      __hideMiniTO = setTimeout(()=>{
        if (!miniDock.classList.contains('visible')){
          miniDock.classList.add('d-none');
          try{ miniPlayer?.pause(); }catch(_){}
        }
      }, 140);
    }

    function wirePreviewHover(containerId){
      const el = document.getElementById(containerId);
      if (!el) return;
      el.addEventListener('mouseover', (e)=>{
        const btn = e.target.closest('button[data-url]');
        if (!btn) return;
        const url = decodeURIComponent(btn.getAttribute('data-url')||'');
        if (url) showMiniPreview(url);
      });
      el.addEventListener('mouseleave', ()=>{
        hideMiniPreview();
      });
    }

    // Branchements pour les trois listes
    wirePreviewHover('channelList');
    wirePreviewHover('channelList2');
    wirePreviewHover('inlineChannelList');

// --- Plein écran Page / Player
const btnFsPage   = document.getElementById('btnFsPage');
const btnFsPlayer = document.getElementById('btnFsPlayer');

function setPressed(btn, on){
  btn?.setAttribute('aria-pressed', on ? 'true' : 'false');
}

function togglePageFullscreen(){
  if (!document.fullscreenElement){
    document.documentElement.requestFullscreen?.().catch(()=>{});
  } else {
    document.exitFullscreen?.().catch(()=>{});
  }
}

function togglePlayerFullscreen(){
  try{
    if (player.isFullscreen && player.isFullscreen()){
      player.exitFullscreen();
    } else if (player.requestFullscreen){
      player.requestFullscreen();
    } else {
      // Fallback standard sur l’élément du player
      player.el()?.requestFullscreen?.();
    }
  }catch(_){}
}

// sync visuel
document.addEventListener('fullscreenchange', ()=>{
  const isDocFS = !!document.fullscreenElement;
  setPressed(btnFsPage, isDocFS && document.fullscreenElement === document.documentElement);
  // Si le FS est pris par le player, Video.js gère l'UI ; on met l'état "pressed" si l'élément FS est le conteneur du player
  const isPlayerFS = !!document.fullscreenElement && player && player.el && (document.fullscreenElement === player.el());
  setPressed(btnFsPlayer, isPlayerFS || (player.isFullscreen && player.isFullscreen()));
});

btnFsPage?.addEventListener('click', togglePageFullscreen);
btnFsPlayer?.addEventListener('click', togglePlayerFullscreen);

    // ————————————————
    // Zapping: état global
    // ————————————————
    let channels = [];
    let filteredChannels = [];
    let currentIndex = -1;

    const btnPrev = $('#btnPrev');
    const btnNext = $('#btnNext');
    const zapTitleEl = $('#zapTitle');

    function setZapTitle(text){ zapTitleEl.textContent = text || '—'; }
    function updateZapButtonsState(){
      const has = filteredChannels.length > 0;
      if (btnPrev) btnPrev.disabled = !has;
      if (btnNext) btnNext.disabled = !has;
    }

    function goToIndex(idx){
      if (!filteredChannels.length) return;
      const len = filteredChannels.length;
      currentIndex = ((idx % len) + len) % len;
      const c = filteredChannels[currentIndex];
      if (!c) return;
      loadSource(c.url, c.logo || '', c.name || 'Chaîne');
    }

    function goPrev(){ if (!filteredChannels.length) return; goToIndex(currentIndex >= 0 ? currentIndex - 1 : 0); }
    function goNext(){ if (!filteredChannels.length) return; goToIndex(currentIndex >= 0 ? currentIndex + 1 : 0); }

    if (btnPrev) btnPrev.addEventListener('click', goPrev);
    if (btnNext) btnNext.addEventListener('click', goNext);

    document.addEventListener('keydown', (e)=>{
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    });

    function loadSource(url, logo='', name='') {
      if (!url) return;
      const type = detectType(url);

      if (type === 'application/dash+xml') {
        console.warn('Flux DASH détecté (.mpd). Si la lecture échoue, utilisez un flux HLS (.m3u8) ou MP4.');
      }

      player.pause();
      player.src({ src: url, type });
      player.poster('https://cdn.futura-sciences.com/sources/images/iptv.jpeg');
      player.play().catch(()=>{});

      $('#nowPlaying').textContent = name || 'Lecture URL personnalisée';
      $('#nowUrl').textContent = prettyUrl(url);

      const logoImg = $('#channelLogo');
      if (logo) {
        logoImg.src = logo;
        logoImg.classList.remove('d-none');
      } else {
        logoImg.classList.add('d-none');
      }

      $('#nowbar').classList.remove('d-none');

      setZapTitle(name || 'Lecture personnalisée');

      const idx = filteredChannels.findIndex(c => c.url === url);
      currentIndex = idx;

      updateViewportVars();
    }
// Ferme le panneau offcanvas si ouvert
function closePanel(){
  const el = document.getElementById('panel');
  if (!el || typeof bootstrap === 'undefined') return;
  const oc = bootstrap.Offcanvas.getOrCreateInstance(el);
  oc.hide();
}

    // URL + Fichier local
    $('#btnPlay').addEventListener('click', () => {
      const url = $('#inputUrl').value.trim();
      if (url) loadSource(url);
    });

    $('#inputFile').addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      loadSource(url, '', file.name);
    });

    // ————————————————
    // M3U parsing & UI
    // ————————————————
    async function parseM3U(text){
      const out = [];
      let current = null;
      const lines = text.split(/\r?\n/);
      for (const line of lines){
        if (!line || line.startsWith('#EXTM3U')) continue;
        if (line.startsWith('#EXTINF')){
          const attrs = Object.fromEntries(Array.from(line.matchAll(/(\w[\w-]*)\s*=\s*"([^"]*)"/g)).map(m=>[m[1], m[2]]));
          const name = (line.split(',')[1] || attrs['tvg-name'] || 'Sans nom').trim();
          current = { name, group: attrs['group-title'] || 'Divers', logo: attrs['tvg-logo'] || '' };
        } else if (current && !line.startsWith('#')){
          current.url = line.trim();
          out.push(current);
          current = null;
        }
      }
      return out;
    }

    function renderCategories(chans, sel1, sel2){
      const groups = ['Toutes', ...Array.from(new Set(chans.map(c=>c.group))).sort((a,b)=>a.localeCompare(b))];
      for (const sel of [sel1, sel2]){
        if (!sel) continue;
        sel.innerHTML = groups.map(g=>`<option value="${g}">${g}</option>`).join('');
      }
    }

    function renderChannels(chans, container1, container2, activeGroup='Toutes', q=''){
      const match = (c) => (activeGroup==='Toutes' || c.group===activeGroup) && (!q || c.name.toLowerCase().includes(q.toLowerCase()));
      const list = chans.filter(match);

      function toItem(c){
        const logo = c.logo ? `<img src="${c.logo}" alt="" class="me-2" style="height:18px;width:18px;object-fit:contain;border-radius:3px;"/>` : '';
        return `<button type="button" class="list-group-item list-group-item-action d-flex align-items-center" data-url="${encodeURIComponent(c.url)}" data-logo="${encodeURIComponent(c.logo||'')}" data-name="${encodeURIComponent(c.name)}">
          ${logo}<span class="flex-grow-1 text-start">${c.name}</span>
          <span class="badge rounded-pill badge-geo">${c.group||'—'}</span>
        </button>`;
      }

      for (const container of [container1, container2]){
        if (!container) continue;
        container.innerHTML = list.map(toItem).join('') || `<div class="tiny">Aucun résultat…</div>`;
      }

      filteredChannels = list;
      updateZapButtonsState();

      if (currentIndex >= 0) {
        const cur = filteredChannels[currentIndex];
        if (!cur) currentIndex = -1;
      }

      for (const container of [container1, container2]){
        if (!container) continue;
        container.onclick = (e) => {
          const btn = e.target.closest('button[data-url]');
          if (!btn) return;
          const url = decodeURIComponent(btn.getAttribute('data-url'));
          const logo = decodeURIComponent(btn.getAttribute('data-logo')||'');
          const name = decodeURIComponent(btn.getAttribute('data-name'));
          currentIndex = filteredChannels.findIndex(c => c.url === url);
          loadSource(url, logo, name);
          closePanel();
          };
      }
    }

    async function loadM3UFromUrl(url){
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP '+res.status);
        const txt = await res.text();
        channels = await parseM3U(txt);
        renderCategories(channels, $('#categorySelect'), $('#categorySelect2'));
        renderChannels(channels, $('#channelList'), $('#channelList2'));
        updateViewportVars();
      } catch (err){
        console.error(err);
        alert('Impossible de charger la playlist. Certaines sources bloquent le CORS. Essayez de la télécharger et d\'utiliser le bouton "Choisir un fichier".');
      }
    }

    async function loadM3UFromFile(input){
      const file = input.files?.[0];
      if (!file) return;
      const txt = await file.text();
      channels = await parseM3U(txt);
      renderCategories(channels, $('#categorySelect'), $('#categorySelect2'));
      renderChannels(channels, $('#channelList'), $('#channelList2'));
      updateViewportVars();
    }

    function bindSourceSelectors(sel, customWrap){
      sel.addEventListener('change', ()=>{
        const isCustom = sel.value === 'custom';
        customWrap.classList.toggle('d-none', !isCustom);
      });
    }

    bindSourceSelectors($('#sourceSelect'), $('#customUrlWrap'));
    bindSourceSelectors($('#sourceSelect2'), $('#customUrlWrap2'));

    function bindLoadButtons(btn, sel, customInput){
      btn.addEventListener('click', ()=>{
        const val = sel.value === 'custom' ? customInput.value.trim() : sel.value;
        if (val) loadM3UFromUrl(val);
      });
    }

    bindLoadButtons($('#btnLoadM3U'), $('#sourceSelect'), $('#customUrl'));
    bindLoadButtons($('#btnLoadM3U2'), $('#sourceSelect2'), $('#customUrl2'));

    $('#m3uFile').addEventListener('change', e=> loadM3UFromFile(e.target));
    $('#m3uFile2').addEventListener('change', e=> loadM3UFromFile(e.target));

    function bindCategory(select, selectTwin, list1, list2, searchInput){
      const handler = ()=>{
        const group = select.value;
        const q = searchInput.value.trim();
        renderChannels(channels, list1, list2, group, q);
      };
      select.addEventListener('change', handler);
      searchInput.addEventListener('input', handler);
      select.addEventListener('change', ()=>{ if (selectTwin) selectTwin.value = select.value; });
    }

    bindCategory($('#categorySelect'), $('#categorySelect2'), $('#channelList'), $('#channelList2'), $('#search'));
    bindCategory($('#categorySelect2'), $('#categorySelect'), $('#channelList'), $('#channelList2'), $('#search2'));

    // --- Offcanvas: largeur
    function syncOffcanvasWidth(){
      const panel = document.getElementById('panel');
      if (!panel) return;
      const asideCard = document.querySelector('.col-xl-3 .card.glass');
      let w = 360;
      if (asideCard && asideCard.offsetWidth) {
        w = Math.max(240, Math.round(asideCard.getBoundingClientRect().width));
      }
      panel.style.setProperty('--bs-offcanvas-width', w + 'px');
    }
    const offcanvasEl = document.getElementById('panel');
    if (offcanvasEl) {
      offcanvasEl.addEventListener('show.bs.offcanvas', syncOffcanvasWidth);
    }
    window.addEventListener('resize', () => {
      if (offcanvasEl && offcanvasEl.classList.contains('show')) {
        syncOffcanvasWidth();
      }
    });

    // Bouton Rafraîchir
    const refreshBtn = document.getElementById('btnRefresh');
    function forceRefresh() {
      const url = new URL(window.location.href);
      url.searchParams.set('_r', Date.now().toString());
      if ('serviceWorker' in navigator) {
        try {
          navigator.serviceWorker.getRegistrations()
            .then(regs => Promise.allSettled(regs.map(r => r.update().catch(()=>{}))))
            .finally(() => window.location.replace(url.toString()));
          return;
        } catch(_) {}
      }
      window.location.replace(url.toString());
    }
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('rotating');
        forceRefresh();
        setTimeout(() => refreshBtn.classList.remove('rotating'), 800);
      });
    }

    // Init état boutons au chargement
    updateZapButtonsState();

    // ==============================
    // Vérification des liens M3U
    // ==============================
    const linkStatus = new Map(); // url -> {status, ms, note, http}
    let isChecking = false;

    function setItemStatus(url, status, ms = 0, note = '', http = 0){
      linkStatus.set(url, {status, ms, note, http});
      const sel = `button[data-url="${encodeURIComponent(url)}"]`;
      $$(sel).forEach(btn => {
        let badge = btn.querySelector('.link-status');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'link-status badge rounded-pill ms-2';
          btn.appendChild(badge);
        }
        let label = '?', border = '', bg = '', color = '';
        if (status === 'ok'){ label='OK';  border='1px solid rgba(88,196,107,.55)'; bg='rgba(88,196,107,.18)'; color='#eafff0'; }
        else if (status === 'cors'){ label='CORS'; border='1px solid rgba(255,200,0,.55)';   bg='rgba(255,200,0,.18)'; }
        else if (status === 'dead'){ label='HS';  border='1px solid rgba(220,53,69,.6)';    bg='rgba(220,53,69,.22)'; }
        else if (status === 'yt'){ label='YT';    border='1px solid rgba(255,255,255,.35)'; bg='rgba(255,255,255,.08)'; }
        else { label='?'; border='1px solid rgba(255,255,255,.25)'; bg='rgba(255,255,255,.08)'; }

        badge.textContent = label;
        badge.style.border = border;
        badge.style.background = bg;
        badge.style.color = color || '';
        const meta = [];
        if (http) meta.push(`HTTP ${http}`);
        if (ms)   meta.push(`${ms} ms`);
        if (note) meta.push(note);
        badge.title = meta.join(' · ');
      });
    }

    const __oldRenderChannels = renderChannels;
    renderChannels = function(...args){
      __oldRenderChannels(...args);
      for (const [url, data] of linkStatus.entries()){
        setItemStatus(url, data.status, data.ms, data.note, data.http);
      }
    
  // ⬇️ Mirror the rendered list into inlineChannelList and wire click -> loadSource
  try {
    const inline = document.getElementById('inlineChannelList');
    // args: [chans, container1, container2, activeGroup, q]
    const src = (args && args[2]) || document.getElementById('channelList2');
    if (inline && src) {
      inline.innerHTML = src.innerHTML;
      inline.onclick = (e) => {
        const btn = e.target.closest('button[data-url]');
        if (!btn) return;
        const url  = decodeURIComponent(btn.getAttribute('data-url')||'');
        const logo = decodeURIComponent(btn.getAttribute('data-logo')||'');
        const name = decodeURIComponent(btn.getAttribute('data-name')||'');
        try {
          if (Array.isArray(window.filteredChannels)) {
            const found = window.filteredChannels.findIndex(c => c.url === url);
            if (found >= 0) window.currentIndex = found;
          }
        } catch(_) {}
        window.loadSource(url, logo, name);
      };
    }
  } catch(_) {}
};

    function isYouTube(url){
      return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url);
    }

    async function checkUrlSmart(url, timeoutMs = 9000){
      const t0 = performance.now();

      if (isYouTube(url)){
        return {status:'yt', ms: Math.round(performance.now()-t0), note:'YouTube (plugin)'}; 
      }

      const makeAbort = (ms) => {
        const controller = new AbortController();
        const to = setTimeout(()=>controller.abort(), ms);
        return {controller, to};
      };

      try {
        {
          const {controller, to} = makeAbort(timeoutMs);
          let res = await fetch(url, { method:'HEAD', mode:'cors', cache:'no-store', redirect:'follow', signal: controller.signal });
          clearTimeout(to);
          if (res.ok) {
            return {status:'ok', http: res.status, ms: Math.round(performance.now()-t0), note:'HEAD ok'};
          }
          if (res.status === 405 || res.status === 400 || res.status === 403) {
            const {controller: c2, to: to2} = makeAbort(timeoutMs);
            try{
              res = await fetch(url, {
                method:'GET',
                headers:{ 'Range': 'bytes=0-0' },
                mode:'cors',
                cache:'no-store',
                redirect:'follow',
                signal: c2.signal
              });
              clearTimeout(to2);
              if (res.ok || res.status === 206) {
                return {status:'ok', http: res.status, ms: Math.round(performance.now()-t0), note:'GET partial ok'};
              }
            } catch(_){}
          }
        }
      } catch(_errCorsOrNet){
        try {
          const {controller, to} = makeAbort(timeoutMs);
          await fetch(url, { method:'GET', mode:'no-cors', cache:'no-store', redirect:'follow', signal: controller.signal });
          clearTimeout(to);
          return {status:'cors', http: 0, ms: Math.round(performance.now()-t0), note:'Réussi en no-cors (bloqué CORS)'};
        } catch(err2){
          return {status:'dead', http: 0, ms: Math.round(performance.now()-t0), note: (err2.name==='AbortError'?'Timeout':'Erreur réseau/CORS')};
        }
      }

      return {status:'dead', http: 0, ms: Math.round(performance.now()-t0), note:'HTTP non OK'};
    }

    async function runPool(fns, limit=8){
      return new Promise(resolve=>{
        let i=0, active=0;
        const next = ()=>{
          if (i>=fns.length && active===0) { resolve(); return; }
          while (active<limit && i<fns.length){
            const fn = fns[i++]; active++;
            fn().finally(()=>{ active--; next(); });
          }
        };
        next();
      });
    }

    function setProgress(done, total, ok=0, cors=0, dead=0){
      for (const id of ['checkProgress','checkProgress2']){
        const bar = document.querySelector(`#${id} .progress-bar`);
        const wrap = document.getElementById(id);
        if (!bar || !wrap) continue;
        const pct = total ? Math.round((done/total)*100) : 0;
        bar.style.width = pct + '%';
        wrap.classList.toggle('d-none', total===0);
      }
      for (const id of ['checkSummary','checkSummary2']){
        const el = document.getElementById(id);
        if (!el) continue;
        el.textContent = total
          ? `Testé ${done}/${total} — ✅ ${ok} · ⚠️ ${cors} · ❌ ${dead}`
          : '';
      }
    }

    function setButtonsDisabled(disabled){
      for (const id of ['btnCheckLinks','btnCheckLinks2']){
        const b = document.getElementById(id);
        if (b) b.disabled = disabled;
      }
    }

    async function startLinkCheck(){
      if (isChecking) return;
      if (!channels.length){
        alert('Charge d’abord une playlist (URL ou fichier .m3u).');
        return;
      }
      isChecking = true;
      setButtonsDisabled(true);
      linkStatus.clear();
      setProgress(0, channels.length, 0, 0, 0);

      let done=0, ok=0, cors=0, dead=0;
      const tasks = channels.map(c => async ()=>{
        try{
          const r = await checkUrlSmart(c.url);
          if (r.status==='ok') ok++;
          else if (r.status==='cors' || r.status==='yt') {
            if (r.status==='cors') cors++;
            if (r.status==='yt')   cors++;
          } else { dead++; }
          setItemStatus(c.url, r.status, r.ms, r.note, r.http||0);
        } catch(_){
          dead++;
          setItemStatus(c.url, 'dead', 0, 'Erreur inconnue', 0);
        } finally {
          done++;
          setProgress(done, channels.length, ok, cors, dead);
        }
      });

      await runPool(tasks, 8);
      isChecking = false;
      setButtonsDisabled(false);
    }

    document.getElementById('btnCheckLinks')?.addEventListener('click', startLinkCheck);
    document.getElementById('btnCheckLinks2')?.addEventListener('click', startLinkCheck);
  

  <!-- ⭐ Module favoris pour playlists (sources M3U) -->

(() => {
  // utilise le helper $ déjà défini

  // ID stable basé sur l'URL de la playlist
  function makeRef(url=''){
    let h = 5381; const s = String(url);
    for (let i=0;i<s.length;i++) h = ((h<<5)+h) ^ s.charCodeAt(i);
    return 'pl_' + (h>>>0).toString(36);
  }

  const LS_PL_FAVS = 'iptv:pl:favs';
  const getFavs = () => { try{ return JSON.parse(localStorage.getItem(LS_PL_FAVS) || '[]'); }catch{ return []; } };
  const setFavs = (arr) => localStorage.setItem(LS_PL_FAVS, JSON.stringify(arr));

  const sel1 = document.getElementById('sourceSelect');
  const sel2 = document.getElementById('sourceSelect2');
  const custom1 = document.getElementById('customUrl');
  const custom2 = document.getElementById('customUrl2');
  const star1 = document.getElementById('plFavBtn1');
  const star2 = document.getElementById('plFavBtn2');

  function currentPlaylist(select, customInput){
    if (!select) return {url:'', name:''};
    const isCustom = select.value === 'custom';
    const url = (isCustom ? (customInput?.value?.trim() || '') : select.value) || '';
    let name = '';
    if (isCustom){
      name = url || '(Personnalisée)';
    } else {
      const opt = select.options[select.selectedIndex];
      name = (opt?.text || '').trim();
    }
    return { url, name };
  }

  function syncStar(starBtn, isFav){
    if (!starBtn) return;
    starBtn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
    starBtn.title = isFav ? 'Retirer des favoris' : 'Ajouter aux favoris';
  }

  function toggleFavByUrl(url, name){
    if (!url) return;
    const ref = makeRef(url);
    const favs = getFavs();
    const i = favs.findIndex(f => f.ref === ref);
    if (i >= 0){
      favs.splice(i,1);
    } else {
      favs.unshift({ ref, url, name: name || url });
    }
    setFavs(favs);
    applyFavOptgroup(sel1);
    applyFavOptgroup(sel2);
  }

  function applyFavOptgroup(select){
    if (!select) return;
    [...select.querySelectorAll('optgroup[data-favg]')].forEach(g=>g.remove());

    const favs = getFavs();
    if (!favs.length) return;

    const og = document.createElement('optgroup');
    og.setAttribute('label', '★ Favoris');
    og.setAttribute('data-favg','1');

    favs.forEach(f => {
      const already = [...select.options].some(o => o.value === f.url);
      const opt = document.createElement('option');
      opt.value = f.url;
      opt.textContent = f.name || f.url;
      if (already) opt.textContent += ' (dup)';
      og.appendChild(opt);
    });

    select.insertBefore(og, select.firstChild);
  }

  function refreshStars(){
    const cur1 = currentPlaylist(sel1, custom1);
    const cur2 = currentPlaylist(sel2, custom2);
    const favs = getFavs();
    const isFav1 = cur1.url && favs.some(f => f.ref === makeRef(cur1.url));
    const isFav2 = cur2.url && favs.some(f => f.ref === makeRef(cur2.url));
    syncStar(star1, !!isFav1);
    syncStar(star2, !!isFav2);
  }

  // --- PATCH B : clic simple = favori CHAÎNE en cours ; Alt+clic = favori PLAYLIST
  function handleStarClick(starBtn, select, customInput, ev){
    // 1) Par défaut: on bascule la chaîne en cours dans les favoris (si dispo)
    if (!ev.altKey && typeof window.__fav_toggleCurrentChannel === 'function') {
      const res = window.__fav_toggleCurrentChannel(); // 'added' | 'removed' | false
      if (res) {
        // feedback visuel
        starBtn.classList.add('flash-fav');
        setTimeout(() => starBtn.classList.remove('flash-fav'), 600);
        return; // ne touche pas aux favoris PLAYLIST
      }
    }
    // 2) Alt+clic (ou pas de chaîne en cours) => toggle favori PLAYLIST (comportement d'origine)
    const {url, name} = currentPlaylist(select, customInput);
    if (!url) return;
    toggleFavByUrl(url, name);
    refreshStars();
  }

  star1?.addEventListener('click', (ev) => handleStarClick(star1, sel1, custom1, ev));
  star2?.addEventListener('click', (ev) => handleStarClick(star2, sel2, custom2, ev));

  // Tooltips explicites
  try {
    if (star1) star1.title = '⭐ Chaîne en cours (clic) — ★ Playlist (Alt+clic)';
    if (star2) star2.title = '⭐ Chaîne en cours (clic) — ★ Playlist (Alt+clic)';
  } catch(_) {}

  sel1?.addEventListener('change', refreshStars);
  sel2?.addEventListener('change', refreshStars);
  custom1?.addEventListener('input', refreshStars);
  custom2?.addEventListener('input', refreshStars);

  applyFavOptgroup(sel1);
  applyFavOptgroup(sel2);
  setTimeout(refreshStars, 0);

  // Optionnel : auto-charger un favori quand on le sélectionne
  /*
  function autoLoadIfFav(select, btnLoad){
    select?.addEventListener('change', ()=>{
      const opt = select.options[select.selectedIndex];
      const parentOG = opt?.parentElement;
      if (parentOG && parentOG.tagName === 'OPTGROUP' && parentOG.getAttribute('data-favg') === '1'){
        btnLoad?.click();
      }
    });
  }
  autoLoadIfFav(sel1, document.getElementById('btnLoadM3U'));
  autoLoadIfFav(sel2, document.getElementById('btnLoadM3U2'));
  */
})();
(() => {
  // Utilise #channelList2 comme conteneur d’affichage dans le panneau
  const listEl = document.getElementById('channelList2');
  const btnFav = document.getElementById('btnListFav');
  const btnHis = document.getElementById('btnListHist');
  const btnClearHist = document.getElementById('btnClearHist');

  // Affiche/masque le bouton selon le mode et le contenu
  function updateClearButton(){
    if (!btnClearHist) return;
    const has = (loadHist().length > 0);
    btnClearHist.classList.toggle('d-none', !(listMode === 'history' && has));
  }

  // Clic sur "Effacer"
  btnClearHist?.addEventListener('click', () => {
    if (!confirm('Effacer tout l’historique ?')) return;
    saveHist([]);              // vide l'historique
    if (listMode === 'history') renderAlt('history'); // refresh la vue si on est dessus
    updateClearButton();
  });

  // Référence stable pour les chaînes (URL + nom)
  function makeRef(url='', name=''){
    const s = (url||'') + '|' + (name||'');
    let h = 5381;
    for (let i=0;i<s.length;i++) h = ((h<<5)+h) ^ s.charCodeAt(i);
    return 'ch_' + (h>>>0).toString(36);
  }

  // Persistence
  const LS_FAV = 'iptv:ch:favs';
  const LS_HIS = 'iptv:ch:hist';
  const MAX_HIS = 250;

  const loadFavs = () => { try{ return JSON.parse(localStorage.getItem(LS_FAV)||'[]'); }catch{ return []; } };
  const saveFavs = (v) => localStorage.setItem(LS_FAV, JSON.stringify(v));
  const loadHist = () => { try{ return JSON.parse(localStorage.getItem(LS_HIS)||'[]'); }catch{ return []; } };
  const saveHist = (v) => localStorage.setItem(LS_HIS, JSON.stringify(v));

  // Ajoute au fil de l’eau l’historique quand on lance une chaîne
  const _oldLoadSource = window.loadSource;
  window.loadSource = function(url, logo='', name=''){
    _oldLoadSource?.(url, logo, name);
// mémorise la chaîne en cours pour l’étoile
try {
  const group = (window.channels||[]).find(c => c.url === url)?.group || '';
  window.__lastPlayed = { url, name, logo, group };
__syncChannelStarState();

} catch(_) {}

    try { addHistoryFrom(url, name, logo); if (listMode==='history') renderAlt('history'); } catch(e){}
  };

 // Permet au bouton étoile (au-dessus de "Source M3U") d'ajouter la chaîne en cours
window.__fav_toggleCurrentChannel = function() {
  const lp = window.__lastPlayed;
  if (!lp || !lp.url) return false;

  const ref = makeRef(lp.url, lp.name || '');
  const item = {
    ref,
    url: lp.url,
    name: lp.name || 'Sans nom',
    logo: lp.logo || '',
    group: lp.group || ''
  };
// Synchronise l'icône étoile avec l'état "favori CHAÎNE en cours"
function __syncChannelStarState(){
  const starBtns = [document.getElementById('plFavBtn1'), document.getElementById('plFavBtn2')];
  let on = false;
  try{
    const lp = window.__lastPlayed;
    if (lp && lp.url){
      const ref = makeRef(lp.url, lp.name || '');
      on = loadFavs().some(x => x.ref === ref);
    }
  }catch(_){}
  starBtns.forEach(b => b && b.classList.toggle('is-ch-fav', on));
}

  const favs = loadFavs();
  const i = favs.findIndex(x => x.ref === ref);
  let action = 'added';
  if (i >= 0) { favs.splice(i,1); action = 'removed'; }
  else { favs.unshift(item); }
  saveFavs(favs);
__syncChannelStarState();
  // si l'onglet Favoris est affiché, on le rafraîchit
  if (typeof renderAlt === 'function' && (window.listMode === 'favorites' || listMode === 'favorites')) {
    try { renderAlt('favorites'); } catch(_) {}
  }
  return action; // 'added' | 'removed'
};
 

function addHistoryFrom(url, name, logo){
    if (!url) return;
    const ref = makeRef(url, name||'');
    const hist = loadHist();
    const i = hist.findIndex(x => x.ref === ref);
    if (i >= 0) hist.splice(i,1);
    // essaie de récupérer la catégorie depuis la playlist chargée
    const group = (window.channels||[]).find(c => c.url === url)?.group || '';
    hist.unshift({ ref, url, name: name||'Sans nom', logo: logo||'', group, last: Date.now() });
    if (hist.length > MAX_HIS) hist.length = MAX_HIS;
    saveHist(hist);
  }

  function isFav(ref){ return loadFavs().some(x => x.ref === ref); }
  function toggleFav(item){
    const favs = loadFavs();
    const i = favs.findIndex(x => x.ref === item.ref);
    if (i >= 0) favs.splice(i,1); else favs.unshift(item);
    saveFavs(favs);
    if (listMode==='favorites') renderAlt('favorites');
  }

  // Construit un item compatible avec tes listes
  function buildItemHTML(c){
    const logo = c.logo ? `<img src="${c.logo}" alt="" class="me-2" style="height:18px;width:18px;object-fit:contain;border-radius:3px;"/>` : '';
    return `<button type="button" class="list-group-item list-group-item-action d-flex align-items-center"
              data-ref="${c.ref}"
              data-url="${encodeURIComponent(c.url||'')}"
              data-logo="${encodeURIComponent(c.logo||'')}"
              data-name="${encodeURIComponent(c.name||'')}">
      ${logo}<span class="flex-grow-1 text-start">${c.name||'Sans nom'}</span>
      <span class="badge rounded-pill badge-geo">${c.group||'—'}</span>
    </button>`;
  }

  // Rendu alternatif (Favoris ou Historique) dans #channelList2
  let listMode = 'none'; // 'none' | 'favorites' | 'history'
  function setActive(mode){
    [btnFav, btnHis].forEach(b=> b?.classList.remove('active'));
    if (mode==='favorites') btnFav?.classList.add('active');
    if (mode==='history')   btnHis?.classList.add('active');
    updateClearButton();

 }
  function renderAlt(mode){
    listMode = mode;
    setActive(mode);
    if (!listEl) return;

    if (mode==='none'){
      // Revenir à l’affichage normal de la playlist courante
      const sel = document.getElementById('categorySelect2');
      const q   = (document.getElementById('search2')?.value||'').trim();
      // on “force” un refresh de la liste standard en appelant le handler existant
      if (sel) sel.dispatchEvent(new Event('change'));
      return;
    }

    let data = [];
    if (mode==='favorites') data = loadFavs();
    if (mode==='history')   data = loadHist();

    if (!data.length){
      listEl.innerHTML = `<div class="tiny">Aucun élément…</div>`;
      return;
    }
    listEl.innerHTML = data.map(buildItemHTML).join('');

    // Clic : lire la chaîne
    listEl.onclick = (e) => {
      const btn = e.target.closest('button[data-url]');
      if (!btn) return;
      const url  = decodeURIComponent(btn.getAttribute('data-url')||'');
      const logo = decodeURIComponent(btn.getAttribute('data-logo')||'');
      const name = decodeURIComponent(btn.getAttribute('data-name')||'');
      window.loadSource(url, logo, name);
      closePanel();
     };
  // 🔁 maj du bouton Effacer (visible si mode=history et liste non vide)
  if (typeof updateClearButton === 'function') updateClearButton();
}

  // === MENU CONTEXTUEL CHAÎNES ===
// (à placer à la place de l’ancienne section “Double-clic / clic droit…”)

const ctx = (()=>{
  const el = document.getElementById('ctxMenu');
  let current = null;

  function hide(){
    el.classList.add('d-none'); current=null;
    document.removeEventListener('click', onDocClick, true);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', hide);
    document.removeEventListener('scroll', hide, true);
  }
  function onDocClick(e){ if (!el.contains(e.target)) hide(); }
  function onKey(e){ if (e.key==='Escape') hide(); }

  function show(x, y, item){
    current = item;
    // Libellé favoris dynamique
    const favBtn = el.querySelector('[data-act="fav"]');
    favBtn.textContent = isFav(item.ref) ? 'Retirer des favoris' : 'Ajouter aux favoris';

    el.style.left='0px'; el.style.top='0px';
    el.classList.remove('d-none');
    const rect = el.getBoundingClientRect();
    const nx = Math.min(x, window.innerWidth  - rect.width  - 8);
    const ny = Math.min(y, window.innerHeight - rect.height - 8);
    el.style.left = nx + 'px'; el.style.top = ny + 'px';

    setTimeout(()=>{ document.addEventListener('click', onDocClick, true); },0);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', hide);
    document.addEventListener('scroll', hide, true);
  }

  el.addEventListener('click', async (e)=>{
    const act = e.target.closest('button')?.dataset?.act;
    if (!act || !current) return;
    const {url, logo, name} = current;
    hide();

    if (act==='play'){ window.loadSource(url, logo, name); }
    else if (act==='fav'){ toggleFav(current); }
    else if (act==='copy'){
      try{ await navigator.clipboard.writeText(url); }
      catch{
        const t=document.createElement('textarea'); t.value=url;
        document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
      }
    }
    else if (act==='open'){ window.open(url, '_blank', 'noopener,noreferrer'); }
  });

  return { show };
})();

// Récupère l’item depuis un bouton de liste
function pick(btn){
  const url  = decodeURIComponent(btn.getAttribute('data-url')||'');
  const name = decodeURIComponent(btn.getAttribute('data-name')||'');
  const logo = decodeURIComponent(btn.getAttribute('data-logo')||'');
  const group = (window.channels||[]).find(c => c.url === url)?.group || '';
  return { ref: makeRef(url, name), url, name, logo, group };
}

// Branche les listes (inclut le inline panel si présent)
['channelList','channelList2','inlineChannelList'].forEach(id=>{
  const el = document.getElementById(id);
  if (!el) return;

  // Double-clic = (dé)favoriser
  el.addEventListener('dblclick', (e)=>{
    const btn = e.target.closest('button[data-url]');
    if (!btn) return;
    toggleFav(pick(btn));
    btn.classList.add('flash-fav'); setTimeout(()=>btn.classList.remove('flash-fav'), 600);
  });

  // Clic droit = menu contextuel
  el.addEventListener('contextmenu', (e)=>{
    const btn = e.target.closest('button[data-url]');
    if (!btn) return;
    e.preventDefault();
    ctx.show(e.clientX, e.clientY, pick(btn));
  });
});


  // Boutons “Favoris / Historique” (toggle on/off)
  btnFav?.addEventListener('click', ()=>{
    renderAlt(listMode==='favorites' ? 'none' : 'favorites');
  });
  btnHis?.addEventListener('click', ()=>{
    renderAlt(listMode==='history' ? 'none' : 'history');
  });

  // Si la liste standard se réactualise pendant un mode alternatif, on réimpose notre rendu
  
const cat2 = document.getElementById('categorySelect2');
  const srch2= document.getElementById('search2');
  cat2?.addEventListener('change', ()=>{ if (listMode!=='none') renderAlt(listMode); });
  srch2?.addEventListener('input', ()=>{ if (listMode!=='none') renderAlt(listMode); });
// --- API globale pour ouvrir le panneau directement dans un mode
  window.__openPanelListMode = function(mode){
    try {
      if (mode === 'favorites' || mode === 'history') renderAlt(mode);
    } catch(_) {}
    const panelEl = document.getElementById('panel');
    if (panelEl && typeof bootstrap !== 'undefined') {
      const oc = bootstrap.Offcanvas.getOrCreateInstance(panelEl);
      oc.show();
    }
  };

  // Branche les boutons rapides de la navbar (si présents)
  document.getElementById('btnQuickFav')?.addEventListener('click', (e)=>{
    e.preventDefault();
    window.__openPanelListMode('favorites');
  });
  document.getElementById('btnQuickHist')?.addEventListener('click', (e)=>{
    e.preventDefault();
    window.__openPanelListMode('history');
  });
})();
(() => {
  // ---- Sélecteurs
  const btnExport = document.getElementById('btnExportData');
  const btnImport = document.getElementById('btnImportData');
  const fileInput = document.getElementById('importFile');

  if (!btnExport || !btnImport || !fileInput) return;

  // ---- LocalStorage keys
  const K = {
    favCh: 'iptv:ch:favs',
    hisCh: 'iptv:ch:hist',
    favPl: 'iptv:pl:favs',
  };

  // ---- Helpers LS
  const read = (k, d=[]) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); } catch { return d; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  // ---- Export
  btnExport.addEventListener('click', () => {
    const payload = {
      app: 'iptv-player',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        channels: {
          favorites: read(K.favCh, []),
          history:   read(K.hisCh, []),
        },
        playlists: {
          favorites: read(K.favPl, []),
        }
      }
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
    const ts = new Date().toISOString().replace(/[-:T.Z]/g,'').slice(0,14);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `iptv-data-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  });

  // ---- Import
  btnImport.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      // validation légère
      const inFavCh = json?.data?.channels?.favorites ?? [];
      const inHisCh = json?.data?.channels?.history   ?? [];
      const inFavPl = json?.data?.playlists?.favorites ?? [];
      if (!Array.isArray(inFavCh) || !Array.isArray(inHisCh) || !Array.isArray(inFavPl)) {
        alert('Fichier invalide : structure inattendue.');
        fileInput.value = '';
        return;
      }

      const replaceAll = confirm('Importer :\nOK = Remplacer tout\nAnnuler = Fusionner (ajouts uniquement)');
      // lecture existante
      const curFavCh = read(K.favCh, []);
      const curHisCh = read(K.hisCh, []);
      const curFavPl = read(K.favPl, []);

      // normalisation simple
      const normFavCh = inFavCh.filter(x => x && x.ref && x.url);
      const normHisCh = inHisCh
        .filter(x => x && x.ref && x.url)
        .map(x => ({...x, last: typeof x.last === 'number' ? x.last : Date.now()}));
      const normFavPl = inFavPl.filter(x => x && x.ref && x.url);

      // fusion/dédup par ref
      const byRef = (arr) => {
        const m = new Map();
        arr.forEach(o => { if (!m.has(o.ref)) m.set(o.ref, o); });
        return [...m.values()];
      };

      let outFavCh, outHisCh, outFavPl;

      if (replaceAll) {
        outFavCh = byRef(normFavCh);
        outFavPl = byRef(normFavPl);
        // pour l'historique on garde l’ordre par date desc
        const m = new Map();
        [...normHisCh].forEach(o => {
          const ex = m.get(o.ref);
          if (!ex || (o.last||0) > (ex.last||0)) m.set(o.ref, o);
        });
        outHisCh = [...m.values()].sort((a,b)=> (b.last||0)-(a.last||0)).slice(0,250);
      } else {
        // MERGE: on garde ce que tu as déjà, on ajoute les nouveaux
        outFavCh = byRef([...curFavCh, ...normFavCh]);
        outFavPl = byRef([...curFavPl, ...normFavPl]);
        // historique: on garde l’entrée avec last le plus récent
        const m = new Map();
        [...curHisCh, ...normHisCh].forEach(o => {
          const ex = m.get(o.ref);
          if (!ex || (o.last||0) > (ex.last||0)) m.set(o.ref, o);
        });
        outHisCh = [...m.values()].sort((a,b)=> (b.last||0)-(a.last||0)).slice(0,250);
      }

      // écriture
      write(K.favCh, outFavCh);
      write(K.hisCh, outHisCh);
      write(K.favPl, outFavPl);

      // ---- Rafraîchis l’UI

      // 1) Si un onglet alt (Favoris/Hist) est ouvert, le code existant re-render sur change de catégorie
      document.getElementById('categorySelect2')?.dispatchEvent(new Event('change'));

      // 2) Regénère l’optgroup "★ Favoris" dans les selects playlists
      (function refreshPlaylistFavOptgroups(){
        const favs = read(K.favPl, []);
        [document.getElementById('sourceSelect'), document.getElementById('sourceSelect2')].forEach(select=>{
          if (!select) return;
          // supprime anciens groupes
          [...select.querySelectorAll('optgroup[data-favg]')].forEach(g=>g.remove());
          if (!favs.length) return;
          const og = document.createElement('optgroup');
          og.setAttribute('label','★ Favoris');
          og.setAttribute('data-favg','1');
          favs.forEach(f=>{
            const opt = document.createElement('option');
            opt.value = f.url;
            opt.textContent = f.name || f.url;
            og.appendChild(opt);
          });
          select.insertBefore(og, select.firstChild);
        });
      })();

      alert(`Import terminé :
- Favoris chaînes : ${outFavCh.length}
- Historique      : ${outHisCh.length}
- Favoris playlists: ${outFavPl.length}`);

    } catch (err) {
      console.error(err);
      alert('Impossible de lire ce fichier JSON.');
    } finally {
      fileInput.value = ''; // permet de réimporter le même fichier plus tard
    }
  });
})();
// ===== Inline Panel helpers =====
function openInlinePanel(){
  const p = document.getElementById('inlinePanel');
  if (!p) return;
  p.classList.remove('d-none');
  requestAnimationFrame(()=> p.classList.add('show'));
}
function closeInlinePanel(){
  const p = document.getElementById('inlinePanel');
  if (!p) return;
  p.classList.remove('show');
  setTimeout(()=> p.classList.add('d-none'), 180);
}
function closePanel(){
  try{
    const el = document.getElementById('panel');
    if (!el || typeof bootstrap === 'undefined') return;
    const oc = bootstrap.Offcanvas.getInstance(el) || bootstrap.Offcanvas.getOrCreateInstance(el);
    oc.hide();
  }catch(_){}
}

// Intercepte le bouton navbar "Playlist & Chaînes"
(function(){
  const navPanelBtn = document.querySelector('[data-bs-target="#panel"]');
  if (!navPanelBtn) return;
  navPanelBtn.addEventListener('click', (e)=>{
    const isDesktop = window.matchMedia('(min-width: 992px)').matches;
    if (isDesktop){
      e.preventDefault();
      e.stopPropagation();
      const p = document.getElementById('inlinePanel');
      if (!p) return;
      if (p.classList.contains('d-none')) openInlinePanel();
      else closeInlinePanel();
    }
  });
  document.getElementById('inlineClose')?.addEventListener('click', closeInlinePanel);
})();

// ----- Sur-alimente renderCategories pour peupler #inlineCategorySelect
(function(){
  try{
    const __origRenderCategories = window.renderCategories;
    if (typeof __origRenderCategories === 'function'){
      window.renderCategories = function(chans, sel1, sel2){
        __origRenderCategories(chans, sel1, sel2);
        const sel3 = document.getElementById('inlineCategorySelect');
        if (!sel3) return;
        const groups = ['Toutes', ...Array.from(new Set((chans||[]).map(c=>c.group))).sort((a,b)=> (a||'').localeCompare(b||''))];
        sel3.innerHTML = groups.map(g=>`<option value="${g}">${g}</option>`).join('');
      };
    }
  }catch(_){}
})();

// ----- Clone le rendu des chaînes vers #inlineChannelList et ferme panneaux au clic
(function(){
  function buildItemHTML(c){
    const logo = c.logo ? `<img src="${c.logo}" alt="" class="me-2" style="height:18px;width:18px;object-fit:contain;border-radius:3px;"/>` : '';
    return `<button type="button" class="list-group-item list-group-item-action d-flex align-items-center"
              data-url="${encodeURIComponent(c.url||'')}"
              data-logo="${encodeURIComponent(c.logo||'')}"
              data-name="${encodeURIComponent(c.name||'')}">
      ${logo}<span class="flex-grow-1 text-start">${c.name||'Sans nom'}</span>
      <span class="badge rounded-pill badge-geo">${c.group||'—'}</span>
    </button>`;
  }

  function wireCloseOnClick(containerId){
    const el = document.getElementById(containerId);
    if (!el) return;
    el.addEventListener('click', (e)=>{
      const btn = e.target.closest('button[data-url]');
      if (!btn) return;
      // La lecture est déjà gérée par le handler principal; ici on ferme juste les panneaux
      closeInlinePanel();
      closePanel();
    });
  }

  try{
    const __origRenderChannels = window.renderChannels;
    if (typeof __origRenderChannels === 'function'){
      window.renderChannels = function(chans, container1, container2, activeGroup='Toutes', q=''){
        __origRenderChannels(chans, container1, container2, activeGroup, q);
        const inline = document.getElementById('inlineChannelList');
        if (!inline) return;
        const match = (c) => (activeGroup==='Toutes' || c.group===activeGroup) && (!q || (c.name||'').toLowerCase().includes(String(q).toLowerCase()));
        const list = (chans||[]).filter(match);
        inline.innerHTML = list.length ? list.map(buildItemHTML).join('') : `<div class="tiny">Aucun élément…</div>`;
      };
    }
  }catch(_){}

  // Bind ferme-panneaux pour inline et offcanvas
  wireCloseOnClick('inlineChannelList');
  wireCloseOnClick('channelList2');

  // Lier les contrôles inline à ton moteur de filtrage existant
  (function bindInlineControls(){
    if (typeof window.bindCategory !== 'function') return;
    const selInline = document.getElementById('inlineCategorySelect');
    const selTwin   = document.getElementById('categorySelect2'); // déjà synchronisé avec le principal
    const list1     = document.getElementById('channelList');
    const list2     = document.getElementById('channelList2');
    const searchI   = document.getElementById('inlineSearch');
    if (selInline && list1 && list2){
      window.bindCategory(selInline, selTwin, list1, list2, searchI || { value: '' , addEventListener(){}});
    }
  })();
})();
