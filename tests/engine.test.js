/* Automatische Tests der Spiel-Engine.  Ausführen:  node tests/engine.test.js
   1) Gezielte Szenarien (u. a. alle Fehler aus Version 1)
   2) Tausende Zufallsspiele mit zufälligen Rollen und Entscheidungen        */
'use strict';
require('../js/roles.js');
const W = require('../js/engine.js');

let failed = 0, passed = 0;
function check(label, cond, extra) {
  if (cond) passed++;
  else { failed++; console.log('✗', label, extra !== undefined ? JSON.stringify(extra) : ''); }
}

/** Spiel mit fester Rollenzuteilung anlegen: {Name: rolleId} in Sitzreihenfolge. */
function game(map, settings) {
  const namesList = Object.keys(map);
  const counts = {};
  Object.values(map).forEach(r => { counts[r] = (counts[r] || 0) + 1; });
  const s = W.createGame(namesList, counts, settings);
  s.players.forEach((p, i) => { p.roleId = map[namesList[i]]; p.flags = p.roleId === 'aeltester' ? { extraLife: true } : {}; });
  s.p.rolesInGame = [...new Set(Object.values(map))];
  s.p.guenstlingTeam = 'wolf';
  return s;
}
const id = (s, n) => s.players.find(p => p.name === n).id;
const isAlive = (s, n) => s.players.find(p => p.name === n).alive;

/** Nacht mit Entscheidungen durchspielen: {stepId: [Namen] | true | {heal, poison:Name}} */
function night(s, choices = {}) {
  if (s.screen !== 'night') W.startNight(s);
  let guard = 0;
  while (s.screen === 'night' && guard++ < 50) {
    const cur = W.currentStep(s);
    const c = choices[cur.id];
    let v = null;
    if (cur.def.kind === 'pick') v = (c || []).map(n => id(s, n));
    else if (cur.def.kind === 'yesno') v = !!c;
    else if (cur.def.kind === 'hexe') v = { heal: !!(c && c.heal), poison: c && c.poison ? id(s, c.poison) : null };
    W.submitStep(s, v);
  }
}
function resolveAll(s, picks = []) {
  let guard = 0;
  while (s.screen === 'interrupt' && guard++ < 20) {
    const it = s.queue[0];
    const v = picks.shift();
    W.resolveInterrupt(s, it.type === 'akw' ? (v || []).map(n => id(s, n)) : (v ? id(s, v) : null));
  }
}
function lynchByName(s, n) { s.round = Math.max(1, s.round); W.toDay(s); if (s.screen === 'mayor') W.electMayor(s, null); W.lynch(s, id(s, n)); }

