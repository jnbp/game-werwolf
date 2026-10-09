/* ==========================================================================
   Werwolf v2 – SPIEL-ENGINE
   Reine Spiellogik ohne Oberfläche. Jede Funktion verändert das übergebene
   `state`-Objekt. Dadurch lässt sich alles speichern (localStorage),
   rückgängig machen (Snapshots) und automatisch testen (Node).
   ========================================================================== */

(function (global) {
  'use strict';

  const DATA = global.WW_DATA || (typeof require !== 'undefined' ? require('./roles.js') : null);
  const { ROLES, NIGHT_STEPS, TEAMS } = DATA;
  const ROLE = Object.fromEntries(ROLES.map(r => [r.id, r]));
  const STEP = Object.fromEntries(NIGHT_STEPS.map(s => [s.id, s]));
  const KILLER_ROLES = ['werwolf', 'urwolf', 'wolfsseherin', 'weisserwolf', 'vampir', 'serienmoerder'];

  const DEFAULT_SETTINGS = {
    revealRoles: true,      // Rolle Verstorbener öffentlich aufdecken
    callDeadRoles: true,    // tote Rollen nachts zum Schein weiter aufrufen
    seerMode: 'team',       // 'team' = Werwolf ja/nein, 'role' = genaue Rolle
    wolvesParity: true,     // Böse gewinnen bei Gleichstand
    mayor: true,            // Bürgermeisterwahl am ersten Tag
    dayMinutes: 5,
    narration: true,        // Erzähltexte anzeigen
    tts: false              // Erzähltexte vorlesen
  };

  // ------------------------------------------------------------------ Helfer
  const byId = (s, id) => s.players.find(p => p.id === id);
  const role = p => ROLE[p.roleId];
  const alive = s => s.players.filter(p => p.alive);
  const name = (s, id) => (byId(s, id) || {}).name || '?';
  const names = (s, ids) => ids.map(id => name(s, id)).join(' & ');
  const isWolfish = p => !!p.flags.wolf || role(p).wakes.includes('werwoelfe');
  const appearsWolf = p => !!p.flags.wolf || !!role(p).appearsWolf;
  const isVampire = p => p.roleId === 'vampir';
  const hasAliveRole = (s, id) => alive(s).some(p => p.roleId === id);
  const firstAlive = (s, id) => alive(s).find(p => p.roleId === id);
  const phaseLabel = s => (s.phase === 'night' ? 'Nacht ' : 'Tag ') + s.round;

  function baseTeam(s, p) {
    if (p.flags.wolf) return 'wolf';
    if (p.roleId === 'guenstling') return s.p.guenstlingTeam;
    return role(p).team;
  }
  function loversMixed(s) {
    const [a, b] = s.p.lovers.map(id => byId(s, id));
    return !!(a && b && baseTeam(s, a) !== baseTeam(s, b));
  }
  function team(s, p) {
    if (s.p.lovers.includes(p.id) && loversMixed(s)) return 'liebende';
    return baseTeam(s, p);
  }
  function roleLabel(p) {
    const r = role(p);
    return p.flags.wolf ? `${r.emoji} ${r.name} → 🐺 Werwolf` : `${r.emoji} ${r.name}`;
  }

  /** Lebende Sitznachbarn (links, rechts) in Sitzreihenfolge. */
  function neighbours(s, id) {
    const seats = s.players;
    const i = seats.findIndex(p => p.id === id);
    const n = seats.length, res = [];
    for (let k = 1; k < n; k++) { const q = seats[(i - k + n) % n]; if (q.alive && q.id !== id) { res.push(q.id); break; } }
    for (let k = 1; k < n; k++) { const q = seats[(i + k) % n]; if (q.alive && q.id !== id) { if (!res.includes(q.id)) res.push(q.id); break; } }
    return res;
  }
  function nextWolfClockwise(s, id) {
    const seats = s.players, i = seats.findIndex(p => p.id === id), n = seats.length;
    for (let k = 1; k < n; k++) { const q = seats[(i + k) % n]; if (q.alive && isWolfish(q)) return q.id; }
    return null;
  }

  function log(s, text, secret = false) {
    s.log.push({ label: s.round ? phaseLabel(s) : 'Start', text, secret });
  }
  function say(s, text, secret = false) {
    s.news.lines.push({ text, secret });
    log(s, text, secret);
  }

  // ------------------------------------------------------------------ Setup
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function validateSetup(playerNames, counts, settings = DEFAULT_SETTINGS) {
    const errors = [], warnings = [];
    const n = playerNames.length;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const c = id => counts[id] || 0;
    if (n < 4) errors.push('Mindestens 4 Spieler nötig.');
    const lower = playerNames.map(x => x.trim().toLowerCase());
    if (new Set(lower).size !== lower.length) errors.push('Zwei Spieler haben denselben Namen.');
    if (total !== n) errors.push(`${n} Spieler, aber ${total} Rollen gewählt.`);
    for (const [id, k] of Object.entries(counts)) {
      if (k > (ROLE[id].max || 1)) errors.push(`${ROLE[id].name} darf höchstens ${ROLE[id].max || 1}× vorkommen.`);
    }
    if (!KILLER_ROLES.some(id => c(id) > 0)) errors.push('Es fehlt eine böse Rolle (Werwolf, Vampir oder Serienmörder).');
    const evil = c('werwolf') + c('urwolf') + c('wolfsseherin') + c('weisserwolf') + c('vampir') + c('serienmoerder');
    if (n >= 4 && evil > Math.floor(n / 2)) warnings.push('Sehr viele böse Rollen – das Dorf hat kaum eine Chance.');
    if (n >= 8 && evil === 1) warnings.push('Nur eine böse Rolle bei so vielen Spielern – eher leicht fürs Dorf.');
    if (c('freimaurer') === 1) warnings.push('Ein einzelner Freimaurer erkennt niemanden – nimm mindestens zwei.');
    if (c('rotkaeppchen') && !c('jaeger')) warnings.push('Rotkäppchen ist ohne Jäger nicht geschützt.');
    if (c('reinigungskraft') && !settings.revealRoles) warnings.push('Reinigungskraft wirkt nur, wenn Rollen Verstorbener aufgedeckt werden.');
    if (c('guenstling') && !(c('werwolf') + c('urwolf') + c('wolfsseherin') + c('vampir'))) warnings.push('Günstling ohne Werwölfe oder Vampire hat niemanden zum Helfen.');
    if (c('urwolf') + c('wolfsseherin') + c('werwolf') === 0 && c('weisserwolf')) warnings.push('Weißer Werwolf ohne andere Werwölfe jagt allein.');
    return { ok: errors.length === 0, errors, warnings };
  }

  /** Ausgewogener Rollenvorschlag für n Spieler. */
  function suggestRoles(n) {
    const counts = {};
    const add = (id, k = 1) => { counts[id] = (counts[id] || 0) + k; };
    const wolves = Math.max(1, Math.floor((n + 1) / 4));
    let used = 0;
    if (n >= 11) { add('werwolf', wolves - 1); add('urwolf'); } else add('werwolf', wolves);
    used += wolves;
    const specials = ['seherin', 'hexe', 'jaeger', 'amor', 'leibwaechter', 'baerenfuehrer', 'dorfdepp', 'rabe', 'ritter', 'fuchs', 'aeltester', 'wildeskind', 'suendenbock', 'detektiv'];
    const slots = Math.max(0, Math.min(specials.length, Math.round((n - wolves) * 0.6)));
    specials.slice(0, slots).forEach(id => add(id));
    used += slots;
    if (n - used > 0) add('dorfbewohner', n - used);
    return counts;
  }

  function balance(counts) {
    return Object.entries(counts).reduce((sum, [id, k]) => sum + (ROLE[id].weight || 0) * k, 0);
  }

  function createGame(playerNames, counts, settings) {
    const pool = shuffle(Object.entries(counts).flatMap(([id, k]) => Array(k).fill(id)));
    const players = playerNames.map((nm, i) => ({
      id: 'p' + i, name: nm.trim(), seat: i, roleId: pool[i], alive: true,
      deathCause: null, deathLabel: null,
      flags: pool[i] === 'aeltester' ? { extraLife: true } : {}
    }));
    const inGame = id => players.some(p => p.roleId === id);
    const s = {
      v: 2, settings: Object.assign({}, DEFAULT_SETTINGS, settings || {}),
      players, round: 0, phase: 'setup', screen: 'reveal',
      night: null, day: null, queue: [], after: null, winner: null, engelWin: null,
      news: { title: '', lines: [] }, log: [],
      p: {
        lovers: [], mayor: null, hexeHeal: true, hexePoison: true, bgLast: null,
        urwolfUsed: false, fuchsActive: true, blumenkindUsed: false, cleanerUsed: false,
        richterUsed: false, rusty: null, rustyPending: null, raven: null, wildModel: null,
        guenstlingTeam: (inGame('werwolf') || inGame('urwolf') || inGame('wolfsseherin') || !inGame('vampir')) ? 'wolf' : 'vampir',
        rolesInGame: [...new Set(pool)]
      }
    };
    log(s, 'Rollen verteilt: ' + players.map(p => `${p.name} = ${role(p).name}`).join(', '), true);
    return s;
  }

  // ------------------------------------------------------------------ Nacht
  const TARGETS = {
    alive:       (s, actors) => alive(s),
    others:      (s, actors) => alive(s).filter(p => !actors.includes(p.id)),
    bodyguard:   (s, actors) => alive(s).filter(p => !actors.includes(p.id) && p.id !== s.p.bgLast),
    nonWolf:     (s, actors) => alive(s).filter(p => !isWolfish(p)),
    otherWolves: (s, actors) => alive(s).filter(p => isWolfish(p) && !actors.includes(p.id)),
    nonVampire:  (s, actors) => alive(s).filter(p => !isVampire(p))
  };

  function stepMembers(s, stepId, onlyAlive = true) {
    const list = onlyAlive ? alive(s) : s.players;
    if (stepId === 'werwoelfe') return list.filter(isWolfish);
    if (stepId === 'liebende') return list.filter(p => s.p.lovers.includes(p.id));
    return list.filter(p => role(p).wakes.includes(stepId));
  }
  function stepExisted(s, stepId) {
    if (stepId === 'liebende') return s.p.lovers.length === 2;
    if (stepId === 'werwoelfe' && s.players.some(p => p.flags.wolf)) return true;
    return s.p.rolesInGame.some(id => ROLE[id].wakes.includes(stepId));
  }

  /** 'active' | 'fake' | 'skip' */
  function stepStatus(s, stepId) {
    const st = STEP[stepId];
    if (st.when === 'first' && s.round !== 1) return 'skip';
    if (st.when === 'even' && s.round % 2 !== 0) return 'skip';
    if (!stepExisted(s, stepId)) return 'skip';
    const members = stepMembers(s, stepId);
    const fakeOrSkip = s.settings.callDeadRoles ? 'fake' : 'skip';
    if (!members.length) return (stepId === 'liebende' || stepId === 'urwolf') ? 'skip' : fakeOrSkip;
    switch (stepId) {
      case 'urwolf': {
        const t = (s.night.sel.werwoelfe || [])[0];
        return (!s.p.urwolfUsed && t) ? 'active' : 'skip';
      }
      case 'hexe': return (s.p.hexeHeal || s.p.hexePoison) ? 'active' : fakeOrSkip;
      case 'fuchs': return s.p.fuchsActive ? 'active' : fakeOrSkip;
      case 'weisserwolf': return TARGETS.otherWolves(s, members.map(p => p.id)).length ? 'active' : fakeOrSkip;
    }
    return 'active';
  }

  function startNight(s) {
    s.round += 1;
    s.phase = 'night';
    s.day = null;
    s.night = { idx: -1, steps: NIGHT_STEPS.slice().sort((a, b) => a.order - b.order).map(x => x.id), sel: {}, results: {} };
    s.screen = 'night';
    log(s, `🌙 Nacht ${s.round} beginnt.`);
    advanceStep(s);
  }

  function advanceStep(s) {
    const n = s.night;
    while (++n.idx < n.steps.length) {
      if (stepStatus(s, n.steps[n.idx]) !== 'skip') return;
    }
    finishNight(s);
  }

  /** Infos zum aktuellen Schritt für die Oberfläche. */
  function currentStep(s) {
    if (!s.night || s.night.idx >= s.night.steps.length) return null;
    const id = s.night.steps[s.night.idx];
    const st = STEP[id];
    const status = stepStatus(s, id);
    const actors = stepMembers(s, id).map(p => p.id);
    const targets = st.targets ? TARGETS[st.targets](s, actors).map(p => p.id) : [];
    return { id, def: st, status, actors, targets, info: stepInfo(s, id), number: s.night.steps.slice(0, s.night.idx + 1).filter(x => stepStatus(s, x) !== 'skip').length };
  }

  function stepInfo(s, id) {
    switch (id) {
      case 'liebende': return `Verliebt: ${names(s, s.p.lovers)}`;
      case 'freimaurer': return 'Freimaurer: ' + stepMembers(s, 'freimaurer').map(p => p.name).join(', ');
      case 'guenstling': return 'Werwölfe zum Handheben: ' + (alive(s).filter(isWolfish).map(p => p.name).join(', ') || '– keine –');
      case 'werwoelfe': return 'Werwölfe: ' + stepMembers(s, 'werwoelfe').map(p => p.name).join(', ');
      case 'urwolf': return `Opfer der Werwölfe: ${name(s, (s.night.sel.werwoelfe || [])[0])}`;
      case 'hexe': {
        const t = (s.night.sel.werwoelfe || [])[0];
        return t ? `Opfer der Werwölfe: ${name(s, t)}${s.night.sel.urwolf ? ' (soll infiziert werden)' : ''}` : 'Die Werwölfe haben niemanden gewählt.';
      }
      case 'weisserwolf': return 'Gerade Nacht – der weiße Werwolf darf zuschlagen.';
      case 'leibwaechter': return s.p.bgLast ? `Letzte Nacht geschützt: ${name(s, s.p.bgLast)} (heute gesperrt)` : '';
    }
    return '';
  }

  /** Ergebnis, das der wählenden Rolle direkt gezeigt wird (Seherin & Co.). */
  function stepResult(s, id, ids) {
    if (!Array.isArray(ids)) return null;
    const ps = ids.map(x => byId(s, x)).filter(Boolean);
    if (!ps.length) return null;
    const t = ps[0];
    switch (id) {
      case 'seherin':
        if (s.settings.seerMode === 'role') return { text: `${t.name} ist: ${t.flags.wolf ? '🐺 Werwolf' : roleLabel(t)}`, good: !appearsWolf(t) };
        return appearsWolf(t) ? { text: `🐺 Ja – ${t.name} ist ein Werwolf.`, good: false } : { text: `🙂 Nein – ${t.name} ist kein Werwolf.`, good: true };
      case 'wolfsseherin':
        return { text: `${t.name} ist: ${roleLabel(t)}`, good: true };
      case 'fuchs': {
        const group = [t.id, ...neighbours(s, t.id)].map(x => byId(s, x));
        const hit = group.some(appearsWolf);
        return hit ? { text: `🦊 Ja – bei ${group.map(p => p.name).join(', ')} ist ein Werwolf.`, good: false }
                   : { text: `🦊 Nein – kein Werwolf bei ${group.map(p => p.name).join(', ')}. Der Fuchs verliert seine Nase.`, good: true };
      }
      case 'detektiv': {
        if (ps.length < 2) return null;
        const look = p => p.flags.wolf ? 'wolf' : p.roleId === 'guenstling' ? 'dorf' : role(p).team === 'solo' ? 'solo:' + p.roleId : role(p).team;
        const same = look(ps[0]) === look(ps[1]);
        return { text: same ? `🕵️ ${ps[0].name} & ${ps[1].name} gehören zum selben Lager.` : `🕵️ ${ps[0].name} & ${ps[1].name} gehören zu verschiedenen Lagern.`, good: same };
      }
    }
    return null;
  }

  /** Auswahl eines Nachtschritts bestätigen. value: Array von IDs, true/false oder {heal, poison}. */
  function submitStep(s, value) {
    const cur = currentStep(s);
    if (!cur) return;
    const { id } = cur;
    if (cur.status === 'active') {
      s.night.sel[id] = value;
      const res = stepResult(s, id, value);
      if (res) { s.night.results[id] = res.text; log(s, `${STEP[id].title}: ${res.text}`, true); }
      if (id === 'amor' && Array.isArray(value) && value.length === 2) {
        s.p.lovers = value.slice();
        log(s, `💘 Amor verliebt ${names(s, value)}.`, true);
      }
      if (id === 'wildeskind' && value && value[0]) {
        s.p.wildModel = value[0];
        log(s, `🐾 Vorbild des wilden Kindes: ${name(s, value[0])}.`, true);
      }
      if (id === 'fuchs' && value && value[0]) {
        const group = [value[0], ...neighbours(s, value[0])].map(x => byId(s, x));
        if (!group.some(appearsWolf)) s.p.fuchsActive = false;
      }
    }
    advanceStep(s);
  }

  // ------------------------------------------------- ROLLEN-EFFEKTE (Nacht)
  function finishNight(s) {
    const sel = s.night.sel;
    const first = k => (sel[k] || [])[0] || null;
    s.night.idx = s.night.steps.length;
    s.news = { title: `☀️ Morgen nach Nacht ${s.round}`, lines: [] };
    const deaths = [];
    const die = (id, cause) => { if (id && !deaths.some(d => d[0] === id)) deaths.push([id, cause]); };

    // Schutz & Besuche
    const guards = {};
    if (first('leibwaechter')) guards[first('leibwaechter')] = 'Leibwächter';
    if (first('priester')) guards[first('priester')] = guards[first('priester')] ? 'Leibwächter & Priester' : 'Priester';
    const matratze = firstAlive(s, 'dorfmatratze');
    const visit = matratze ? first('dorfmatratze') : null;
    const blocked = id => guards[id] ? `geschützt durch ${guards[id]}` : (matratze && id === matratze.id && visit ? 'nicht zu Hause (Dorfmatratze)' : null);
    const hexe = sel.hexe || {};

    // Rostiges Schwert aus der Vornacht
    if (s.p.rusty && byId(s, s.p.rusty).alive) die(s.p.rusty, 'ritter');
    s.p.rusty = null;

    // Werwölfe (+ Urwolf)
    const wt = first('werwoelfe');
    if (wt) {
      const t = byId(s, wt);
      const infect = sel.urwolf === true;
      if (infect) s.p.urwolfUsed = true;
      let reason = null;
      if (['vampir', 'serienmoerder'].includes(t.roleId)) reason = `${role(t).name} ist immun gegen Werwölfe`;
      else if (blocked(wt)) reason = blocked(wt);
      else if (t.roleId === 'rotkaeppchen' && hasAliveRole(s, 'jaeger')) reason = 'Rotkäppchen – der Jäger lebt noch';
      else if (hexe.heal) reason = 'von der Hexe geheilt';
      else if (t.flags.extraLife) { t.flags.extraLife = false; reason = 'der Älteste übersteht den ersten Angriff'; }
      if (reason) say(s, `Werwolf-Angriff auf ${t.name} gescheitert: ${reason}.`, true);
      else if (t.roleId === 'verfluchter' && !t.flags.wolf) {
        t.flags.wolf = true;
        say(s, `⛓️ ${t.name} (Verfluchter) wurde zum Werwolf. Tippe ihn heimlich an – ab der nächsten Nacht wacht er mit den Wölfen auf.`, true);
      } else if (infect) {
        t.flags.wolf = true;
        say(s, `🩸 ${t.name} wurde vom Urwolf infiziert und ist jetzt ein Werwolf. Tippe ihn heimlich an.`, true);
      } else {
        die(wt, 'wolf');
        if (visit === wt) die(matratze.id, 'matratze');
      }
    }
    if (hexe.heal) s.p.hexeHeal = false;

    // Weißer Werwolf
    const ww = first('weisserwolf');
    if (ww) {
      if (blocked(ww)) say(s, `Weißer Werwolf scheitert an ${name(s, ww)}: ${blocked(ww)}.`, true);
      else die(ww, 'weisserwolf');
    }
    // Vampirbiss
    const vb = first('vampire');
    if (vb) {
      if (blocked(vb)) say(s, `Vampirbiss bei ${name(s, vb)} abgewehrt: ${blocked(vb)}.`, true);
      else if (!deaths.some(d => d[0] === vb)) { byId(s, vb).flags.bitten = true; say(s, `🦇 ${name(s, vb)} wurde gebissen und stirbt am Ende des Tages.`, true); }
    }
    // Serienmörder
    const sk = first('serienmoerder');
    if (sk) {
      if (blocked(sk)) say(s, `Serienmörder scheitert an ${name(s, sk)}: ${blocked(sk)}.`, true);
      else { die(sk, 'serienmoerder'); if (visit === sk) die(matratze.id, 'matratze'); }
    }
    // Gift der Hexe (wirkt immer)
    if (hexe.poison) { die(hexe.poison, 'gift'); s.p.hexePoison = false; }

    // Dauerhafte Nachtwirkungen
    s.p.bgLast = first('leibwaechter');
    s.p.raven = first('rabe');

    if (deaths.length) deaths.forEach(([id, cause]) => kill(s, id, cause));
    else say(s, 'Niemand ist in dieser Nacht gestorben. 🌅');
    if (s.p.rustyPending) { s.p.rusty = s.p.rustyPending; s.p.rustyPending = null; }

    const bear = firstAlive(s, 'baerenfuehrer');
    if (bear) say(s, neighbours(s, bear.id).some(id => appearsWolf(byId(s, id))) ? '🐻 Der Bär brummt laut!' : '🐻 Der Bär bleibt ruhig.');
    if (s.p.raven && byId(s, s.p.raven).alive) say(s, `🐦‍⬛ Der Rabe hat ${name(s, s.p.raven)} markiert: +2 Stimmen in der Abstimmung.`);

    s.phase = 'day';
    s.after = 'morning';
    continueFlow(s);
  }

  // ------------------------------------------------------------- Tod & Folgen
  const CAUSE = {
    wolf: ['🐺', 'wurde von den Werwölfen gerissen', 'ist in der Nacht gestorben'],
    gift: ['🧪', 'wurde von der Hexe vergiftet', 'ist in der Nacht gestorben'],
    vampir: ['🦇', 'erliegt dem Vampirbiss', 'bricht in der Abenddämmerung tot zusammen'],
    serienmoerder: ['🔪', 'wurde vom Serienmörder getötet', 'ist in der Nacht gestorben'],
    weisserwolf: ['🤍', 'wurde vom weißen Werwolf getötet', 'ist in der Nacht gestorben'],
    matratze: ['💃', 'starb beim Besuch eines Opfers', 'ist in der Nacht gestorben'],
    ritter: ['⚔️', 'starb am rostigen Schwert des Ritters', 'ist in der Nacht gestorben'],
    liebe: ['💔', 'stirbt aus Liebeskummer', 'stirbt aus Liebeskummer'],
    jaeger: ['🏹', 'wurde vom Jäger erschossen', 'wurde vom Jäger erschossen'],
    akw: ['☢️', 'wurde verstrahlt', 'wurde vom AKW verstrahlt'],
    lynch: ['⚖️', 'wurde vom Dorf gehängt', 'wurde vom Dorf gehängt'],
    spielleitung: ['✋', 'wurde von der Spielleitung entfernt', 'scheidet aus']
  };

  function kill(s, id, cause) {
    const p = byId(s, id);
    if (!p || !p.alive) return false;
    p.alive = false; p.deathCause = cause; p.deathLabel = phaseLabel(s); p.flags.bitten = false;
    const [emo, secretText, publicText] = CAUSE[cause] || ['☠️', 'starb', 'starb'];
    const showRole = s.settings.revealRoles && !p.flags.roleHidden;
    // Öffentlich nur ein neutrales Symbol, wenn die Ursache geheim bleiben soll
    const pubEmo = publicText === secretText ? emo : '🪦';
    say(s, `${pubEmo} ${p.name} ${publicText}.${showRole ? ` Rolle: ${roleLabel(p)}.` : ''}`);
    if (publicText !== secretText) log(s, `${emo} ${p.name} ${secretText}.`, true);
    if (p.flags.roleHidden) say(s, `🧹 Rolle von ${p.name} bleibt geheim (war ${roleLabel(p)}).`, true);

    // Engel
    if (p.roleId === 'engel' && s.round === 1 && !s.engelWin) s.engelWin = p.id;
    // Ritter
    if (p.roleId === 'ritter' && cause === 'wolf') {
      const victim = nextWolfClockwise(s, p.id);
      if (victim) { s.p.rustyPending = victim; say(s, `⚔️ Rostiges Schwert: ${name(s, victim)} stirbt in der nächsten Nacht.`, true); }
    }
    // Wildes Kind
    if (s.p.wildModel === p.id) {
      const child = firstAlive(s, 'wildeskind');
      if (child && !child.flags.wolf) { child.flags.wolf = true; say(s, `🐾 Vorbild tot – ${child.name} (Wildes Kind) ist jetzt Werwolf. Tippe es heimlich an.`, true); }
    }
    // Bürgermeister
    if (s.p.mayor === p.id) { s.p.mayor = null; if (alive(s).length) s.queue.push({ type: 'mayor', pid: p.id }); }
    // Jäger & AKW
    if (p.roleId === 'jaeger' && alive(s).length) s.queue.push({ type: 'jaeger', pid: p.id });
    if (p.roleId === 'akw' && alive(s).length) s.queue.push({ type: 'akw', pid: p.id, suggest: neighbours(s, p.id) });
    // Liebende
    if (s.p.lovers.includes(p.id)) {
      const other = s.p.lovers.find(x => x !== p.id);
      if (other) kill(s, other, 'liebe');
    }
    return true;
  }

  /** Arbeitet offene Folgen (Jäger, AKW, Bürgermeister) ab, prüft dann den Sieg. */
  function continueFlow(s) {
    if (s.engelWin) return endGame(s, { team: 'engel', title: '😇 Der Engel gewinnt!', text: `${name(s, s.engelWin)} ist in der ersten Runde gestorben und steigt triumphierend auf.`, ids: [s.engelWin] });
    if (s.queue.length) { s.screen = 'interrupt'; return; }
    const win = checkWin(s);
    if (win) return endGame(s, win);
    const next = s.after;
    s.after = null;
    if (next === 'startNight') startNight(s);
    else s.screen = next || s.screen;
  }

  function interruptTargets(s) {
    const it = s.queue[0];
    if (!it) return [];
    return alive(s).filter(p => p.id !== it.pid).map(p => p.id);
  }

  function resolveInterrupt(s, value) {
    const it = s.queue.shift();
    if (!it) return;
    const who = name(s, it.pid);
    if (it.type === 'jaeger') {
      if (value) kill(s, value, 'jaeger');
      else say(s, `🏹 ${who} hat nicht geschossen.`);
    } else if (it.type === 'akw') {
      const ids = (value || []).slice(0, 2);
      if (ids.length) { say(s, `☢️ Das AKW von ${who} explodiert!`); ids.forEach(x => kill(s, x, 'akw')); }
      else say(s, `☢️ Das AKW von ${who} bleibt stabil.`);
    } else if (it.type === 'mayor') {
      if (value && byId(s, value).alive) { s.p.mayor = value; say(s, `👑 ${who} übergibt das Bürgermeisteramt an ${name(s, value)}.`); }
      else say(s, '👑 Das Dorf hat keinen Bürgermeister mehr.');
    }
    continueFlow(s);
  }

  // ------------------------------------------------------------------ Sieg
  function checkWin(s) {
    const living = alive(s);
    const all = s.players;
    const members = t => all.filter(p => team(s, p) === t).map(p => p.id);
    if (!living.length) return { team: 'niemand', title: '🪦 Niemand gewinnt', text: 'Das Dorf ist ausgestorben.', ids: [] };
    const teams = living.map(p => team(s, p));
    const count = t => teams.filter(x => x === t).length;
    const solos = living.filter(p => team(s, p) === 'solo');
    const mixedLovers = count('liebende') > 0;
    const helperOf = p => p.roleId === 'guenstling';

    if (mixedLovers && living.length === 2 && count('liebende') === 2)
      return { team: 'liebende', title: '💞 Die Liebenden gewinnen!', text: `${names(s, s.p.lovers)} haben allen getrotzt.`, ids: s.p.lovers.slice() };
    if (living.length === 1 && solos.length === 1)
      return { team: 'solo', title: `${role(solos[0]).emoji} ${role(solos[0]).name} gewinnt!`, text: `${solos[0].name} bleibt als Letzter übrig.`, ids: [solos[0].id] };

    const wolves = living.filter(p => team(s, p) === 'wolf' && !helperOf(p)).length;
    const vamps = living.filter(p => team(s, p) === 'vampir' && !helperOf(p)).length;
    if (!wolves && !vamps && !solos.length && !mixedLovers)
      return { team: 'dorf', title: '🏡 Das Dorf gewinnt!', text: 'Alle Bedrohungen wurden ausgeschaltet.', ids: members('dorf') };

    const evilWin = (t, n, title, text) => {
      if (!n) return null;
      const helpers = living.filter(p => helperOf(p) && team(s, p) === t).length;
      const others = living.length - n - helpers;
      const otherThreat = (t === 'wolf' ? vamps : wolves) + solos.length + (mixedLovers ? 1 : 0);
      if (!otherThreat && (others === 0 || (s.settings.wolvesParity && n + helpers >= others)))
        return { team: t, title, text, ids: members(t) };
      return null;
    };
    return evilWin('wolf', wolves, '🐺 Die Werwölfe gewinnen!', 'Das Dorf gehört jetzt dem Rudel.')
        || evilWin('vampir', vamps, '🧛 Die Vampire gewinnen!', 'Ewige Nacht über dem Dorf.')
        || null;
  }

  function endGame(s, win) {
    s.winner = win;
    s.queue = [];
    s.screen = 'over';
    s.phase = 'over';
    log(s, `🏁 ${win.title} ${win.text}`);
  }

  // ------------------------------------------------------------------ Tag
  function toDay(s) {
    s.phase = 'day';
    s.day = { mode: 'talk', votes: {}, protectedId: null, mayorVote: null, voteNo: 1, tied: null, pendingLynch: null, done: false };
    s.screen = (s.settings.mayor && !s.p.mayor && s.round === 1) ? 'mayor' : 'day';
    log(s, `☀️ Tag ${s.round} beginnt.`);
  }

  function electMayor(s, id) {
    if (id) { s.p.mayor = id; log(s, `👑 ${name(s, id)} wurde zum Bürgermeister gewählt.`); }
    s.screen = 'day';
  }

  function blumenkindProtect(s, id) {
    s.p.blumenkindUsed = true;
    s.day.protectedId = id;
    log(s, `🌸 Das Blumenkind schützt ${name(s, id)} vor der Abstimmung.`);
  }

  function voteCandidates(s) {
    return alive(s).filter(p => p.id !== s.day.protectedId).map(p => p.id);
  }
  function voteTotals(s) {
    const t = {};
    for (const id of voteCandidates(s)) {
      t[id] = (s.day.votes[id] || 0)
        + (s.p.raven === id && s.day.voteNo === 1 ? 2 : 0)
        + (s.day.mayorVote === id && s.p.mayor && byId(s, s.p.mayor).alive ? 1 : 0);
    }
    return t;
  }

  function resolveVote(s) {
    const t = voteTotals(s);
    const max = Math.max(0, ...Object.values(t));
    if (max <= 0) return noLynch(s, 'Keine Stimmen – niemand wird gehängt.');
    const tied = Object.keys(t).filter(id => t[id] === max);
    if (tied.length === 1) return lynch(s, tied[0]);
    const goat = firstAlive(s, 'suendenbock');
    if (goat && goat.id !== s.day.protectedId) { log(s, `🐐 Gleichstand zwischen ${names(s, tied)} – der Sündenbock muss dran glauben.`); return lynch(s, goat.id); }
    if (s.p.mayor && byId(s, s.p.mayor).alive) { s.day.tied = tied; s.screen = 'tie'; return; }
    return noLynch(s, `Gleichstand zwischen ${names(s, tied)} – niemand wird gehängt.`);
  }

  function lynch(s, id) {
    const t = byId(s, id);
    s.day.tied = null;
    if (t.roleId === 'dorfdepp' && !t.flags.noVote) {
      t.flags.noVote = true;
      s.news = { title: '⚖️ Urteil', lines: [] };
      say(s, `🤪 ${t.name} ist der Dorfdepp! Alle lachen – er überlebt, darf aber nicht mehr abstimmen.`);
      s.after = 'afterLynch';
      return continueFlow(s);
    }
    const cleaner = firstAlive(s, 'reinigungskraft');
    if (cleaner && !s.p.cleanerUsed && s.settings.revealRoles && cleaner.id !== id) {
      s.day.pendingLynch = id;
      s.screen = 'cleaner';
      return;
    }
    doLynch(s, id);
  }

  function cleanerDecide(s, hide) {
    const id = s.day.pendingLynch;
    s.day.pendingLynch = null;
    if (hide) { s.p.cleanerUsed = true; byId(s, id).flags.roleHidden = true; }
    doLynch(s, id);
  }

  function doLynch(s, id) {
    s.news = { title: '⚖️ Urteil', lines: [] };
    kill(s, id, 'lynch');
    s.after = 'afterLynch';
    continueFlow(s);
  }

  function noLynch(s, text) {
    s.day.tied = null;
    s.news = { title: '⚖️ Urteil', lines: [] };
    say(s, text || 'Das Dorf verschont heute alle.');
    s.after = 'afterLynch';
    continueFlow(s);
  }

  function richterSecondVote(s) {
    s.p.richterUsed = true;
    s.day.votes = {}; s.day.mayorVote = null; s.day.voteNo += 1; s.day.mode = 'vote';
    s.screen = 'day';
    log(s, '⚖️ Der stotternde Richter verlangt eine zweite Abstimmung!');
  }

  function endDay(s) {
    s.news = { title: `🌆 Abend ${s.round}`, lines: [] };
    const bitten = alive(s).filter(p => p.flags.bitten);
    s.p.raven = null;
    bitten.forEach(p => kill(s, p.id, 'vampir'));
    s.after = bitten.length ? 'dusk' : 'startNight';
    continueFlow(s);
  }

  // ------------------------------------------------------------ Spielleitung
  function gmKill(s, id) {
    const back = s.screen;
    if (!['morning', 'afterLynch', 'dusk', 'interrupt'].includes(back)) s.news = { title: '✋ Eingriff der Spielleitung', lines: [] };
    kill(s, id, 'spielleitung');
    if (back !== 'interrupt') s.after = back;
    continueFlow(s);
  }
  function gmRevive(s, id) {
    const p = byId(s, id);
    if (!p || p.alive) return;
    p.alive = true; p.deathCause = null; p.deathLabel = null;
    log(s, `✋ ${p.name} wurde von der Spielleitung zurückgeholt.`, true);
  }

  const API = {
    ROLE, STEP, TEAMS, DEFAULT_SETTINGS, KILLER_ROLES,
    byId, role, alive, name, names, team, roleLabel, neighbours, phaseLabel, isWolfish, appearsWolf, loversMixed,
    validateSetup, suggestRoles, balance, createGame, shuffle,
    startNight, currentStep, stepResult, submitStep, stepStatus,
    interruptTargets, resolveInterrupt, continueFlow, checkWin,
    toDay, electMayor, blumenkindProtect, voteCandidates, voteTotals, resolveVote, lynch, cleanerDecide, noLynch, richterSecondVote, endDay,
    gmKill, gmRevive
  };
  global.WW = API;
  if (typeof module !== 'undefined') module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : window);
