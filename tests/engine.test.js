/* Automated tests for the game engine.  Run:  node tests/engine.test.js
   1) Targeted scenarios (including every bug found in version 1)
   2) Thousands of random games with random roles and decisions            */
'use strict';
require('../js/roles.js');
const W = require('../js/engine.js');
const I = require('../js/i18n.js');

let failed = 0, passed = 0;
function check(label, cond, extra) {
  if (cond) passed++;
  else { failed++; console.log('✗', label, extra !== undefined ? JSON.stringify(extra) : ''); }
}

/** Create a game with fixed roles: {name: roleId} in seating order. */
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

/** Play a night with decisions: {stepId: [names] | true | {heal, poison: name}} */
function night(s, choices = {}) {
  if (s.screen !== 'night') W.startNight(s);
  let guard = 0;
  while (s.screen === 'night' && guard++ < 50) {
    const cur = W.currentStep(s);
    const c = choices[cur.id];
    let v = null;
    if (cur.def.kind === 'pick') v = (c || []).map(n => id(s, n));
    else if (cur.def.kind === 'draw') v = c || null;
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

// ======================================================= Scenarios
(function scenarios() {
  let s;

  // v1 bug 6: a win during the night ends the game cleanly
  s = game({ A: 'werwolf', B: 'werwolf', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner' });
  night(s, { werwoelfe: ['C'] });
  check('Werewolves win at night on parity', s.screen === 'over' && s.winner.team === 'wolf', s.screen);

  // v1 bug 3: Cupid changes no other roles; wolves cannot target each other
  s = game({ A: 'werwolf', B: 'werwolf', C: 'amor', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner', G: 'dorfbewohner' });
  W.startNight(s);
  W.submitStep(s, [id(s, 'A'), id(s, 'D')]); // Amor
  check('Lovers step follows', W.currentStep(s).id === 'liebende');
  W.submitStep(s, null);
  const ws = W.currentStep(s);
  check('Wolf targets exclude wolves', ws.id === 'werwoelfe' && !ws.targets.includes(id(s, 'B')) && !ws.targets.includes(id(s, 'A')), ws.targets);
  check('Mixed lovers detected', W.loversMixed(s));
  check('Werewolf role unchanged', W.ROLE.werwolf.team === 'wolf');

  // v1 bug 4: the bodyguard cannot protect the same person twice in a row; the priest overwrites nothing
  s = game({ A: 'werwolf', B: 'leibwaechter', C: 'priester', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner' });
  night(s, { leibwaechter: ['D'], werwoelfe: ['D'] }); // priest skips
  check('Bodyguard saves despite priest skip', isAlive(s, 'D'));
  W.toDay(s); W.electMayor(s, null); W.noLynch(s); W.endDay(s);
  const lw = W.currentStep(s);
  check('Bodyguard repeat block active', lw.id === 'leibwaechter' && !lw.targets.includes(id(s, 'D')), lw.targets);

  // v1 bug 5: the cursed really turns into a werewolf
  s = game({ A: 'werwolf', B: 'verfluchter', C: 'seherin', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner' });
  night(s, { werwoelfe: ['B'] });
  check('Cursed survives & is a wolf', isAlive(s, 'B') && s.players[1].flags.wolf);
  check('Seer sees the turned cursed as a wolf', W.stepResult(s, 'seherin', [id(s, 'B')]).good === false);

  // v1 bug 7: hunter dies at night → shot, then a normal day (mayor election!)
  s = game({ A: 'werwolf', B: 'werwolf', C: 'jaeger', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner', G: 'dorfbewohner' });
  night(s, { werwoelfe: ['C'] });
  check('Hunter interrupt', s.screen === 'interrupt' && s.queue[0].type === 'jaeger');
  resolveAll(s, ['A']);
  check('After the shot: morning instead of end of day', s.screen === 'morning' && !isAlive(s, 'A'), s.screen);
  W.toDay(s);
  check('Mayor election happens', s.screen === 'mayor');

  // v1 bug 8: hunter shoots hunter → both shots happen
  s = game({ A: 'werwolf', B: 'werwolf', C: 'jaeger', D: 'jaeger', E: 'dorfbewohner', F: 'dorfbewohner', G: 'dorfbewohner', H: 'dorfbewohner' });
  lynchByName(s, 'C');
  resolveAll(s, ['D', 'A']);
  check('Chain shot hunter→hunter→wolf', !isAlive(s, 'D') && !isAlive(s, 'A') && s.screen === 'afterLynch', s.screen);

  // v1 bug 9: a bitten hunter shoots in the evening
  s = game({ A: 'vampir', B: 'jaeger', C: 'werwolf', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner', G: 'dorfbewohner' });
  night(s, { vampire: ['B'], werwoelfe: ['D'] });
  W.toDay(s); W.electMayor(s, null); W.noLynch(s); W.endDay(s);
  check('Bitten hunter: evening shot', s.screen === 'interrupt' && s.queue[0].type === 'jaeger', s.screen);
  resolveAll(s, ['C']);
  check('Then the evening screen', s.screen === 'dusk', s.screen);

  // v1 bug 10: no win while the hunter may still shoot
  s = game({ A: 'werwolf', B: 'jaeger', C: 'dorfbewohner' });
  lynchByName(s, 'B');
  check('No premature wolf win', s.screen === 'interrupt');
  resolveAll(s, ['A']);
  check('Hunter saves the village', s.winner && s.winner.team === 'dorf');

  // v1 bug 11: lovers on the same side do not block a village win
  s = game({ A: 'werwolf', B: 'amor', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner' });
  W.startNight(s); W.submitStep(s, [id(s, 'C'), id(s, 'D')]); W.submitStep(s, null); W.submitStep(s, [id(s, 'E')]);
  lynchByName(s, 'A');
  check('Village wins despite lovers', s.winner && s.winner.team === 'dorf');

  // mixed lovers win as the last two
  s = game({ A: 'werwolf', B: 'amor', C: 'dorfbewohner', D: 'dorfbewohner' }, { wolvesParity: false });
  W.startNight(s); W.submitStep(s, [id(s, 'A'), id(s, 'C')]); W.submitStep(s, null); W.submitStep(s, [id(s, 'B')]);
  check('Lovers: no win yet', !s.winner, s.winner);
  lynchByName(s, 'D');
  check('Lovers win', s.winner && s.winner.team === 'liebende', s.winner);

  // v1 bug 1: flower child & cleaner work
  s = game({ A: 'werwolf', B: 'blumenkind', C: 'reinigungskraft', D: 'dorfbewohner', E: 'dorfbewohner', F: 'werwolf', G: 'dorfbewohner' });
  W.toDay(s); W.electMayor(s, null);
  W.blumenkindProtect(s, id(s, 'D'));
  check('Flower child protects', !W.voteCandidates(s).includes(id(s, 'D')));
  W.lynch(s, id(s, 'A'));
  check('Cleaner is asked', s.screen === 'cleaner');
  W.cleanerDecide(s, true);
  check('Role hidden', s.players[0].flags.roleHidden && s.news.lines.some(l => !l.secret && l.k === 'news.death' && l.p.role === null));

  // village idiot survives the lynch
  s = game({ A: 'werwolf', B: 'dorfdepp', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner' });
  lynchByName(s, 'B');
  check('Village idiot survives', isAlive(s, 'B') && s.players[1].flags.noVote);

  // scapegoat on a tie
  s = game({ A: 'werwolf', B: 'suendenbock', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'werwolf' });
  W.toDay(s); W.electMayor(s, null); s.day.votes[id(s, 'A')] = 2; s.day.votes[id(s, 'C')] = 2; W.resolveVote(s);
  check('Scapegoat dies on a tie', !isAlive(s, 'B'));

  // mayor breaks a tie
  s = game({ A: 'werwolf', B: 'dorfbewohner', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'werwolf' });
  W.toDay(s); W.electMayor(s, id(s, 'B')); s.day.votes[id(s, 'A')] = 2; s.day.votes[id(s, 'C')] = 2; W.resolveVote(s);
  check('Tie → mayor', s.screen === 'tie');

  // mayor succession
  s = game({ A: 'werwolf', B: 'dorfbewohner', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'werwolf' });
  W.toDay(s); W.electMayor(s, id(s, 'B')); W.lynch(s, id(s, 'B'));
  check('Succession is asked', s.screen === 'interrupt' && s.queue[0].type === 'mayor');
  resolveAll(s, ['C']);
  check('New mayor', s.p.mayor === id(s, 'C'));

  // knight with rusty sword
  s = game({ A: 'ritter', B: 'werwolf', C: 'dorfbewohner', D: 'werwolf', E: 'dorfbewohner', F: 'dorfbewohner', G: 'dorfbewohner', H: 'dorfbewohner' });
  night(s, { werwoelfe: ['A'] });
  W.toDay(s); W.electMayor(s, null); W.noLynch(s); W.endDay(s);
  night(s, { werwoelfe: ['C'] });
  check('Rusty sword kills the next wolf to the left', !isAlive(s, 'B') && isAlive(s, 'D'));

  // elder survives the first attack
  s = game({ A: 'werwolf', B: 'aeltester', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner' });
  night(s, { werwoelfe: ['B'] });
  check('Elder alive after 1st attack', isAlive(s, 'B'));
  W.toDay(s); W.electMayor(s, null); W.noLynch(s); W.endDay(s);
  night(s, { werwoelfe: ['B'] });
  check('Elder dies on 2nd attack', !isAlive(s, 'B'));

  // witch: heal + poison in one night
  s = game({ A: 'werwolf', B: 'hexe', C: 'dorfbewohner', D: 'dorfbewohner', E: 'werwolf', F: 'dorfbewohner', G: 'dorfbewohner' });
  night(s, { werwoelfe: ['C'], hexe: { heal: true, poison: 'A' } });
  check('Witch heals and poisons', isAlive(s, 'C') && !isAlive(s, 'A') && !s.p.hexeHeal && !s.p.hexePoison);

  // village harlot
  s = game({ A: 'werwolf', B: 'dorfmatratze', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner', G: 'werwolf' });
  night(s, { dorfmatratze: ['C'], werwoelfe: ['C'] });
  check('Harlot dies with her host', !isAlive(s, 'B') && !isAlive(s, 'C'));
  s = game({ A: 'werwolf', B: 'dorfmatratze', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner' });
  night(s, { dorfmatratze: ['C'], werwoelfe: ['B'] });
  check('Harlot not at home', isAlive(s, 'B'));

  // alpha wolf infects
  s = game({ A: 'urwolf', B: 'dorfbewohner', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner' });
  night(s, { werwoelfe: ['B'], urwolf: true });
  check('Infected instead of killed', isAlive(s, 'B') && s.players[1].flags.wolf && s.p.urwolfUsed);

  // wild child turns into a wolf
  s = game({ A: 'werwolf', B: 'wildeskind', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner' });
  night(s, { wildeskind: ['C'], werwoelfe: ['C'] });
  check('Wild child turned', s.players[1].flags.wolf);

  // angel dies on the first day
  s = game({ A: 'werwolf', B: 'engel', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner' });
  lynchByName(s, 'B');
  check('Angel wins', s.winner && s.winner.team === 'engel');

  // white werewolf as last survivor
  s = game({ A: 'weisserwolf', B: 'werwolf', C: 'dorfbewohner' }, { wolvesParity: false });
  night(s, { werwoelfe: ['C'] });
  check('White wolf + wolf: no win yet', !s.winner, s.winner);
  W.toDay(s); W.electMayor(s, null); W.noLynch(s); W.endDay(s);
  night(s, { weisserwolf: ['B'] });
  check('White werewolf wins alone', s.winner && s.winner.team === 'solo', s.winner);

  // nuclear plant
  s = game({ A: 'werwolf', B: 'akw', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner', G: 'werwolf' });
  lynchByName(s, 'B');
  check('Nuclear plant interrupt with neighbours', s.screen === 'interrupt' && s.queue[0].suggest.length === 2, s.queue[0]);
  resolveAll(s, [['C', 'D']]);
  check('Nuclear plant kills two', !isAlive(s, 'C') && !isAlive(s, 'D'));

  // bear
  s = game({ A: 'dorfbewohner', B: 'baerenfuehrer', C: 'werwolf', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner' });
  night(s, { werwoelfe: ['E'] });
  check('Bear growls', s.news.lines.some(l => l.k === 'news.bearGrowl'));

  // raven
  s = game({ A: 'werwolf', B: 'rabe', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner' });
  night(s, { rabe: ['C'], werwoelfe: ['D'] });
  W.toDay(s); W.electMayor(s, null);
  check('Raven +2', W.voteTotals(s)[id(s, 'C')] === 2);

  // dead roles are called for show
  s = game({ A: 'werwolf', B: 'seherin', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'werwolf', G: 'dorfbewohner' });
  lynchByName(s, 'B'); W.endDay(s);
  check('Dead seer: fake call', W.currentStep(s).id === 'seherin' && W.currentStep(s).status === 'fake');

  // no game master: the cleaner is asked for show even when dead
  s = game({ A: 'werwolf', B: 'reinigungskraft', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'werwolf', G: 'dorfbewohner' }, { mode: 'auto' });
  lynchByName(s, 'B'); if (s.screen === 'cleaner') W.cleanerDecide(s, false); W.endDay(s); night(s, { werwoelfe: ['C'] }); W.toDay(s); W.lynch(s, id(s, 'D'));
  check('Auto: fake cleaner question', s.screen === 'cleaner' && s.day.cleanerActive === false);
  W.cleanerDecide(s, true);
  check('Auto: fake question hides nothing', !s.players[3].flags.roleHidden);

  // secret pass-around vote (mayor counts double)
  s = game({ A: 'werwolf', B: 'dorfbewohner', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'werwolf' }, { voteMode: 'pass' });
  s.round = 1; W.toDay(s); W.electMayor(s, id(s, 'B')); W.startVote(s);
  check('Voter list', s.day.voterList.length === 6);
  [['A', 'B'], ['B', 'A'], ['C', 'A'], ['D', 'F'], ['E', 'F'], ['F', null]].forEach(([v, x]) => W.castBallot(s, id(s, v), x ? id(s, x) : null));
  W.tallyBallots(s);
  check('Pass-around: mayor counts double', W.voteTotals(s)[id(s, 'A')] === 3 && W.voteTotals(s)[id(s, 'F')] === 2);
  W.resolveVote(s);
  check('Pass-around: A lynched', !isAlive(s, 'A'));

  // newly turned wolves are shown to the pack
  s = game({ A: 'werwolf', B: 'verfluchter', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner' });
  night(s, { werwoelfe: ['B'] }); W.toDay(s); W.electMayor(s, null); W.noLynch(s); W.endDay(s);
  while (W.currentStep(s).id !== 'werwoelfe') W.submitStep(s, null);
  check('New pack member shown', W.currentStep(s).info.k === 'info.wolvesNew');
  W.submitStep(s, [id(s, 'C')]);
  check('New-wolf mark cleared afterwards', !s.players[1].flags.newWolf);

  // take over as game master
  s = game({ A: 'werwolf', B: 'dorfbewohner', C: 'dorfbewohner', D: 'dorfbewohner' }, { mode: 'auto' });
  W.takeOverAsGM(s);
  check('Takeover', s.settings.mode === 'gm');

  // mayor succession: new election instead of a successor
  s = game({ A: 'werwolf', B: 'dorfbewohner', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner' }, { mayorSuccession: 'elect' });
  night(s, { werwoelfe: ['F'] }); W.toDay(s); W.electMayor(s, id(s, 'B'));
  W.lynch(s, id(s, 'B'));
  check('Elect mode: no successor question', s.screen === 'afterLynch' && !s.queue.length, s.screen);
  check('Elect mode: announced', s.news.lines.some(l => l.k === 'news.mayorElect'));
  W.endDay(s); night(s, { werwoelfe: ['E'] }); W.toDay(s);
  check('Elect mode: new election next day', s.screen === 'mayor', s.screen);
  W.electMayor(s, id(s, 'C'));
  check('Elect mode: flag cleared', !s.p.mayorElect && s.p.mayor === id(s, 'C'));
  // default: the dying mayor names a successor
  s = game({ A: 'werwolf', B: 'dorfbewohner', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner' });
  s.round = 1; W.toDay(s); W.electMayor(s, id(s, 'B')); W.lynch(s, id(s, 'B'));
  check('Choose mode: successor question', s.screen === 'interrupt' && s.queue[0].type === 'mayor');

  // no game master: lovers learn about each other in a phone round in night 1
  s = game({ A: 'amor', B: 'werwolf', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner' }, { mode: 'auto' });
  W.startNight(s);
  W.submitStep(s, [id(s, 'B'), id(s, 'C')]);
  check('Auto: lovers step follows Cupid', W.currentStep(s).id === 'liebende' && W.currentStep(s).status === 'active');
  W.loverPassStart(s);
  check('Auto: everyone is in the round', s.night.pass.list.length === 6);
  check('Auto: lover sees partner', W.loverPassInfo(s, id(s, 'B')) === 'C' && W.loverPassInfo(s, id(s, 'C')) === 'B');
  check('Auto: others see nothing', W.loverPassInfo(s, id(s, 'D')) === null);
  let done = false; for (let i = 0; i < 6; i++) done = W.loverPassNext(s);
  check('Auto: round ends after everyone', done);
  W.submitStep(s, null);
  check('Auto: night continues after the round', W.currentStep(s) && W.currentStep(s).id !== 'liebende');

  // wolf cub: the pack takes two victims the night after its death
  s = game({ A: 'werwolf', B: 'babywolf', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner', G: 'dorfbewohner', H: 'dorfbewohner' });
  lynchByName(s, 'B');
  check('Wolf cub: rage noted', s.p.wolfRage === true);
  W.endDay(s);
  while (W.currentStep(s).id !== 'werwoelfe') W.submitStep(s, null);
  check('Wolf cub: two victims allowed', W.currentStep(s).count === 2 && W.currentStep(s).info.k === 'info.wolvesRage');
  W.submitStep(s, [id(s, 'C'), id(s, 'D')]);
  while (s.screen === 'night') W.submitStep(s, null);
  check('Wolf cub: both victims die', !isAlive(s, 'C') && !isAlive(s, 'D'));
  W.toDay(s); W.noLynch(s); W.endDay(s);
  while (W.currentStep(s).id !== 'werwoelfe') W.submitStep(s, null);
  check('Wolf cub: rage lasts one night', W.currentStep(s).count === 1);

  // monk: holy water kills a werewolf …
  s = game({ A: 'werwolf', B: 'moench', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'werwolf', G: 'dorfbewohner' });
  night(s, { moench: ['A'], werwoelfe: ['C'] });
  check('Monk kills a werewolf', !isAlive(s, 'A') && isAlive(s, 'B') && s.p.moenchUsed);
  W.toDay(s); W.electMayor(s, null); W.noLynch(s); W.endDay(s);
  check('Monk only once', W.currentStep(s) && (W.stepStatus(s, 'moench') !== 'active'));
  // … or the monk himself
  s = game({ A: 'werwolf', B: 'moench', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'werwolf', G: 'dorfbewohner' });
  night(s, { moench: ['C'], werwoelfe: ['D'] });
  check('Monk dies when wrong', !isAlive(s, 'B') && isAlive(s, 'C'));

  // ghost hand: acts only after death, sign shown in the morning
  s = game({ A: 'werwolf', B: 'geisterhand', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner', F: 'dorfbewohner', G: 'werwolf' });
  W.startNight(s);
  check('Ghost hand alive: only called for show', W.stepStatus(s, 'geisterhand') !== 'active');
  while (s.screen === 'night') { const c = W.currentStep(s); W.submitStep(s, c.id === 'werwoelfe' ? [id(s, 'B')] : null); }
  W.toDay(s); W.electMayor(s, null); W.noLynch(s); W.endDay(s);
  check('Ghost hand dead: active', W.stepStatus(s, 'geisterhand') === 'active');
  night(s, { werwoelfe: ['C'], geisterhand: 'data:image/png;base64,AAAA' });
  check('Ghost sign in the morning', s.news.sign === 'data:image/png;base64,AAAA' && s.news.lines.some(l => l.k === 'news.ghostSign'));

  // custom roles: reminder step at night, wolf-team custom role counts as evil
  W.setCustomRoles([{ id: 'c_test', name: 'Bäcker', emoji: '🥖', team: 'dorf', when: 'night', wake: 'Der Bäcker erwacht.' },
                    { id: 'c_wolf', name: 'Schattenwolf', team: 'wolf', when: 'none' }]);
  check('Custom role registered', W.ROLE.c_test && W.STEP.c_test && W.ROLE.c_wolf.wakes.includes('werwoelfe'));
  check('Custom wolf counts as evil', W.validateSetup(['A', 'B', 'C', 'D'], { c_wolf: 1, c_test: 1, dorfbewohner: 2 }).ok);
  s = game({ A: 'c_wolf', B: 'c_test', C: 'dorfbewohner', D: 'dorfbewohner', E: 'dorfbewohner' });
  W.startNight(s);
  const seen = [];
  while (s.screen === 'night') { const c = W.currentStep(s); seen.push(c.id); W.submitStep(s, c.id === 'werwoelfe' ? [id(s, 'C')] : null); }
  check('Custom role is called at night', seen.includes('c_test') && !isAlive(s, 'C'));
  checkMsg({ k: 'log.stepResult', p: { step: 'c_test', res: { k: 'res.seerNo', p: { name: 'X' } } } });
  W.setCustomRoles([]);
  check('Custom roles removed again', !W.ROLE.c_test && !W.STEP.c_test);

  // balance bar with vampires
  const bp = W.balanceParts({ werwolf: 2, vampir: 1, seherin: 1, dorfbewohner: 4 });
  check('Balance knows vampires', bp.vampir > 0 && bp.wolf > 0 && bp.share > 0 && bp.share < 1);
})();

/** Checks that a message translates cleanly in both languages. */
function checkMsg(msg) {
  for (const l of ['de', 'en']) {
    const txt = I.msg(msg, l);
    if (!txt || txt === msg.k || /\{\w+\}|undefined|\[object/.test(txt)) throw new Error(`Text ${l} ${msg.k}: ${txt}`);
  }
}

// ======================================================= Random games
(function fuzz() {
  W.setCustomRoles([{ id: 'c_night', name: 'Nachtrolle', team: 'dorf', when: 'night' }, { id: 'c_wolf', name: 'Schattenwolf', team: 'wolf', when: 'first' },
                    { id: 'c_solo', name: 'Gaukler', team: 'solo', when: 'day' }]);
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
    const settings = { wolvesParity: Math.random() < .5, callDeadRoles: Math.random() < .5, seerMode: pick(['team', 'role']), revealRoles: Math.random() < .8,
      mayorSuccession: pick(['choose', 'elect']), mode: pick(['gm', 'auto']) };
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
                const t = W.shuffle(cur.targets).slice(0, cur.count);
                v = Math.random() < .15 ? [] : t;
              } else if (cur.def.kind === 'draw') v = Math.random() < .5 ? 'data:image/png;base64,AAAA' : null;
              else if (cur.def.kind === 'yesno') v = Math.random() < .5;
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
          default: throw new Error('Unknown screen ' + s.screen);
        }
        // every text must work in both languages
        s.news.lines.forEach(checkMsg);
        // invariants
        if (s.players.some(p => !p.alive && p.flags.bitten)) throw new Error('Dead player is bitten');
        if (s.p.mayor && !s.players.find(p => p.id === s.p.mayor).alive) throw new Error('Dead mayor');
        if (s.p.lovers.length === 2 && s.screen !== 'interrupt') {
          const [a, b] = s.p.lovers.map(x => s.players.find(p => p.id === x));
          if (a.alive !== b.alive) throw new Error('Only one lover alive');
        }
      }
      s.log.forEach(l => { checkMsg(l); checkMsg(l.label); });
      if (s.winner) { checkMsg(s.winner.title); checkMsg(s.winner.text); }
      if (s.screen !== 'over') { stuck++; if (stuck < 4) console.log('stuck', s.screen, s.round, JSON.stringify(counts)); }
      else {
        endings[s.winner.team] = (endings[s.winner.team] || 0) + 1;
        // win check: the village never wins with a living wolf
        if (s.winner.team === 'dorf' && W.alive(s).some(p => W.team(s, p) === 'wolf' && p.roleId !== 'guenstling')) throw new Error('Village win with a living wolf');
      }
      games++;
    } catch (e) {
      errors++;
      if (errors < 5) console.log('ERROR', e.stack.split('\n').slice(0, 3).join(' | '), JSON.stringify(counts));
    }
  }
  check('Random games without errors', errors === 0, errors);
  check('All random games end', stuck === 0, stuck);
  console.log(`Random games: ${games}, endings:`, endings);
})();

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
