/* ==========================================================================
   Werwolf Manager – USER INTERFACE
   Setup → reveal (pass the phone or QR) → game (with or without game master).
   Rules: engine.js · texts: i18n.js · sound: audio.js · lights: ha.js
   ========================================================================== */
(function () {
  'use strict';

  const W = window.WW;
  const I = window.WW_I18N;
  const A = window.WW_AUDIO;
  const HA = window.WW_HA;
  const { ROLES, TEAMS } = window.WW_DATA;
  const CHANGELOG = window.WW_CHANGELOG || [];
  const VERSION = (CHANGELOG[0] || {}).version || '2.1';
  const QR_LIB = 'https://cdn.jsdelivr.net/npm/qrcode-generator@2.0.4/dist/qrcode.js';

  const $app = document.getElementById('app');
  const $modal = document.getElementById('modal-root');
  const $toast = document.getElementById('toast');
  const t = (k, p) => I.t(k, p);
  const m = msg => I.msg(msg);

  // ------------------------------------------------------------ Storage
  const KEY = { setup: 'ww2.setup', game: 'ww2.game', hist: 'ww2.history', seen: 'ww2.seenVersion', prefs: 'ww2.prefs' };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* full or blocked */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };

  /** Device preferences (apply to every game). */
  const prefs = Object.assign({
    lang: (navigator.language || 'de').toLowerCase().startsWith('de') ? 'de' : 'en',
    ambient: false, effects: true, voice: 'recorded', volume: 0.8, autoRead: false, muted: false,
    haLights: []
  }, store.get(KEY.prefs, {}));
  const savePrefs = () => store.set(KEY.prefs, prefs);
  I.setLang(prefs.lang);
  document.documentElement.lang = prefs.lang;
  const applyAudio = () => A.configure({ ambient: prefs.ambient && !prefs.muted, effects: prefs.effects && !prefs.muted, voice: prefs.muted ? 'off' : prefs.voice, volume: prefs.volume });
  applyAudio();
  HA.setLights(prefs.haLights || []);

  let setup = Object.assign({ players: [], counts: {}, filter: 'alle' }, store.get(KEY.setup, {}));
  setup.settings = Object.assign({}, W.DEFAULT_SETTINGS, setup.settings || {});
  Object.keys(setup.counts).forEach(id => { if (!W.ROLE[id] || !setup.counts[id]) delete setup.counts[id]; });

  let game = store.get(KEY.game, null);
  if (game && (game.v !== 2 || !game.news || (game.news.lines[0] && game.news.lines[0].text))) game = null; // drop old saves (v2.0)
  if (game) game.settings = Object.assign({}, W.DEFAULT_SETTINGS, game.settings);
  let history = game ? store.get(KEY.hist, []) : [];

  // jump straight into a running game
  let view = 'setup';
  if (location.hash.startsWith('#role=')) view = 'qrrole';
  else if (game && game.phase !== 'over') view = game.screen === 'reveal' ? 'reveal' : 'game';

  /** Transient UI state (not saved). */
  let tmp = freshTmp();
  function freshTmp() { return { key: null, sel: [], poisonOpen: false, heal: false, poison: null, seen: false, blumen: false, showSecretLog: false, cardLang: null, qr: false, auto: null }; }
  const timer = { total: 0, left: 0, running: false, handle: null, day: null };
  let autoTimers = [];
  const clearAuto = () => { autoTimers.forEach(clearTimeout); autoTimers = []; };
  const later = (ms, fn) => { const h = setTimeout(fn, ms); autoTimers.push(h); return h; };
  const rand = (a, b) => (a + Math.random() * (b - a)) * 1000 * (window.WW_SPEED || 1); // WW_SPEED only for tests

  const saveSetup = () => store.set(KEY.setup, setup);
  const saveGame = () => { store.set(KEY.game, game); store.set(KEY.hist, history); };
  const isAuto = () => game && game.settings.mode === 'auto';

  /** Game move that can be undone. */
  function commit(fn) {
    history.push(JSON.stringify(game));
    if (history.length > 40) history.shift();
    fn(game);
    saveGame();
    render();
  }
  /** Small change without an undo entry. */
  function mutate(fn) { fn(game); saveGame(); render(); }

  function undo() {
    if (!history.length) return;
    clearAuto(); A.stopVoice();
    game = JSON.parse(history.pop());
    tmp = freshTmp();
    saveGame();
    if (game.screen === 'reveal') view = 'reveal';
    render();
    toast(t('toast.undone'));
  }

  // ------------------------------------------------------------ Helpers
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const teamOf = r => TEAMS[r.team] || TEAMS.dorf;
  const teamName = id => I.teamName(id);
  const byId = id => W.byId(game, id);
  const pname = id => esc(W.name(game, id));
  const roleLabel = p => I.roleLabel(W.R(p));
  let toastTimer;
  function toast(text) {
    $toast.textContent = text;
    $toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $toast.classList.remove('show'), 2400);
  }
  function vibrate(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* not supported */ } }
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function flagsOf(p) {
    const f = [];
    if (game.p.mayor === p.id) f.push('👑');
    if (isAuto()) return f.join('');
    if (game.p.lovers.includes(p.id)) f.push('💘');
    if (p.flags.wolf) f.push('🐺');
    if (p.flags.bitten) f.push('🦇');
    if (p.flags.noVote) f.push('🔇');
    if (p.flags.extraLife) f.push('💪');
    if (game.p.wildModel === p.id) f.push('🐾');
    if (game.day && game.day.protectedId === p.id) f.push('🌸');
    return f.join('');
  }
  function teamColor(p) { return (TEAMS[W.team(game, p)] || TEAMS.dorf).color; }

  // ------------------------------------------------------------ Keep screen on
  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && !wakeLock && 'wakeLock' in navigator && document.visibilityState === 'visible') {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (e) { wakeLock = null; }
  }
  document.addEventListener('visibilitychange', () => { if (view === 'game') keepAwake(true); });

  // ------------------------------------------------------------ Narrator
  /** Play the narration of a night step (recording or browser voice). */
  function narrateStep(stepId, part) {
    const st = I.step(stepId);
    const text = part === 'sleep' ? st.sleep : st.wake;
    if (!text) return Promise.resolve();
    return A.narrate(`step-${stepId}-${part}`, text, I.lang);
  }
  const narrateLine = key => A.narrate(key, t('voice.' + key), I.lang);
  const speakNews = () => {
    const lines = game.news.lines.filter(l => !l.secret).map(m).join(' ');
    return lines ? A.speak(lines, I.lang) : Promise.resolve();
  };

  // ==================================================================== RENDER
  let lastScreen = null;
  function render() {
    const night = view === 'game' ? (game && game.phase === 'night') : (view !== 'qrrole' || true);
    document.body.classList.toggle('is-night', !!night);
    document.body.classList.toggle('is-day', !night);
    document.body.classList.toggle('auto-blank', view === 'game' && isAuto() && game.screen === 'night' && tmp.auto && tmp.auto.phase === 'blank');
    const key = view + '|' + stepKey();
    const enter = key !== lastScreen;
    lastScreen = key;
    let html = '';
    if (view === 'setup') html = renderSetup();
    else if (view === 'reveal') html = renderReveal();
    else if (view === 'qrrole') html = renderQrRole();
    else html = renderGame();
    $app.innerHTML = html;
    const sc = $app.querySelector('.screen');
    if (sc && enter) sc.classList.add('enter');
    afterRender();
  }

  // ------------------------------------------------------------ Building blocks
  const quote = text => I.lang === 'de' ? `„${text}“` : `“${text}”`;
  const langChip = () => `<button class="lang-chip" data-act="toggleLang" aria-label="${t('a11y.lang')}"><span class="${I.lang === 'de' ? 'on' : ''}">DE</span><span class="${I.lang === 'en' ? 'on' : ''}">EN</span></button>`;
  const seg = (act, key, cur, options) => `<span class="seg">${options.map(([v, l]) => `<button class="${cur === v ? 'on' : ''}" data-act="${act}" data-key="${key}" data-val="${v}">${l}</button>`).join('')}</span>`;

  function balanceBar(counts) {
    const b = W.balanceParts(counts);
    const total = b.dorf + b.wolf + b.vampir + b.solo;
    if (!total) return `<div class="balance sticky"><div class="bal-head"><span>⚖️ ${t('bal.title')}</span><strong class="muted">${t('bal.pick')}</strong></div><div class="bal-bar empty"></div></div>`;
    const pct = v => (v / total * 100);
    const verdict = b.share < 0.43 ? 'bal.evil' : b.share > 0.62 ? 'bal.village' : 'bal.even';
    const segs = [['dorf', b.dorf], ['wolf', b.wolf], ['vampir', b.vampir], ['solo', b.solo]].filter(x => x[1] > 0);
    return `
      <div class="balance sticky" data-verdict="${verdict}">
        <div class="bal-head"><span>⚖️ ${t('bal.title')}</span><strong>${t(verdict)}</strong></div>
        <div class="bal-bar">${segs.map(([k, v]) => `<i class="seg-${k}" style="width:${pct(v)}%"></i>`).join('')}<span class="bal-mid"></span></div>
        <div class="bal-legend">${segs.map(([k, v]) => `<span><b class="dot seg-${k}"></b>${TEAMS[k].emoji} ${teamName(k)} ${Math.round(pct(v))}%</span>`).join('')}</div>
      </div>`;
  }

  // ------------------------------------------------------------ SETUP
  function renderSetup() {
    const n = setup.players.length;
    const total = Object.values(setup.counts).reduce((a, b) => a + b, 0);
    const v = W.validateSetup(setup.players, setup.counts, setup.settings);
    const running = game && game.phase !== 'over';
    const S = setup.settings;

    const playersHtml = setup.players.map((nm, i) => `
      <li style="--i:${i}">
        <span class="seat">${i + 1}</span>
        <span class="pname">${esc(nm)}</span>
        <button class="icon-btn" data-act="movePlayer" data-i="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="${t('a11y.up')}">↑</button>
        <button class="icon-btn" data-act="movePlayer" data-i="${i}" data-dir="1" ${i === n - 1 ? 'disabled' : ''} aria-label="${t('a11y.down')}">↓</button>
        <button class="icon-btn" data-act="removePlayer" data-i="${i}" aria-label="${t('a11y.remove')}">✕</button>
      </li>`).join('');

    const f = setup.filter;
    const roles = ROLES.filter(r => f === 'alle' || (f === 'neu' && r.isNew) || (f === 'klassisch' && !r.isNew) || (f === 'gewaehlt' && setup.counts[r.id]));
    const roleCards = roles.map((r, i) => {
      const c = setup.counts[r.id] || 0;
      const R = I.role(r.id);
      return `
      <div class="role-card ${c ? 'active' : ''}" style="--tc:${teamOf(r).color};--i:${Math.min(i, 14)}">
        <button class="head" data-act="roleInfo" data-id="${r.id}">
          <span class="emo">${r.emoji}</span>
          <span><span class="rname">${esc(R.name)}</span><br><span class="team">${teamName(r.team)}${r.isNew ? ` · <span class="new-txt">${t('setup.new')}</span>` : ''} · ⓘ</span></span>
        </button>
        <div class="stepper">
          <button data-act="roleDec" data-id="${r.id}" ${c ? '' : 'disabled'} aria-label="${t('a11y.less')}">−</button>
          <span class="val">${c}</span>
          <button data-act="roleInc" data-id="${r.id}" ${c >= (r.max || 1) ? 'disabled' : ''} aria-label="${t('a11y.more')}">+</button>
        </div>
      </div>`;
    }).join('') || `<p class="muted small">${t('setup.noRoles')}</p>`;

    const msgs = [...v.errors.slice(0, 2).map(e => `<div class="msg err">⚠️ ${esc(m(e))}</div>`), ...(v.ok ? v.warnings.slice(0, 2).map(w => `<div class="msg warn">💡 ${esc(m(w))}</div>`) : [])].join('');

    return `
      <header class="topbar">
        <div class="brand"><span class="logo">🐺</span><h1>Werwolf <span>Manager</span></h1><span class="badge">v${esc(VERSION)}</span></div>
        ${langChip()}
        <button class="icon-btn" data-act="openNews" aria-label="${t('nav.news')}" title="${t('nav.news')}">✨</button>
        <button class="icon-btn" data-act="openSettings" aria-label="${t('nav.options')}" title="${t('nav.options')}">⚙️</button>
      </header>
      <div class="screen">
      ${game && game.phase === 'over' ? `
      <section class="panel resume">
        <span class="emo">🏁</span>
        <div class="spacer"><strong>${t('setup.lastGame')}</strong><div class="muted small">${esc(m(game.winner.title))}</div></div>
        <button class="btn" data-act="showResult">${t('setup.view')}</button>
      </section>` : ''}
      ${running ? `
      <section class="panel resume">
        <span class="emo">${game.screen === 'reveal' ? '🎴' : game.phase === 'night' ? '🌙' : '☀️'}</span>
        <div class="spacer"><strong>${t('setup.running')}</strong><div class="muted small">${game.screen === 'reveal' ? t('setup.revealing') : esc(m(W.phaseMsg(game)))} · ${t('setup.nPlayers', { n: game.players.length })}</div></div>
        <button class="btn primary" data-act="resume">${t('setup.continue')}</button>
        <button class="icon-btn" data-act="discard" aria-label="${t('setup.discard')}">🗑️</button>
      </section>` : ''}

      <section class="panel">
        <h2>🎲 ${t('setup.mode')}</h2>
        <div class="mode-pick">
          <button class="mode-card ${S.mode === 'gm' ? 'on' : ''}" data-act="setRule" data-key="mode" data-val="gm">
            <span class="emo">🧑‍⚖️</span><strong>${t('mode.gm')}</strong><small>${t('mode.gmDesc')}</small></button>
          <button class="mode-card ${S.mode === 'auto' ? 'on' : ''}" data-act="setRule" data-key="mode" data-val="auto">
            <span class="emo">📱</span><strong>${t('mode.auto')}</strong><small>${t('mode.autoDesc')}</small></button>
        </div>
        <div class="setting compact"><span class="lbl">🗳️ ${t('set.voteMode')}</span>
          ${seg('setRule', 'voteMode', S.voteMode, [['hands', '✋ ' + t('vote.hands')], ['pass', '🔄 ' + t('vote.pass')]])}</div>
      </section>

      <section class="panel">
        <h2>👥 ${t('setup.players')} <span class="badge">${n}</span></h2>
        <p class="sub">${t('setup.seatHint')}</p>
        <form class="row" data-form="addPlayer" autocomplete="off">
          <input class="input" id="playerInput" placeholder="${t('setup.namePh')}" maxlength="24" enterkeyhint="done" aria-label="${t('setup.namePh')}">
          <button class="btn primary" type="submit" aria-label="${t('a11y.add')}">＋</button>
        </form>
        <ul class="player-list stagger">${playersHtml}</ul>
        ${n ? `<div class="row" style="margin-top:10px"><span class="spacer"></span><button class="btn ghost small" data-act="clearPlayers">${t('setup.clear')}</button></div>` : ''}
      </section>

      <section class="panel roles-panel">
        ${balanceBar(setup.counts)}
        <h2>🎭 ${t('setup.roles')} <span class="badge">${total}/${n}</span></h2>
        <p class="sub">${t('setup.rolesHint')}</p>
        <div class="btn-row">
          <button class="btn primary" data-act="suggest" ${n < 4 ? 'disabled' : ''}>✨ ${t('setup.suggest', { n: n || '…' })}</button>
          <button class="btn" data-act="resetRoles" ${total ? '' : 'disabled'} style="flex:0 0 auto">${t('setup.reset')}</button>
        </div>
        <div class="chips" style="margin-top:12px">
          ${[['alle', t('filter.all')], ['klassisch', t('filter.classic')], ['neu', t('filter.new')], ['gewaehlt', t('filter.picked')]].map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="filter" data-f="${k}">${l}</button>`).join('')}
        </div>
        <div class="role-grid stagger">${roleCards}</div>
      </section>

      <p class="center muted small">Werwolf Manager v${esc(VERSION)} · <a href="v1/" style="color:inherit">${t('setup.v1')}</a> · <a href="#" data-act="openNews" style="color:inherit">${t('nav.news')}</a></p>
      </div>
      <div class="dock"><div class="inner">
        <div class="msgs">${msgs}</div>
        <button class="btn primary big block" data-act="startGame" ${v.ok ? '' : 'disabled'}>🎴 ${t('setup.start')}</button>
      </div></div>`;
  }

  // ------------------------------------------------------------ REVEAL
  function roleFace(roleId, guenstlingTeam, lang) {
    const r = W.ROLE[roleId];
    const R = I.role(roleId, lang);
    const tm = teamOf(r);
    const secret = roleId === 'guenstling' ? ` (${I.t('reveal.secretly', { team: I.teamName(guenstlingTeam === 'wolf' ? 'wolf' : 'vampir', lang) }, lang)})` : '';
    return `
      <div class="role-face">
        <div class="emo">${r.emoji}</div>
        <div class="rname">${esc(R.name)}</div>
        <span class="team-tag">${tm.emoji} ${I.teamName(r.team, lang)}${esc(secret)}</span>
        <p>${esc(R.desc)}</p>
      </div>`;
  }
  function cardCover(lang) {
    return `
      <div class="card-cover" id="cardCover" tabindex="0" role="button" aria-label="${I.t('reveal.hold', null, lang)}">
        <div class="arrow">⬆️</div>
        <div class="moon">🌘</div>
        <div class="hint">${I.t('reveal.hold', null, lang)}</div>
        <div class="hint2">${I.t('reveal.swipe', null, lang)}</div>
      </div>`;
  }

  function renderReveal() {
    const ui = game.ui;
    const dots = game.players.map((p, i) => `<i class="${i < ui.idx ? 'done' : i === ui.idx ? 'now' : ''}"></i>`).join('');
    const head = `<header class="topbar slim"><span class="spacer muted small">🎴 ${t('reveal.title')}</span>${langChip()}</header>`;
    if (ui.stage === 'done') {
      return `${head}
        <div class="screen reveal-wrap">
          <div class="big-emo float">🌕</div>
          <h2 class="pass-name" style="font-size:2rem">${t('reveal.allDone')}</h2>
          <p class="pass-hint">${isAuto() ? t('reveal.doneAuto') : t('reveal.doneGm')}</p>
          <button class="btn primary big block" data-act="beginGame">🌙 ${t('reveal.begin')}</button>
          <button class="btn ghost" data-act="revealBack">← ${t('reveal.lastAgain')}</button>
        </div>`;
    }
    const p = game.players[ui.idx];
    if (ui.stage === 'pass') {
      return `${head}
        <div class="screen reveal-wrap">
          <div class="progress-dots">${dots}</div>
          <div>
            <div class="pass-hint">${t('reveal.passTo')}</div>
            <div class="pass-name pop">${esc(p.name)}</div>
            <div class="pass-hint">${t('reveal.othersLook')}</div>
          </div>
          <button class="btn primary big block" data-act="revealGo">${t('reveal.iAm', { name: esc(p.name) })}</button>
          <button class="btn block" data-act="revealQr">📱 ${t('reveal.qr')}</button>
          <div class="row" style="justify-content:center">
            ${ui.idx > 0 ? `<button class="btn ghost" data-act="revealBack">← ${t('common.back')}</button>` : `<button class="btn ghost" data-act="toSetup">← ${t('reveal.toSetup')}</button>`}
          </div>
        </div>`;
    }
    if (ui.stage === 'qr') {
      return `${head}
        <div class="screen reveal-wrap">
          <div class="progress-dots">${dots}</div>
          <div class="pass-hint">${t('reveal.qrFor', { name: esc(p.name) })}</div>
          <div class="qr-box" id="qrBox"><div class="spinner"></div></div>
          <p class="pass-hint small">${t('reveal.qrHint', { name: esc(p.name) })}</p>
          <button class="btn primary big block" data-act="revealNext">${t('reveal.qrDone')} ✓</button>
          <button class="btn ghost" data-act="revealBackToPass">← ${t('common.back')}</button>
        </div>`;
    }
    const lang = tmp.cardLang || I.lang;
    return `${head}
      <div class="screen reveal-wrap">
        <div class="progress-dots">${dots}</div>
        <div class="pass-hint">${t('reveal.yourRole', { name: `<strong>${esc(p.name)}</strong>` })}</div>
        <div class="card-stage" id="cardStage" style="--tc:${teamOf(W.ROLE[p.roleId]).color}">
          ${roleFace(p.roleId, game.p.guenstlingTeam, lang)}
          ${cardCover(lang)}
        </div>
        <div class="row" style="justify-content:center">
          <button class="chip" data-act="cardLang">${lang === 'en' ? '🇩🇪 Deutsch' : '🇬🇧 English'}</button>
        </div>
        <button class="btn primary big block" id="revealNextBtn" data-act="revealNext" ${tmp.seen ? '' : 'disabled'}>
          ${ui.idx === game.players.length - 1 ? t('reveal.understood') : t('reveal.understoodPass')} ✓
        </button>
      </div>`;
  }

  // QR code: the role is obfuscated inside the link – no server needed.
  const QR_KEY = 'WWManager';
  function encodeRole(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj)).map((b, i) => b ^ QR_KEY.charCodeAt(i % QR_KEY.length));
    let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodeRole(str) {
    try {
      const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
      const bytes = Uint8Array.from(bin, (c, i) => c.charCodeAt(0) ^ QR_KEY.charCodeAt(i % QR_KEY.length));
      const o = JSON.parse(new TextDecoder().decode(bytes));
      return W.ROLE[o.r] ? o : null;
    } catch (e) { return null; }
  }
  async function drawQr() {
    const box = document.getElementById('qrBox');
    if (!box) return;
    const p = game.players[game.ui.idx];
    const url = location.origin + location.pathname + '#role=' + encodeRole({ n: p.name, r: p.roleId, g: game.p.guenstlingTeam, l: I.lang });
    try {
      await loadScript(QR_LIB);
      const qr = window.qrcode(0, 'M');
      qr.addData(url); qr.make();
      box.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
    } catch (e) {
      box.innerHTML = `<p class="small">${t('reveal.qrFail')}</p>`;
    }
  }

  function renderQrRole() {
    const o = decodeRole(location.hash.slice(6));
    if (!o) return `<div class="screen reveal-wrap"><div class="big-emo">🤷</div><p>${t('qr.invalid')}</p><a class="btn" href="./">${t('qr.openApp')}</a></div>`;
    const lang = tmp.cardLang || o.l || I.lang;
    return `
      <header class="topbar slim"><span class="spacer muted small">🐺 Werwolf Manager</span></header>
      <div class="screen reveal-wrap">
        <div class="pass-hint">${I.t('reveal.yourRole', { name: `<strong>${esc(o.n)}</strong>` }, lang)}</div>
        <div class="card-stage" id="cardStage" style="--tc:${teamOf(W.ROLE[o.r]).color}">
          ${roleFace(o.r, o.g, lang)}
          ${cardCover(lang)}
        </div>
        <div class="row" style="justify-content:center"><button class="chip" data-act="cardLang">${lang === 'en' ? '🇩🇪 Deutsch' : '🇬🇧 English'}</button></div>
        <p class="pass-hint small">${I.t('qr.close', null, lang)}</p>
      </div>`;
  }

  function bindCard() {
    const cover = document.getElementById('cardCover');
    const stage = document.getElementById('cardStage');
    if (!cover || !stage) return;
    let startY = 0, active = false, holdT = null;
    const h = () => stage.getBoundingClientRect().height;
    const markSeen = () => {
      if (!tmp.seen) { tmp.seen = true; vibrate(25); A.fx('swoosh'); const b = document.getElementById('revealNextBtn'); if (b) b.disabled = false; }
    };
    const setY = y => { cover.style.transform = `translateY(${-y}px) rotate(${-y / h() * 4}deg)`; stage.classList.toggle('open', y > h() * 0.35); if (y > h() * 0.35) markSeen(); };
    const open = () => { cover.classList.remove('dragging'); setY(h() * 0.88); };
    const close = () => { clearTimeout(holdT); active = false; cover.classList.remove('dragging'); cover.style.transform = ''; stage.classList.remove('open'); };
    cover.addEventListener('pointerdown', e => {
      active = true; startY = e.clientY;
      try { cover.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
      holdT = setTimeout(open, 140);
    });
    cover.addEventListener('pointermove', e => {
      if (!active) return;
      const dy = startY - e.clientY;
      if (dy > 8) { clearTimeout(holdT); cover.classList.add('dragging'); setY(Math.min(h() * 0.92, dy)); }
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => cover.addEventListener(ev, close));
    cover.addEventListener('contextmenu', e => e.preventDefault());
    cover.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); open(); } });
    cover.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') close(); });
  }

  // ------------------------------------------------------------ GAME
  function renderGame() {
    const label = game.screen === 'over' ? `🏁 ${t('game.over')}` : (game.phase === 'night' ? '🌙 ' : '☀️ ') + m(W.phaseMsg(game));
    const body = {
      night: isAuto() ? renderAutoNight : renderNight, interrupt: renderInterrupt, morning: renderNews, afterLynch: renderNews, dusk: renderNews,
      mayor: renderMayor, day: renderDay, tie: renderTie, cleaner: isAuto() ? renderAutoCleaner : renderCleaner, over: renderOver
    }[game.screen] || (() => `<div class="panel">? „${esc(game.screen)}“ <button class="btn" data-act="undo">↶</button></div>`);
    const hideUndo = isAuto() && game.screen === 'night';
    return `
      <header class="topbar">
        <h1 class="phase-title">${label}${isAuto() ? ` <span class="badge mode-badge" title="${t('mode.autoShort')}">📱</span>` : ''}</h1>
        ${langChip()}
        <button class="icon-btn" data-act="toggleMute" aria-label="${t('a11y.mute')}" title="${t('a11y.mute')}">${prefs.muted ? '🔇' : '🔊'}</button>
      </header>
      <div class="screen">${body()}</div>
      <nav class="tabbar" aria-label="${t('a11y.nav')}">
        <button data-act="undo" ${history.length && !hideUndo ? '' : 'disabled'}><span class="ti">↶</span><span class="tl">${t('nav.undo')}</span></button>
        <button data-act="openPlayers"><span class="ti">👥</span><span class="tl">${t('nav.players')}</span></button>
        <button data-act="openLog"><span class="ti">📜</span><span class="tl">${t('nav.log')}</span></button>
        <button data-act="openSettings"><span class="ti">⚙️</span><span class="tl">${t('nav.options')}</span></button>
      </nav>`;
  }

  function stepEmoji(id) {
    const special = { liebende: '💞', werwoelfe: '🐺', vampire: '🧛' };
    if (special[id]) return special[id];
    const r = ROLES.find(x => x.wakes.includes(id));
    return r ? r.emoji : '🌙';
  }

  function narration(text, voiceKey, extraClass = '') {
    if (!game.settings.narration || !text) return '';
    return `<div class="narration ${extraClass}"><span class="txt">${quote(esc(text))}</span><button class="say" data-act="say" data-key="${voiceKey || ''}" data-text="${esc(text)}" aria-label="${t('a11y.read')}">🔊</button></div>`;
  }

  function pickGrid(ids, opts = {}) {
    const sel = opts.sel || tmp.sel;
    const showRoles = !isAuto() && opts.roles !== false;
    if (!ids.length) return `<p class="muted">${t('game.noTargets')}</p>`;
    return `<div class="pick-grid stagger">${ids.map((id, i) => {
      const p = byId(id);
      const on = sel.includes(id);
      return `<button class="pick ${on ? 'sel' : ''}" style="--i:${i}" data-act="${opts.act || 'pick'}" data-id="${id}">
        <span><span>${esc(p.name)}</span>${showRoles ? `<span class="tag">${esc(roleLabel(p))} ${flagsOf(p)}</span>` : (game.p.mayor === p.id ? '<span class="tag">👑</span>' : '')}</span>
        ${on ? '<span class="mark">✓</span>' : ''}
      </button>`;
    }).join('')}</div>`;
  }

  function stepProgress(cur) {
    const visible = game.night.steps.filter(id => W.stepStatus(game, id) !== 'skip');
    const pos = Math.max(0, visible.indexOf(cur.id));
    return `<div class="steps-progress">${visible.map((_, i) => `<i class="${i < pos ? 'done' : i === pos ? 'now' : ''}"></i>`).join('')}</div>`;
  }

  /** Input part of a night step (shared by game-master and auto mode). */
  function stepInput(cur, auto) {
    const def = cur.def;
    const info = cur.info ? `<div class="info-line">${esc(m(cur.info))}</div>` : '';
    if (def.kind === 'yesno') {
      return `${info}
        <div class="btn-row">
          <button class="btn danger big" data-act="urwolf" data-yes="1">🩸 ${t('night.infect')}</button>
          <button class="btn big" data-act="urwolf" data-yes="0">${t('night.kill')}</button>
        </div>`;
    }
    if (def.kind === 'hexe') {
      const victim = (game.night.sel.werwoelfe || [])[0];
      const canHeal = game.p.hexeHeal && !!victim;
      const poisonTargets = W.alive(game).filter(p => !cur.actors.includes(p.id)).map(p => p.id);
      return `${info}
        <div class="potion">
          <span class="emo">💚</span>
          <span class="lbl">${t('night.heal')}${victim ? ` → ${pname(victim)}` : ''}<small>${game.p.hexeHeal ? (victim ? t('night.healDesc') : t('night.healNone')) : t('night.used')}</small></span>
          <button class="switch ${tmp.heal ? 'on' : ''}" data-act="hexeHeal" ${canHeal ? '' : 'disabled'} aria-label="${t('night.heal')}"></button>
        </div>
        <div class="potion">
          <span class="emo">☠️</span>
          <span class="lbl">${t('night.poison')}<small>${game.p.hexePoison ? (tmp.poison ? `→ ${pname(tmp.poison)}` : t('night.poisonDesc')) : t('night.used')}</small></span>
          <button class="switch ${tmp.poisonOpen ? 'on' : ''}" data-act="hexePoisonToggle" ${game.p.hexePoison ? '' : 'disabled'} aria-label="${t('night.poison')}"></button>
        </div>
        ${tmp.poisonOpen ? pickGrid(poisonTargets, { act: 'hexePoison', sel: tmp.poison ? [tmp.poison] : [] }) : ''}
        <div style="height:12px"></div>
        <button class="btn primary big block" data-act="confirmHexe" ${tmp.poisonOpen && !tmp.poison ? 'disabled' : ''}>
          ${tmp.heal || tmp.poison ? t('common.confirm') + ' ✓' : t('night.noPotion') + ' →'}
        </button>`;
    }
    const need = def.count;
    const res = !auto && tmp.sel.length === need ? W.stepResult(game, cur.id, tmp.sel) : null;
    return `${info}
      <p class="muted small" style="margin:0 0 8px">${need === 1 ? t('night.pickOne') : t('night.pickN', { n: need, k: tmp.sel.length })}</p>
      ${pickGrid(cur.targets)}
      ${res ? `<div class="result ${res.good ? 'good' : 'bad'}">${esc(m(res))}</div>` : ''}
      <div style="height:14px"></div>
      <div class="btn-row">
        <button class="btn" data-act="skipStep" style="flex:0 0 auto">${cur.id === 'werwoelfe' ? t('night.noVictim') : t('common.skip')}</button>
        <button class="btn primary big" data-act="confirmStep" ${tmp.sel.length === need ? '' : 'disabled'}>${t('common.confirm')} ✓</button>
      </div>`;
  }

  function renderNight() {
    const cur = W.currentStep(game);
    if (!cur) return '';
    const st = I.step(cur.id);
    const actors = cur.actors.map(pname).join(', ');
    let body;
    if (cur.status === 'fake') {
      body = `<div class="fake-note">🕯️ ${t('night.fake')}</div>
        <button class="btn primary big block" data-act="skipStep">${t('common.next')} →</button>`;
    } else if (cur.def.kind === 'info') {
      body = `${cur.info ? `<div class="info-line">${esc(m(cur.info))}</div>` : ''}
        <button class="btn primary big block" data-act="skipStep">${t('common.next')} →</button>`;
    } else body = stepInput(cur, false);
    return `
      <section class="panel night-panel">
        ${stepProgress(cur)}
        <div class="step-head">
          <span class="emo">${stepEmoji(cur.id)}</span>
          <div><h2>${esc(st.title)}</h2><div class="who">${cur.status === 'fake' ? t('night.notInGame') : actors ? t('night.wakes', { names: actors }) : ''}</div></div>
        </div>
        ${narration(st.wake, `step-${cur.id}-wake`)}
        ${body}
        ${st.sleep && game.settings.narration ? `<p class="muted small" style="margin:12px 0 0">${t('night.then')} ${quote(esc(st.sleep))}</p>` : ''}
      </section>`;
  }

  // ------------------------------------------------ NO GAME MASTER: night
  /*  Flow per step:  call (announcement + input)  →  result (if any)  →
      blank (black screen, random pause)  →  "goes back to sleep"  →  next step.
      Dead/missing roles: call without input → random pause → continue.        */
  function renderAutoNight() {
    const cur = W.currentStep(game);
    if (!cur) return '';
    const st = I.step(cur.id);
    const a = tmp.auto || {};
    if (a.phase === 'intro') {
      return `<section class="auto-stage">
          <div class="big-emo float">🌙</div>
          <h2>${t('auto.nightTitle', { n: game.round })}</h2>
          <p class="muted">${t('auto.nightIntro')}</p>
          <button class="btn primary big block" data-act="autoStartNight">🌙 ${t('auto.go')}</button>
        </section>`;
    }
    if (a.phase === 'blank' || cur.status === 'fake' || cur.def.kind === 'info') {
      return `<section class="auto-stage blank"><div class="moon-pulse">🌙</div><p class="muted">${t('auto.eyesClosed')}</p></section>`;
    }
    if (a.phase === 'result') {
      return `<section class="auto-stage">
          <div class="step-head"><span class="emo">${stepEmoji(cur.id)}</span><h2>${esc(st.title)}</h2></div>
          <div class="result ${a.result.good ? 'good' : 'bad'} big">${esc(m(a.result))}</div>
          <button class="btn primary big block" data-act="autoResultOk">${t('auto.gotIt')} ✓</button>
        </section>`;
    }
    if (a.phase === 'amorTap') {
      return `<section class="auto-stage">
          <div class="big-emo">💘</div>
          <h2>${t('auto.amorTap', { names: tmp.sel.map(pname).join(' & ') })}</h2>
          <button class="btn primary big block" data-act="autoAmorDone">${t('auto.done')} ✓</button>
        </section>`;
    }
    return `
      <section class="panel night-panel auto">
        <div class="step-head">
          <span class="emo">${stepEmoji(cur.id)}</span>
          <div><h2>${esc(st.title)}</h2><div class="who">${t('auto.onlyYou')}</div></div>
        </div>
        ${stepInput(cur, true)}
      </section>`;
  }

  /** Drives the timing in no-game-master mode (started for every new step). */
  function autoController() {
    clearAuto();
    if (!isAuto() || game.screen !== 'night') return;
    const cur = W.currentStep(game);
    if (!cur) return;
    const firstStep = game.night.steps.filter(id => W.stepStatus(game, id) !== 'skip')[0] === cur.id;
    if (firstStep && !(tmp.auto && tmp.auto.started) && !game.night.autoStarted) { tmp.auto = { phase: 'intro' }; return; }
    tmp.auto = { phase: 'call', started: true };
    if (cur.id === 'werwoelfe') { A.fx('howl'); HA.pulse(); }
    const passive = cur.status === 'fake' || cur.def.kind === 'info';
    narrateStep(cur.id, 'wake').then(() => {
      if (!passive) return;
      // fake pause or info step: just wait, then continue
      later(rand(6, 13), () => finishAutoStep(cur.def.kind === 'pick' ? [] : null));
    });
  }
  /** Input done → black screen, pause, "goes back to sleep", finish the step. */
  function finishAutoStep(value) {
    const cur = W.currentStep(game);
    tmp.auto = Object.assign({}, tmp.auto, { phase: 'blank' });
    render();
    later(rand(3, 9), () => {
      narrateStep(cur.id, 'sleep').then(() => later(rand(1.5, 3), () => {
        tmp.auto = { phase: 'call', started: true };
        commit(g => W.submitStep(g, value));
      }));
    });
  }

  // ------------------------------------------------ Morning / verdict / evening
  function newsBlock(onlyPublic = false) {
    const pub = game.news.lines.filter(l => !l.secret);
    const sec = isAuto() ? [] : game.news.lines.filter(l => l.secret);
    return `
      ${pub.length ? `<ul class="news-list stagger">${pub.map((l, i) => `<li style="--i:${i * 3}">${esc(m(l))}</li>`).join('')}</ul>` : ''}
      ${!onlyPublic && sec.length ? `
        <details class="secret-box">
          <summary>🔒 ${t('news.secret', { n: sec.length })}</summary>
          <ul>${sec.map(l => `<li>${esc(m(l))}</li>`).join('')}</ul>
        </details>` : ''}`;
  }

  function renderNews() {
    const s = game.screen;
    let buttons = '';
    if (s === 'morning') buttons = `<button class="btn primary big block" data-act="toDay">☀️ ${t('news.toDay')}</button>`;
    else if (s === 'afterLynch') {
      const judge = W.alive(game).find(p => p.roleId === 'richter');
      const showJudge = judge && !game.p.richterUsed;
      buttons = `
        ${showJudge ? `<button class="btn block" data-act="richter">⚖️ ${isAuto() ? t('news.judgeAuto') : t('news.judge', { name: esc(judge.name) })}</button>` : ''}
        <button class="btn primary big block" data-act="endDay">🌙 ${t('news.endDay')}</button>`;
    } else buttons = `<button class="btn primary big block" data-act="startNight">🌙 ${t('news.startNight', { n: game.round + 1 })}</button>`;
    const intro = s === 'morning' ? t('news.morningIntro') : s === 'dusk' ? t('news.duskIntro') : '';
    return `
      <section class="panel">
        <div class="row"><h2 style="flex:1">${esc(m(game.news.title))}</h2>
          <button class="icon-btn" data-act="sayNews" aria-label="${t('a11y.read')}">🔊</button>
        </div>
        ${intro ? `<p class="sub">${intro}</p>` : ''}
        ${newsBlock()}
      </section>
      <div class="btn-col actions">${buttons}</div>`;
  }

  function renderInterrupt() {
    const it = game.queue[0];
    const who = pname(it.pid);
    const targets = W.interruptTargets(game);
    const cfg = {
      jaeger: { emo: '🏹', title: t('int.hunter', { name: who }), text: t('int.hunterText'), skip: t('int.hunterSkip') },
      akw: { emo: '☢️', title: t('int.akw', { name: who }), text: isAuto() ? t('int.akwAuto') : t('int.akwText'), skip: t('int.akwSkip') },
      mayor: { emo: '👑', title: t('int.mayor', { name: who }), text: t('int.mayorText'), skip: t('int.mayorSkip') }
    }[it.type];
    const autoAkw = isAuto() && it.type === 'akw';
    return `
      ${game.news.lines.some(l => !l.secret) ? `<section class="panel"><h2>${esc(m(game.news.title))}</h2>${newsBlock(true)}</section>` : ''}
      <section class="panel">
        <div class="step-head"><span class="emo">${cfg.emo}</span><div><h2>${cfg.title}</h2></div></div>
        <p class="sub">${cfg.text}</p>
        ${autoAkw ? `<div class="info-line">☢️ ${(it.suggest || []).map(pname).join(' & ') || '–'}</div>` : pickGrid(targets)}
        <div style="height:14px"></div>
        <div class="btn-row">
          ${autoAkw ? '' : `<button class="btn" data-act="skipInterrupt" style="flex:0 0 auto">${cfg.skip}</button>`}
          <button class="btn primary big" data-act="confirmInterrupt" ${tmp.sel.length || autoAkw ? '' : 'disabled'}>${t('common.confirm')} ✓</button>
        </div>
      </section>`;
  }

  function renderMayor() {
    return `
      <section class="panel">
        <div class="step-head"><span class="emo">👑</span><div><h2>${t('mayor.title')}</h2><div class="who">${t('mayor.day1')}</div></div></div>
        ${narration(t('voice.mayor'), 'mayor')}
        <p class="sub">${t('mayor.text')}</p>
        ${pickGrid(W.alive(game).map(p => p.id))}
        <div style="height:14px"></div>
        <div class="btn-row">
          <button class="btn" data-act="noMayor" style="flex:0 0 auto">${t('mayor.none')}</button>
          <button class="btn primary big" data-act="electMayor" ${tmp.sel.length ? '' : 'disabled'}>👑 ${t('mayor.elect')}</button>
        </div>
      </section>`;
  }

  function dayReminders() {
    const r = [];
    const mayor = game.p.mayor && byId(game.p.mayor);
    if (mayor && mayor.alive) r.push(t('day.mayor', { name: `<strong>${esc(mayor.name)}</strong>` }));
    if (game.p.raven && byId(game.p.raven).alive && game.day.voteNo === 1) r.push(t('day.raven', { name: pname(game.p.raven) }));
    if (game.day.protectedId) r.push(t('day.flower', { name: pname(game.day.protectedId) }));
    game.players.filter(p => !p.alive && p.roleId === 'geist' && (!isAuto() || game.settings.revealRoles)).forEach(p => r.push(t('day.ghost', { name: esc(p.name) })));
    game.players.filter(p => p.alive && p.flags.noVote).forEach(p => r.push(t('day.noVote', { name: esc(p.name) })));
    const judge = W.alive(game).find(p => p.roleId === 'richter');
    if (judge && !game.p.richterUsed && !isAuto()) r.push(t('day.judge', { name: esc(judge.name) }));
    return r.length ? `<div class="reminders">${r.map(x => `<div class="reminder">${x}</div>`).join('')}</div>` : '';
  }

  function renderDay() {
    const d = game.day;
    if (d.mode === 'vote') return renderVote();
    if (timer.day !== game.round) { stopTimer(); timer.total = timer.left = game.settings.dayMinutes * 60; timer.day = game.round; }
    const flower = W.alive(game).find(p => p.roleId === 'blumenkind');
    const canFlower = flower && !game.p.blumenkindUsed;
    const pct = timer.total ? (timer.left / timer.total) * 100 : 0;
    return `
      <section class="panel">
        <h2>💬 ${t('day.discussion')}</h2>
        <p class="sub">${t('day.discussionText')}</p>
        <div class="timer">
          <div class="digits ${timer.left <= 30 && timer.left > 0 ? 'low' : ''}" id="tDigits">${fmt(timer.left)}</div>
          <div class="bar"><i id="tBar" style="width:${pct}%"></i></div>
          <div class="btn-row">
            <button class="btn" data-act="timerAdd" data-d="-60">−1</button>
            <button class="btn primary" data-act="timerToggle" id="tToggle">${timer.running ? '⏸ ' + t('timer.pause') : '▶︎ ' + t('timer.start')}</button>
            <button class="btn" data-act="timerAdd" data-d="60">+1</button>
            <button class="btn" data-act="timerReset" aria-label="${t('timer.reset')}">↺</button>
          </div>
        </div>
        ${dayReminders()}
        ${tmp.blumen ? `
          <div class="info-line">🌸 ${t('day.flowerPick', { name: esc(flower.name) })}</div>
          ${pickGrid(W.alive(game).map(p => p.id))}
          <div style="height:10px"></div>
          <div class="btn-row"><button class="btn" data-act="blumenCancel">${t('common.cancel')}</button><button class="btn primary" data-act="blumenConfirm" ${tmp.sel.length ? '' : 'disabled'}>${t('day.protect')}</button></div>
        ` : canFlower ? `<button class="btn block" data-act="blumenOpen">🌸 ${t('day.flowerBtn', { name: esc(flower.name) })}</button>` : ''}
      </section>
      <div class="btn-col actions"><button class="btn primary big block" data-act="startVote">🗳️ ${t('day.startVote')}</button></div>`;
  }

  function voteRows(readonly) {
    const d = game.day;
    const totals = W.voteTotals(game);
    const max = Math.max(0, ...Object.values(totals));
    const mayor = game.p.mayor && byId(game.p.mayor);
    const mayorAlive = mayor && mayor.alive;
    const rows = W.voteCandidates(game).map((id, i) => {
      const p = byId(id);
      const extra = [];
      if (game.p.raven === id && d.voteNo === 1) extra.push('+2 🐦‍⬛');
      if (d.mayorVote === id && mayorAlive && !readonly) extra.push('+1 👑');
      return `
        <div class="vote-row ${max > 0 && totals[id] === max ? 'lead' : ''}" style="--i:${i};--w:${max ? totals[id] / max * 100 : 0}%">
          <span class="vbar"></span>
          <span class="vname">${esc(p.name)} <span class="extra">${extra.join(' ')}</span></span>
          ${!readonly && mayorAlive ? `<button class="icon-btn crown ${d.mayorVote === id ? 'on' : ''}" data-act="mayorVote" data-id="${id}" aria-label="${t('vote.mayorFor', { name: esc(p.name) })}">👑</button>` : ''}
          ${!readonly ? `<button class="icon-btn" data-act="vote" data-id="${id}" data-d="-1" ${(d.votes[id] || 0) ? '' : 'disabled'} aria-label="−">−</button>` : ''}
          <span class="count">${totals[id]}</span>
          ${!readonly ? `<button class="icon-btn" data-act="vote" data-id="${id}" data-d="1" aria-label="+">＋</button>` : ''}
        </div>`;
    }).join('');
    const leaders = Object.keys(totals).filter(id => max > 0 && totals[id] === max);
    const status = !max ? t('vote.none') : leaders.length === 1 ? t('vote.lead', { name: `<strong>${pname(leaders[0])}</strong>`, n: max }) : t('vote.tie', { names: leaders.map(pname).join(', ') });
    return { rows, max, status, mayorAlive };
  }

  function renderVote() {
    const d = game.day;
    const title = `🗳️ ${t('vote.title')}${d.voteNo > 1 ? ' – ' + t('vote.second') : ''}`;
    if (game.settings.voteMode === 'pass' && d.passStage !== 'result') return renderPassVote(title);
    const readonly = game.settings.voteMode === 'pass';
    const v = voteRows(readonly);
    return `
      <section class="panel">
        <h2>${title}</h2>
        <p class="sub">${readonly ? t('vote.resultText') : t('vote.handsText') + (v.mayorAlive ? ' ' + t('vote.mayorHint') : '')}</p>
        ${dayReminders()}
        <div class="vote-list stagger ${readonly ? 'readonly' : ''}">${v.rows}</div>
        <p class="center" style="margin:14px 0 0">${v.status}</p>
      </section>
      <div class="btn-col actions">
        <button class="btn primary big block" data-act="resolveVote" ${v.max ? '' : 'disabled'}>⚖️ ${t('vote.resolve')}</button>
        <div class="btn-row">
          ${readonly ? '' : `<button class="btn" data-act="backToTalk">← ${t('vote.backTalk')}</button>`}
          <button class="btn" data-act="noLynch">${t('vote.noLynch')}</button>
        </div>
      </div>`;
  }

  function renderPassVote(title) {
    const d = game.day;
    const list = d.voterList || [];
    const dots = list.map((_, i) => `<i class="${i < d.passIdx ? 'done' : i === d.passIdx ? 'now' : ''}"></i>`).join('');
    if (d.passStage === 'done' || d.passIdx >= list.length) {
      return `<section class="panel center">
          <h2 style="justify-content:center">${title}</h2>
          <div class="big-emo float">🗳️</div>
          <p>${t('vote.allVoted')}</p>
          <button class="btn primary big block" data-act="passReveal">📊 ${t('vote.showResult')}</button>
        </section>`;
    }
    const voter = byId(list[d.passIdx]);
    if (d.passStage === 'hand') {
      return `<section class="panel center pass-panel">
          <h2 style="justify-content:center">${title}</h2>
          <div class="progress-dots">${dots}</div>
          <div class="pass-hint">${t('reveal.passTo')}</div>
          <div class="pass-name pop">${esc(voter.name)}</div>
          <p class="pass-hint">${t('vote.secretHint')}</p>
          <button class="btn primary big block" data-act="passIAm">${t('reveal.iAm', { name: esc(voter.name) })}</button>
          <button class="btn ghost" data-act="noLynch">${t('vote.noLynch')}</button>
        </section>`;
    }
    const cands = W.voteCandidates(game).filter(id => id !== voter.id);
    return `<section class="panel">
        <h2>${t('vote.whoFor', { name: esc(voter.name) })}</h2>
        ${pickGrid(cands, { roles: false })}
        <div style="height:14px"></div>
        <div class="btn-row">
          <button class="btn" data-act="passCast" data-abstain="1" style="flex:0 0 auto">${t('vote.abstain')}</button>
          <button class="btn primary big" data-act="passCast" ${tmp.sel.length ? '' : 'disabled'}>${t('vote.cast')} ✓</button>
        </div>
      </section>`;
  }

  function renderTie() {
    const mayor = byId(game.p.mayor);
    return `
      <section class="panel">
        <div class="step-head"><span class="emo">⚖️</span><div><h2>${t('tie.title')}</h2><div class="who">${t('tie.mayorDecides', { name: esc(mayor.name) })}</div></div></div>
        ${pickGrid(game.day.tied)}
        <div style="height:14px"></div>
        <div class="btn-row">
          <button class="btn" data-act="noLynch" style="flex:0 0 auto">${t('tie.nobody')}</button>
          <button class="btn primary big" data-act="tieConfirm" ${tmp.sel.length ? '' : 'disabled'}>${t('tie.hang')}</button>
        </div>
      </section>`;
  }

  function renderCleaner() {
    const cleaner = W.alive(game).find(p => p.roleId === 'reinigungskraft');
    const target = byId(game.day.pendingLynch);
    return `
      <section class="panel">
        <div class="step-head"><span class="emo">🧹</span><div><h2>${I.role('reinigungskraft').name}</h2><div class="who">${esc(cleaner ? cleaner.name : '')} · ${t('cleaner.once')}</div></div></div>
        <p class="sub">${t('cleaner.text', { name: `<strong>${esc(target.name)}</strong>` })}</p>
        <div class="btn-row">
          <button class="btn big" data-act="cleaner" data-yes="0">${t('cleaner.no')}</button>
          <button class="btn primary big" data-act="cleaner" data-yes="1">🧹 ${t('cleaner.yes')}</button>
        </div>
      </section>`;
  }

  /** Cleaner without game master: everyone closes their eyes, fake pause if needed. */
  function renderAutoCleaner() {
    const a = tmp.auto || {};
    const target = byId(game.day.pendingLynch);
    if (a.phase === 'blank' || !game.day.cleanerActive || a.phase !== 'ask') {
      return `<section class="auto-stage blank"><div class="moon-pulse">🧹</div><p class="muted">${t('auto.eyesClosed')}</p></section>`;
    }
    return `<section class="auto-stage">
        <div class="big-emo">🧹</div>
        <h2>${t('cleaner.text', { name: `<strong>${esc(target.name)}</strong>` })}</h2>
        <div class="btn-row">
          <button class="btn big" data-act="autoCleaner" data-yes="0">${t('cleaner.no')}</button>
          <button class="btn primary big" data-act="autoCleaner" data-yes="1">🧹 ${t('cleaner.yes')}</button>
        </div>
      </section>`;
  }
  function autoCleanerController() {
    clearAuto();
    tmp.auto = { phase: 'call' };
    narrateLine('cleaner').then(() => {
      if (game.day.cleanerActive) { tmp.auto = { phase: 'ask' }; render(); }
      else later(rand(5, 10), () => autoCleanerFinish(false));
    });
  }
  function autoCleanerFinish(hide) {
    tmp.auto = { phase: 'blank' }; render();
    later(rand(2, 5), () => narrateLine('eyesOpen').then(() => commit(g => W.cleanerDecide(g, hide))));
  }

  function renderOver() {
    const w = game.winner;
    const cards = game.players.map((p, i) => {
      const win = w.ids.includes(p.id);
      return `<div class="pcard ${p.alive ? '' : 'dead'} ${win ? 'win' : ''}" style="--tc:${teamColor(p)};--i:${i}">
        <span class="pn">${win ? '🏆' : ''} ${esc(p.name)}</span>
        <span class="pr">${esc(roleLabel(p))}</span>
        <span class="pr">${p.alive ? t('over.survived') : '☠️ ' + esc(m(p.deathLabel || { k: 'label.start' }))}</span>
      </div>`;
    }).join('');
    const confetti = Array.from({ length: 26 }, (_, i) => `<i style="--x:${Math.random() * 100}%;--d:${(Math.random() * 2.5).toFixed(2)}s;--s:${(0.8 + Math.random() * 0.9).toFixed(2)}">${w.emo}</i>`).join('');
    return `
      <div class="confetti" aria-hidden="true">${confetti}</div>
      <section class="panel winner-hero">
        <div class="big">${w.emo}</div>
        <h2>${esc(m(w.title))}</h2>
        <p class="muted">${esc(m(w.text))}</p>
      </section>
      <section class="panel">
        <h2>🎭 ${t('over.reveal')}</h2>
        <div class="grid-players stagger" style="margin-top:10px">${cards}</div>
      </section>
      <section class="panel">
        <details><summary style="cursor:pointer;font-weight:700">📜 ${t('over.chronicle')}</summary>
          <div style="height:10px"></div>${logList(true)}
        </details>
      </section>
      <div class="btn-col actions">
        <button class="btn primary big block" data-act="again">🔁 ${t('over.again')}</button>
        <button class="btn block" data-act="toSetup">🛠️ ${t('over.change')}</button>
      </div>`;
  }

  function logList(showSecret) {
    const items = game.log.filter(l => showSecret || !l.secret);
    return `<ul class="log-list">${items.map(l => `<li class="${l.secret ? 'secret' : ''}"><span class="lbl">${esc(m(l.label))}${l.secret ? ' · ' + t('log.secret') : ''}</span>${esc(m(l))}</li>`).join('')}</ul>`;
  }

  // ------------------------------------------------------------ Timer
  const fmt = sec => `${String(Math.floor(Math.max(0, sec) / 60)).padStart(2, '0')}:${String(Math.max(0, sec) % 60).padStart(2, '0')}`;
  function paintTimer() {
    const dg = document.getElementById('tDigits'), bar = document.getElementById('tBar'), tg = document.getElementById('tToggle');
    if (dg) { dg.textContent = fmt(timer.left); dg.classList.toggle('low', timer.left <= 30 && timer.left > 0); }
    if (bar) bar.style.width = (timer.total ? timer.left / timer.total * 100 : 0) + '%';
    if (tg) tg.textContent = timer.running ? '⏸ ' + t('timer.pause') : '▶︎ ' + t('timer.start');
  }
  function stopTimer() { clearInterval(timer.handle); timer.handle = null; timer.running = false; }
  function startTimer() {
    if (timer.left <= 0) timer.left = timer.total;
    timer.running = true;
    clearInterval(timer.handle);
    timer.handle = setInterval(() => {
      timer.left -= 1;
      if (timer.left === 10) A.fx('heartbeat');
      if (timer.left <= 0) { timer.left = 0; stopTimer(); A.fx('alarm'); vibrate([200, 100, 200]); toast('⏰ ' + t('timer.up')); }
      paintTimer();
    }, 1000);
  }

  // ------------------------------------------------------------ MODALS
  let modalName = null;
  function openModal(html, name) {
    const existing = $modal.querySelector('.modal');
    if (existing && !existing.closest('.closing')) {
      // swap content instead of re-animating → no flicker
      const top = existing.scrollTop;
      existing.innerHTML = html;
      if (modalName === name) existing.scrollTop = top;
    } else {
      $modal.innerHTML = `<div class="modal-back" data-modal-back><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
    }
    modalName = name || null;
  }
  function closeModal() {
    const back = $modal.querySelector('.modal-back');
    modalName = null;
    if (!back) return;
    back.classList.add('closing');
    setTimeout(() => { if (back.parentNode) back.parentNode.removeChild(back); }, 200);
  }
  const modalHead = title => `<h2>${title}<button class="icon-btn close" data-act="closeModal" aria-label="${t('common.close')}">✕</button></h2>`;

  function openNews() {
    const html = CHANGELOG.map((v, idx) => {
      const L = v[I.lang] || v.de;
      return `
      <div class="${idx ? 'older' : ''}">
        <p class="muted">${esc(L.intro)}</p>
        ${L.sections.map(s => `<h3>${esc(s.title)}</h3><ul class="feat">${s.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`).join('')}
        <p class="muted small" style="margin-top:18px">${t('news.version', { v: v.version, d: L.date })}</p>
      </div>`;
    }).join('<hr class="soft">');
    openModal(`${modalHead(`✨ ${t('news.whatsNew', { v: VERSION })}`)}${html}<div style="height:14px"></div><button class="btn primary block" data-act="closeModal">${t('news.letsGo')}</button>`, 'news');
    store.set(KEY.seen, VERSION);
  }

  function openRoleInfo(id) {
    const r = W.ROLE[id];
    const R = I.role(id);
    const tm = teamOf(r);
    const other = I.role(id, I.lang === 'de' ? 'en' : 'de');
    openModal(`
      ${modalHead(`${r.emoji} ${esc(R.name)}`)}
      <div class="row wrap" style="margin-bottom:10px"><span class="badge" style="color:${tm.color};border-color:${tm.color};background:transparent">${tm.emoji} ${teamName(r.team)}</span>${r.isNew ? `<span class="badge new">${t('setup.newV2')}</span>` : ''}${r.wakes.length ? `<span class="badge">🌙 ${t('role.wakes')}</span>` : ''}</div>
      <p>${esc(R.desc)}</p>
      <p class="muted small"><em>${esc(other.desc)}</em></p>
      ${R.tip ? `<p class="info-line small">💡 ${esc(R.tip)}</p>` : ''}
      <button class="btn block" data-act="closeModal">${t('common.close')}</button>`, 'role');
  }

  function openSettings() {
    const inGame = !!(game && (view === 'game' || view === 'reveal'));
    const S = inGame ? game.settings : setup.settings;
    const sw = (act, key, on, label, hint, disabled) => `
      <div class="setting"><span class="lbl">${label}<small>${hint}</small></span>
        <button class="switch ${on ? 'on' : ''}" data-act="${act}" data-key="${key}" ${disabled ? 'disabled' : ''} aria-label="${label}"></button></div>`;
    const ha = HA.state;
    const haLights = ha.status === 'on' ? HA.lights() : [];
    const haBlock = ha.status === 'on' ? `
        <p class="small ok-text">✅ ${t('ha.connected', { url: esc(ha.url || '') })}</p>
        <div class="light-list">${haLights.length ? haLights.map(l => `
          <label class="light-item"><input type="checkbox" data-light="${esc(l.id)}" ${prefs.haLights.includes(l.id) ? 'checked' : ''}>
            <span>${l.on ? '💡' : '⚫'} ${esc(l.name)}</span></label>`).join('') : `<p class="muted small">${t('ha.noLights')}</p>`}</div>
        <div class="btn-row" style="margin-top:10px">
          <button class="btn" data-act="haTest" ${prefs.haLights.length ? '' : 'disabled'}>✨ ${t('ha.test')}</button>
          <button class="btn ghost" data-act="haDisconnect">${t('ha.disconnect')}</button>
        </div>` : `
        <p class="muted small">${t('ha.intro')}</p>
        <div class="row"><input class="input" id="haUrl" placeholder="https://home.example.de" value="${esc(store.get('ww2.haUrl', '') || '')}" inputmode="url" autocomplete="url">
          <button class="btn primary" data-act="haConnect" ${ha.status === 'connecting' ? 'disabled' : ''}>${ha.status === 'connecting' ? '…' : t('ha.connect')}</button></div>
        ${ha.status === 'error' ? `<p class="small err-text">⚠️ ${t('ha.error')}</p>` : ''}`;
    openModal(`
      ${modalHead(`⚙️ ${t('nav.options')}`)}
      <h3>🌍 ${t('set.language')}</h3>
      <div class="setting"><span class="lbl">${t('set.languageHint')}</span>${seg('setLang', 'lang', I.lang, [['de', '🇩🇪 Deutsch'], ['en', '🇬🇧 English']])}</div>

      <h3>🎲 ${t('set.game')}</h3>
      ${inGame ? '' : `<div class="setting"><span class="lbl">${t('setup.mode')}</span>${seg('setRule', 'mode', S.mode, [['gm', '🧑‍⚖️ ' + t('mode.gmShort')], ['auto', '📱 ' + t('mode.autoShort')]])}</div>`}
      <div class="setting"><span class="lbl">${t('set.voteMode')}<small>${t('set.voteModeHint')}</small></span>${seg('setRule', 'voteMode', S.voteMode, [['hands', '✋ ' + t('vote.hands')], ['pass', '🔄 ' + t('vote.pass')]])}</div>
      ${sw('setRule', 'narration', S.narration, t('set.narration'), t('set.narrationHint'))}
      ${sw('setRule', 'revealRoles', S.revealRoles, t('set.reveal'), t('set.revealHint'))}
      ${sw('setRule', 'callDeadRoles', S.callDeadRoles, t('set.dead'), t('set.deadHint'))}
      ${sw('setRule', 'mayor', S.mayor, t('set.mayor'), t('set.mayorHint'))}
      ${sw('setRule', 'wolvesParity', S.wolvesParity, t('set.parity'), t('set.parityHint'))}
      <div class="setting"><span class="lbl">${t('set.seer')}<small>${t('set.seerHint')}</small></span>${seg('setRule', 'seerMode', S.seerMode, [['team', t('set.seerTeam')], ['role', t('set.seerRole')]])}</div>
      <div class="setting"><span class="lbl">${t('set.minutes')}<small>${t('set.minutesHint')}</small></span>${seg('setRule', 'dayMinutes', String(S.dayMinutes), [2, 3, 5, 8, 10].map(x => [String(x), String(x)]))}</div>

      <h3>🔊 ${t('set.sound')}</h3>
      ${sw('setPref', 'ambient', prefs.ambient, t('set.ambient'), t('set.ambientHint'))}
      ${sw('setPref', 'effects', prefs.effects, t('set.effects'), t('set.effectsHint'))}
      <div class="setting"><span class="lbl">${t('set.voice')}<small>${t('set.voiceHint')}</small></span>${seg('setPref', 'voice', prefs.voice, [['recorded', '🎙️ ' + t('set.voiceRec')], ['browser', '🤖 ' + t('set.voiceBrowser')], ['off', t('set.off')]])}</div>
      ${sw('setPref', 'autoRead', prefs.autoRead, t('set.autoRead'), t('set.autoReadHint'))}
      <div class="setting"><span class="lbl">${t('set.volume')}</span><input type="range" min="0" max="1" step="0.05" value="${prefs.volume}" data-input="volume" class="range"></div>

      <h3>💡 ${t('set.lights')}</h3>
      ${haBlock}

      ${inGame && view === 'game' ? `
        <div style="height:18px"></div>
        ${isAuto() && game.phase !== 'over' ? `<button class="btn block" data-act="takeOver">🧑‍⚖️ ${t('set.takeOver')}</button><div style="height:8px"></div>` : ''}
        <button class="btn danger block" data-act="abortGame">${t('set.abort')}</button>` : ''}
      <div style="height:10px"></div>
      <button class="btn primary block" data-act="closeModal">${t('common.done')}</button>`, 'settings');
  }

  function openPlayers() {
    const auto = isAuto() && game.phase !== 'over';
    const cards = game.players.map((p, i) => `
      <button class="pcard ${p.alive ? '' : 'dead'}" style="--tc:${auto ? 'var(--line-strong)' : teamColor(p)};--i:${i}" ${auto ? '' : `data-act="playerMenu" data-id="${p.id}"`}>
        <span class="pn">${esc(p.name)}</span>
        ${auto ? (p.alive || !game.settings.revealRoles || p.flags.roleHidden ? '' : `<span class="pr">${esc(roleLabel(p))}</span>`) : `<span class="pr">${esc(roleLabel(p))}</span>`}
        <span class="flags">${p.alive ? flagsOf(p) : '☠️ ' + esc(m(p.deathLabel || { k: 'label.start' }))}</span>
      </button>`).join('');
    openModal(`${modalHead(`👥 ${t('players.title', { a: W.alive(game).length, n: game.players.length })}`)}
      <div class="grid-players stagger enter">${cards}</div>
      ${auto ? '' : `<p class="muted small" style="margin-top:12px">${t('players.legend')}</p><p class="muted small">${t('players.hint')}</p>`}`, 'players');
  }

  function openPlayerMenu(id) {
    const p = byId(id);
    openModal(`${modalHead(esc(p.name))}
      <p>${esc(roleLabel(p))} · ${p.alive ? t('players.alive') : '☠️ ' + esc(m(p.deathLabel || { k: 'label.start' }))}</p>
      <p class="muted small">${esc(I.role(p.roleId).desc)}</p>
      <div class="btn-col">
        ${p.alive
          ? `<button class="btn danger block" data-act="gmKill" data-id="${id}">☠️ ${t('players.kill')}</button><p class="muted small">${t('players.killHint')}</p>`
          : `<button class="btn block" data-act="gmRevive" data-id="${id}">💚 ${t('players.revive')}</button>`}
        <button class="btn block" data-act="openPlayers">← ${t('common.back')}</button>
      </div>`, 'player');
  }

  function openLog() {
    const canSecret = !isAuto() || game.phase === 'over';
    openModal(`${modalHead(`📜 ${t('nav.log')}`)}
      ${canSecret ? `<div class="row" style="margin-bottom:10px"><span class="spacer muted small">${t('log.hint')}</span>
        <button class="chip ${tmp.showSecretLog ? 'on' : ''}" data-act="toggleSecretLog">🔒 ${t('log.showSecret')}</button></div>` : ''}
      ${logList(canSecret && tmp.showSecretLog)}`, 'log');
  }

  let pendingConfirm = null;
  function confirmBox(text, okLabel, onOk) {
    openModal(`<h2>${esc(text)}</h2><div style="height:10px"></div>
      <div class="btn-row"><button class="btn" data-act="closeModal">${t('common.cancel')}</button><button class="btn danger" data-act="confirmOk">${esc(okLabel)}</button></div>`, 'confirm');
    pendingConfirm = onOk;
  }

  // ==================================================================== FLOW HOOKS
  function stepKey() {
    if (view !== 'game' || !game) return view + (game && game.ui ? game.ui.idx + game.ui.stage : '');
    return [game.screen, game.round, game.night ? game.night.idx : '', game.queue.length, game.day ? game.day.mode + game.day.voteNo + (game.day.passIdx || 0) + (game.day.passStage || '') : ''].join('|');
  }

  /** Reactions when entering a new screen: sound, lights, narrator, timing. */
  function onEnter(prevKey) {
    if (view !== 'game') { A.setAmbient(view === 'reveal' ? 'night' : null); return; }
    const sc = game.screen;
    const deaths = game.news.lines.some(l => !l.secret && l.k === 'news.death');
    if (game.phase === 'night') A.setAmbient('night');
    else if (sc !== 'over') A.setAmbient('day');
    else A.setAmbient(null);

    if (sc === 'night') {
      const cur = W.currentStep(game);
      const isFirst = cur && game.night.steps.filter(id => W.stepStatus(game, id) !== 'skip')[0] === cur.id;
      if (isFirst) { A.fx('owl'); HA.mood('night'); }
      if (isAuto()) autoController();
      else {
        if (cur && cur.id === 'werwoelfe') { A.fx('howl'); HA.pulse(); }
        if (cur && prefs.autoRead && game.settings.narration) narrateStep(cur.id, 'wake');
      }
    } else if (sc === 'morning') {
      A.fx('rooster'); HA.mood('day');
      if (deaths) setTimeout(() => { A.fx('gong'); HA.blink(); }, 1400);
      if (isAuto()) narrateLine('dayStart').then(speakNews);
    } else if (sc === 'afterLynch' || sc === 'dusk') {
      if (deaths) { A.fx('gong'); HA.blink(); }
      if (isAuto()) speakNews();
    } else if (sc === 'interrupt') {
      if (isAuto()) speakNews();
    } else if (sc === 'cleaner' && isAuto()) {
      autoCleanerController();
    } else if (sc === 'over') {
      A.fx('fanfare'); HA.mood(game.winner.team);
    } else if (sc === 'day' && game.day.mode === 'vote' && prevKey && prevKey.indexOf('talk') >= 0) {
      A.fx('bell');
    }
  }

  function afterRender() {
    const key = stepKey();
    if (key !== tmp.key) {
      const prevKey = tmp.key;
      const keep = { showSecretLog: tmp.showSecretLog, cardLang: tmp.cardLang, auto: view === 'game' && game && game.screen === 'night' && tmp.auto && tmp.auto.started ? { started: true } : null };
      clearAuto();
      tmp = Object.assign(freshTmp(), keep, { key });
      if (view === 'game' && game.screen === 'interrupt' && game.queue[0] && game.queue[0].type === 'akw') tmp.sel = (game.queue[0].suggest || []).slice(0, 2);
      if (prevKey !== null) window.scrollTo({ top: 0, behavior: 'smooth' });
      onEnter(prevKey);
      render(); // redraw with fresh tmp
      return;
    }
    if (view === 'reveal' || view === 'qrrole') bindCard();
    if (view === 'reveal' && game.ui.stage === 'qr') drawQr();
    if (view === 'setup') { const inp = document.getElementById('playerInput'); if (inp && focusInput) { inp.focus(); focusInput = false; } }
    keepAwake(view === 'game' && game && game.screen !== 'over');
  }
  let focusInput = false;

  // ==================================================================== ACTIONS
  function setRule(key, val) {
    const targets = [setup.settings];
    if (game && (view === 'game' || view === 'reveal')) targets.push(game.settings);
    targets.forEach(s => {
      if (val !== undefined) s[key] = /^\d+$/.test(val) ? +val : val;
      else s[key] = !s[key];
    });
    saveSetup(); if (game) saveGame();
    if (key === 'dayMinutes' && view === 'game' && !timer.running) { timer.total = timer.left = (+val) * 60; }
  }
  function startNewGame() {
    clearAuto(); HA.restore();
    game = W.createGame(setup.players, setup.counts, setup.settings);
    game.ui = { idx: 0, stage: 'pass' };
    history = [];
    saveGame(); view = 'reveal'; tmp = freshTmp(); closeModal(); render();
  }

  const ACT = {
    // --- Setup
    movePlayer(d) {
      const i = +d.i, j = i + +d.dir;
      [setup.players[i], setup.players[j]] = [setup.players[j], setup.players[i]];
      saveSetup(); render();
    },
    removePlayer(d) { setup.players.splice(+d.i, 1); saveSetup(); render(); },
    clearPlayers() { confirmBox(t('setup.clearQ'), t('setup.clearOk'), () => { setup.players = []; saveSetup(); render(); }); },
    roleInc(d) { setup.counts[d.id] = (setup.counts[d.id] || 0) + 1; saveSetup(); render(); },
    roleDec(d) { setup.counts[d.id] = Math.max(0, (setup.counts[d.id] || 0) - 1); if (!setup.counts[d.id]) delete setup.counts[d.id]; saveSetup(); render(); },
    roleInfo(d) { openRoleInfo(d.id); },
    suggest() { setup.counts = W.suggestRoles(setup.players.length); saveSetup(); render(); toast('✨ ' + t('toast.suggested')); },
    resetRoles() { setup.counts = {}; saveSetup(); render(); },
    filter(d) { setup.filter = d.f; saveSetup(); render(); },
    startGame() {
      const v = W.validateSetup(setup.players, setup.counts, setup.settings);
      if (!v.ok) return toast(m(v.errors[0]));
      if (game && game.phase !== 'over') confirmBox(t('setup.overwriteQ'), t('setup.overwriteOk'), startNewGame); else startNewGame();
    },
    showResult() { view = 'game'; render(); },
    resume() { view = game.screen === 'reveal' ? 'reveal' : 'game'; render(); },
    discard() { confirmBox(t('setup.discardQ'), t('setup.discard'), () => { game = null; history = []; store.del(KEY.game); store.del(KEY.hist); HA.restore(); render(); }); },
    setRule(d) {
      setRule(d.key, d.val);
      if ($modal.querySelector('.modal') && modalName === 'settings') openSettings();
      render();
    },

    // --- Reveal
    revealGo() { game.ui.stage = 'card'; tmp.seen = false; saveGame(); render(); },
    revealQr() { game.ui.stage = 'qr'; saveGame(); render(); },
    revealBackToPass() { game.ui.stage = 'pass'; saveGame(); render(); },
    revealNext() {
      if (game.ui.idx >= game.players.length - 1) game.ui.stage = 'done';
      else { game.ui.idx += 1; game.ui.stage = 'pass'; }
      tmp.seen = false; tmp.cardLang = null; saveGame(); render();
    },
    revealBack() {
      if (game.ui.stage === 'done') { game.ui.stage = 'pass'; }
      else if (game.ui.idx > 0) { game.ui.idx -= 1; game.ui.stage = 'pass'; }
      saveGame(); render();
    },
    cardLang() { const cur = tmp.cardLang || I.lang; tmp.cardLang = cur === 'en' ? 'de' : 'en'; render(); },
    beginGame() { history = []; game.ui = null; W.startNight(game); saveGame(); view = 'game'; A.unlock(); render(); },

    // --- Night
    pick(d) {
      const cur = game.screen === 'night' ? W.currentStep(game) : null;
      let max = cur ? cur.def.count : 1;
      if (game.screen === 'interrupt' && game.queue[0].type === 'akw') max = 2;
      const i = tmp.sel.indexOf(d.id);
      if (i >= 0) tmp.sel.splice(i, 1);
      else if (max === 1) tmp.sel = [d.id];
      else if (tmp.sel.length < max) tmp.sel.push(d.id);
      else { tmp.sel.shift(); tmp.sel.push(d.id); }
      A.fx('click');
      render();
    },
    confirmStep() {
      const v = tmp.sel.slice();
      if (!isAuto()) return commit(g => W.submitStep(g, v));
      const cur = W.currentStep(game);
      const res = W.stepResult(game, cur.id, v);
      if (res) { tmp.auto = Object.assign({}, tmp.auto, { phase: 'result', result: res, value: v }); return render(); }
      if (cur.id === 'amor') { tmp.auto = Object.assign({}, tmp.auto, { phase: 'amorTap', value: v }); return render(); }
      finishAutoStep(v);
    },
    skipStep() {
      const cur = W.currentStep(game);
      const v = cur.def.kind === 'pick' ? [] : null;
      if (isAuto()) return finishAutoStep(v);
      commit(g => W.submitStep(g, v));
    },
    urwolf(d) { if (isAuto()) return finishAutoStep(d.yes === '1'); commit(g => W.submitStep(g, d.yes === '1')); },
    hexeHeal() { tmp.heal = !tmp.heal; render(); },
    hexePoisonToggle() { tmp.poisonOpen = !tmp.poisonOpen; if (!tmp.poisonOpen) tmp.poison = null; render(); },
    hexePoison(d) { tmp.poison = tmp.poison === d.id ? null : d.id; render(); },
    confirmHexe() { const v = { heal: tmp.heal, poison: tmp.poison }; if (isAuto()) return finishAutoStep(v); commit(g => W.submitStep(g, v)); },
    autoStartNight() {
      A.unlock();
      game.night.autoStarted = true; saveGame();
      tmp.auto = { phase: 'blank', started: true }; render();
      narrateLine('nightStart').then(() => later(1500, () => { tmp.auto = { phase: 'call', started: true }; autoController(); render(); }));
    },
    autoResultOk() { finishAutoStep(tmp.auto.value); },
    autoAmorDone() { finishAutoStep(tmp.auto.value); },
    autoCleaner(d) { autoCleanerFinish(d.yes === '1'); },

    // --- Interrupts
    confirmInterrupt() {
      const it = game.queue[0];
      const v = it.type === 'akw' ? (isAuto() ? (it.suggest || []).slice(0, 2) : tmp.sel.slice()) : tmp.sel[0];
      if (it.type === 'jaeger' && v) A.fx('shot');
      if (it.type === 'akw' && v.length) A.fx('gong');
      commit(g => W.resolveInterrupt(g, v));
    },
    skipInterrupt() { const it = game.queue[0]; commit(g => W.resolveInterrupt(g, it.type === 'akw' ? [] : null)); },

    // --- Day
    toDay() { commit(g => W.toDay(g)); },
    electMayor() { const v = tmp.sel[0]; commit(g => W.electMayor(g, v)); },
    noMayor() { commit(g => W.electMayor(g, null)); },
    blumenOpen() { tmp.blumen = true; tmp.sel = []; render(); },
    blumenCancel() { tmp.blumen = false; tmp.sel = []; render(); },
    blumenConfirm() { const v = tmp.sel[0]; tmp.blumen = false; commit(g => W.blumenkindProtect(g, v)); },
    startVote() { stopTimer(); commit(g => W.startVote(g)); },
    backToTalk() { mutate(g => { g.day.mode = 'talk'; }); },
    vote(d) { A.fx('click'); mutate(g => { g.day.votes[d.id] = Math.max(0, (g.day.votes[d.id] || 0) + +d.d); }); },
    mayorVote(d) { mutate(g => { g.day.mayorVote = g.day.mayorVote === d.id ? null : d.id; }); },
    passIAm() { mutate(g => { g.day.passStage = 'ballot'; }); },
    passCast(d) {
      const target = d.abstain ? null : tmp.sel[0];
      A.fx('click');
      mutate(g => {
        W.castBallot(g, g.day.voterList[g.day.passIdx], target);
        g.day.passIdx += 1;
        g.day.passStage = g.day.passIdx >= g.day.voterList.length ? 'done' : 'hand';
      });
    },
    passReveal() { A.fx('bell'); commit(g => { W.tallyBallots(g); g.day.passStage = 'result'; }); },
    resolveVote() { A.fx('bell'); commit(g => W.resolveVote(g)); },
    noLynch() { commit(g => W.noLynch(g)); },
    tieConfirm() { const v = tmp.sel[0]; commit(g => W.lynch(g, v)); },
    cleaner(d) { commit(g => W.cleanerDecide(g, d.yes === '1')); },
    richter() { commit(g => W.richterSecondVote(g)); },
    endDay() { commit(g => W.endDay(g)); },
    startNight() { commit(g => W.startNight(g)); },
    timerToggle() { if (timer.running) stopTimer(); else startTimer(); paintTimer(); },
    timerAdd(d) { timer.left = Math.max(0, timer.left + +d.d); timer.total = Math.max(timer.total, timer.left); paintTimer(); },
    timerReset() { stopTimer(); timer.left = timer.total = game.settings.dayMinutes * 60; paintTimer(); },

    // --- End
    again() { startNewGame(); },
    toSetup() { clearAuto(); A.stopVoice(); view = 'setup'; keepAwake(false); if (game && game.phase === 'over') HA.restore(); render(); },

    // --- General
    undo() { undo(); },
    say(d, el) {
      const key = el.getAttribute('data-key');
      const text = el.getAttribute('data-text');
      A.unlock();
      A.narrate(key || null, text, I.lang);
    },
    sayNews() { A.unlock(); speakNews(); },
    toggleLang() { ACT.setLang({ val: I.lang === 'de' ? 'en' : 'de' }); },
    setLang(d) {
      prefs.lang = d.val; savePrefs(); I.setLang(d.val); document.documentElement.lang = d.val;
      if (modalName === 'settings') openSettings(); else if (modalName === 'news') openNews(); else if (modalName === 'players') openPlayers(); else if (modalName === 'log') openLog();
      render();
    },
    toggleMute() { prefs.muted = !prefs.muted; savePrefs(); applyAudio(); if (prefs.muted) A.stopVoice(); render(); toast(prefs.muted ? '🔇 ' + t('toast.muted') : '🔊 ' + t('toast.unmuted')); },
    setPref(d) {
      if (d.val !== undefined) prefs[d.key] = d.val; else prefs[d.key] = !prefs[d.key];
      savePrefs(); A.unlock(); applyAudio();
      if (d.key === 'ambient' && prefs.ambient) onEnter(null);
      if (d.key === 'effects' && prefs.effects) A.fx('bell');
      openSettings();
    },
    openNews() { openNews(); },
    openSettings() { openSettings(); },
    openPlayers() { openPlayers(); },
    openLog() { openLog(); },
    toggleSecretLog() { tmp.showSecretLog = !tmp.showSecretLog; openLog(); },
    playerMenu(d) { openPlayerMenu(d.id); },
    gmKill(d) { closeModal(); commit(g => W.gmKill(g, d.id)); toast(t('toast.removed')); },
    gmRevive(d) { closeModal(); commit(g => W.gmRevive(g, d.id)); },
    closeModal() { closeModal(); },
    confirmOk() { const fn = pendingConfirm; pendingConfirm = null; closeModal(); if (fn) fn(); },
    takeOver() {
      confirmBox(t('set.takeOverQ'), t('set.takeOverOk'), () => { clearAuto(); A.stopVoice(); commit(g => W.takeOverAsGM(g)); toast('🧑‍⚖️ ' + t('toast.takenOver')); });
    },
    abortGame() { confirmBox(t('set.abortQ'), t('set.abortOk'), () => { clearAuto(); A.stopVoice(); HA.restore(); game = null; history = []; store.del(KEY.game); store.del(KEY.hist); view = 'setup'; keepAwake(false); render(); }); },
    haConnect() {
      const inp = document.getElementById('haUrl');
      const url = (inp && inp.value.trim()) || '';
      if (!/^https:\/\//i.test(url)) return toast('⚠️ ' + t('ha.needHttps'));
      store.set('ww2.haUrl', url);
      HA.connect(url);
    },
    haDisconnect() { HA.disconnect(); openSettings(); },
    haTest() { HA.test(); }
  };

  function handleClick(e) {
    const back = e.target.closest('[data-modal-back]');
    if (back && e.target === back) return closeModal();
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    e.preventDefault();
    const fn = ACT[el.dataset.act];
    if (fn) fn(el.dataset, el, e);
  }
  $app.addEventListener('click', handleClick);
  $modal.addEventListener('click', handleClick);
  $modal.addEventListener('input', e => {
    if (e.target.dataset.input === 'volume') { prefs.volume = +e.target.value; savePrefs(); applyAudio(); }
  });
  $modal.addEventListener('change', e => {
    const id = e.target.dataset.light;
    if (!id) return;
    prefs.haLights = prefs.haLights.filter(x => x !== id);
    if (e.target.checked) prefs.haLights.push(id);
    savePrefs(); HA.setLights(prefs.haLights);
    openSettings();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $modal.innerHTML) closeModal(); });
  $app.addEventListener('submit', e => {
    if (e.target.dataset.form !== 'addPlayer') return;
    e.preventDefault();
    const inp = document.getElementById('playerInput');
    const nm = inp.value.trim().replace(/\s+/g, ' ');
    if (!nm) return;
    if (setup.players.some(x => x.toLowerCase() === nm.toLowerCase())) { toast(t('toast.dupName', { name: nm })); return; }
    if (setup.players.length >= 30) { toast(t('toast.max30')); return; }
    setup.players.push(nm);
    saveSetup(); focusInput = true; render();
  });
  window.addEventListener('hashchange', () => { if (location.hash.startsWith('#role=')) { view = 'qrrole'; render(); } });
  HA.onChange(() => { if (modalName === 'settings') openSettings(); });

  // ------------------------------------------------------------ Start
  render();
  HA.resume();
  if (view !== 'qrrole' && store.get(KEY.seen, null) !== VERSION) setTimeout(openNews, 400);
  if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
})();
