/* ==========================================================================
   Werwolf Manager – GAME ENGINE
   Pure game logic without any UI. Every function mutates the given `state`
   object, so everything can be saved (localStorage), undone (snapshots) and
   tested automatically (Node). The engine stores no finished sentences –
   only message keys {k, p} that i18n.js turns into German or English.
   ========================================================================== */

(function (global) {
  'use strict';

  const DATA = global.WW_DATA || (typeof require !== 'undefined' ? require('./roles.js') : null);
  const { ROLES, NIGHT_STEPS, TEAMS } = DATA;
  const ROLE = Object.fromEntries(ROLES.map(r => [r.id, r]));
  const STEP = Object.fromEntries(NIGHT_STEPS.map(s => [s.id, s]));
  const KILLER_ROLES = ['werwolf', 'urwolf', 'wolfsseherin', 'weisserwolf', 'vampir', 'serienmoerder'];

  const DEFAULT_SETTINGS = {
    revealRoles: true,      // reveal the role of dead players publicly
    callDeadRoles: true,    // keep calling dead roles at night (for show)
    seerMode: 'team',       // 'team' = werewolf yes/no, 'role' = exact role
    wolvesParity: true,     // evil wins at parity
    mayor: true,            // mayor election on day 1
    dayMinutes: 5,
    narration: true,        // show narration texts
    mode: 'gm',             // 'gm' = with game master, 'auto' = the phone narrates
    voteMode: 'hands'       // 'hands' = show of hands, 'pass' = secret, passed around
  };

  // ------------------------------------------------------------------ Helpers
  const byId = (s, id) => s.players.find(p => p.id === id);
  const role = p => ROLE[p.roleId];
  const alive = s => s.players.filter(p => p.alive);
  const name = (s, id) => (byId(s, id) || {}).name || '?';
  const names = (s, ids) => ids.map(id => name(s, id));
  const M = (k, p) => ({ k, p: p || {} });             // message key for i18n.js
  const R = p => ({ r: p.roleId, w: !!p.flags.wolf });   // role as message parameter
  const isWolfish = p => !!p.flags.wolf || role(p).wakes.includes('werwoelfe');
  const appearsWolf = p => !!p.flags.wolf || !!role(p).appearsWolf;
  const isVampire = p => p.roleId === 'vampir';
  const hasAliveRole = (s, id) => alive(s).some(p => p.roleId === id);
  const firstAlive = (s, id) => alive(s).find(p => p.roleId === id);

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

  /** Living seat neighbours (left, right) in seating order. */
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

  const phaseMsg = s => s.round ? M(s.phase === 'night' ? 'label.night' : 'label.day', { n: s.round }) : M('label.start');
  function log(s, k, p, secret = false) {
    s.log.push({ label: phaseMsg(s), k, p: p || {}, secret });
  }
  function say(s, k, p, secret = false) {
    s.news.lines.push({ k, p: p || {}, secret });
    log(s, k, p, secret);
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
    if (n < 4) errors.push(M('val.min4'));
    const lower = playerNames.map(x => x.trim().toLowerCase());
    if (new Set(lower).size !== lower.length) errors.push(M('val.dupName'));
    if (total !== n) errors.push(M('val.count', { n, t: total }));
    for (const [id, k] of Object.entries(counts)) {
      if (k > (ROLE[id].max || 1)) errors.push(M('val.max', { role: { r: id }, m: ROLE[id].max || 1 }));
    }
    if (!KILLER_ROLES.some(id => c(id) > 0)) errors.push(M('val.noEvil'));
    const evil = c('werwolf') + c('urwolf') + c('wolfsseherin') + c('weisserwolf') + c('vampir') + c('serienmoerder');
    if (n >= 4 && evil > Math.floor(n / 2)) warnings.push(M('warn.manyEvil'));
    if (n >= 8 && evil === 1) warnings.push(M('warn.oneEvil'));
    if (c('freimaurer') === 1) warnings.push(M('warn.mason'));
    if (c('rotkaeppchen') && !c('jaeger')) warnings.push(M('warn.redhood'));
    if (c('reinigungskraft') && !settings.revealRoles) warnings.push(M('warn.cleaner'));
    if (c('guenstling') && !(c('werwolf') + c('urwolf') + c('wolfsseherin') + c('vampir'))) warnings.push(M('warn.minion'));
    if (c('urwolf') + c('wolfsseherin') + c('werwolf') === 0 && c('weisserwolf')) warnings.push(M('warn.white'));
    return { ok: errors.length === 0, errors, warnings };
  }

  /** Balanced role suggestion for n players. */
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

  /** Strength per faction for the balance bar: { dorf, wolf, vampir, solo, share } (share = village share 0..1). */
  function balanceParts(counts) {
    const parts = { dorf: 0, wolf: 0, vampir: 0, solo: 0 };
    for (const [id, k] of Object.entries(counts)) {
      const r = ROLE[id], w = r.weight || 0;
      if (r.team === 'dorf') { if (w >= 0) parts.dorf += Math.max(w, 0.5) * k; else parts.wolf += -w * 1.5 * k; }
      else parts[r.team] += Math.abs(w) * 1.5 * k;
    }
    const evil = parts.wolf + parts.vampir + parts.solo;
    parts.share = parts.dorf + evil ? parts.dorf / (parts.dorf + evil) : 0.5;
    return parts;
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
    log(s, 'log.dealt', { list: players.map(p => ({ k: 'fmt.nameRole', p: { name: p.name, role: R(p) } })) }, true);
    return s;
  }

  // ------------------------------------------------------------------ Night
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
    log(s, 'log.nightStart', { n: s.round });
    advanceStep(s);
  }

  function advanceStep(s) {
    const n = s.night;
    while (++n.idx < n.steps.length) {
      if (stepStatus(s, n.steps[n.idx]) !== 'skip') return;
    }
    finishNight(s);
  }

  /** Info about the current step for the UI. */
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
      case 'liebende': return M('info.lovers', { names: names(s, s.p.lovers) });
      case 'freimaurer': return M('info.masons', { names: stepMembers(s, 'freimaurer').map(p => p.name) });
      case 'guenstling': return M('info.minion', { names: alive(s).filter(isWolfish).map(p => p.name) });
      case 'werwoelfe': {
        const fresh = stepMembers(s, 'werwoelfe').filter(p => p.flags.newWolf).map(p => p.name);
        return fresh.length ? M('info.wolvesNew', { names: stepMembers(s, 'werwoelfe').map(p => p.name), fresh })
                            : M('info.wolves', { names: stepMembers(s, 'werwoelfe').map(p => p.name) });
      }
      case 'urwolf': return M('info.urwolf', { name: name(s, (s.night.sel.werwoelfe || [])[0]) });
      case 'hexe': {
        const t = (s.night.sel.werwoelfe || [])[0];
        return t ? M(s.night.sel.urwolf ? 'info.hexeInfect' : 'info.hexe', { name: name(s, t) }) : M('info.hexeNone');
      }
      case 'weisserwolf': return M('info.white');
      case 'leibwaechter': return s.p.bgLast ? M('info.bg', { name: name(s, s.p.bgLast) }) : null;
    }
    return null;
  }

  /** Result shown right away to the choosing role (Seer & co.). */
  function stepResult(s, id, ids) {
    if (!Array.isArray(ids)) return null;
    const ps = ids.map(x => byId(s, x)).filter(Boolean);
    if (!ps.length) return null;
    const t = ps[0];
    const res = (k, p, good) => ({ k, p, good });
    switch (id) {
      case 'seherin':
        if (s.settings.seerMode === 'role') return res('res.seerRole', { name: t.name, role: t.flags.wolf ? { r: 'werwolf' } : R(t) }, !appearsWolf(t));
        return appearsWolf(t) ? res('res.seerYes', { name: t.name }, false) : res('res.seerNo', { name: t.name }, true);
      case 'wolfsseherin':
        return res('res.wseer', { name: t.name, role: R(t) }, true);
      case 'fuchs': {
        const group = [t.id, ...neighbours(s, t.id)].map(x => byId(s, x));
        const list = group.map(p => p.name);
        return group.some(appearsWolf) ? res('res.foxYes', { list }, false) : res('res.foxNo', { list }, true);
      }
      case 'detektiv': {
        if (ps.length < 2) return null;
        const look = p => p.flags.wolf ? 'wolf' : p.roleId === 'guenstling' ? 'dorf' : role(p).team === 'solo' ? 'solo:' + p.roleId : role(p).team;
        const same = look(ps[0]) === look(ps[1]);
        return res(same ? 'res.detSame' : 'res.detDiff', { a: ps[0].name, b: ps[1].name }, same);
      }
    }
    return null;
  }

  /** Confirm a night step. value: array of ids, true/false or {heal, poison}. */
  function submitStep(s, value) {
    const cur = currentStep(s);
    if (!cur) return;
    const { id } = cur;
    if (cur.status === 'active') {
      s.night.sel[id] = value;
      const res = stepResult(s, id, value);
      if (res) { s.night.results[id] = { k: res.k, p: res.p }; log(s, 'log.stepResult', { step: id, res: { k: res.k, p: res.p } }, true); }
      if (id === 'amor' && Array.isArray(value) && value.length === 2) {
        s.p.lovers = value.slice();
        log(s, 'log.amor', { names: names(s, value) }, true);
      }
      if (id === 'wildeskind' && value && value[0]) {
        s.p.wildModel = value[0];
        log(s, 'log.wildModel', { name: name(s, value[0]) }, true);
      }
      if (id === 'werwoelfe') s.players.forEach(p => { delete p.flags.newWolf; });
      if (id === 'fuchs' && value && value[0]) {
        const group = [value[0], ...neighbours(s, value[0])].map(x => byId(s, x));
        if (!group.some(appearsWolf)) s.p.fuchsActive = false;
      }
    }
    advanceStep(s);
  }

  // ------------------------------------------------- ROLE EFFECTS (night)
  function finishNight(s) {
    const sel = s.night.sel;
    const first = k => (sel[k] || [])[0] || null;
    s.night.idx = s.night.steps.length;
    s.news = { title: M('title.morning', { n: s.round }), lines: [] };
    const deaths = [];
    const die = (id, cause) => { if (id && !deaths.some(d => d[0] === id)) deaths.push([id, cause]); };

    // protection & visits
    const guards = {};
    const guard = (id, r) => { if (id) (guards[id] = guards[id] || []).push({ r }); };
    guard(first('leibwaechter'), 'leibwaechter');
    guard(first('priester'), 'priester');
    const matratze = firstAlive(s, 'dorfmatratze');
    const visit = matratze ? first('dorfmatratze') : null;
    const blocked = id => guards[id] ? M('reason.guarded', { roles: guards[id] }) : (matratze && id === matratze.id && visit ? M('reason.away') : null);
    const hexe = sel.hexe || {};

    // rusty sword from the previous night
    if (s.p.rusty && byId(s, s.p.rusty).alive) die(s.p.rusty, 'ritter');
    s.p.rusty = null;

    // werewolves (+ alpha wolf)
    const wt = first('werwoelfe');
    if (wt) {
      const t = byId(s, wt);
      const infect = sel.urwolf === true;
      if (infect) s.p.urwolfUsed = true;
      let reason = null;
      if (['vampir', 'serienmoerder'].includes(t.roleId)) reason = M('reason.immune', { role: { r: t.roleId } });
      else if (blocked(wt)) reason = blocked(wt);
      else if (t.roleId === 'rotkaeppchen' && hasAliveRole(s, 'jaeger')) reason = M('reason.redhood');
      else if (hexe.heal) reason = M('reason.healed');
      else if (t.flags.extraLife) { t.flags.extraLife = false; reason = M('reason.elder'); }
      if (reason) say(s, 'news.attackFailed', { name: t.name, reason }, true);
      else if (t.roleId === 'verfluchter' && !t.flags.wolf) {
        t.flags.wolf = true; t.flags.newWolf = true;
        say(s, 'news.cursedTurned', { name: t.name }, true);
      } else if (infect) {
        t.flags.wolf = true; t.flags.newWolf = true;
        say(s, 'news.infected', { name: t.name }, true);
      } else {
        die(wt, 'wolf');
        if (visit === wt) die(matratze.id, 'matratze');
      }
    }
    if (hexe.heal) s.p.hexeHeal = false;

    // white werewolf
    const ww = first('weisserwolf');
    if (ww) {
      if (blocked(ww)) say(s, 'news.whiteFailed', { name: name(s, ww), reason: blocked(ww) }, true);
      else die(ww, 'weisserwolf');
    }
    // vampire bite
    const vb = first('vampire');
    if (vb) {
      if (blocked(vb)) say(s, 'news.biteBlocked', { name: name(s, vb), reason: blocked(vb) }, true);
      else if (!deaths.some(d => d[0] === vb)) { byId(s, vb).flags.bitten = true; say(s, 'news.bitten', { name: name(s, vb) }, true); }
    }
    // serial killer
    const sk = first('serienmoerder');
    if (sk) {
      if (blocked(sk)) say(s, 'news.skFailed', { name: name(s, sk), reason: blocked(sk) }, true);
      else { die(sk, 'serienmoerder'); if (visit === sk) die(matratze.id, 'matratze'); }
    }
    // witch's poison (always works)
    if (hexe.poison) { die(hexe.poison, 'gift'); s.p.hexePoison = false; }

    // lasting night effects
    s.p.bgLast = first('leibwaechter');
    s.p.raven = first('rabe');

    if (deaths.length) deaths.forEach(([id, cause]) => kill(s, id, cause));
    else say(s, 'news.nobodyDied');
    if (s.p.rustyPending) { s.p.rusty = s.p.rustyPending; s.p.rustyPending = null; }

    const bear = firstAlive(s, 'baerenfuehrer');
    if (bear) say(s, neighbours(s, bear.id).some(id => appearsWolf(byId(s, id))) ? 'news.bearGrowl' : 'news.bearQuiet');
    if (s.p.raven && byId(s, s.p.raven).alive) say(s, 'news.raven', { name: name(s, s.p.raven) });

    s.phase = 'day';
    s.after = 'morning';
    continueFlow(s);
  }

  // ------------------------------------------------------------- Death & consequences
  // Icon per cause of death; the texts live in i18n.js (cause.<id>.pub / .sec).
  const CAUSE = {
    wolf: '🐺', gift: '🧪', vampir: '🦇', serienmoerder: '🔪', weisserwolf: '🤍', matratze: '💃',
    ritter: '⚔️', liebe: '💔', jaeger: '🏹', akw: '☢️', lynch: '⚖️', spielleitung: '✋'
  };
  const PUBLIC_CAUSES = ['liebe', 'jaeger', 'akw', 'lynch', 'spielleitung', 'vampir'];

  function kill(s, id, cause) {
    const p = byId(s, id);
    if (!p || !p.alive) return false;
    p.alive = false; p.deathCause = cause; p.deathLabel = phaseMsg(s); p.flags.bitten = false;
    const emo = CAUSE[cause] || '☠️';
    const isPublic = PUBLIC_CAUSES.includes(cause);
    const showRole = s.settings.revealRoles && !p.flags.roleHidden;
    // publicly only a neutral icon if the cause must stay secret
    say(s, 'news.death', { emo: isPublic ? emo : '🪦', name: p.name, cause: M(`cause.${isPublic ? cause : 'night'}.pub`), role: showRole ? R(p) : null });
    if (!isPublic) log(s, 'log.deathCause', { emo, name: p.name, cause: M(`cause.${cause}.sec`) }, true);
    if (p.flags.roleHidden) say(s, 'news.roleHidden', { name: p.name, role: R(p) }, true);

    // angel
    if (p.roleId === 'engel' && s.round === 1 && !s.engelWin) s.engelWin = p.id;
    // knight
    if (p.roleId === 'ritter' && cause === 'wolf') {
      const victim = nextWolfClockwise(s, p.id);
      if (victim) { s.p.rustyPending = victim; say(s, 'news.rusty', { name: name(s, victim) }, true); }
    }
    // wild child
    if (s.p.wildModel === p.id) {
      const child = firstAlive(s, 'wildeskind');
      if (child && !child.flags.wolf) { child.flags.wolf = true; child.flags.newWolf = true; say(s, 'news.wildTurned', { name: child.name }, true); }
    }
    // mayor
    if (s.p.mayor === p.id) { s.p.mayor = null; if (alive(s).length) s.queue.push({ type: 'mayor', pid: p.id }); }
    // hunter & nuclear plant
    if (p.roleId === 'jaeger' && alive(s).length) s.queue.push({ type: 'jaeger', pid: p.id });
    if (p.roleId === 'akw' && alive(s).length) s.queue.push({ type: 'akw', pid: p.id, suggest: neighbours(s, p.id) });
    // lovers
    if (s.p.lovers.includes(p.id)) {
      const other = s.p.lovers.find(x => x !== p.id);
      if (other) kill(s, other, 'liebe');
    }
    return true;
  }

  /** Works through pending consequences (hunter, nuclear plant, mayor), then checks for a win. */
  function continueFlow(s) {
    if (s.engelWin) return endGame(s, { team: 'engel', emo: '😇', title: M('win.engel.title'), text: M('win.engel.text', { name: name(s, s.engelWin) }), ids: [s.engelWin] });
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
      else say(s, 'news.hunterNoShot', { name: who });
    } else if (it.type === 'akw') {
      const ids = (value || []).slice(0, 2);
      if (ids.length) { say(s, 'news.akwBoom', { name: who }); ids.forEach(x => kill(s, x, 'akw')); }
      else say(s, 'news.akwStable', { name: who });
    } else if (it.type === 'mayor') {
      if (value && byId(s, value).alive) { s.p.mayor = value; say(s, 'news.mayorPass', { name: who, to: name(s, value) }); }
      else say(s, 'news.mayorNone');
    }
    continueFlow(s);
  }

  // ------------------------------------------------------------------ Win
  function checkWin(s) {
    const living = alive(s);
    const all = s.players;
    const members = t => all.filter(p => team(s, p) === t).map(p => p.id);
    if (!living.length) return { team: 'niemand', emo: '🪦', title: M('win.niemand.title'), text: M('win.niemand.text'), ids: [] };
    const teams = living.map(p => team(s, p));
    const count = t => teams.filter(x => x === t).length;
    const solos = living.filter(p => team(s, p) === 'solo');
    const mixedLovers = count('liebende') > 0;
    const helperOf = p => p.roleId === 'guenstling';

    if (mixedLovers && living.length === 2 && count('liebende') === 2)
      return { team: 'liebende', emo: '💞', title: M('win.liebende.title'), text: M('win.liebende.text', { names: names(s, s.p.lovers) }), ids: s.p.lovers.slice() };
    if (living.length === 1 && solos.length === 1)
      return { team: 'solo', emo: role(solos[0]).emoji, title: M('win.solo.title', { role: { r: solos[0].roleId } }), text: M('win.solo.text', { name: solos[0].name }), ids: [solos[0].id] };

    const wolves = living.filter(p => team(s, p) === 'wolf' && !helperOf(p)).length;
    const vamps = living.filter(p => team(s, p) === 'vampir' && !helperOf(p)).length;
    if (!wolves && !vamps && !solos.length && !mixedLovers)
      return { team: 'dorf', emo: '🏡', title: M('win.dorf.title'), text: M('win.dorf.text'), ids: members('dorf') };

    const evilWin = (t, n, emo) => {
      if (!n) return null;
      const helpers = living.filter(p => helperOf(p) && team(s, p) === t).length;
      const others = living.length - n - helpers;
      const otherThreat = (t === 'wolf' ? vamps : wolves) + solos.length + (mixedLovers ? 1 : 0);
      if (!otherThreat && (others === 0 || (s.settings.wolvesParity && n + helpers >= others)))
        return { team: t, emo, title: M(`win.${t}.title`), text: M(`win.${t}.text`), ids: members(t) };
      return null;
    };
    return evilWin('wolf', wolves, '🐺') || evilWin('vampir', vamps, '🧛') || null;
  }

  function endGame(s, win) {
    s.winner = win;
    s.queue = [];
    s.screen = 'over';
    s.phase = 'over';
    log(s, 'log.gameEnd', { title: win.title, text: win.text });
  }

  // ------------------------------------------------------------------ Day
  function toDay(s) {
    s.phase = 'day';
    s.day = { mode: 'talk', votes: {}, ballots: {}, protectedId: null, mayorVote: null, voteNo: 1, tied: null, pendingLynch: null, cleanerActive: false };
    s.screen = (s.settings.mayor && !s.p.mayor && s.round === 1) ? 'mayor' : 'day';
    log(s, 'log.dayStart', { n: s.round });
  }

  function electMayor(s, id) {
    if (id) { s.p.mayor = id; log(s, 'log.mayor', { name: name(s, id) }); }
    s.screen = 'day';
  }

  function blumenkindProtect(s, id) {
    s.p.blumenkindUsed = true;
    s.day.protectedId = id;
    log(s, 'log.blumen', { name: name(s, id) });
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

  /** Start the vote (also sets the order for the secret pass-around vote). */
  function startVote(s) {
    s.day.mode = 'vote';
    s.day.votes = {}; s.day.ballots = {}; s.day.mayorVote = null;
    s.day.voterList = voters(s); s.day.passIdx = 0; s.day.passStage = 'hand';
  }
  /** Who may vote (for the secret pass-around vote). */
  function voters(s) {
    return alive(s).filter(p => !p.flags.noVote).map(p => p.id);
  }
  /** Cast a secret ballot (pass-around mode). */
  function castBallot(s, voterId, targetId) {
    s.day.ballots[voterId] = targetId || null;
  }
  /** Turn secret ballots into the vote count. */
  function tallyBallots(s) {
    s.day.votes = {}; s.day.mayorVote = null;
    for (const [voter, target] of Object.entries(s.day.ballots)) {
      if (!target) continue;
      s.day.votes[target] = (s.day.votes[target] || 0) + 1;
      if (voter === s.p.mayor) s.day.mayorVote = target;
    }
  }

  function resolveVote(s) {
    const t = voteTotals(s);
    const max = Math.max(0, ...Object.values(t));
    if (max <= 0) return noLynch(s, M('news.noVotes'));
    const tied = Object.keys(t).filter(id => t[id] === max);
    if (tied.length === 1) return lynch(s, tied[0]);
    const goat = firstAlive(s, 'suendenbock');
    if (goat && goat.id !== s.day.protectedId) { log(s, 'log.goat', { names: names(s, tied) }); return lynch(s, goat.id); }
    if (s.p.mayor && byId(s, s.p.mayor).alive) { s.day.tied = tied; s.screen = 'tie'; return; }
    return noLynch(s, M('news.tieNone', { names: names(s, tied) }));
  }

  function lynch(s, id) {
    const t = byId(s, id);
    s.day.tied = null;
    if (t.roleId === 'dorfdepp' && !t.flags.noVote) {
      t.flags.noVote = true;
      s.news = { title: M('title.verdict'), lines: [] };
      say(s, 'news.dorfdepp', { name: t.name });
      s.after = 'afterLynch';
      return continueFlow(s);
    }
    const cleaner = firstAlive(s, 'reinigungskraft');
    const active = !!(cleaner && !s.p.cleanerUsed && cleaner.id !== id);
    // Without a game master the cleaner is also asked for show, otherwise her death would be obvious.
    const fake = !active && s.settings.mode === 'auto' && s.settings.callDeadRoles && s.p.rolesInGame.includes('reinigungskraft');
    if (s.settings.revealRoles && (active || fake)) {
      s.day.pendingLynch = id;
      s.day.cleanerActive = active;
      s.screen = 'cleaner';
      return;
    }
    doLynch(s, id);
  }

  function cleanerDecide(s, hide) {
    const id = s.day.pendingLynch;
    s.day.pendingLynch = null;
    if (hide && s.day.cleanerActive) { s.p.cleanerUsed = true; byId(s, id).flags.roleHidden = true; }
    doLynch(s, id);
  }

  function doLynch(s, id) {
    s.news = { title: M('title.verdict'), lines: [] };
    kill(s, id, 'lynch');
    s.after = 'afterLynch';
    continueFlow(s);
  }

  function noLynch(s, msg) {
    s.day.tied = null;
    s.news = { title: M('title.verdict'), lines: [] };
    msg = msg || M('news.spare');
    say(s, msg.k, msg.p);
    s.after = 'afterLynch';
    continueFlow(s);
  }

  function richterSecondVote(s) {
    s.p.richterUsed = true;
    s.day.votes = {}; s.day.ballots = {}; s.day.mayorVote = null; s.day.voteNo += 1; s.day.mode = 'vote';
    startVote(s);
    s.screen = 'day';
    log(s, 'log.richter');
  }

  function endDay(s) {
    s.news = { title: M('title.evening', { n: s.round }), lines: [] };
    const bitten = alive(s).filter(p => p.flags.bitten);
    s.p.raven = null;
    bitten.forEach(p => kill(s, p.id, 'vampir'));
    s.after = bitten.length ? 'dusk' : 'startNight';
    continueFlow(s);
  }

  // ------------------------------------------------------------ Game master
  function gmKill(s, id) {
    const back = s.screen;
    if (!['morning', 'afterLynch', 'dusk', 'interrupt'].includes(back)) s.news = { title: M('title.gm'), lines: [] };
    kill(s, id, 'spielleitung');
    if (back !== 'interrupt') s.after = back;
    continueFlow(s);
  }
  function gmRevive(s, id) {
    const p = byId(s, id);
    if (!p || p.alive) return;
    p.alive = true; p.deathCause = null; p.deathLabel = null;
    log(s, 'log.revive', { name: p.name }, true);
  }
  /** Leave no-game-master mode: a (dead) player takes over. */
  function takeOverAsGM(s) {
    s.settings.mode = 'gm';
    log(s, 'log.takeover');
  }

  const API = {
    ROLE, STEP, TEAMS, DEFAULT_SETTINGS, KILLER_ROLES,
    byId, role, alive, name, names, team, neighbours, phaseMsg, isWolfish, appearsWolf, loversMixed, R,
    validateSetup, suggestRoles, balance, balanceParts, createGame, shuffle,
    startNight, currentStep, stepResult, submitStep, stepStatus,
    interruptTargets, resolveInterrupt, continueFlow, checkWin,
    toDay, electMayor, blumenkindProtect, voteCandidates, voteTotals, voters, startVote, castBallot, tallyBallots, resolveVote, lynch, cleanerDecide, noLynch, richterSecondVote, endDay,
    gmKill, gmRevive, takeOverAsGM
  };
  global.WW = API;
  if (typeof module !== 'undefined') module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : window);
