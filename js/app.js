/* ==========================================================================
   Werwolf v2 – OBERFLÄCHE
   Rendert Einrichten → Aufdecken → Spielleitung. Alle Spielregeln liegen in
   engine.js; hier wird nur angezeigt und auf Klicks reagiert.
   ========================================================================== */
(function () {
  'use strict';

  const W = window.WW;
  const { ROLES, TEAMS } = window.WW_DATA;
  const CHANGELOG = window.WW_CHANGELOG || [];
  const VERSION = (CHANGELOG[0] || {}).version || '2.0';

  const $app = document.getElementById('app');
  const $modal = document.getElementById('modal-root');
  const $toast = document.getElementById('toast');

  // ------------------------------------------------------------ Speicher
  const KEY = { setup: 'ww2.setup', game: 'ww2.game', hist: 'ww2.history', seen: 'ww2.seenVersion' };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* voll oder gesperrt */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* egal */ } }
  };

  let setup = Object.assign({ players: [], counts: {}, filter: 'alle' }, store.get(KEY.setup, {}));
  setup.settings = Object.assign({}, W.DEFAULT_SETTINGS, setup.settings || {});
  // veraltete Rollen-IDs aus alten Speicherständen entfernen
  Object.keys(setup.counts).forEach(id => { if (!W.ROLE[id] || !setup.counts[id]) delete setup.counts[id]; });

  let game = store.get(KEY.game, null);
  if (game && game.v !== 2) game = null;
  let history = store.get(KEY.hist, []);
  let view = 'setup';

  /** Flüchtiger UI-Zustand (nicht gespeichert). */
  let tmp = freshTmp();
  function freshTmp() { return { key: null, sel: [], poisonOpen: false, heal: false, poison: null, en: false, seen: false, blumen: false, showSecretLog: false }; }
  const timer = { total: 0, left: 0, running: false, handle: null, day: null };

  const saveSetup = () => store.set(KEY.setup, setup);
  const saveGame = () => { store.set(KEY.game, game); store.set(KEY.hist, history); };

  /** Spielzug mit Rückgängig-Möglichkeit. */
  function commit(fn) {
    history.push(JSON.stringify(game));
    if (history.length > 40) history.shift();
    fn(game);
    saveGame();
    render();
  }
  /** Kleine Änderung ohne Rückgängig-Eintrag (z. B. Stimmen zählen). */
  function mutate(fn) { fn(game); saveGame(); render(); }

  function undo() {
    if (!history.length) return;
    game = JSON.parse(history.pop());
    tmp = freshTmp();
    saveGame();
    if (game.screen === 'reveal') view = 'reveal';
    render();
    toast('↶ Rückgängig gemacht');
  }

  // ------------------------------------------------------------ Helfer
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const teamOf = r => TEAMS[r.team] || TEAMS.dorf;
  const byId = id => W.byId(game, id);
  const pname = id => esc(W.name(game, id));
  let toastTimer;
  function toast(text) {
    $toast.textContent = text;
    $toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $toast.classList.remove('show'), 2200);
  }
  function vibrate(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* nicht unterstützt */ } }

  function flagsOf(p) {
    const f = [];
    if (game.p.mayor === p.id) f.push('👑');
    if (game.p.lovers.includes(p.id)) f.push('💘');
    if (p.flags.wolf) f.push('🐺');
    if (p.flags.bitten) f.push('🦇');
    if (p.flags.noVote) f.push('🔇');
    if (p.flags.extraLife) f.push('💪');
    if (game.p.wildModel === p.id) f.push('🐾');
    if (game.day && game.day.protectedId === p.id) f.push('🌸');
    return f.join('');
  }
  function teamColor(p) {
    const t = W.team(game, p);
    return (TEAMS[t] || TEAMS.dorf).color;
  }

  // ------------------------------------------------------------ Vorlesen
  function speak(text) {
    if (!('speechSynthesis' in window)) { toast('Vorlesen wird von diesem Browser nicht unterstützt.'); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ''));
    u.lang = 'de-DE';
    u.rate = 0.95;
    const voice = window.speechSynthesis.getVoices().find(v => v.lang && v.lang.startsWith('de'));
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  }

  // ------------------------------------------------------------ Bildschirm an
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

  // ------------------------------------------------------------ Signalton
  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, .25, .5].forEach(t => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 660; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(.0001, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(.3, ctx.currentTime + t + .02);
        g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + t + .2);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + .22);
      });
    } catch (e) { /* kein Audio */ }
  }

  // ==================================================================== RENDER
  function render() {
    const night = view === 'game' ? (game && game.phase === 'night') : true;
    document.body.className = night ? 'theme-night' : 'theme-day';
    let html = '';
    if (view === 'setup') html = renderSetup();
    else if (view === 'reveal') html = renderReveal();
    else html = renderGame();
    $app.innerHTML = html;
    afterRender();
  }

  // ------------------------------------------------------------ EINRICHTEN
  function renderSetup() {
    const n = setup.players.length;
    const total = Object.values(setup.counts).reduce((a, b) => a + b, 0);
    const v = W.validateSetup(setup.players, setup.counts, setup.settings);
    const running = game && game.phase !== 'over';

    const playersHtml = setup.players.map((nm, i) => `
      <li>
        <span class="seat">${i + 1}</span>
        <span class="pname">${esc(nm)}</span>
        <button class="icon-btn" data-act="movePlayer" data-i="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="nach oben">↑</button>
        <button class="icon-btn" data-act="movePlayer" data-i="${i}" data-dir="1" ${i === n - 1 ? 'disabled' : ''} aria-label="nach unten">↓</button>
        <button class="icon-btn" data-act="removePlayer" data-i="${i}" aria-label="entfernen">✕</button>
      </li>`).join('');

    const f = setup.filter;
    const roles = ROLES.filter(r => f === 'alle' || (f === 'neu' && r.isNew) || (f === 'klassisch' && !r.isNew) || (f === 'gewaehlt' && setup.counts[r.id]));
    const roleCards = roles.map(r => {
      const c = setup.counts[r.id] || 0;
      return `
      <div class="role-card ${c ? 'active' : ''}" style="--tc:${teamOf(r).color}">
        <button class="head" data-act="roleInfo" data-id="${r.id}">
          <span class="emo">${r.emoji}</span>
          <span><span class="rname">${esc(r.name)}</span><br><span class="team">${teamOf(r).name}${r.isNew ? ' · <span class="new-txt">NEU</span>' : ''} · ⓘ</span></span>
        </button>
        <div class="stepper">
          <button data-act="roleDec" data-id="${r.id}" ${c ? '' : 'disabled'} aria-label="weniger">−</button>
          <span class="val">${c}</span>
          <button data-act="roleInc" data-id="${r.id}" ${c >= (r.max || 1) ? 'disabled' : ''} aria-label="mehr">+</button>
        </div>
      </div>`;
    }).join('') || '<p class="muted small">Noch keine Rollen gewählt.</p>';

    const score = W.balance(setup.counts);
    const knob = Math.max(4, Math.min(96, 50 + score * 2.2));
    const verdict = total === 0 ? 'Wähle Rollen' : score > 9 ? 'Dorf im Vorteil' : score < -6 ? 'Böse im Vorteil' : 'Ausgeglichen ✓';

    const msgs = [...v.errors.slice(0, 2).map(e => `<div class="msg err">⚠️ ${esc(e)}</div>`), ...(v.ok ? v.warnings.slice(0, 2).map(w => `<div class="msg warn">💡 ${esc(w)}</div>`) : [])].join('');

    return `
      <header class="topbar">
        <div class="brand"><span class="logo">🐺</span><h1>Werwolf</h1><span class="badge">v${esc(VERSION)}</span></div>
        <button class="icon-btn" data-act="openNews" aria-label="Neu in Version 2" title="Neu in v2">✨</button>
        <button class="icon-btn" data-act="openSettings" aria-label="Einstellungen" title="Einstellungen">⚙️</button>
      </header>

      ${game && game.phase === 'over' ? `
      <section class="panel resume">
        <span class="emo">🏁</span>
        <div class="spacer"><strong>Letztes Spiel</strong><div class="muted small">${esc(game.winner.title)}</div></div>
        <button class="btn" data-act="showResult">Ansehen</button>
      </section>` : ''}

      ${running ? `
      <section class="panel resume">
        <span class="emo">${game.screen === 'reveal' ? '🎴' : game.phase === 'night' ? '🌙' : '☀️'}</span>
        <div class="spacer"><strong>Laufendes Spiel</strong><div class="muted small">${game.screen === 'reveal' ? 'Rollen werden aufgedeckt' : esc(W.phaseLabel(game))} · ${game.players.length} Spieler</div></div>
        <button class="btn primary" data-act="resume">Weiter</button>
        <button class="icon-btn" data-act="discard" aria-label="Spiel verwerfen">🗑️</button>
      </section>` : ''}

      <section class="panel">
        <h2>👥 Spieler <span class="badge">${n}</span></h2>
        <p class="sub">Reihenfolge = Sitzordnung im Uhrzeigersinn (wichtig für Fuchs, Bär, Ritter und AKW).</p>
        <form class="row" data-form="addPlayer" autocomplete="off">
          <input class="input" id="playerInput" placeholder="Name eingeben …" maxlength="24" enterkeyhint="done" aria-label="Spielername">
          <button class="btn primary" type="submit" aria-label="Spieler hinzufügen">＋</button>
        </form>
        <ul class="player-list">${playersHtml}</ul>
        ${n ? `<div class="row" style="margin-top:10px"><span class="spacer"></span><button class="btn ghost small" data-act="clearPlayers">Alle entfernen</button></div>` : ''}
      </section>

      <section class="panel">
        <h2>🎭 Rollen <span class="badge">${total}/${n}</span></h2>
        <p class="sub">Tippe auf eine Rolle für die Beschreibung.</p>
        <div class="btn-row">
          <button class="btn primary" data-act="suggest" ${n < 4 ? 'disabled' : ''}>✨ Vorschlag für ${n || '…'} Spieler</button>
          <button class="btn" data-act="resetRoles" ${total ? '' : 'disabled'} style="flex:0 0 auto">Leeren</button>
        </div>
        <div class="chips" style="margin-top:12px">
          ${[['alle', 'Alle'], ['klassisch', 'Klassisch'], ['neu', 'Neu in v2'], ['gewaehlt', 'Gewählt']].map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="filter" data-f="${k}">${l}</button>`).join('')}
        </div>
        <div class="role-grid">${roleCards}</div>
        <div class="balance">
          <div class="bar"><span class="knob" style="left:${knob}%"></span></div>
          <div class="labels"><span>🐺 Böse</span><strong>${verdict}</strong><span>Dorf 🏡</span></div>
        </div>
      </section>

      <p class="center muted small">Werwolf v${esc(VERSION)} · <a href="v1/" style="color:inherit">alte Version 1</a> · <a href="#" data-act="openNews" style="color:inherit">Was ist neu?</a></p>

      <div class="dock"><div class="inner">
        <div class="msgs">${msgs}</div>
        <button class="btn primary big block" data-act="startGame" ${v.ok ? '' : 'disabled'}>🎴 Rollen verteilen</button>
      </div></div>`;
  }

  // ------------------------------------------------------------ AUFDECKEN
  function renderReveal() {
    const ui = game.ui;
    const dots = game.players.map((p, i) => `<i class="${i < ui.idx ? 'done' : i === ui.idx ? 'now' : ''}"></i>`).join('');
    if (ui.stage === 'done') {
      return `
        <div class="reveal-wrap">
          <div style="font-size:4rem">🌕</div>
          <h2 class="pass-name" style="font-size:2rem">Alle kennen ihre Rolle</h2>
          <p class="pass-hint">Gib das Gerät jetzt der Spielleitung.<br>Alle schließen die Augen – die erste Nacht beginnt.</p>
          <button class="btn primary big block" data-act="beginGame">🌙 Nacht 1 beginnen</button>
          <button class="btn ghost" data-act="revealBack">← Letzte Karte nochmal</button>
        </div>`;
    }
    const p = game.players[ui.idx];
    if (ui.stage === 'pass') {
      return `
        <div class="reveal-wrap">
          <div class="progress-dots">${dots}</div>
          <div>
            <div class="pass-hint">Gib das Gerät an</div>
            <div class="pass-name">${esc(p.name)}</div>
            <div class="pass-hint">Alle anderen schauen weg 🙈</div>
          </div>
          <button class="btn primary big block" data-act="revealGo">Ich bin ${esc(p.name)}</button>
          <div class="row" style="justify-content:center">
            ${ui.idx > 0 ? '<button class="btn ghost" data-act="revealBack">← Zurück</button>' : '<button class="btn ghost" data-act="toSetup">← Zum Einrichten</button>'}
          </div>
        </div>`;
    }
    const r = W.role(p);
    const t = teamOf(r);
    return `
      <div class="reveal-wrap">
        <div class="progress-dots">${dots}</div>
        <div class="pass-hint"><strong>${esc(p.name)}</strong>, deine Rolle:</div>
        <div class="card-stage" id="cardStage" style="--tc:${t.color}">
          <div class="role-face">
            <div class="emo">${r.emoji}</div>
            <div class="rname">${esc(r.name)}</div>
            <span class="team-tag">${t.emoji} ${t.name}${p.roleId === 'guenstling' ? ' (heimlich ' + (game.p.guenstlingTeam === 'wolf' ? 'Werwölfe' : 'Vampire') + ')' : ''}</span>
            <p>${esc(tmp.en ? r.descEN : r.desc)}</p>
          </div>
          <div class="card-cover" id="cardCover" tabindex="0" role="button" aria-label="Gedrückt halten, um die Rolle zu sehen">
            <div class="arrow">⬆️</div>
            <div class="moon">🌘</div>
            <div class="hint">Gedrückt halten</div>
            <div class="hint2">oder nach oben schieben</div>
          </div>
        </div>
        <div class="row" style="justify-content:center">
          <button class="chip" data-act="toggleLang">${tmp.en ? '🇩🇪 Deutsch' : '🇬🇧 English'}</button>
        </div>
        <button class="btn primary big block" id="revealNextBtn" data-act="revealNext" ${tmp.seen ? '' : 'disabled'}>
          ${ui.idx === game.players.length - 1 ? 'Verstanden ✓' : 'Verstanden – weitergeben ✓'}
        </button>
      </div>`;
  }

  function bindCard() {
    const cover = document.getElementById('cardCover');
    const stage = document.getElementById('cardStage');
    if (!cover || !stage) return;
    let startY = 0, active = false, holdT = null;
    const h = () => stage.getBoundingClientRect().height;
    const markSeen = () => {
      if (!tmp.seen) { tmp.seen = true; vibrate(25); const b = document.getElementById('revealNextBtn'); if (b) b.disabled = false; }
    };
    const setY = y => { cover.style.transform = `translateY(${-y}px)`; if (y > h() * 0.35) markSeen(); };
    const open = () => { cover.classList.remove('dragging'); setY(h() * 0.88); };
    const close = () => { clearTimeout(holdT); active = false; cover.classList.remove('dragging'); cover.style.transform = ''; };
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

  // ------------------------------------------------------------ SPIELLEITUNG
  function renderGame() {
    const label = game.screen === 'over' ? '🏁 Spielende' : (game.phase === 'night' ? '🌙 ' : '☀️ ') + W.phaseLabel(game);
    const body = {
      night: renderNight, interrupt: renderInterrupt, morning: renderNews, afterLynch: renderNews, dusk: renderNews,
      mayor: renderMayor, day: renderDay, tie: renderTie, cleaner: renderCleaner, over: renderOver
    }[game.screen] || (() => `<div class="panel">Unbekannter Zustand „${esc(game.screen)}“. <button class="btn" data-act="undo">↶ Rückgängig</button></div>`);
    return `
      <header class="topbar">
        <h1 class="phase-title">${label}</h1>
        <button class="icon-btn" data-act="undo" ${history.length ? '' : 'disabled'} aria-label="Rückgängig" title="Rückgängig">↶</button>
        <button class="icon-btn" data-act="openPlayers" aria-label="Spielerübersicht" title="Spieler">👥</button>
        <button class="icon-btn" data-act="openLog" aria-label="Chronik" title="Chronik">📜</button>
        <button class="icon-btn" data-act="openSettings" aria-label="Einstellungen" title="Einstellungen">⚙️</button>
      </header>
      ${body()}`;
  }

  function stepEmoji(id) {
    const special = { liebende: '💞', werwoelfe: '🐺', vampire: '🧛' };
    if (special[id]) return special[id];
    const r = ROLES.find(x => x.wakes.includes(id));
    return r ? r.emoji : '🌙';
  }

  function narration(text, extraClass = '') {
    if (!game.settings.narration || !text) return '';
    return `<div class="narration ${extraClass}"><span class="txt">„${esc(text)}“</span><button class="say" data-act="say" data-text="${esc(text)}" aria-label="Vorlesen">🔊</button></div>`;
  }

  function pickGrid(ids, opts = {}) {
    const sel = opts.sel || tmp.sel;
    if (!ids.length) return '<p class="muted">Keine wählbaren Spieler.</p>';
    return `<div class="pick-grid">${ids.map(id => {
      const p = byId(id);
      const r = W.role(p);
      const on = sel.includes(id);
      return `<button class="pick ${on ? 'sel' : ''}" data-act="${opts.act || 'pick'}" data-id="${id}">
        <span><span>${esc(p.name)}</span><span class="tag">${r.emoji} ${esc(r.name)} ${flagsOf(p)}</span></span>
        ${on ? '<span class="mark">✓</span>' : ''}
      </button>`;
    }).join('')}</div>`;
  }

  function renderNight() {
    const cur = W.currentStep(game);
    if (!cur) return '<div class="panel">Die Nacht ist vorbei.</div>';
    const def = cur.def;
    const visible = game.night.steps.filter(id => W.stepStatus(game, id) !== 'skip');
    const pos = Math.max(0, visible.indexOf(cur.id));
    const prog = visible.map((_, i) => `<i class="${i < pos ? 'done' : ''}"></i>`).join('');
    const actors = cur.actors.map(pname).join(', ');
    let body = '';

    if (cur.status === 'fake') {
      body = `
        <div class="fake-note">🕯️ Diese Rolle ist nicht mehr im Spiel. Rufe sie trotzdem auf, warte ein paar Sekunden und mach dann weiter – so verrät niemand etwas.</div>
        <button class="btn primary big block" data-act="skipStep">Weiter →</button>`;
    } else if (def.kind === 'info') {
      body = `
        ${cur.info ? `<div class="info-line">${esc(cur.info)}</div>` : ''}
        <button class="btn primary big block" data-act="skipStep">Weiter →</button>`;
    } else if (def.kind === 'yesno') {
      body = `
        ${cur.info ? `<div class="info-line">${esc(cur.info)}</div>` : ''}
        <div class="btn-row">
          <button class="btn danger big" data-act="urwolf" data-yes="1">🩸 Ja, infizieren</button>
          <button class="btn big" data-act="urwolf" data-yes="0">Nein, töten</button>
        </div>`;
    } else if (def.kind === 'hexe') {
      const victim = (game.night.sel.werwoelfe || [])[0];
      const canHeal = game.p.hexeHeal && !!victim;
      const poisonTargets = W.alive(game).filter(p => !cur.actors.includes(p.id)).map(p => p.id);
      body = `
        <div class="info-line">${esc(cur.info)}</div>
        <div class="potion">
          <span class="emo">💚</span>
          <span class="lbl">Heiltrank${victim ? ` auf ${pname(victim)}` : ''}<small>${game.p.hexeHeal ? (victim ? 'Rettet das Opfer der Werwölfe' : 'Kein Opfer zu retten') : 'Bereits verbraucht'}</small></span>
          <button class="switch ${tmp.heal ? 'on' : ''}" data-act="hexeHeal" ${canHeal ? '' : 'disabled'} aria-label="Heiltrank einsetzen"></button>
        </div>
        <div class="potion">
          <span class="emo">☠️</span>
          <span class="lbl">Gifttrank<small>${game.p.hexePoison ? (tmp.poison ? `Ziel: ${pname(tmp.poison)}` : 'Tötet einen Spieler deiner Wahl') : 'Bereits verbraucht'}</small></span>
          <button class="switch ${tmp.poisonOpen ? 'on' : ''}" data-act="hexePoisonToggle" ${game.p.hexePoison ? '' : 'disabled'} aria-label="Gifttrank einsetzen"></button>
        </div>
        ${tmp.poisonOpen ? pickGrid(poisonTargets, { act: 'hexePoison', sel: tmp.poison ? [tmp.poison] : [] }) : ''}
        <div style="height:12px"></div>
        <button class="btn primary big block" data-act="confirmHexe" ${tmp.poisonOpen && !tmp.poison ? 'disabled' : ''}>
          ${tmp.heal || tmp.poison ? 'Bestätigen ✓' : 'Keinen Trank einsetzen →'}
        </button>`;
    } else {
      const need = def.count;
      const res = tmp.sel.length === need ? W.stepResult(game, cur.id, tmp.sel) : null;
      body = `
        ${cur.info ? `<div class="info-line">${esc(cur.info)}</div>` : ''}
        <p class="muted small" style="margin:0 0 8px">${need === 1 ? 'Wähle einen Spieler:' : `Wähle ${need} Spieler (${tmp.sel.length}/${need}):`}</p>
        ${pickGrid(cur.targets)}
        ${res ? `<div class="result ${res.good ? 'good' : 'bad'}">${esc(res.text)}</div>` : ''}
        <div style="height:14px"></div>
        <div class="btn-row">
          <button class="btn" data-act="skipStep" style="flex:0 0 auto">${cur.id === 'werwoelfe' ? 'Kein Opfer' : 'Überspringen'}</button>
          <button class="btn primary big" data-act="confirmStep" ${tmp.sel.length === need ? '' : 'disabled'}>Bestätigen ✓</button>
        </div>`;
    }

    return `
      <section class="panel">
        <div class="steps-progress">${prog}</div>
        <div class="step-head">
          <span class="emo">${stepEmoji(cur.id)}</span>
          <div><h2>${esc(def.title)}</h2><div class="who">${cur.status === 'fake' ? 'nicht mehr im Spiel' : actors ? 'Wacht auf: ' + actors : ''}</div></div>
        </div>
        ${narration(def.wake)}
        ${body}
        ${def.sleep && game.settings.narration ? `<p class="muted small" style="margin:12px 0 0">Danach: „${esc(def.sleep)}“</p>` : ''}
      </section>`;
  }

  function newsBlock(onlyPublic = false) {
    const pub = game.news.lines.filter(l => !l.secret);
    const sec = game.news.lines.filter(l => l.secret);
    return `
      ${pub.length ? `<ul class="news-list">${pub.map(l => `<li>${esc(l.text)}</li>`).join('')}</ul>` : ''}
      ${!onlyPublic && sec.length ? `
        <details class="secret-box">
          <summary>🔒 Nur für die Spielleitung (${sec.length})</summary>
          <ul>${sec.map(l => `<li>${esc(l.text)}</li>`).join('')}</ul>
        </details>` : ''}`;
  }

  function renderNews() {
    const s = game.screen;
    const pubText = game.news.lines.filter(l => !l.secret).map(l => l.text).join(' ');
    let buttons = '';
    if (s === 'morning') {
      buttons = `<button class="btn primary big block" data-act="toDay">☀️ Weiter zum Tag</button>`;
    } else if (s === 'afterLynch') {
      const judge = W.alive(game).find(p => p.roleId === 'richter');
      buttons = `
        ${judge && !game.p.richterUsed ? `<button class="btn block" data-act="richter">⚖️ Richter ${esc(judge.name)}: zweite Abstimmung</button>` : ''}
        <button class="btn primary big block" data-act="endDay">🌙 Tag beenden</button>`;
    } else {
      buttons = `<button class="btn primary big block" data-act="startNight">🌙 Nacht ${game.round + 1} beginnen</button>`;
    }
    const intro = s === 'morning' ? 'Das Dorf erwacht. Verkünde, was in der Nacht geschah:' : s === 'dusk' ? 'Die Sonne geht unter …' : '';
    return `
      <section class="panel">
        <div class="row"><h2 style="flex:1">${esc(game.news.title)}</h2>
          ${pubText ? `<button class="icon-btn" data-act="say" data-text="${esc(pubText)}" aria-label="Vorlesen">🔊</button>` : ''}
        </div>
        ${intro ? `<p class="sub">${intro}</p>` : ''}
        ${newsBlock()}
      </section>
      <div class="btn-col">${buttons}</div>`;
  }

  function renderInterrupt() {
    const it = game.queue[0];
    const who = pname(it.pid);
    const targets = W.interruptTargets(game);
    const cfg = {
      jaeger: { emo: '🏹', title: `Letzter Schuss von ${who}`, text: 'Der Jäger reißt im Sterben jemanden mit. Wen trifft der Schuss?', skip: 'Nicht schießen', need: 1 },
      akw: { emo: '☢️', title: `Das AKW von ${who}`, text: 'Bis zu zwei Spieler werden verstrahlt. Vorgeschlagen sind die Sitznachbarn – du entscheidest.', skip: 'Niemanden treffen', need: 2 },
      mayor: { emo: '👑', title: `${who} gibt das Amt weiter`, text: 'Der sterbende Bürgermeister bestimmt einen Nachfolger.', skip: 'Keinen Nachfolger', need: 1 }
    }[it.type];
    return `
      ${game.news.lines.some(l => !l.secret) ? `<section class="panel"><h2>${esc(game.news.title)}</h2>${newsBlock(true)}</section>` : ''}
      <section class="panel">
        <div class="step-head"><span class="emo">${cfg.emo}</span><div><h2>${cfg.title}</h2></div></div>
        <p class="sub">${cfg.text}</p>
        ${pickGrid(targets)}
        <div style="height:14px"></div>
        <div class="btn-row">
          <button class="btn" data-act="skipInterrupt" style="flex:0 0 auto">${cfg.skip}</button>
          <button class="btn primary big" data-act="confirmInterrupt" ${tmp.sel.length ? '' : 'disabled'}>Bestätigen ✓</button>
        </div>
      </section>`;
  }

  function renderMayor() {
    return `
      <section class="panel">
        <div class="step-head"><span class="emo">👑</span><div><h2>Bürgermeisterwahl</h2><div class="who">Erster Tag</div></div></div>
        ${narration('Bevor ihr Verdächtige sucht, wählt das Dorf offen einen Bürgermeister.')}
        <p class="sub">Seine Stimme zählt bei Abstimmungen doppelt, bei Gleichstand entscheidet er. Stirbt er, bestimmt er einen Nachfolger.</p>
        ${pickGrid(W.alive(game).map(p => p.id))}
        <div style="height:14px"></div>
        <div class="btn-row">
          <button class="btn" data-act="noMayor" style="flex:0 0 auto">Ohne</button>
          <button class="btn primary big" data-act="electMayor" ${tmp.sel.length ? '' : 'disabled'}>👑 Wählen</button>
        </div>
      </section>`;
  }

  function dayReminders() {
    const r = [];
    const mayor = game.p.mayor && byId(game.p.mayor);
    if (mayor && mayor.alive) r.push(`👑 Bürgermeister: <strong>${esc(mayor.name)}</strong> (Stimme zählt doppelt)`);
    if (game.p.raven && byId(game.p.raven).alive && game.day.voteNo === 1) r.push(`🐦‍⬛ ${pname(game.p.raven)} startet mit 2 Stimmen gegen sich.`);
    if (game.day.protectedId) r.push(`🌸 ${pname(game.day.protectedId)} steht heute unter dem Schutz des Blumenkinds.`);
    game.players.filter(p => !p.alive && p.roleId === 'geist').forEach(p => r.push(`👻 Geist ${esc(p.name)} darf heute ein einziges Wort sagen.`));
    game.players.filter(p => p.alive && p.flags.noVote).forEach(p => r.push(`🔇 ${esc(p.name)} darf nicht abstimmen.`));
    const judge = W.alive(game).find(p => p.roleId === 'richter');
    if (judge && !game.p.richterUsed) r.push(`⚖️ Achte auf das geheime Zeichen des Richters (${esc(judge.name)}).`);
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
        <h2>💬 Diskussion</h2>
        <p class="sub">Das Dorf berät, wer verdächtig ist.</p>
        <div class="timer">
          <div class="digits ${timer.left <= 30 && timer.left > 0 ? 'low' : ''}" id="tDigits">${fmt(timer.left)}</div>
          <div class="bar"><i id="tBar" style="width:${pct}%"></i></div>
          <div class="btn-row">
            <button class="btn" data-act="timerAdd" data-d="-60">−1</button>
            <button class="btn primary" data-act="timerToggle" id="tToggle">${timer.running ? '⏸ Pause' : '▶︎ Start'}</button>
            <button class="btn" data-act="timerAdd" data-d="60">+1</button>
            <button class="btn" data-act="timerReset" aria-label="Zurücksetzen">↺</button>
          </div>
        </div>
        ${dayReminders()}
        ${tmp.blumen ? `
          <div class="info-line">🌸 Wen stellt das Blumenkind (${esc(flower.name)}) unter Schutz?</div>
          ${pickGrid(W.alive(game).map(p => p.id))}
          <div style="height:10px"></div>
          <div class="btn-row"><button class="btn" data-act="blumenCancel">Abbrechen</button><button class="btn primary" data-act="blumenConfirm" ${tmp.sel.length ? '' : 'disabled'}>Schützen</button></div>
        ` : canFlower ? `<button class="btn block" data-act="blumenOpen">🌸 Blumenkind ${esc(flower.name)} schützt jemanden</button>` : ''}
      </section>
      <button class="btn primary big block" data-act="startVote">🗳️ Abstimmung starten</button>`;
  }

  function renderVote() {
    const d = game.day;
    const totals = W.voteTotals(game);
    const max = Math.max(0, ...Object.values(totals));
    const mayor = game.p.mayor && byId(game.p.mayor);
    const mayorAlive = mayor && mayor.alive;
    const rows = W.voteCandidates(game).map(id => {
      const p = byId(id);
      const extra = [];
      if (game.p.raven === id && d.voteNo === 1) extra.push('+2 🐦‍⬛');
      if (d.mayorVote === id && mayorAlive) extra.push('+1 👑');
      return `
        <div class="vote-row ${max > 0 && totals[id] === max ? 'lead' : ''}">
          <span class="vname">${esc(p.name)} <span class="extra">${extra.join(' ')}</span></span>
          ${mayorAlive ? `<button class="icon-btn crown ${d.mayorVote === id ? 'on' : ''}" data-act="mayorVote" data-id="${id}" aria-label="Bürgermeister stimmt für ${esc(p.name)}">👑</button>` : ''}
          <button class="icon-btn" data-act="vote" data-id="${id}" data-d="-1" ${(d.votes[id] || 0) ? '' : 'disabled'} aria-label="Stimme weniger">−</button>
          <span class="count">${totals[id]}</span>
          <button class="icon-btn" data-act="vote" data-id="${id}" data-d="1" aria-label="Stimme mehr">＋</button>
        </div>`;
    }).join('');
    const leaders = Object.keys(totals).filter(id => max > 0 && totals[id] === max);
    const status = !max ? 'Noch keine Stimmen.' : leaders.length === 1 ? `Vorne: <strong>${pname(leaders[0])}</strong> mit ${max} Stimmen` : `Gleichstand: ${leaders.map(pname).join(', ')}`;
    return `
      <section class="panel">
        <h2>🗳️ Abstimmung${d.voteNo > 1 ? ' – zweite Runde' : ''}</h2>
        <p class="sub">Zählt die Stimmen offen aus und tippt sie hier ein.${mayorAlive ? ' 👑 markiert, wofür der Bürgermeister stimmt (zählt doppelt).' : ''}</p>
        ${dayReminders()}
        <div class="vote-list">${rows}</div>
        <p class="center" style="margin:14px 0 0">${status}</p>
      </section>
      <div class="btn-col">
        <button class="btn primary big block" data-act="resolveVote" ${max ? '' : 'disabled'}>⚖️ Auswerten</button>
        <div class="btn-row">
          <button class="btn" data-act="backToTalk">← Diskussion</button>
          <button class="btn" data-act="noLynch">Niemand hängen</button>
        </div>
      </div>`;
  }

  function renderTie() {
    const mayor = byId(game.p.mayor);
    return `
      <section class="panel">
        <div class="step-head"><span class="emo">⚖️</span><div><h2>Gleichstand</h2><div class="who">${esc(mayor.name)} entscheidet als Bürgermeister</div></div></div>
        ${pickGrid(game.day.tied)}
        <div style="height:14px"></div>
        <div class="btn-row">
          <button class="btn" data-act="noLynch" style="flex:0 0 auto">Niemand</button>
          <button class="btn primary big" data-act="tieConfirm" ${tmp.sel.length ? '' : 'disabled'}>Hängen</button>
        </div>
      </section>`;
  }

  function renderCleaner() {
    const cleaner = W.alive(game).find(p => p.roleId === 'reinigungskraft');
    const target = byId(game.day.pendingLynch);
    return `
      <section class="panel">
        <div class="step-head"><span class="emo">🧹</span><div><h2>Reinigungskraft</h2><div class="who">${esc(cleaner.name)} – einmal im Spiel</div></div></div>
        <p class="sub">Frag die Reinigungskraft unauffällig (z. B. per vereinbartem Zeichen): Soll die Rolle von <strong>${esc(target.name)}</strong> geheim bleiben?</p>
        <div class="btn-row">
          <button class="btn big" data-act="cleaner" data-yes="0">Nein, aufdecken</button>
          <button class="btn primary big" data-act="cleaner" data-yes="1">🧹 Ja, verbergen</button>
        </div>
      </section>`;
  }

  function renderOver() {
    const w = game.winner;
    const cards = game.players.map(p => {
      const win = w.ids.includes(p.id);
      return `<div class="pcard ${p.alive ? '' : 'dead'} ${win ? 'win' : ''}" style="--tc:${teamColor(p)}">
        <span class="pn">${win ? '🏆' : ''} ${esc(p.name)}</span>
        <span class="pr">${esc(W.roleLabel(p))}</span>
        <span class="pr">${p.alive ? 'überlebt' : '☠️ ' + esc(p.deathLabel || '')}</span>
      </div>`;
    }).join('');
    return `
      <section class="panel winner-hero">
        <div class="big">${w.title.split(' ')[0]}</div>
        <h2>${esc(w.title.split(' ').slice(1).join(' '))}</h2>
        <p class="muted">${esc(w.text)}</p>
      </section>
      <section class="panel">
        <h2>🎭 Auflösung</h2>
        <div class="grid-players" style="margin-top:10px">${cards}</div>
      </section>
      <section class="panel">
        <details><summary style="cursor:pointer;font-weight:700">📜 Chronik des Spiels</summary>
          <div style="height:10px"></div>${logList(true)}
        </details>
      </section>
      <div class="btn-col">
        <button class="btn primary big block" data-act="again">🔁 Nochmal – gleiche Runde</button>
        <button class="btn block" data-act="toSetup">🛠️ Spieler & Rollen ändern</button>
      </div>`;
  }

  function logList(showSecret) {
    const items = game.log.filter(l => showSecret || !l.secret);
    return `<ul class="log-list">${items.map(l => `<li class="${l.secret ? 'secret' : ''}"><span class="lbl">${esc(l.label)}${l.secret ? ' · geheim' : ''}</span>${esc(l.text)}</li>`).join('')}</ul>`;
  }

  // ------------------------------------------------------------ Timer
  const fmt = sec => `${String(Math.floor(Math.max(0, sec) / 60)).padStart(2, '0')}:${String(Math.max(0, sec) % 60).padStart(2, '0')}`;
  function paintTimer() {
    const dg = document.getElementById('tDigits'), bar = document.getElementById('tBar'), tg = document.getElementById('tToggle');
    if (dg) { dg.textContent = fmt(timer.left); dg.classList.toggle('low', timer.left <= 30 && timer.left > 0); }
    if (bar) bar.style.width = (timer.total ? timer.left / timer.total * 100 : 0) + '%';
    if (tg) tg.textContent = timer.running ? '⏸ Pause' : '▶︎ Start';
  }
  function stopTimer() { clearInterval(timer.handle); timer.handle = null; timer.running = false; }
  function startTimer() {
    if (timer.left <= 0) timer.left = timer.total;
    timer.running = true;
    clearInterval(timer.handle);
    timer.handle = setInterval(() => {
      timer.left -= 1;
      if (timer.left <= 0) { timer.left = 0; stopTimer(); beep(); vibrate([200, 100, 200]); toast('⏰ Die Zeit ist um!'); }
      paintTimer();
    }, 1000);
  }

  // ------------------------------------------------------------ MODALS
  function openModal(html) {
    $modal.innerHTML = `<div class="modal-back" data-modal-back><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
  }
  function closeModal() { $modal.innerHTML = ''; }
  const modalHead = title => `<h2>${title}<button class="icon-btn close" data-act="closeModal" aria-label="Schließen">✕</button></h2>`;

  function openNews() {
    const html = CHANGELOG.map(v => `
      <p class="muted">${esc(v.intro)}</p>
      ${v.sections.map(s => `<h3>${esc(s.title)}</h3><ul class="feat">${s.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`).join('')}
      <p class="muted small" style="margin-top:18px">Version ${esc(v.version)} · ${esc(v.date)} · Die alte Version gibt es weiter unter <a href="v1/" style="color:inherit">/v1/</a>.</p>`).join('<hr class="soft">');
    openModal(`${modalHead(`✨ Neu in Version ${esc(VERSION)}`)}${html}<div style="height:14px"></div><button class="btn primary block" data-act="closeModal">Los geht's</button>`);
    store.set(KEY.seen, VERSION);
  }

  function openRoleInfo(id) {
    const r = W.ROLE[id];
    const t = teamOf(r);
    openModal(`
      ${modalHead(`${r.emoji} ${esc(r.name)}`)}
      <div class="row wrap" style="margin-bottom:10px"><span class="badge" style="color:${t.color};border-color:${t.color};background:transparent">${t.emoji} ${t.name}</span>${r.isNew ? '<span class="badge new">NEU in v2</span>' : ''}${r.wakes.length ? '<span class="badge">🌙 wacht nachts auf</span>' : ''}</div>
      <p>${esc(r.desc)}</p>
      <p class="muted small"><em>${esc(r.descEN)}</em></p>
      ${r.tip ? `<p class="info-line small">💡 ${esc(r.tip)}</p>` : ''}
      <button class="btn block" data-act="closeModal">Schließen</button>`);
  }

  function openSettings() {
    const s = view === 'game' || view === 'reveal' ? game.settings : setup.settings;
    const sw = (key, label, hint) => `
      <div class="setting"><span class="lbl">${label}<small>${hint}</small></span>
        <button class="switch ${s[key] ? 'on' : ''}" data-act="setSetting" data-key="${key}" aria-label="${label}"></button></div>`;
    openModal(`
      ${modalHead('⚙️ Einstellungen')}
      ${sw('narration', 'Erzähltexte anzeigen', 'Vorlesetexte für die Nacht')}
      ${sw('tts', 'Automatisch vorlesen', 'Das Handy liest die Erzähltexte selbst vor')}
      ${sw('revealRoles', 'Rollen Verstorbener aufdecken', 'Bei jedem Tod wird die Rolle verkündet')}
      ${sw('callDeadRoles', 'Tote Rollen weiter aufrufen', 'Zum Schein, damit niemand etwas merkt')}
      ${sw('mayor', 'Bürgermeisterwahl', 'Am ersten Tag wird ein Bürgermeister gewählt')}
      ${sw('wolvesParity', 'Böse gewinnen bei Gleichstand', 'Sobald sie gleich viele sind wie die Übrigen')}
      <div class="setting"><span class="lbl">Seherin sieht<small>Nur „Werwolf ja/nein“ oder die genaue Rolle</small></span>
        <span class="seg"><button class="${s.seerMode === 'team' ? 'on' : ''}" data-act="setSetting" data-key="seerMode" data-val="team">Ja/Nein</button><button class="${s.seerMode === 'role' ? 'on' : ''}" data-act="setSetting" data-key="seerMode" data-val="role">Rolle</button></span></div>
      <div class="setting"><span class="lbl">Diskussionszeit<small>Minuten pro Tag</small></span>
        <span class="seg">${[2, 3, 5, 8, 10].map(m => `<button class="${s.dayMinutes === m ? 'on' : ''}" data-act="setSetting" data-key="dayMinutes" data-val="${m}">${m}</button>`).join('')}</span></div>
      ${view === 'game' ? `<div style="height:16px"></div><button class="btn danger block" data-act="abortGame">Spiel abbrechen</button>` : ''}
      <div style="height:10px"></div>
      <button class="btn primary block" data-act="closeModal">Fertig</button>`);
  }

  function openPlayers() {
    const cards = game.players.map(p => `
      <button class="pcard ${p.alive ? '' : 'dead'}" style="--tc:${teamColor(p)}" data-act="playerMenu" data-id="${p.id}">
        <span class="pn">${esc(p.name)}</span>
        <span class="pr">${esc(W.roleLabel(p))}</span>
        <span class="flags">${p.alive ? flagsOf(p) : '☠️ ' + esc(p.deathLabel || '')}</span>
      </button>`).join('');
    const legend = '👑 Bürgermeister · 💘 verliebt · 🐺 verwandelt · 🦇 gebissen · 🔇 kein Stimmrecht · 💪 Extraleben · 🐾 Vorbild';
    openModal(`${modalHead(`👥 Spieler (${W.alive(game).length}/${game.players.length} leben)`)}
      <div class="grid-players">${cards}</div>
      <p class="muted small" style="margin-top:12px">${legend}</p>
      <p class="muted small">Tippe auf einen Spieler, um ihn manuell zu entfernen oder zurückzuholen.</p>`);
  }

  function openPlayerMenu(id) {
    const p = byId(id);
    openModal(`${modalHead(esc(p.name))}
      <p>${esc(W.roleLabel(p))} · ${p.alive ? 'lebt' : '☠️ tot (' + esc(p.deathLabel || '') + ')'}</p>
      <p class="muted small">${esc(W.role(p).desc)}</p>
      <div class="btn-col">
        ${p.alive
          ? `<button class="btn danger block" data-act="gmKill" data-id="${id}">☠️ Aus dem Spiel nehmen</button><p class="muted small">Löst alle Folgen aus (Jäger, Liebe, AKW …). Rückgängig ist jederzeit möglich.</p>`
          : `<button class="btn block" data-act="gmRevive" data-id="${id}">💚 Zurückholen</button>`}
        <button class="btn block" data-act="openPlayers">← Zurück</button>
      </div>`);
  }

  function openLog() {
    openModal(`${modalHead('📜 Chronik')}
      <div class="row" style="margin-bottom:10px"><span class="spacer muted small">Geheime Einträge sehen nur die Spielleitung.</span>
        <button class="chip ${tmp.showSecretLog ? 'on' : ''}" data-act="toggleSecretLog">🔒 Geheimes zeigen</button></div>
      ${logList(tmp.showSecretLog)}`);
  }

  function confirmBox(text, okLabel, onOk) {
    openModal(`<h2>${esc(text)}</h2><div style="height:10px"></div>
      <div class="btn-row"><button class="btn" data-act="closeModal">Abbrechen</button><button class="btn danger" data-act="confirmOk">${esc(okLabel)}</button></div>`);
    pendingConfirm = onOk;
  }
  let pendingConfirm = null;

  // ==================================================================== AKTIONEN
  function stepKey() {
    if (view !== 'game' || !game) return view;
    return [game.screen, game.round, game.night ? game.night.idx : '', game.queue.length, game.day ? game.day.mode + game.day.voteNo : ''].join('|');
  }

  function afterRender() {
    const key = stepKey();
    if (key !== tmp.key) {
      const prevKey = tmp.key;
      const keep = { en: tmp.en, showSecretLog: tmp.showSecretLog };
      tmp = Object.assign(freshTmp(), keep, { key });
      if (view === 'game' && game.screen === 'interrupt' && game.queue[0] && game.queue[0].type === 'akw') tmp.sel = (game.queue[0].suggest || []).slice(0, 2);
      if (prevKey !== null) window.scrollTo({ top: 0, behavior: 'smooth' });
      if (view === 'game' && game.screen === 'night' && game.settings.tts && game.settings.narration) {
        const cur = W.currentStep(game);
        if (cur) speak(cur.def.wake);
      }
      render(); // mit frischem tmp neu zeichnen
      return;
    }
    if (view === 'reveal') bindCard();
    if (view === 'setup') { const inp = document.getElementById('playerInput'); if (inp && focusInput) { inp.focus(); focusInput = false; } }
    keepAwake(view === 'game' && game && game.screen !== 'over');
  }
  let focusInput = false;

  const ACT = {
    // --- Einrichten
    movePlayer(d) {
      const i = +d.i, j = i + +d.dir;
      [setup.players[i], setup.players[j]] = [setup.players[j], setup.players[i]];
      saveSetup(); render();
    },
    removePlayer(d) { setup.players.splice(+d.i, 1); saveSetup(); render(); },
    clearPlayers() { confirmBox('Alle Spieler entfernen?', 'Entfernen', () => { setup.players = []; saveSetup(); render(); }); },
    roleInc(d) { setup.counts[d.id] = (setup.counts[d.id] || 0) + 1; saveSetup(); render(); },
    roleDec(d) { setup.counts[d.id] = Math.max(0, (setup.counts[d.id] || 0) - 1); if (!setup.counts[d.id]) delete setup.counts[d.id]; saveSetup(); render(); },
    roleInfo(d) { openRoleInfo(d.id); },
    suggest() { setup.counts = W.suggestRoles(setup.players.length); saveSetup(); render(); toast('✨ Ausgewogene Rollen gewählt – gern anpassen'); },
    resetRoles() { setup.counts = {}; saveSetup(); render(); },
    filter(d) { setup.filter = d.f; saveSetup(); render(); },
    startGame() {
      const v = W.validateSetup(setup.players, setup.counts, setup.settings);
      if (!v.ok) return toast(v.errors[0]);
      const go = () => {
        game = W.createGame(setup.players, setup.counts, setup.settings);
        game.ui = { idx: 0, stage: 'pass' };
        history = [];
        saveGame(); view = 'reveal'; closeModal(); render();
      };
      if (game && game.phase !== 'over') confirmBox('Das laufende Spiel wird überschrieben.', 'Neues Spiel', go); else go();
    },
    showResult() { view = 'game'; render(); },
    resume() { view = game.screen === 'reveal' ? 'reveal' : 'game'; render(); },
    discard() { confirmBox('Laufendes Spiel verwerfen?', 'Verwerfen', () => { game = null; history = []; store.del(KEY.game); store.del(KEY.hist); render(); }); },

    // --- Aufdecken
    revealGo() { game.ui.stage = 'card'; tmp.seen = false; saveGame(); render(); },
    revealNext() {
      if (game.ui.idx >= game.players.length - 1) game.ui.stage = 'done';
      else { game.ui.idx += 1; game.ui.stage = 'pass'; }
      tmp.seen = false; saveGame(); render();
    },
    revealBack() {
      if (game.ui.stage === 'done') { game.ui.stage = 'pass'; }
      else if (game.ui.idx > 0) { game.ui.idx -= 1; game.ui.stage = 'pass'; }
      saveGame(); render();
    },
    toggleLang() { tmp.en = !tmp.en; render(); },
    beginGame() { history = []; game.ui = null; W.startNight(game); saveGame(); view = 'game'; render(); },

    // --- Nacht
    pick(d) {
      const cur = game.screen === 'night' ? W.currentStep(game) : null;
      let max = cur ? cur.def.count : 1;
      if (game.screen === 'interrupt' && game.queue[0].type === 'akw') max = 2;
      const i = tmp.sel.indexOf(d.id);
      if (i >= 0) tmp.sel.splice(i, 1);
      else if (max === 1) tmp.sel = [d.id];
      else if (tmp.sel.length < max) tmp.sel.push(d.id);
      else { tmp.sel.shift(); tmp.sel.push(d.id); }
      render();
    },
    confirmStep() { const v = tmp.sel.slice(); commit(g => W.submitStep(g, v)); },
    skipStep() {
      const cur = W.currentStep(game);
      const v = cur.def.kind === 'pick' ? [] : null;
      commit(g => W.submitStep(g, v));
    },
    urwolf(d) { commit(g => W.submitStep(g, d.yes === '1')); },
    hexeHeal() { tmp.heal = !tmp.heal; render(); },
    hexePoisonToggle() { tmp.poisonOpen = !tmp.poisonOpen; if (!tmp.poisonOpen) tmp.poison = null; render(); },
    hexePoison(d) { tmp.poison = tmp.poison === d.id ? null : d.id; render(); },
    confirmHexe() { const v = { heal: tmp.heal, poison: tmp.poison }; commit(g => W.submitStep(g, v)); },

    // --- Unterbrechungen
    confirmInterrupt() {
      const it = game.queue[0];
      const v = it.type === 'akw' ? tmp.sel.slice() : tmp.sel[0];
      commit(g => W.resolveInterrupt(g, v));
    },
    skipInterrupt() { const it = game.queue[0]; commit(g => W.resolveInterrupt(g, it.type === 'akw' ? [] : null)); },

    // --- Tag
    toDay() { commit(g => W.toDay(g)); },
    electMayor() { const v = tmp.sel[0]; commit(g => W.electMayor(g, v)); },
    noMayor() { commit(g => W.electMayor(g, null)); },
    blumenOpen() { tmp.blumen = true; tmp.sel = []; render(); },
    blumenCancel() { tmp.blumen = false; tmp.sel = []; render(); },
    blumenConfirm() { const v = tmp.sel[0]; tmp.blumen = false; commit(g => W.blumenkindProtect(g, v)); },
    startVote() { stopTimer(); commit(g => { g.day.mode = 'vote'; }); },
    backToTalk() { mutate(g => { g.day.mode = 'talk'; }); },
    vote(d) { mutate(g => { g.day.votes[d.id] = Math.max(0, (g.day.votes[d.id] || 0) + +d.d); }); },
    mayorVote(d) { mutate(g => { g.day.mayorVote = g.day.mayorVote === d.id ? null : d.id; }); },
    resolveVote() { commit(g => W.resolveVote(g)); },
    noLynch() { commit(g => W.noLynch(g)); },
    tieConfirm() { const v = tmp.sel[0]; commit(g => W.lynch(g, v)); },
    cleaner(d) { commit(g => W.cleanerDecide(g, d.yes === '1')); },
    richter() { commit(g => W.richterSecondVote(g)); },
    endDay() { commit(g => W.endDay(g)); },
    startNight() { commit(g => W.startNight(g)); },
    timerToggle() { if (timer.running) stopTimer(); else startTimer(); paintTimer(); },
    timerAdd(d) { timer.left = Math.max(0, timer.left + +d.d); timer.total = Math.max(timer.total, timer.left); paintTimer(); },
    timerReset() { stopTimer(); timer.left = timer.total = game.settings.dayMinutes * 60; paintTimer(); },

    // --- Ende
    again() {
      game = W.createGame(setup.players, setup.counts, setup.settings);
      game.ui = { idx: 0, stage: 'pass' };
      history = []; saveGame(); view = 'reveal'; render();
    },
    toSetup() { view = 'setup'; keepAwake(false); render(); },

    // --- Allgemein
    undo() { undo(); },
    say(d, el) { speak(el.getAttribute('data-text')); },
    openNews() { openNews(); },
    openSettings() { openSettings(); },
    openPlayers() { openPlayers(); },
    openLog() { openLog(); },
    toggleSecretLog() { tmp.showSecretLog = !tmp.showSecretLog; openLog(); },
    playerMenu(d) { openPlayerMenu(d.id); },
    gmKill(d) { closeModal(); commit(g => W.gmKill(g, d.id)); toast('Spieler entfernt – ↶ macht es rückgängig'); },
    gmRevive(d) { closeModal(); commit(g => W.gmRevive(g, d.id)); },
    closeModal() { closeModal(); },
    confirmOk() { const fn = pendingConfirm; pendingConfirm = null; closeModal(); if (fn) fn(); },
    setSetting(d) {
      const targets = [setup.settings];
      if (game && (view === 'game' || view === 'reveal')) targets.push(game.settings);
      targets.forEach(s => {
        if (d.val !== undefined) s[d.key] = isNaN(+d.val) ? d.val : +d.val;
        else s[d.key] = !s[d.key];
      });
      saveSetup(); if (game) saveGame();
      if (d.key === 'dayMinutes' && view === 'game' && !timer.running) { timer.total = timer.left = (+d.val) * 60; }
      openSettings(); render();
    },
    abortGame() { confirmBox('Spiel wirklich abbrechen?', 'Abbrechen', () => { game = null; history = []; store.del(KEY.game); store.del(KEY.hist); view = 'setup'; keepAwake(false); render(); }); }
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
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $modal.innerHTML) closeModal(); });
  $app.addEventListener('submit', e => {
    if (e.target.dataset.form !== 'addPlayer') return;
    e.preventDefault();
    const inp = document.getElementById('playerInput');
    const nm = inp.value.trim().replace(/\s+/g, ' ');
    if (!nm) return;
    if (setup.players.some(x => x.toLowerCase() === nm.toLowerCase())) { toast(`„${nm}“ ist schon dabei`); return; }
    if (setup.players.length >= 30) { toast('Maximal 30 Spieler'); return; }
    setup.players.push(nm);
    saveSetup(); focusInput = true; render();
  });

  // ------------------------------------------------------------ Start
  render();
  if (store.get(KEY.seen, null) !== VERSION) setTimeout(openNews, 400);
  if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
})();