// ======================================================= Szenarien
(function scenarios() {
  let s;

  // V1-Bug 6: Sieg in der Nacht beendet das Spiel sauber
  s = game({ A: 'werwolf', B: 'werwolf', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner' });
  night(s, { werwoelfe: ['C'] });
  check('Nacht-Sieg der Werwölfe bei Gleichstand', s.screen === 'over' && s.winner.team === 'wolf', s.screen);

  // V1-Bug 3: Amor verändert keine fremden Rollen; Wölfe können sich nicht gegenseitig wählen
  s = game({ A: 'werwolf', B: 'werwolf', C: 'amor', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner', G: 'dorfbewohner' });
  W.startNight(s);
  W.submitStep(s, [id(s, 'A'), id(s, 'D')]); // Amor
  check('Liebende-Schritt folgt', W.currentStep(s).id === 'liebende');
  W.submitStep(s, null);
  const ws = W.currentStep(s);
  check('Wolf-Ziele ohne Wölfe', ws.id === 'werwoelfe' && !ws.targets.includes(id(s, 'B')) && !ws.targets.includes(id(s, 'A')), ws.targets);
  check('Gemischte Liebende erkannt', W.loversMixed(s));
  check('Rolle Werwolf unverändert', W.ROLE.werwolf.team === 'wolf');

  // V1-Bug 4: Leibwächter darf nicht zweimal hintereinander dieselbe Person schützen; Priester überschreibt nichts
  s = game({ A: 'werwolf', B: 'leibwaechter', C: 'priester', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner' });
  night(s, { leibwaechter: ['D'], werwoelfe: ['D'] }); // Priester überspringt
  check('Leibwächter rettet trotz Priester-Skip', isAlive(s, 'D'));
  W.toDay(s); W.electMayor(s, null); W.noLynch(s); W.endDay(s);
  const lw = W.currentStep(s);
  check('Leibwächter-Sperre aktiv', lw.id === 'leibwaechter' && !lw.targets.includes(id(s, 'D')), lw.targets);

  // V1-Bug 5: Verfluchter wird wirklich Werwolf
  s = game({ A: 'werwolf', B: 'verfluchter', C: 'seherin', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner' });
  night(s, { werwoelfe: ['B'] });
  check('Verfluchter lebt & ist Wolf', isAlive(s, 'B') && s.players[1].flags.wolf);
  check('Seherin sieht verwandelten Verfluchten als Wolf', W.stepResult(s, 'seherin', [id(s, 'B')]).good === false);

  // V1-Bug 7: Jäger stirbt nachts → Schuss, danach normaler Tag (Bürgermeisterwahl!)
  s = game({ A: 'werwolf', B: 'werwolf', C: 'jaeger', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner', G: 'dorfbewohner' });
  night(s, { werwoelfe: ['C'] });
  check('Jäger-Unterbrechung', s.screen === 'interrupt' && s.queue[0].type === 'jaeger');
  resolveAll(s, ['A']);
  check('Nach Schuss: Morgen statt Tagesende', s.screen === 'morning' && !isAlive(s, 'A'), s.screen);
  W.toDay(s);
  check('Bürgermeisterwahl findet statt', s.screen === 'mayor');

  // V1-Bug 8: Jäger erschießt Jäger → beide Schüsse
  s = game({ A: 'werwolf', B: 'werwolf', C: 'jaeger', D: 'jaeger', E: 'dorfbewohner', F: 'dorfbewohner', G: 'dorfbewohner', H: 'dorfbewohner' });
  lynchByName(s, 'C');
  resolveAll(s, ['D', 'A']);
  check('Kettenschuss Jäger→Jäger→Wolf', !isAlive(s, 'D') && !isAlive(s, 'A') && s.screen === 'afterLynch', s.screen);

  // V1-Bug 9: Gebissener Jäger schießt am Abend
  s = game({ A: 'vampir', B: 'jaeger', C: 'werwolf', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner', G: 'dorfbewohner' });
  night(s, { vampire: ['B'], werwoelfe: ['D'] });
  W.toDay(s); W.electMayor(s, null); W.noLynch(s); W.endDay(s);
  check('Gebissener Jäger: Abendschuss', s.screen === 'interrupt' && s.queue[0].type === 'jaeger', s.screen);
  resolveAll(s, ['C']);
  check('Danach Abend-Bildschirm', s.screen === 'dusk', s.screen);

  // V1-Bug 10: kein Sieg, solange der Jäger noch schießen darf
  s = game({ A: 'werwolf', B: 'jaeger', C: 'dorfbewohner' });
  lynchByName(s, 'B');
  check('Kein vorzeitiger Wolfsieg', s.screen === 'interrupt');
  resolveAll(s, ['A']);
  check('Jäger rettet das Dorf', s.winner && s.winner.team === 'dorf');

  // V1-Bug 11: Liebende im selben Lager blockieren keinen Dorfsieg
  s = game({ A: 'werwolf', B: 'amor', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner' });
  W.startNight(s); W.submitStep(s, [id(s, 'C'), id(s, 'D')]); W.submitStep(s, null); W.submitStep(s, [id(s, 'E')]);
  lynchByName(s, 'A');
  check('Dorf gewinnt trotz Liebespaar', s.winner && s.winner.team === 'dorf');

  // Gemischte Liebende gewinnen zu zweit
  s = game({ A: 'werwolf', B: 'amor', C: 'dorfbewohner', D: 'dorfbewohner' }, { wolvesParity: false });
  W.startNight(s); W.submitStep(s, [id(s, 'A'), id(s, 'C')]); W.submitStep(s, null); W.submitStep(s, [id(s, 'B')]);
  check('Liebende: noch kein Sieg', !s.winner, s.winner);
  lynchByName(s, 'D');
  check('Liebende gewinnen', s.winner && s.winner.team === 'liebende', s.winner);

  // V1-Bug 1: Blumenkind & Reinigungskraft funktionieren
  s = game({ A: 'werwolf', B: 'blumenkind', C: 'reinigungskraft', D: 'dorfbewohner', E: 'dorfbewohner', F: 'werwolf', G: 'dorfbewohner' });
  W.toDay(s); W.electMayor(s, null);
  W.blumenkindProtect(s, id(s, 'D'));
  check('Blumenkind schützt', !W.voteCandidates(s).includes(id(s, 'D')));
  W.lynch(s, id(s, 'A'));
  check('Reinigungskraft wird gefragt', s.screen === 'cleaner');
  W.cleanerDecide(s, true);
  check('Rolle verborgen', s.players[0].flags.roleHidden && s.news.lines.some(l => !l.secret && !l.text.includes('Rolle:')));

  // Dorfdepp überlebt Lynch
  s = game({ A: 'werwolf', B: 'dorfdepp', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner' });
  lynchByName(s, 'B');
  check('Dorfdepp überlebt', isAlive(s, 'B') && s.players[1].flags.noVote);

  // Sündenbock bei Gleichstand
  s = game({ A: 'werwolf', B: 'suendenbock', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'werwolf' });
  W.toDay(s); W.electMayor(s, null); s.day.votes[id(s, 'A')] = 2; s.day.votes[id(s, 'C')] = 2; W.resolveVote(s);
  check('Sündenbock stirbt bei Gleichstand', !isAlive(s, 'B'));

  // Bürgermeister entscheidet Gleichstand
  s = game({ A: 'werwolf', B: 'dorfbewohner', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'werwolf' });
  W.toDay(s); W.electMayor(s, id(s, 'B')); s.day.votes[id(s, 'A')] = 2; s.day.votes[id(s, 'C')] = 2; W.resolveVote(s);
  check('Gleichstand → Bürgermeister', s.screen === 'tie');

  // Bürgermeister-Nachfolge
  s = game({ A: 'werwolf', B: 'dorfbewohner', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'werwolf' });
  W.toDay(s); W.electMayor(s, id(s, 'B')); W.lynch(s, id(s, 'B'));
  check('Nachfolge wird gefragt', s.screen === 'interrupt' && s.queue[0].type === 'mayor');
  resolveAll(s, ['C']);
  check('Neuer Bürgermeister', s.p.mayor === id(s, 'C'));

  // Ritter mit rostigem Schwert
  s = game({ A: 'ritter', B: 'werwolf', C: 'dorfbewohner', D: 'werwolf', E: 'dorfbewohner', F: 'dorfbewohner', G: 'dorfbewohner', H: 'dorfbewohner' });
  night(s, { werwoelfe: ['A'] });
  W.toDay(s); W.electMayor(s, null); W.noLynch(s); W.endDay(s);
  night(s, { werwoelfe: ['C'] });
  check('Rostiges Schwert tötet nächsten Wolf links', !isAlive(s, 'B') && isAlive(s, 'D'));

  // Ältester übersteht ersten Angriff
  s = game({ A: 'werwolf', B: 'aeltester', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner' });
  night(s, { werwoelfe: ['B'] });
  check('Ältester lebt nach 1. Angriff', isAlive(s, 'B'));
  W.toDay(s); W.electMayor(s, null); W.noLynch(s); W.endDay(s);
  night(s, { werwoelfe: ['B'] });
  check('Ältester stirbt beim 2. Angriff', !isAlive(s, 'B'));

  // Hexe: heilen + vergiften in einer Nacht
  s = game({ A: 'werwolf', B: 'hexe', C: 'dorfbewohner', D: 'dorfbewohner', E: 'werwolf', F: 'dorfbewohner', G: 'dorfbewohner' });
  night(s, { werwoelfe: ['C'], hexe: { heal: true, poison: 'A' } });
  check('Hexe heilt und vergiftet', isAlive(s, 'C') && !isAlive(s, 'A') && !s.p.hexeHeal && !s.p.hexePoison);

  // Dorfmatratze
  s = game({ A: 'werwolf', B: 'dorfmatratze', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner', G: 'werwolf' });
  night(s, { dorfmatratze: ['C'], werwoelfe: ['C'] });
  check('Matratze stirbt mit Gastgeber', !isAlive(s, 'B') && !isAlive(s, 'C'));
  s = game({ A: 'werwolf', B: 'dorfmatratze', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner' });
  night(s, { dorfmatratze: ['C'], werwoelfe: ['B'] });
  check('Matratze nicht zu Hause', isAlive(s, 'B'));

  // Urwolf infiziert
  s = game({ A: 'urwolf', B: 'dorfbewohner', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner' });
  night(s, { werwoelfe: ['B'], urwolf: true });
  check('Infiziert statt getötet', isAlive(s, 'B') && s.players[1].flags.wolf && s.p.urwolfUsed);

  // Wildes Kind wird Wolf
  s = game({ A: 'werwolf', B: 'wildeskind', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner' });
  night(s, { wildeskind: ['C'], werwoelfe: ['C'] });
  check('Wildes Kind verwandelt', s.players[1].flags.wolf);

  // Engel stirbt am ersten Tag
  s = game({ A: 'werwolf', B: 'engel', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner' });
  lynchByName(s, 'B');
  check('Engel gewinnt', s.winner && s.winner.team === 'engel');

  // Weißer Werwolf als letzter
  s = game({ A: 'weisserwolf', B: 'werwolf', C: 'dorfbewohner' }, { wolvesParity: false });
  night(s, { werwoelfe: ['C'] });
  check('Weißer W. + Wolf: noch kein Sieg', !s.winner, s.winner);
  W.toDay(s); W.electMayor(s, null); W.noLynch(s); W.endDay(s);
  night(s, { weisserwolf: ['B'] });
  check('Weißer Werwolf gewinnt allein', s.winner && s.winner.team === 'solo', s.winner);

  // AKW
  s = game({ A: 'werwolf', B: 'akw', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner', G: 'werwolf' });
  lynchByName(s, 'B');
  check('AKW-Unterbrechung mit Nachbarn', s.screen === 'interrupt' && s.queue[0].suggest.length === 2, s.queue[0]);
  resolveAll(s, [['C', 'D']]);
  check('AKW tötet zwei', !isAlive(s, 'C') && !isAlive(s, 'D'));

  // Bär
  s = game({ A: 'dorfbewohner', B: 'baerenfuehrer', C: 'werwolf', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner' });
  night(s, { werwoelfe: ['E'] });
  check('Bär brummt', s.news.lines.some(l => l.text.includes('brummt')));

  // Rabe
  s = game({ A: 'werwolf', B: 'rabe', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner' });
  night(s, { rabe: ['C'], werwoelfe: ['D'] });
  W.toDay(s); W.electMayor(s, null);
  check('Rabe +2', W.voteTotals(s)[id(s, 'C')] === 2);

  // Tote Rollen werden zum Schein aufgerufen
  s = game({ A: 'werwolf', B: 'seherin', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'werwolf', G: 'dorfbewohner' });
  lynchByName(s, 'B'); W.endDay(s);
  check('Tote Seherin: Schein-Aufruf', W.currentStep(s).id === 'seherin' && W.currentStep(s).status === 'fake');
})();

// ======================================================= Zufallsspiele
(function fuzz() {
  const ids = W.ROLE ? Object.keys(W.ROLE) : [];
  const rnd = n => Math.floor(Math.random() * n);
  const pick = a => a[rnd(a.length)];
  let games = 0, endings = {}, stuck = 0, errors = 0;
  for (let g = 0; g < 4000; g++) {
    const n = 5 + rnd(12);
    let counts;
    if (g % 3 === 0) counts = W.suggestRoles(n);
    else {
      counts = {};
      const killer = pick(W.KILLER_ROLES); counts[killer] = 1;
      let left = n - 1;
      while (left > 0) {
        const r = pick(ids);
        const max = W.ROLE[r].max || 1;
        if ((counts[r] || 0) < max) { counts[r] = (counts[r] || 0) + 1; left--; }
      }
    }
    const settings = { wolvesParity: Math.random() < .5, callDeadRoles: Math.random() < .5, seerMode: pick(['team', 'role']), revealRoles: Math.random() < .8 };
    const s = W.createGame(Array.from({ length: n }, (_, i) => 'S' + i), counts, settings);
    try {
      let steps = 0;
      W.startNight(s);
      while (s.screen !== 'over' && steps++ < 2000) {
        switch (s.screen) {
          case 'night': {
            const cur = W.currentStep(s);
            let v = null;
            if (cur.status === 'active') {
              if (cur.def.kind === 'pick') {
                const t = W.shuffle(cur.targets).slice(0, cur.def.count);
                v = Math.random() < .15 ? [] : t;
              } else if (cur.def.kind === 'yesno') v = Math.random() < .5;
              else if (cur.def.kind === 'hexe') {
                const victim = (s.night.sel.werwoelfe || [])[0];
                const hexeIds = cur.actors;
                const poisonable = W.alive(s).filter(p => !hexeIds.includes(p.id)).map(p => p.id);
                v = { heal: !!victim && s.p.hexeHeal && Math.random() < .4, poison: s.p.hexePoison && Math.random() < .3 ? pick(poisonable) : null };
              }
            }
            W.submitStep(s, v);
            break;
          }
          case 'interrupt': {
            const it = s.queue[0];
            const t = W.interruptTargets(s);
            if (it.type === 'akw') W.resolveInterrupt(s, W.shuffle(t).slice(0, rnd(3)));
            else W.resolveInterrupt(s, t.length && Math.random() < .9 ? pick(t) : null);
            break;
          }
          case 'morning': W.toDay(s); break;
          case 'mayor': W.electMayor(s, pick(W.alive(s)).id); break;
          case 'day': {
            if (s.p.rolesInGame.includes('blumenkind') && !s.p.blumenkindUsed && W.alive(s).some(p => p.roleId === 'blumenkind') && Math.random() < .3) W.blumenkindProtect(s, pick(W.alive(s)).id);
            const c = W.voteCandidates(s);
            c.forEach(x => { s.day.votes[x] = rnd(3); });
            if (Math.random() < .3 && s.p.mayor) s.day.mayorVote = pick(c);
            W.resolveVote(s);
            break;
          }
          case 'tie': W.lynch(s, pick(s.day.tied)); break;
          case 'cleaner': W.cleanerDecide(s, Math.random() < .5); break;
          case 'afterLynch':
            if (W.alive(s).some(p => p.roleId === 'richter') && !s.p.richterUsed && Math.random() < .3) W.richterSecondVote(s);
            else W.endDay(s);
            break;
          case 'dusk': W.startNight(s); break;
          default: throw new Error('Unbekannter Bildschirm ' + s.screen);
        }
        // Invarianten
        if (s.players.some(p => !p.alive && p.flags.bitten)) throw new Error('Toter ist gebissen');
        if (s.p.mayor && !s.players.find(p => p.id === s.p.mayor).alive) throw new Error('Toter Bürgermeister');
        if (s.p.lovers.length === 2 && s.screen !== 'interrupt') {
          const [a, b] = s.p.lovers.map(x => s.players.find(p => p.id === x));
          if (a.alive !== b.alive) throw new Error('Nur ein Liebender lebt');
        }
      }
      if (s.screen !== 'over') { stuck++; if (stuck < 4) console.log('hängt', s.screen, s.round, JSON.stringify(counts)); }
      else {
        endings[s.winner.team] = (endings[s.winner.team] || 0) + 1;
        // Siegerprüfung: Dorf gewinnt nie mit lebendem Wolf
        if (s.winner.team === 'dorf' && W.alive(s).some(p => W.team(s, p) === 'wolf' && p.roleId !== 'guenstling')) throw new Error('Dorfsieg mit lebendem Wolf');
      }
      games++;
    } catch (e) {
      errors++;
      if (errors < 5) console.log('FEHLER', e.stack.split('\n').slice(0, 3).join(' | '), JSON.stringify(counts));
    }
  }
  check('Zufallsspiele ohne Fehler', errors === 0, errors);
  check('Zufallsspiele enden alle', stuck === 0, stuck);
  console.log(`Zufallsspiele: ${games}, Enden:`, endings);
})();

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen`);
process.exit(failed ? 1 : 0);
