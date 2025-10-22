/* json-playlist.js (lite) — Le JSON *liste*, et c’est `scriptiptv.js` qui *lit*.
   ➤ Au clic: on appelle window.loadSource(url) (même chemin que tes listes HTML)
*/
(function () {
  'use strict';

  // Elements existants de ta page
  var el = {
    // Champs/panneaux
    list: document.getElementById('channelList'),
    list2: document.getElementById('channelList2'),
    inlineList: document.getElementById('inlineChannelList'),
    cat: document.getElementById('categorySelect'),
    cat2: document.getElementById('categorySelect2'),
    inlineCat: document.getElementById('inlineCategorySelect'),
    search: document.getElementById('search'),
    search2: document.getElementById('search2'),
    inlineSearch: document.getElementById('inlineSearch'),
    // Sélecteurs source + boutons charger
    sourceSel: document.getElementById('sourceSelect'),
    sourceSel2: document.getElementById('sourceSelect2'),
    btnLoadM3U: document.getElementById('btnLoadM3U'),
    btnLoadM3U2: document.getElementById('btnLoadM3U2'),
    // Champ URL + bouton Lire
    inputUrl: document.getElementById('inputUrl'),
    btnPlay: document.getElementById('btnPlay'),
    // Bandeau d’info
    nowbar: document.getElementById('nowbar'),
    channelLogo: document.getElementById('channelLogo'),
    nowPlaying: document.getElementById('nowPlaying'),
    nowUrl: document.getElementById('nowUrl'),
    zapTitle: document.getElementById('zapTitle')
  };

  // État minimal : juste ce qu’il faut pour filtrer/afficher
  var state = {
    entries: [],     // { id, name, url, kind: 'playlist'|'channel' }
    filtered: [],
    index: -1
  };

  function isJsonUrl(url) { return /\.json(\?|#|$)/i.test(url || ''); }
  function guessType(url) {
    if (!url) return '';
    if (/^yt:|youtube\.com|youtu\.be/i.test(url)) return 'youtube';
    if (/\.m3u8(\?|#|$)/i.test(url)) return 'hls';
    if (/\.m3u(\?|#|$)/i.test(url)) return 'm3u-list';
    if (/\.mpd(\?|#|$)/i.test(url)) return 'dash';
    if (/\.mp4(\?|#|$)/i.test(url)) return 'mp4';
    if (/\.mp3(\?|#|$)/i.test(url)) return 'mp3';
    return '';
  }

  // --------- Parsing JSON → liste "cliquable" ----------
  function parseJsonToEntries(obj) {
    var out = [];

    // 1) Méta-listes: { playlists: [ {name, url} ] }
    if (obj && Array.isArray(obj.playlists)) {
      obj.playlists.forEach(function (p, i) {
        var name = p && (p.name || p.title || p.label) || ('Entrée ' + (i+1));
        var url = p && (p.url || p.link || p.src);
        if (!name || !url) return;
        out.push({ id: 'pl_' + i, name: name, url: url, kind: 'playlist' });
      });
    }

    // 2) Liste de chaînes directe: { channels:[...] } ou tableau
    var channels = (obj && Array.isArray(obj.channels)) ? obj.channels : (Array.isArray(obj) ? obj : null);
    if (channels && Array.isArray(channels)) {
      channels.forEach(function (c, i) {
        var name = c && (c.name || c.title || c.channel || c.label);
        var url  = c && (c.url || c.src || c.link || c.stream || c.stream_url || c.play || c.playurl);
        if (!name || !url) return;
        out.push({ id: 'ch_' + i, name: name, url: url, kind: 'channel', type: guessType(url) });
      });
    }

    // 3) Objet de groupes { groups/categories: [...] }
    var groups = obj && (obj.groups || obj.Categories || obj.categories);
    if (Array.isArray(groups)) {
      groups.forEach(function (g, gi) {
        var items = Array.isArray(g.items) ? g.items : (Array.isArray(g.channels) ? g.channels : []);
        items.forEach(function (it, i) {
          var name = it && (it.name || it.title || it.channel || it.label);
          var url  = it && (it.url || it.src || it.link || it.stream || it.stream_url || it.play || it.playurl);
          if (!name || !url) return;
          // On considère que ce sont des "playlist" s’ils pointent vers .m3u
          var kind = /\.m3u8?(\?|#|$)/i.test(url) ? 'channel' : (/\.json(\?|#|$)/i.test(url) ? 'playlist' : 'playlist');
          out.push({ id: 'gp_' + gi + '_' + i, name: name, url: url, kind: kind, type: guessType(url) });
        });
      });
    }

    // Si rien détecté, tenter { items|list|streams|lives }
    var generic = obj && (obj.items || obj.list || obj.streams || obj.lives);
    if (Array.isArray(generic)) {
      generic.forEach(function (it, i) {
        var name = it && (it.name || it.title || it.channel || it.label);
        var url  = it && (it.url || it.src || it.link || it.stream || it.stream_url || it.play || it.playurl);
        if (!name || !url) return;
        out.push({ id: 'it_' + i, name: name, url: url, kind: /\.m3u8?(\?|#|$)/i.test(url) ? 'channel' : 'playlist', type: guessType(url) });
      });
    }

    return out;
  }

  // --------- Fetch JSON ----------
  async function loadJsonFromUrl(url) {
    try {
      var resp = await fetch(url, { credentials: 'omit', cache: 'no-store' });
      if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + (resp.statusText || ''));
      var text = await resp.text();

      var obj;
      try { obj = JSON.parse(text); }
      catch (e) {
        console.error('[JSON] payload ≈', text.slice(0, 200));
        throw new Error('JSON invalide');
      }

      var entries = parseJsonToEntries(obj);
      state.entries = entries;
      renderList();

      if (!entries.length) {
        alert('Le JSON est chargé, mais ne contient aucune entrée exploitable (name/url manquants).');
      }
    } catch (err) {
      console.error('[JSON]', err);
      alert('Chargement JSON impossible : ' + (err && err.message ? err.message : err));
    }
  }

  // --------- Rendu + interactions ----------
  function filterEntries() {
    var q = ((el.search && el.search.value) || (el.search2 && el.search2.value) || (el.inlineSearch && el.inlineSearch.value) || '').trim().toLowerCase();
    state.filtered = state.entries.filter(function (e) {
      if (!q) return true;
      var hay = (e.name + ' ' + e.url).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  function renderList() {
    filterEntries();
    var html = state.filtered.length
      ? state.filtered.map(function (e, idx) {
          var badge = (e.kind === 'playlist') ? '<span class="badge text-bg-secondary ms-2">M3U</span>' : '';
          return '<button class="list-group-item list-group-item-action d-flex align-items-center" data-idx="' + idx + '">' +
                 '<span class="flex-grow-1 text-truncate">' + e.name + '</span>' + badge + '</button>';
        }).join('')
      : '<div class="text-muted small p-2">Aucune entrée</div>';

    if (el.list) el.list.innerHTML = html;
    if (el.list2) el.list2.innerHTML = html;
    if (el.inlineList) el.inlineList.innerHTML = html;

    // Clic → déléguer au loader natif
    Array.prototype.forEach.call(document.querySelectorAll('[data-idx]'), function (btn) {
      btn.addEventListener('click', function (ev) {
        var idx = Number(ev.currentTarget.getAttribute('data-idx'));
        playAt(idx);
      });
    });

    if (el.zapTitle) el.zapTitle.textContent = state.filtered[0] ? state.filtered[0].name : '—';
  }

  function playAt(idx) {
    var e = state.filtered[idx];
    if (!e) return;

    // HTTPS page + HTTP flux → bloqué
    if (location.protocol === 'https:' && /^http:\/\//i.test(e.url)) {
      alert('Bloqué : flux HTTP sur page HTTPS (Mixed Content). Cherche une URL HTTPS.');
      return;
    }

    // La lecture est DÉLÉGUÉE au player natif (scriptiptv.js)
    if (typeof window.loadSource === 'function') {
      window.loadSource(e.url);
    } else {
      alert('loadSource indisponible – assure-toi que scriptiptv.js est chargé en premier.');
    }

    // Habillage visuel (non bloquant)
    if (el.nowbar) el.nowbar.classList.remove('d-none');
    if (el.nowPlaying) el.nowPlaying.textContent = e.name || 'Lecture';
    if (el.nowUrl) el.nowUrl.textContent = e.url || '';
    if (el.zapTitle) el.zapTitle.textContent = e.name || '—';
  }

  // --------- Intégrations UI existantes ----------
  function wireUI() {
    // Bouton Lire en haut → route .json vers notre loader
    if (el.btnPlay) el.btnPlay.addEventListener('click', function () {
      var v = el.inputUrl && el.inputUrl.value ? el.inputUrl.value.trim() : '';
      if (!v) return;
      if (isJsonUrl(v)) loadJsonFromUrl(v);
      else if (typeof window.loadSource === 'function') window.loadSource(v);
    });

    // “Charger la playlist” → n’intercepter QUE si .json
    function attachSelect(btn, sel) {
      if (!btn || !sel) return;
      btn.addEventListener('click', function (ev) {
        var url = sel.value || '';
        if (isJsonUrl(url)) {
          ev.preventDefault(); ev.stopImmediatePropagation();
          loadJsonFromUrl(url);
        }
        // sinon, on laisse le loader natif gérer (.m3u / .m3u8 / etc.)
      }, true);
    }
    attachSelect(el.btnLoadM3U,  el.sourceSel);
    attachSelect(el.btnLoadM3U2, el.sourceSel2);

    // Recherche
    [el.search, el.search2, el.inlineSearch].forEach(function (inp) {
      if (inp) inp.addEventListener('input', renderList);
    });
  }

  // --------- Init ----------
  wireUI();

  // API debug
  window.IPTV_JSON = {
    load: loadJsonFromUrl,
    state: function () { return { entries: state.entries.slice(), filtered: state.filtered.slice() }; }
  };
})();
