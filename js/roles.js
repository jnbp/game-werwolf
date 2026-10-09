/* ==========================================================================
   Werwolf v2 – ROLLEN & NACHTABLAUF
   --------------------------------------------------------------------------
   Diese Datei ist der Ort zum Erweitern. Eine neue Rolle = ein neuer Eintrag
   in ROLES. Braucht sie eine Nachtaktion, trägt sie in `wakes` eine Schritt-ID
   aus NIGHT_STEPS ein (oder du legst dort einen neuen Schritt an).
   Rollen ohne besondere Regel (z. B. Dorfbewohner-Varianten) oder reine
   Info-/Prüf-Schritte brauchen keinen weiteren Code.
   Echte Spezialeffekte (Tod verhindern, verwandeln …) stehen in engine.js
   im Abschnitt „ROLLEN-EFFEKTE“.

   Felder einer Rolle:
     id          eindeutige Kennung (klein, ohne Umlaute)
     name        Anzeigename
     emoji       Symbol
     team        'dorf' | 'wolf' | 'vampir' | 'solo'
     appearsWolf true, wenn Seherin/Fuchs/Bär sie als Werwolf erkennen
     wakes       Liste von NIGHT_STEPS-IDs, bei denen die Rolle aufwacht
     max         wie oft die Rolle im Spiel sein darf (Standard 1)
     weight      Balance-Wert: + stärkt das Dorf, − stärkt die Bösen
     tags        Filter im Setup: 'klassisch', 'neu', 'chaos'
     desc/descEN Rollentext beim Aufdecken
     tip         kurzer Hinweis für die Spielleitung
   ========================================================================== */

