/* 
 * json-playlist.js — playlists JSON & méta-listes (.m3u) sans dépendre de loadSource
 *
 * ➤ Intégration : placez APRÈS `scriptiptv.js` (ou seul) :
 *    <script src="/js/json-playlist.js" defer></script>
 *
 * ➤ Prend en charge :
 *    - JSON { meta, categories, channels }
 *    - Tableau direct de chaînes [{ name, url, ... }]
 *    - Méta-listes { playlists: [{ name, url(.m3u|.m3u8|.mpd|.mp4|.mp3|YouTube) }] }
 *      • Si l'URL est .m3u → on télécharge et on PARSE nous-mêmes la M3U
 *
 * ➤ Le bouton "Lire" accepte aussi une URL .json
 */
(() => {
  'use strict';

  // ===== Helpers & éléments =====
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = {
    player: document.getElementById('player'),
    nowbar: document.getElementById('nowbar'),
    channelLogo: document.getElementById('channelLogo'),
    nowPlaying: document.getElementById('nowPlaying'),
    nowUrl: document.getElementById('nowUrl'),
    zapTitle: document.getElementById('zapTitle'),
    btnPrev: document.getElementById('btnPrev'),
    btnNext: document.getElementById('btnNext'),
    // Catégories
    cat: document.getElementById('categorySelect'),
    cat2: document.getElementById('categorySelect2'),
    inlineCat: document.getElementById('inlineCategorySelect'),
    // Listes
    list: document.getElementById('channelList'),
    list2: document.getElementById('channelList2'),
    inlineList: document.getElementById('inlineChannelList'),
    // Recherches
    search: document.getElementById('search'),
    search2: document.getElementById('search2'),
    inlineSearch: document.getElementById('inlineSearch'),
    // Sources + boutons
    sourceSel: document.getElementById('sourceSelect'),
    sourceSel2: document.getElementById('sourceSelect2'),
    btnLoadM3U: document.getElementById('btnLoadM3U'),
    btnLoadM3U2: document.getElementById('btnLoadM3U2'),
    inputUrl: document.getElementById('inputUrl'),
    btnPlay: document.getElementById('btnPlay'),
  };

  let vjs = null;
  try { vjs = window.videojs ? window.videojs('player') : null; } catch (e) {}

  const state = {
    meta: {},
    channels: [],
    categories: [],
    filtered: [],
    index: -1,
  };

  const isJsonUrl = (url) => /\.json(\?|#|$)/i.test(url || '');

  // ===== Détection de type =====
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

  function srcForPlayer(ch) {
    if (ch.type === 'm3u-list') return null; // non jouable
    if (ch.type === 'youtube') return { src: ch.url.replace(/^yt:/i, ''), type: 'video/youtube' };
    if (ch.type === 'dash') return { src: ch.url, type: 'application/dash+xml' };
    if (ch.type === 'hls') return { src: ch.url, type: 'application/x-mpegURL' };
    if (ch.type === 'mp4') return { src: ch.url, type: 'video/mp4' };
    if (ch.type === 'mp3') return { src: ch.url, type: 'audio/mpeg' };
    return { src: ch.url };
  }

  // ===== Catégories =====
  function buildCategories(channels, catsList) {
    const byLabel = new Map();
    (Array.isArray(catsList) ? catsList : []).forEach((c) => {
      const id = c.id || (c.label || '').toLowerCase().trim();
      if (id) byLabel.set(id, { id, label: c.label || id });
    });
    channels.forEach((c) => {
      const id = (c.category || 'Autres').toString();
      const key = id.toLowerCase();
      if (!byLabel.has(key)) byLabel.set(key, { id: key, label: c.category || 'Autres' });
    });
    return [
      { id: '*', label: 'Toutes' },
      ...Array.from(byLabel.values()).sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    ];
  }

  // ===== Parsing JSON =====
  function parseJsonPlaylist(obj) {
    // 1) Natif { meta, categories, channels } ou tableau direct
    const meta0 = obj?.meta || {};
    const cats0 = Array.isArray(obj?.categories) ? obj.categories : [];
    let channels0 = [];
    if (Array.isArray(obj?.channels)) channels0 = obj.channels;
    else if (Array.isArray(obj)) channels0 = obj; // variante courte

    const toChannel = (c, i) => ({
      id: c.id || `ch_${i}`,
      name: c.name || c.title || c.channel || c.label,
      url: c.url || c.src || c.link || c.stream || c.stream_url || c.play || c.playurl,
      logo: c.logo || c.icon || c.image || c.poster || '',
      category: c.category || c.group || c.cat || c.genre || c.type || 'Autres',
      group: c.group || c.country || '',
      type: c.type || guessType(c.url || c.src || c.link || c.stream || c.stream_url || c.play || c.playurl),
      headers: c.headers || {},
      _raw: c,
    });

    if (channels0.length) {
      const channels = channels0
        .filter((c) => c && (c.url || c.src || c.link || c.stream || c.stream_url || c.play || c.playurl) && (c.name || c.title || c.channel || c.label))
        .map(toChannel);
      const categories = buildCategories(channels, cats0);
      return { meta: meta0, channels, categories };
    }

    // 2) Méta-listes & variantes courantes
    const buckets = [];

    // a) { playlists: [ { name/title, url/link, logo, category } ] }
    if (Array.isArray(obj?.playlists)) {
      buckets.push({ key: 'playlists', items: obj.playlists });
    }

    // b) Objet avec tableaux par clé (catégories implicites)
    if (obj && !Array.isArray(obj) && typeof obj === 'object') {
      const objectArrays = Object.entries(obj).filter(([k, v]) => Array.isArray(v));
      if (objectArrays.length && !obj.meta && !obj.channels && !obj.categories && !obj.playlists) {
        objectArrays.forEach(([k, arr]) => {
          arr.forEach((item) => buckets.push({ key: k, items: [{ ...item, category: item.category || k }] }));
        });
      }
    }

    // c) { groups/categories: [{ label/name, items|channels: [...] }] }
    const groups = obj?.groups || obj?.Categories || obj?.categories;
    if (Array.isArray(groups)) {
      groups.forEach((g) => {
        const label = g.label || g.name || g.title || 'Autres';
        const items = Array.isArray(g.items) ? g.items : Array.isArray(g.channels) ? g.channels : [];
        if (items.length) buckets.push({ key: label, items: items.map((it) => ({ ...it, category: it.category || label })) });
      });
    }

    // d) { items | list | streams | lives }
    const generic = obj?.items || obj?.list || obj?.streams || obj?.lives;
    if (Array.isArray(generic)) buckets.push({ key: 'Autres', items: generic });

    // Normalisation → chaque item devient un "canal" cliquable (même si c'est .m3u)
    const flat = buckets.flatMap((b) => (b.items || []).map((c) => ({ ...c, category: c.category || b.key })));
    const channels = flat
      .filter((c) => (c.url || c.src || c.link || c.stream || c.stream_url || c.play || c.playurl) && (c.name || c.title || c.channel || c.label))
      .map(toChannel);

    const meta = obj?.meta || {};
    const categories = buildCategories(channels, obj?.categories || []);
    return { meta, channels, categories };
  }

  // ===== Parser M3U =====
  function parseM3U(text) {
    const lines = (text || '').split(/\r?\n/);
    const out = [];
    let cur = null;
    const attrRe = /(\w[\w-]*)="([^"]*)"/g; // tvg-id, tvg-logo, group-title, etc.

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
