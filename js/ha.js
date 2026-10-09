/* ==========================================================================
   Werwolf Manager – HOME ASSISTANT (optional)
   Connects straight from the browser to your Home Assistant (regular HA
   login, no token copying) and controls the selected lights:
     day / night = colours of the chosen preset · werewolves = pulse ·
     death = two flashes · game over = winners' colour · then restore.
   Requirement: Home Assistant is reachable via HTTPS.
   The home-assistant-js-websocket library is only loaded when needed.
   ========================================================================== */
(function (global) {
  'use strict';

  const LIB = 'https://cdn.jsdelivr.net/npm/home-assistant-js-websocket@9.7.1/dist/haws.umd.js';
  const TOKENS = 'ww2.haTokens';
  const SCENE = 'werwolf_manager_restore';

  /* Light moods. day / night = scene colours, pulse = werewolves wake up, flash = someone dies.
     rgb = [r, g, b], kelvin = white colour temperature, pct = brightness in percent. */
  const PRESETS = {
    classic: { day: { kelvin: 4000, pct: 100 }, night: { rgb: [255, 40, 15], pct: 22 }, pulse: [255, 0, 0], flash: [255, 0, 0] },
    ember:   { day: { kelvin: 2900, pct: 95 },  night: { rgb: [255, 110, 10], pct: 25 }, pulse: [255, 40, 0], flash: [255, 160, 40] },
    moon:    { day: { kelvin: 5200, pct: 100 }, night: { rgb: [40, 70, 255], pct: 18 }, pulse: [150, 0, 255], flash: [255, 255, 255] },
    witch:   { day: { rgb: [255, 200, 90], pct: 90 }, night: { rgb: [120, 30, 255], pct: 22 }, pulse: [40, 255, 60], flash: [40, 255, 60] },
    cinema:  { day: { kelvin: 2700, pct: 40 },  night: { rgb: [255, 30, 10], pct: 4 },   pulse: [255, 0, 0], flash: [255, 0, 0] }
  };
  /** Colours for preview swatches (CSS). */
  const SWATCH = {
    classic: ['#fff1dc', '#ff2a10'], ember: ['#ffd9a8', '#ff7a0a'], moon: ['#eef3ff', '#3048ff'],
    witch: ['#ffc85a', '#7a1eff'], cinema: ['#8a6a48', '#5a0a04']
  };
  const WIN_COLOURS = {
    dorf: [80, 220, 160], wolf: [255, 30, 30], vampir: [170, 90, 255], solo: [255, 150, 40],
    liebende: [255, 110, 190], engel: [255, 255, 255], niemand: [120, 120, 140]
  };

  const state = {
    status: 'off', error: null, conn: null, url: null, lights: [], mood: null, snapshot: false,
    preset: 'classic', effects: true, justLoggedIn: false, all: [], listeners: []
  };
  let lightSig = '', registry = { areas: {}, entityArea: {} };
  const emit = what => state.listeners.forEach(fn => { try { fn(what); } catch (e) { /* ignore */ } });

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

  /** Rooms: area registry + entity/device registry (fetched once, failures are harmless). */
  async function loadRegistry() {
    try {
      const [areas, devices, entities] = await Promise.all([
        state.conn.sendMessagePromise({ type: 'config/area_registry/list' }),
        state.conn.sendMessagePromise({ type: 'config/device_registry/list' }),
        state.conn.sendMessagePromise({ type: 'config/entity_registry/list' })
      ]);
      const deviceArea = {};
      devices.forEach(d => { deviceArea[d.id] = d.area_id; });
      registry.areas = Object.fromEntries(areas.map(a => [a.area_id, a.name]));
      registry.entityArea = {};
      entities.filter(e => e.entity_id.startsWith('light.')).forEach(e => {
        registry.entityArea[e.entity_id] = e.area_id || deviceArea[e.device_id] || null;
      });
    } catch (e) { /* no admin rights or older HA – lights are listed without rooms */ }
  }

  /** Only lights matter: the list is rebuilt when lights appear/disappear, not on every state change. */
  function onEntities(ents) {
    const list = Object.values(ents)
      .filter(e => e.entity_id.startsWith('light.') && e.state !== 'unavailable')
      .map(e => ({ id: e.entity_id, name: (e.attributes && e.attributes.friendly_name) || e.entity_id }));
    const sig = list.map(l => l.id + '|' + l.name).sort().join(';');
    if (sig === lightSig) return;
    lightSig = sig;
    state.all = list;
    emit('lights');
  }

  async function connect(url) {
    state.status = 'connecting'; state.error = null; emit('status');
    const fromLogin = location.search.includes('auth_callback');
    try {
      await loadLib();
      const H = global.HAWS;
      const opts = { saveTokens, loadTokens };
      if (url) opts.hassUrl = url.replace(/\/+$/, '');
      const auth = await H.getAuth(opts);       // redirects to the HA login if needed
      if (fromLogin) history.replaceState(null, '', location.pathname + location.hash);
      state.url = auth.data.hassUrl;
      state.conn = await H.createConnection({ auth });
      await loadRegistry();
      H.subscribeEntities(state.conn, onEntities);
      state.conn.addEventListener('disconnected', () => { state.status = 'error'; state.error = 'disconnected'; emit('status'); });
      state.conn.addEventListener('ready', () => { state.status = 'on'; state.error = null; emit('status'); });
      state.status = 'on';
      state.justLoggedIn = fromLogin;
      emit('status');
    } catch (e) {
      // getAuth throws ERR_HASS_HOST_REQUIRED when nothing is stored – not an error for the user.
      const code = e && (e.code !== undefined ? e.code : e.message);
      state.status = (url || fromLogin) ? 'error' : 'off';
      state.error = String(code);
      emit('status');
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
    state.conn = null; state.status = 'off'; state.all = []; lightSig = ''; emit('status');
  }
  /** All lights, sorted by room and name: [{id, name, area}] */
  function lights() {
    return state.all
      .map(l => ({ id: l.id, name: l.name, area: registry.areas[registry.entityArea[l.id]] || null }))
      .sort((a, b) => (a.area || '￿').localeCompare(b.area || '￿') || a.name.localeCompare(b.name));
  }

  const call = (domain, service, data, target) =>
    state.conn ? global.HAWS.callService(state.conn, domain, service, data, target).catch(() => {}) : Promise.resolve();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const target = () => ({ entity_id: state.lights });
  const ready = () => state.status === 'on' && state.lights.length > 0;
  const P = () => PRESETS[state.preset] || PRESETS.classic;
  const look = (c, transition) => {
    const d = { brightness_pct: c.pct, transition };
    if (c.rgb) d.rgb_color = c.rgb; else d.color_temp_kelvin = c.kelvin;
    return d;
  };
  function moodData(name, transition) {
    if (name === 'day' || name === 'night') return look(P()[name], transition === undefined ? 3 : transition);
    const rgb = WIN_COLOURS[name];
    return rgb ? { rgb_color: rgb, brightness_pct: name === 'niemand' ? 30 : 90, transition: transition === undefined ? 1 : transition } : null;
  }

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
    const data = moodData(name);
    if (!ready() || !data) return;
    await snapshot();
    state.mood = name;
    await call('light', 'turn_on', data, target());
  }
  async function pulse() {          // werewolves wake up
    if (!ready() || !state.effects) return;
    await call('light', 'turn_on', { rgb_color: P().pulse, brightness_pct: 75, transition: 0.4 }, target());
    await sleep(900);
    await call('light', 'turn_on', moodData(state.mood || 'night', 1.2), target());
  }
  async function blink() {          // someone dies
    if (!ready() || !state.effects) return;
    for (let i = 0; i < 2; i++) {
      await call('light', 'turn_on', { rgb_color: P().flash, brightness_pct: 100, transition: 0 }, target());
      await sleep(350);
      await call('light', 'turn_on', { rgb_color: P().flash, brightness_pct: 8, transition: 0 }, target());
      await sleep(300);
    }
    if (state.mood) await call('light', 'turn_on', moodData(state.mood, 1), target());
  }
  /** Preview of the chosen preset: day → night → pulse → flash → back to before. */
  async function test() {
    if (!ready()) return;
    const had = state.snapshot, before = state.mood;
    await snapshot();
    await call('light', 'turn_on', moodData('day', 1), target()); await sleep(1800);
    await call('light', 'turn_on', moodData('night', 1), target()); state.mood = 'night'; await sleep(1800);
    const fx = state.effects; state.effects = true;
    await pulse(); await sleep(400); await blink();
    state.effects = fx;
    if (!had) await restore();
    else if (before) { state.mood = before; await call('light', 'turn_on', moodData(before, 1), target()); }
  }

  global.WW_HA = {
    state, PRESETS, SWATCH, connect, resume, disconnect, lights,
    setLights(ids) { state.lights = ids.slice(); },
    configure(o) {
      Object.assign(state, o);
      if (ready() && state.mood && (state.mood === 'day' || state.mood === 'night')) call('light', 'turn_on', moodData(state.mood, 1), target());
    },
    onChange(fn) { state.listeners.push(fn); },
    mood, pulse, blink, restore, test
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