(function (global) {
  'use strict';

  const ROLES = [
    // ---------------------------------------------------------------- Werwölfe
    {
      id: 'werwolf', name: 'Werwolf', emoji: '🐺', team: 'wolf', appearsWolf: true,
      wakes: ['werwoelfe'], max: 99, weight: -6, tags: ['klassisch'],
      desc: 'Jede Nacht erwachst du mit den anderen Werwölfen. Gemeinsam wählt ihr ein Opfer. Tagsüber tarnst du dich als harmloser Dorfbewohner.',
      descEN: 'Each night you wake with the other werewolves and choose a victim together. By day, blend in as a harmless villager.',
      tip: 'Werwölfe einigen sich lautlos per Zeigen.'
    },
    {
      id: 'urwolf', name: 'Urwolf', emoji: '🩸', team: 'wolf', appearsWolf: true, isNew: true,
      wakes: ['werwoelfe', 'urwolf'], weight: -8, tags: ['neu'],
      desc: 'Du bist ein Werwolf. Einmal im Spiel darfst du das Opfer der Werwölfe infizieren statt töten: Es überlebt und wird heimlich selbst zum Werwolf.',
      descEN: 'You are a werewolf. Once per game you may infect the werewolves\' victim instead of killing it: it survives and secretly becomes a werewolf.',
      tip: 'Infizierte bekommen es von dir per Schulterantippen mitgeteilt.'
    },
    {
      id: 'wolfsseherin', name: 'Wolfsseherin', emoji: '🔮', team: 'wolf', appearsWolf: true, isNew: true,
      wakes: ['wolfsseherin', 'werwoelfe'], weight: -8, tags: ['neu'],
      desc: 'Du gehörst zu den Werwölfen. Jede Nacht darfst du zusätzlich die genaue Rolle eines Spielers erfahren – finde die Seherin!',
      descEN: 'You belong to the werewolves. Each night you may also learn the exact role of one player – find the Seer!'
    },
    {
      id: 'weisserwolf', name: 'Weißer Werwolf', emoji: '🤍', team: 'solo', appearsWolf: true, isNew: true,
      wakes: ['werwoelfe', 'weisserwolf'], weight: -6, tags: ['neu', 'chaos'],
      desc: 'Du jagst mit den Werwölfen, spielst aber nur für dich. Jede zweite Nacht darfst du heimlich einen Werwolf töten. Du gewinnst nur, wenn du als Letzter übrig bleibst.',
      descEN: 'You hunt with the werewolves but play for yourself. Every second night you may secretly kill a werewolf. You win only as the last survivor.',
      tip: 'Wacht in geraden Nächten (2, 4, 6 …) allein auf.'
    },

    // ---------------------------------------------------------------- Dorf
    {
      id: 'dorfbewohner', name: 'Dorfbewohner', emoji: '🧑‍🌾', team: 'dorf',
      wakes: [], max: 99, weight: 1, tags: ['klassisch'],
      desc: 'Du hast keine besonderen Fähigkeiten – nur deinen Verstand. Finde die Werwölfe und überlebe!',
      descEN: 'You have no special abilities – only your wits. Find the werewolves and survive!'
    },
    {
      id: 'seherin', name: 'Seherin', emoji: '👁️', team: 'dorf',
      wakes: ['seherin'], weight: 7, tags: ['klassisch'],
      desc: 'Jede Nacht darfst du einen Spieler anschauen und erfährst, ob er zu den Werwölfen gehört.',
      descEN: 'Each night you may look at one player and learn whether they belong to the werewolves.',
      tip: 'In den Einstellungen umstellbar: Seherin sieht die genaue Rolle.'
    },
    {
      id: 'hexe', name: 'Hexe', emoji: '🧙‍♀️', team: 'dorf',
      wakes: ['hexe'], weight: 6, tags: ['klassisch'],
      desc: 'Du erfährst jede Nacht das Opfer der Werwölfe. Einmal im Spiel kannst du es mit deinem Heiltrank retten, einmal mit deinem Gifttrank jemanden töten.',
      descEN: 'Each night you learn the werewolves\' victim. Once per game you may save it with your healing potion, and once kill someone with your poison.'
    },
    {
      id: 'jaeger', name: 'Jäger', emoji: '🏹', team: 'dorf',
      wakes: [], weight: 3, tags: ['klassisch'],
      desc: 'Wenn du stirbst – egal wie –, gibst du einen letzten Schuss ab und nimmst einen Spieler mit in den Tod.',
      descEN: 'When you die – no matter how – you fire one last shot and take a player with you.'
    },
    {
      id: 'amor', name: 'Amor', emoji: '💘', team: 'dorf',
      wakes: ['amor'], weight: 1, tags: ['klassisch'],
      desc: 'In der ersten Nacht verliebst du zwei Spieler (du darfst dich selbst wählen). Stirbt einer, stirbt der andere vor Kummer. Sind sie aus verschiedenen Lagern, gewinnen sie nur, wenn sie als Einzige übrig bleiben.',
      descEN: 'On the first night you make two players fall in love (you may pick yourself). If one dies, the other dies of grief. If they belong to different sides, they win only as the last two survivors.'
    },
    {
      id: 'leibwaechter', name: 'Leibwächter', emoji: '🛡️', team: 'dorf',
      wakes: ['leibwaechter'], weight: 4, tags: ['klassisch'],
      desc: 'Jede Nacht beschützt du einen anderen Spieler vor Werwölfen, Vampirbiss und Serienmörder. Nicht zweimal hintereinander dieselbe Person.',
      descEN: 'Each night you protect another player from werewolves, vampire bites and the serial killer. Not the same person twice in a row.'
    },
    {
      id: 'priester', name: 'Priester', emoji: '🙏', team: 'dorf',
      wakes: ['priester'], weight: 4, tags: ['klassisch'],
      desc: 'Jede Nacht segnest du einen Spieler – auch dich selbst. Er ist in dieser Nacht vor Werwölfen, Vampirbiss und Serienmörder geschützt.',
      descEN: 'Each night you bless one player – yourself included. They are protected from werewolves, vampire bites and the serial killer that night.'
    },
    {
      id: 'verfluchter', name: 'Verfluchter', emoji: '⛓️', team: 'dorf',
      wakes: [], weight: -2, tags: ['klassisch'],
      desc: 'Du beginnst als Dorfbewohner. Greifen dich die Werwölfe an, stirbst du nicht – du wirst selbst zum Werwolf und wachst ab der nächsten Nacht mit ihnen auf.',
      descEN: 'You start as a villager. If the werewolves attack you, you don\'t die – you become a werewolf and wake with them from the next night on.'
    },
    {
      id: 'dorfmatratze', name: 'Dorfmatratze', emoji: '💃', team: 'dorf',
      wakes: ['dorfmatratze'], weight: 2, tags: ['klassisch'],
      desc: 'Jede Nacht besuchst du jemanden. Wirst du zu Hause angegriffen, bist du nicht da und überlebst. Wird dein Gastgeber getötet, stirbst du mit ihm.',
      descEN: 'Each night you visit someone. If you are attacked at home, you\'re not there and survive. If your host is killed, you die with them.'
    },
    {
      id: 'blumenkind', name: 'Blumenkind', emoji: '🌸', team: 'dorf',
      wakes: [], weight: 2, tags: ['klassisch'],
      desc: 'Einmal im Spiel kannst du vor einer Abstimmung einen Spieler unter deinen Schutz stellen – er kann an diesem Tag nicht gehängt werden.',
      descEN: 'Once per game, before a vote, you can place one player under your protection – they cannot be lynched that day.',
      tip: 'Meldet sich offen beim Spielleiter vor der Abstimmung.'
    },
    {
      id: 'akw', name: 'AKW', emoji: '☢️', team: 'dorf',
      wakes: [], weight: 0, tags: ['klassisch', 'chaos'],
      desc: 'Du bist ein Dorfbewohner mit Strahlung. Stirbst du, reißt du bis zu zwei weitere Spieler mit in den Tod – die Spielleitung entscheidet, wen es trifft.',
      descEN: 'You are a radioactive villager. When you die, up to two more players die with you – the game master decides who.'
    },
    {
      id: 'guenstling', name: 'Günstling', emoji: '🤫', team: 'dorf',
      wakes: ['guenstling'], weight: -3, tags: ['klassisch'],
      desc: 'Du lebst im Dorf, hilfst aber heimlich den Bösen. In der ersten Nacht erfährst du, wer die Werwölfe sind (sie kennen dich nicht). Du gewinnst mit ihnen. Die Seherin sieht dich als harmlos.',
      descEN: 'You live in the village but secretly help the evil side. On the first night you learn who the werewolves are (they don\'t know you). You win with them. The Seer sees you as harmless.',
      tip: 'Gibt es keine Werwölfe, hilft er den Vampiren.'
    },
    {
      id: 'reinigungskraft', name: 'Reinigungskraft', emoji: '🧹', team: 'dorf',
      wakes: [], weight: 1, tags: ['klassisch'],
      desc: 'Einmal im Spiel, direkt nach einer Hinrichtung, darfst du entscheiden, dass die Rolle des Gehängten geheim bleibt.',
      descEN: 'Once per game, right after an execution, you may decide that the executed player\'s role stays secret.',
      tip: 'Nur sinnvoll, wenn Rollen Verstorbener aufgedeckt werden.'
    },
    {
      id: 'geist', name: 'Geist', emoji: '👻', team: 'dorf',
      wakes: [], weight: 2, tags: ['klassisch'],
      desc: 'Auch nach deinem Tod hilfst du dem Dorf: Jeden Tag darfst du genau ein Wort sagen – aber keinen Namen und keine Rolle.',
      descEN: 'Even after death you help the village: each day you may say exactly one word – but no name and no role.'
    },
    {
      id: 'freimaurer', name: 'Freimaurer', emoji: '🤝', team: 'dorf',
      wakes: ['freimaurer'], max: 4, weight: 2, tags: ['klassisch'],
      desc: 'In der ersten Nacht lernst du die anderen Freimaurer kennen. Ihr wisst sicher, dass ihr einander vertrauen könnt.',
      descEN: 'On the first night you meet the other Freemasons. You know for sure you can trust each other.',
      tip: 'Am besten zu zweit oder zu dritt einsetzen.'
    },
    {
      id: 'wildeskind', name: 'Wildes Kind', emoji: '🐾', team: 'dorf', isNew: true,
      wakes: ['wildeskind'], weight: 0, tags: ['neu'],
      desc: 'In der ersten Nacht wählst du ein Vorbild. Solange es lebt, bist du Dorfbewohner. Stirbt dein Vorbild, wirst du heimlich zum Werwolf.',
      descEN: 'On the first night you choose a role model. While they live, you are a villager. If your role model dies, you secretly become a werewolf.'
    },
    {
      id: 'dorfdepp', name: 'Dorfdepp', emoji: '🤪', team: 'dorf', isNew: true,
      wakes: [], weight: 2, tags: ['neu'],
      desc: 'Wirst du vom Dorf gehängt, merken alle, dass du nur der Dorfdepp bist: Du überlebst, verlierst aber dein Stimmrecht.',
      descEN: 'If the village lynches you, everyone realises you\'re just the village idiot: you survive but lose your right to vote.'
    },
    {
      id: 'ritter', name: 'Ritter mit rostigem Schwert', emoji: '⚔️', team: 'dorf', isNew: true,
      wakes: [], weight: 3, tags: ['neu'],
      desc: 'Töten dich die Werwölfe, steckt ihr Rost in der Wunde: Der nächste Werwolf links von dir (in Sitzreihenfolge) stirbt in der folgenden Nacht.',
      descEN: 'If the werewolves kill you, your rusty sword infects them: the next werewolf to your left (in seating order) dies the following night.'
    },
    {
      id: 'aeltester', name: 'Ältester', emoji: '🧓', team: 'dorf', isNew: true,
      wakes: [], weight: 3, tags: ['neu'],
      desc: 'Du bist zäh: Den ersten Angriff der Werwölfe überlebst du. Erst beim zweiten Mal erwischen sie dich.',
      descEN: 'You are tough: you survive the werewolves\' first attack. Only the second one gets you.'
    },
    {
      id: 'rotkaeppchen', name: 'Rotkäppchen', emoji: '🧣', team: 'dorf', isNew: true,
      wakes: [], weight: 2, tags: ['neu'],
      desc: 'Solange der Jäger lebt, trauen sich die Werwölfe nicht an dich heran – ihre Angriffe scheitern.',
      descEN: 'As long as the Hunter is alive, the werewolves don\'t dare to touch you – their attacks fail.',
      tip: 'Nur zusammen mit dem Jäger sinnvoll.'
    },
    {
      id: 'fuchs', name: 'Fuchs', emoji: '🦊', team: 'dorf', isNew: true,
      wakes: ['fuchs'], weight: 4, tags: ['neu'],
      desc: 'Jede Nacht schnupperst du an einem Spieler und seinen beiden Sitznachbarn. Ist ein Werwolf darunter, behältst du deine Nase. Wenn nicht, verlierst du deine Fähigkeit.',
      descEN: 'Each night you sniff a player and their two neighbours. If a werewolf is among them, you keep your nose. If not, you lose your power.'
    },
    {
      id: 'baerenfuehrer', name: 'Bärenführer', emoji: '🐻', team: 'dorf', isNew: true,
      wakes: [], weight: 3, tags: ['neu'],
      desc: 'Jeden Morgen brummt dein Bär, wenn einer deiner beiden lebenden Sitznachbarn ein Werwolf ist. Das ganze Dorf hört es.',
      descEN: 'Every morning your bear growls if one of your two living neighbours is a werewolf. The whole village hears it.',
      tip: 'Die App sagt dir morgens automatisch, ob der Bär brummt.'
    },
    {
      id: 'richter', name: 'Stotternder Richter', emoji: '⚖️', team: 'dorf', isNew: true,
      wakes: [], weight: 2, tags: ['neu'],
      desc: 'Einmal im Spiel kannst du nach einer Abstimmung eine zweite Abstimmung am selben Tag erzwingen. Gib der Spielleitung vorher heimlich ein Zeichen.',
      descEN: 'Once per game you can force a second vote on the same day. Give the game master a secret sign beforehand.'
    },
    {
      id: 'suendenbock', name: 'Sündenbock', emoji: '🐐', team: 'dorf', isNew: true,
      wakes: [], weight: 1, tags: ['neu'],
      desc: 'Endet eine Abstimmung unentschieden, wirst du statt der anderen gehängt. Pech gehabt – aber das Dorf verliert keinen Unschuldigen mehr durch Zufall.',
      descEN: 'If a vote ends in a tie, you are executed instead. Tough luck – but the village no longer loses someone at random.'
    },
    {
      id: 'rabe', name: 'Rabe', emoji: '🐦‍⬛', team: 'dorf', isNew: true,
      wakes: ['rabe'], weight: 3, tags: ['neu'],
      desc: 'Jede Nacht darfst du einen Verdächtigen markieren. Am nächsten Tag startet er mit zwei Stimmen gegen sich in die Abstimmung.',
      descEN: 'Each night you may mark a suspect. The next day they start the vote with two votes against them.'
    },
    {
      id: 'detektiv', name: 'Detektiv', emoji: '🕵️', team: 'dorf', isNew: true,
      wakes: ['detektiv'], weight: 4, tags: ['neu'],
      desc: 'Jede Nacht zeigst du auf zwei Spieler und erfährst, ob sie zum selben Lager gehören.',
      descEN: 'Each night you point at two players and learn whether they belong to the same side.'
    },
    {
      id: 'engel', name: 'Engel', emoji: '😇', team: 'dorf', isNew: true,
      wakes: [], weight: 0, tags: ['neu', 'chaos'],
      desc: 'Stirbst du in der ersten Runde (erste Nacht oder erster Tag), gewinnst du sofort allein. Überlebst du sie, bist du ein normaler Dorfbewohner.',
      descEN: 'If you die in the first round (first night or first day), you win alone immediately. If you survive it, you are a normal villager.'
    },

    // ---------------------------------------------------------------- Andere
    {
      id: 'vampir', name: 'Vampir', emoji: '🧛', team: 'vampir', max: 3,
      wakes: ['vampire'], weight: -6, tags: ['klassisch', 'chaos'],
      desc: 'Eigenes Lager. Jede Nacht beißt du ein Opfer – es stirbt am Ende des nächsten Tages. Werwölfe können dir nichts anhaben. Ihr gewinnt, wenn nur noch Vampire übrig sind.',
      descEN: 'Your own side. Each night you bite a victim – it dies at the end of the next day. Werewolves can\'t hurt you. You win when only vampires remain.'
    },
    {
      id: 'serienmoerder', name: 'Serienmörder', emoji: '🔪', team: 'solo', isNew: true,
      wakes: ['serienmoerder'], weight: -6, tags: ['neu', 'chaos'],
      desc: 'Du spielst allein. Jede Nacht tötest du einen Spieler. Werwölfe können dir nichts anhaben. Du gewinnst als letzter Überlebender.',
      descEN: 'You play alone. Each night you kill a player. Werewolves can\'t hurt you. You win as the last survivor.'
    }
  ];

  /* ------------------------------------------------------------------------
     NACHTABLAUF – in dieser Reihenfolge ruft die App auf.
       order    Reihenfolge (klein = früh)
       when     'first' (nur Nacht 1) | 'always' | 'even' (Nacht 2, 4, …)
       kind     'pick' (Spieler wählen) | 'info' (nur Hinweis) |
                'yesno' | 'hexe'
       count    wie viele Spieler gewählt werden
       targets  Filtername (siehe engine.js → TARGETS)
       wake/sleep  Erzähltext zum Vorlesen
     ------------------------------------------------------------------------ */
  const NIGHT_STEPS = [
    { id: 'amor', order: 10, when: 'first', kind: 'pick', count: 2, targets: 'alive', title: 'Amor',
      wake: 'Amor erwacht und zeigt auf zwei Menschen, die sich unsterblich verlieben.',
      sleep: 'Amor schläft wieder ein.' },
    { id: 'liebende', order: 11, when: 'first', kind: 'info', title: 'Die Verliebten',
      wake: 'Ich tippe jetzt die beiden Verliebten an. Ihr dürft die Augen öffnen und euch erkennen.',
      sleep: 'Die Verliebten schließen die Augen wieder.' },
    { id: 'wildeskind', order: 12, when: 'first', kind: 'pick', count: 1, targets: 'others', title: 'Wildes Kind',
      wake: 'Das wilde Kind erwacht und zeigt auf sein Vorbild.',
      sleep: 'Das wilde Kind schläft wieder ein.' },
    { id: 'freimaurer', order: 13, when: 'first', kind: 'info', title: 'Freimaurer',
      wake: 'Die Freimaurer erwachen und erkennen einander.',
      sleep: 'Die Freimaurer schlafen wieder ein.' },
    { id: 'guenstling', order: 14, when: 'first', kind: 'info', title: 'Günstling',
      wake: 'Günstling, öffne die Augen. Werwölfe, hebt die Hand – aber lasst die Augen geschlossen.',
      sleep: 'Werwölfe, Hand runter. Günstling, schließ die Augen.' },
    { id: 'seherin', order: 20, when: 'always', kind: 'pick', count: 1, targets: 'others', title: 'Seherin',
      wake: 'Die Seherin erwacht und zeigt auf einen Menschen, dessen Wesen sie erkennen möchte.',
      sleep: 'Die Seherin schläft wieder ein.' },
    { id: 'fuchs', order: 21, when: 'always', kind: 'pick', count: 1, targets: 'alive', title: 'Fuchs',
      wake: 'Der Fuchs erwacht und schnuppert an einem Menschen und seinen Nachbarn.',
      sleep: 'Der Fuchs schläft wieder ein.' },
    { id: 'detektiv', order: 22, when: 'always', kind: 'pick', count: 2, targets: 'alive', title: 'Detektiv',
      wake: 'Der Detektiv erwacht und zeigt auf zwei Menschen, die er vergleichen will.',
      sleep: 'Der Detektiv schläft wieder ein.' },
    { id: 'wolfsseherin', order: 23, when: 'always', kind: 'pick', count: 1, targets: 'others', title: 'Wolfsseherin',
      wake: 'Die Wolfsseherin erwacht und zeigt auf einen Menschen, dessen Rolle sie erfahren will.',
      sleep: 'Die Wolfsseherin schläft wieder ein.' },
    { id: 'leibwaechter', order: 30, when: 'always', kind: 'pick', count: 1, targets: 'bodyguard', title: 'Leibwächter',
      wake: 'Der Leibwächter erwacht und zeigt auf den Menschen, den er heute Nacht beschützt.',
      sleep: 'Der Leibwächter schläft wieder ein.' },
    { id: 'priester', order: 31, when: 'always', kind: 'pick', count: 1, targets: 'alive', title: 'Priester',
      wake: 'Der Priester erwacht und segnet einen Menschen.',
      sleep: 'Der Priester schläft wieder ein.' },
    { id: 'dorfmatratze', order: 32, when: 'always', kind: 'pick', count: 1, targets: 'others', title: 'Dorfmatratze',
      wake: 'Die Dorfmatratze erwacht und zeigt, bei wem sie heute übernachtet.',
      sleep: 'Die Dorfmatratze schläft wieder ein.' },
    { id: 'rabe', order: 33, when: 'always', kind: 'pick', count: 1, targets: 'alive', title: 'Rabe',
      wake: 'Der Rabe erwacht und markiert einen Verdächtigen.',
      sleep: 'Der Rabe schläft wieder ein.' },
    { id: 'werwoelfe', order: 40, when: 'always', kind: 'pick', count: 1, targets: 'nonWolf', title: 'Werwölfe',
      wake: 'Die Werwölfe erwachen, erkennen einander und einigen sich lautlos auf ein Opfer.',
      sleep: 'Die Werwölfe schlafen wieder ein.' },
    { id: 'urwolf', order: 41, when: 'always', kind: 'yesno', title: 'Urwolf',
      wake: 'Urwolf, willst du das Opfer infizieren statt töten? Daumen hoch für Ja.',
      sleep: '' },
    { id: 'weisserwolf', order: 42, when: 'even', kind: 'pick', count: 1, targets: 'otherWolves', title: 'Weißer Werwolf',
      wake: 'Der weiße Werwolf erwacht und darf einen Werwolf töten.',
      sleep: 'Der weiße Werwolf schläft wieder ein.' },
    { id: 'vampire', order: 45, when: 'always', kind: 'pick', count: 1, targets: 'nonVampire', title: 'Vampire',
      wake: 'Die Vampire erwachen und wählen ein Opfer für ihren Biss.',
      sleep: 'Die Vampire schlafen wieder ein.' },
    { id: 'serienmoerder', order: 46, when: 'always', kind: 'pick', count: 1, targets: 'others', title: 'Serienmörder',
      wake: 'Der Serienmörder erwacht und wählt sein Opfer.',
      sleep: 'Der Serienmörder schläft wieder ein.' },
    { id: 'hexe', order: 50, when: 'always', kind: 'hexe', title: 'Hexe',
      wake: 'Die Hexe erwacht. Ich zeige ihr das Opfer der Werwölfe. Will sie heilen? Will sie vergiften?',
      sleep: 'Die Hexe schläft wieder ein.' }
  ];

  const TEAMS = {
    dorf:     { name: 'Dorf',        emoji: '🏡', color: 'var(--team-dorf)' },
    wolf:     { name: 'Werwölfe',    emoji: '🐺', color: 'var(--team-wolf)' },
    vampir:   { name: 'Vampire',     emoji: '🧛', color: 'var(--team-vampir)' },
    solo:     { name: 'Einzelgänger', emoji: '🎭', color: 'var(--team-solo)' },
    liebende: { name: 'Liebende',    emoji: '💞', color: 'var(--team-love)' }
  };

  global.WW_DATA = { ROLES, NIGHT_STEPS, TEAMS };
  if (typeof module !== 'undefined') module.exports = global.WW_DATA;
})(typeof globalThis !== 'undefined' ? globalThis : window);
