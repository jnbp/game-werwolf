/* ==========================================================================
   Werwolf Manager – HOME ASSISTANT (optional)
   Connects straight from the browser to your Home Assistant (regular HA
   login, no token copying) and controls the selected lights:
     day = bright & warm · night = dim & red · werewolves = red pulse ·
     death = two red flashes · game over = winners' colour · then restore.
   Requirement: Home Assistant is reachable via HTTPS.
   The home-assistant-js-websocket library is only loaded when needed.
   ========================================================================== */
(function (global) {
  'use strict';

  const LIB = 'https://cdn.jsdelivr.net/npm/home-assistant-js-websocket@9.7.1/dist/haws.umd.js';
  const TOKENS = 'ww2.haTokens';
  const SCENE = 'werwolf_manager_restore';
  const MOODS = {
    day:   { brightness_pct: 100, color_temp_kelvin: 3200, transition: 3 },
    night: { brightness_pct: 22, rgb_color: [255, 45, 20], transition: 3 },
    dorf:  { brightness_pct: 90, rgb_color: [80, 220, 160], transition: 1 },
    wolf:  { brightness_pct: 90, rgb_color: [255, 30, 30], transition: 1 },
    vampir:{ brightness_pct: 90, rgb_color: [170, 90, 255], transition: 1 },
    solo:  { brightness_pct: 90, rgb_color: [255, 150, 40], transition: 1 },
    liebende: { brightness_pct: 90, rgb_color: [255, 110, 190], transition: 1 },
    engel: { brightness_pct: 100, rgb_color: [255, 255, 255], transition: 1 },
    niemand: { brightness_pct: 30, rgb_color: [120, 120, 140], transition: 2 }
  };

  const state = { status: 'off', error: null, conn: null, entities: {}, url: null, lights: [], mood: null, snapshot: false, listeners: [] };
  const emit = () => state.listeners.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });

  function loadLib() {
    if (global.HAWS) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = LIB; s.onload = resolve; s.onerror = () => reject(new Error('lib'));
      document.head.appendChild(s);
    });
  }
  const saveTokens = data => { try { localStorage.setItem(TOKENS, JSON.stringify(data)); } catch (e) { /* storage full */ } };
  const loadTokens = async () => { try { return JSON.parse(localStorage.getItem(TOKENS)) || undefined; } catch (e) { return undefined; } };

  async function connect(url) {
    state.status = 'connecting'; state.error = null; emit();
    try {
      await loadLib();
      const H = global.HAWS;
      const opts = { saveTokens, loadTokens };
      if (url) opts.hassUrl = url.replace(/\/+$/, '');
      const auth = await H.getAuth(opts);       // redirects to the HA login if needed
      if (location.search.includes('auth_callback')) history.replaceState(null, '', location.pathname + location.hash);
      state.url = auth.data.hassUrl;
      state.conn = await H.createConnection({ auth });
      H.subscribeEntities(state.conn, ents => { state.entities = ents; emit(); });
      state.conn.addEventListener('disconnected', () => { state.status = 'error'; state.error = 'disconnected'; emit(); });
      state.conn.addEventListener('ready', () => { state.status = 'on'; state.error = null; emit(); });
      state.status = 'on'; emit();
    } catch (e) {
      // getAuth throws ERR_HASS_HOST_REQUIRED when nothing is stored – not an error for the user.
      const code = e && (e.code !== undefined ? e.code : e.message);
      state.status = (url || location.search.includes('auth_callback')) ? 'error' : 'off';
      state.error = String(code);
      emit();
    }
  }
  /** Reconnect automatically after the login redirect or with stored tokens. */
  async function resume() {
    let has = false;
    try { has = !!localStorage.getItem(TOKENS); } catch (e) { /* ignore */ }
    if (has || location.search.includes('auth_callback')) await connect(null);
  }
  function disconnect() {
    try { localStorage.removeItem(TOKENS); } catch (e) { /* ignore */ }
    if (state.conn) state.conn.close();
    state.conn = null; state.status = 'off'; state.entities = {}; emit();
  }
  function lights() {
    return Object.values(state.entities)
      .filter(e => e.entity_id.startsWith('light.'))
      .map(e => ({ id: e.entity_id, name: (e.attributes && e.attributes.friendly_name) || e.entity_id, on: e.state === 'on' }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const call = (domain, service, data, target) =>
    state.conn ? global.HAWS.callService(state.conn, domain, service, data, target).catch(() => {}) : Promise.resolve();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const target = () => ({ entity_id: state.lights });
  const ready = () => state.status === 'on' && state.lights.length > 0;

  async function snapshot() {
    if (!ready() || state.snapshot) return;
    state.snapshot = true;
    await call('scene', 'create', { scene_id: SCENE, snapshot_entities: state.lights });
  }
  async function restore() {
    if (!ready() || !state.snapshot) return;
    state.snapshot = false; state.mood = null;
    await call('scene', 'turn_on', { entity_id: `scene.${SCENE}`, transition: 2 });
  }
  async function mood(name) {
    if (!ready() || !MOODS[name]) return;
    await snapshot();
    state.mood = name;
    await call('light', 'turn_on', MOODS[name], target());
  }
  async function pulse() {          // werewolves wake up
    if (!ready()) return;
    await call('light', 'turn_on', { rgb_color: [255, 0, 0], brightness_pct: 75, transition: 0.4 }, target());
    await sleep(900);
    await call('light', 'turn_on', Object.assign({}, MOODS[state.mood || 'night'], { transition: 1.2 }), target());
  }
  async function blink() {          // someone dies
    if (!ready()) return;
    for (let i = 0; i < 2; i++) {
      await call('light', 'turn_on', { rgb_color: [255, 0, 0], brightness_pct: 100, transition: 0 }, target());
      await sleep(350);
      await call('light', 'turn_on', { rgb_color: [255, 0, 0], brightness_pct: 8, transition: 0 }, target());
      await sleep(300);
    }
    if (state.mood) await call('light', 'turn_on', Object.assign({}, MOODS[state.mood], { transition: 1 }), target());
  }

  global.WW_HA = {
    state, connect, resume, disconnect, lights,
    setLights(ids) { state.lights = ids.slice(); },
    onChange(fn) { state.listeners.push(fn); },
    mood, pulse, blink, restore,
    async test() { const had = state.snapshot; await snapshot(); await blink(); if (!had) await restore(); }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
