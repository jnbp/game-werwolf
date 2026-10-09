/* ==========================================================================
   Werwolf Manager – ROLES & NIGHT ORDER
   --------------------------------------------------------------------------
   This is the file to extend. A new role = a new entry in ROLES. If it needs
   a night action, add a step id from NIGHT_STEPS to its `wakes` list (or add
   a new step there).
   Roles without special rules (e.g. villager variants) and pure info/check
   steps need no further code. Real special effects (preventing deaths,
   turning players …) live in engine.js in the section "ROLE EFFECTS".
   Ids and team keys are the original German game terms (werwolf = werewolf,
   dorf = village …); they are internal keys only – all visible text is
   bilingual (name/nameEN, desc/descEN, …).

   Role fields:
     id            unique key (lower case, no umlauts)
     name/nameEN   display name (German / English)
     emoji         icon
     team          'dorf' (village) | 'wolf' | 'vampir' (vampire) | 'solo'
     appearsWolf   true if Seer/Fox/Bear detect it as a werewolf
     wakes         list of NIGHT_STEPS ids at which the role wakes up
     max           how often the role may appear (default 1)
     weight        balance value: + helps the village, − helps evil
     tags          setup filter: 'klassisch' (classic), 'neu' (new), 'chaos'
     desc/descEN   role text shown when revealing
     tip/tipEN     short hint for the game master
   ========================================================================== */

(function (global) {
  'use strict';

  const ROLES = [
    // ---------------------------------------------------------------- Werewolves
    {
      id: 'werwolf', nameEN: 'Werewolf', name: 'Werwolf', emoji: '🐺', team: 'wolf', appearsWolf: true,
      wakes: ['werwoelfe'], max: 99, weight: -6, tags: ['klassisch'],
      desc: 'Jede Nacht erwachst du mit den anderen Werwölfen. Gemeinsam wählt ihr ein Opfer. Tagsüber tarnst du dich als harmloser Dorfbewohner.',
      descEN: 'Each night you wake with the other werewolves and choose a victim together. By day, blend in as a harmless villager.',
      tip: 'Werwölfe einigen sich lautlos per Zeigen.',
      tipEN: 'Werewolves agree silently by pointing.'
    },
    {
      id: 'urwolf', nameEN: 'Alpha Wolf', name: 'Urwolf', emoji: '🩸', team: 'wolf', appearsWolf: true, isNew: true,
      wakes: ['werwoelfe', 'urwolf'], weight: -8, tags: ['neu'],
      desc: 'Du bist ein Werwolf. Einmal im Spiel darfst du das Opfer der Werwölfe infizieren statt töten: Es überlebt und wird heimlich selbst zum Werwolf.',
      descEN: 'You are a werewolf. Once per game you may infect the werewolves\' victim instead of killing it: it survives and secretly becomes a werewolf.',
      tip: 'Infizierte bekommen es von dir per Schulterantippen mitgeteilt.',
      tipEN: 'Tap infected players on the shoulder to tell them.'
    },
    {
      id: 'wolfsseherin', nameEN: 'Wolf Seer', name: 'Wolfsseherin', emoji: '🔮', team: 'wolf', appearsWolf: true, isNew: true,
      wakes: ['wolfsseherin', 'werwoelfe'], weight: -8, tags: ['neu'],
      desc: 'Du gehörst zu den Werwölfen. Jede Nacht darfst du zusätzlich die genaue Rolle eines Spielers erfahren – finde die Seherin!',
      descEN: 'You belong to the werewolves. Each night you may also learn the exact role of one player – find the Seer!'
    },
    {
      id: 'weisserwolf', nameEN: 'White Werewolf', name: 'Weißer Werwolf', emoji: '🤍', team: 'solo', appearsWolf: true, isNew: true,
      wakes: ['werwoelfe', 'weisserwolf'], weight: -6, tags: ['neu', 'chaos'],
      desc: 'Du jagst mit den Werwölfen, spielst aber nur für dich. Jede zweite Nacht darfst du heimlich einen Werwolf töten. Du gewinnst nur, wenn du als Letzter übrig bleibst.',
      descEN: 'You hunt with the werewolves but play for yourself. Every second night you may secretly kill a werewolf. You win only as the last survivor.',
      tip: 'Wacht in geraden Nächten (2, 4, 6 …) allein auf.',
      tipEN: 'Wakes alone on even nights (2, 4, 6 …).'
    },

    // ---------------------------------------------------------------- Village
    {
      id: 'dorfbewohner', nameEN: 'Villager', name: 'Dorfbewohner', emoji: '🧑‍🌾', team: 'dorf',
      wakes: [], max: 99, weight: 1, tags: ['klassisch'],
      desc: 'Du hast keine besonderen Fähigkeiten – nur deinen Verstand. Finde die Werwölfe und überlebe!',
      descEN: 'You have no special abilities – only your wits. Find the werewolves and survive!'
    },
    {
      id: 'seherin', nameEN: 'Seer', name: 'Seherin', emoji: '👁️', team: 'dorf',
      wakes: ['seherin'], weight: 7, tags: ['klassisch'],
      desc: 'Jede Nacht darfst du einen Spieler anschauen und erfährst, ob er zu den Werwölfen gehört.',
      descEN: 'Each night you may look at one player and learn whether they belong to the werewolves.',
      tip: 'In den Einstellungen umstellbar: Seherin sieht die genaue Rolle.',
      tipEN: 'Can be switched in settings: the Seer sees the exact role.'
    },
    {
      id: 'hexe', nameEN: 'Witch', name: 'Hexe', emoji: '🧙‍♀️', team: 'dorf',
      wakes: ['hexe'], weight: 6, tags: ['klassisch'],
      desc: 'Du erfährst jede Nacht das Opfer der Werwölfe. Einmal im Spiel kannst du es mit deinem Heiltrank retten, einmal mit deinem Gifttrank jemanden töten.',
      descEN: 'Each night you learn the werewolves\' victim. Once per game you may save it with your healing potion, and once kill someone with your poison.'
    },
    {
      id: 'jaeger', nameEN: 'Hunter', name: 'Jäger', emoji: '🏹', team: 'dorf',
      wakes: [], weight: 3, tags: ['klassisch'],
      desc: 'Wenn du stirbst – egal wie –, gibst du einen letzten Schuss ab und nimmst einen Spieler mit in den Tod.',
      descEN: 'When you die – no matter how – you fire one last shot and take a player with you.'
    },
    {
      id: 'amor', nameEN: 'Cupid', name: 'Amor', emoji: '💘', team: 'dorf',
      wakes: ['amor'], weight: 1, tags: ['klassisch'],
      desc: 'In der ersten Nacht verliebst du zwei Spieler (du darfst dich selbst wählen). Stirbt einer, stirbt der andere vor Kummer. Sind sie aus verschiedenen Lagern, gewinnen sie nur, wenn sie als Einzige übrig bleiben.',
      descEN: 'On the first night you make two players fall in love (you may pick yourself). If one dies, the other dies of grief. If they belong to different sides, they win only as the last two survivors.'
    },
    {
      id: 'leibwaechter', nameEN: 'Bodyguard', name: 'Leibwächter', emoji: '🛡️', team: 'dorf',
      wakes: ['leibwaechter'], weight: 4, tags: ['klassisch'],
      desc: 'Jede Nacht beschützt du einen anderen Spieler vor Werwölfen, Vampirbiss und Serienmörder. Nicht zweimal hintereinander dieselbe Person.',
      descEN: 'Each night you protect another player from werewolves, vampire bites and the serial killer. Not the same person twice in a row.'
    },
    {
      id: 'priester', nameEN: 'Priest', name: 'Priester', emoji: '🙏', team: 'dorf',
      wakes: ['priester'], weight: 4, tags: ['klassisch'],
      desc: 'Jede Nacht segnest du einen Spieler – auch dich selbst. Er ist in dieser Nacht vor Werwölfen, Vampirbiss und Serienmörder geschützt.',
      descEN: 'Each night you bless one player – yourself included. They are protected from werewolves, vampire bites and the serial killer that night.'
    },
    {
      id: 'verfluchter', nameEN: 'Cursed', name: 'Verfluchter', emoji: '⛓️', team: 'dorf',
      wakes: [], weight: -2, tags: ['klassisch'],
      desc: 'Du beginnst als Dorfbewohner. Greifen dich die Werwölfe an, stirbst du nicht – du wirst selbst zum Werwolf und wachst ab der nächsten Nacht mit ihnen auf.',
      descEN: 'You start as a villager. If the werewolves attack you, you don\'t die – you become a werewolf and wake with them from the next night on.'
    },
    {
      id: 'dorfmatratze', nameEN: 'Village Harlot', name: 'Dorfmatratze', emoji: '💃', team: 'dorf',
      wakes: ['dorfmatratze'], weight: 2, tags: ['klassisch'],
      desc: 'Jede Nacht besuchst du jemanden. Wirst du zu Hause angegriffen, bist du nicht da und überlebst. Wird dein Gastgeber getötet, stirbst du mit ihm.',
      descEN: 'Each night you visit someone. If you are attacked at home, you\'re not there and survive. If your host is killed, you die with them.'
    },
    {
      id: 'blumenkind', nameEN: 'Flower Child', name: 'Blumenkind', emoji: '🌸', team: 'dorf',
      wakes: [], weight: 2, tags: ['klassisch'],
      desc: 'Einmal im Spiel kannst du vor einer Abstimmung einen Spieler unter deinen Schutz stellen – er kann an diesem Tag nicht gehängt werden.',
      descEN: 'Once per game, before a vote, you can place one player under your protection – they cannot be lynched that day.',
      tip: 'Meldet sich offen beim Spielleiter vor der Abstimmung.',
      tipEN: 'Speaks up openly before the vote.'
    },
    {
      id: 'akw', nameEN: 'Nuclear Plant', name: 'AKW', emoji: '☢️', team: 'dorf',
      wakes: [], weight: 0, tags: ['klassisch', 'chaos'],
      desc: 'Du bist ein Dorfbewohner mit Strahlung. Stirbst du, reißt du bis zu zwei weitere Spieler mit in den Tod – die Spielleitung entscheidet, wen es trifft.',
      descEN: 'You are a radioactive villager. When you die, up to two more players die with you – the game master decides who.'
    },
    {
      id: 'guenstling', nameEN: 'Minion', name: 'Günstling', emoji: '🤫', team: 'dorf',
      wakes: ['guenstling'], weight: -3, tags: ['klassisch'],
      desc: 'Du lebst im Dorf, hilfst aber heimlich den Bösen. In der ersten Nacht erfährst du, wer die Werwölfe sind (sie kennen dich nicht). Du gewinnst mit ihnen. Die Seherin sieht dich als harmlos.',
      descEN: 'You live in the village but secretly help the evil side. On the first night you learn who the werewolves are (they don\'t know you). You win with them. The Seer sees you as harmless.',
      tip: 'Gibt es keine Werwölfe, hilft er den Vampiren.',
      tipEN: 'If there are no werewolves, the Minion helps the vampires.'
    },
    {
      id: 'reinigungskraft', nameEN: 'Cleaner', name: 'Reinigungskraft', emoji: '🧹', team: 'dorf',
      wakes: [], weight: 1, tags: ['klassisch'],
      desc: 'Einmal im Spiel, direkt nach einer Hinrichtung, darfst du entscheiden, dass die Rolle des Gehängten geheim bleibt.',
      descEN: 'Once per game, right after an execution, you may decide that the executed player\'s role stays secret.',
      tip: 'Nur sinnvoll, wenn Rollen Verstorbener aufgedeckt werden.',
      tipEN: 'Only useful if roles of the dead are revealed.'
    },
    {
      id: 'geist', nameEN: 'Ghost', name: 'Geist', emoji: '👻', team: 'dorf',
      wakes: [], weight: 2, tags: ['klassisch'],
      desc: 'Auch nach deinem Tod hilfst du dem Dorf: Jeden Tag darfst du genau ein Wort sagen – aber keinen Namen und keine Rolle.',
      descEN: 'Even after death you help the village: each day you may say exactly one word – but no name and no role.'
    },
    {
      id: 'freimaurer', nameEN: 'Freemason', name: 'Freimaurer', emoji: '🤝', team: 'dorf',
      wakes: ['freimaurer'], max: 4, weight: 2, tags: ['klassisch'],
      desc: 'In der ersten Nacht lernst du die anderen Freimaurer kennen. Ihr wisst sicher, dass ihr einander vertrauen könnt.',
      descEN: 'On the first night you meet the other Freemasons. You know for sure you can trust each other.',
      tip: 'Am besten zu zweit oder zu dritt einsetzen.',
      tipEN: 'Best used in pairs or threes.'
    },
    {
      id: 'wildeskind', nameEN: 'Wild Child', name: 'Wildes Kind', emoji: '🐾', team: 'dorf', isNew: true,
      wakes: ['wildeskind'], weight: 0, tags: ['neu'],
      desc: 'In der ersten Nacht wählst du ein Vorbild. Solange es lebt, bist du Dorfbewohner. Stirbt dein Vorbild, wirst du heimlich zum Werwolf.',
      descEN: 'On the first night you choose a role model. While they live, you are a villager. If your role model dies, you secretly become a werewolf.'
    },
    {
      id: 'dorfdepp', nameEN: 'Village Idiot', name: 'Dorfdepp', emoji: '🤪', team: 'dorf', isNew: true,
      wakes: [], weight: 2, tags: ['neu'],
      desc: 'Wirst du vom Dorf gehängt, merken alle, dass du nur der Dorfdepp bist: Du überlebst, verlierst aber dein Stimmrecht.',
      descEN: 'If the village lynches you, everyone realises you\'re just the village idiot: you survive but lose your right to vote.'
    },
    {
      id: 'ritter', nameEN: 'Knight with Rusty Sword', name: 'Ritter mit rostigem Schwert', emoji: '⚔️', team: 'dorf', isNew: true,
      wakes: [], weight: 3, tags: ['neu'],
      desc: 'Töten dich die Werwölfe, steckt ihr Rost in der Wunde: Der nächste Werwolf links von dir (in Sitzreihenfolge) stirbt in der folgenden Nacht.',
      descEN: 'If the werewolves kill you, your rusty sword infects them: the next werewolf to your left (in seating order) dies the following night.'
    },
    {
      id: 'aeltester', nameEN: 'Elder', name: 'Ältester', emoji: '🧓', team: 'dorf', isNew: true,
      wakes: [], weight: 3, tags: ['neu'],
      desc: 'Du bist zäh: Den ersten Angriff der Werwölfe überlebst du. Erst beim zweiten Mal erwischen sie dich.',
      descEN: 'You are tough: you survive the werewolves\' first attack. Only the second one gets you.'
    },
    {
      id: 'rotkaeppchen', nameEN: 'Red Riding Hood', name: 'Rotkäppchen', emoji: '🧣', team: 'dorf', isNew: true,
      wakes: [], weight: 2, tags: ['neu'],
      desc: 'Solange der Jäger lebt, trauen sich die Werwölfe nicht an dich heran – ihre Angriffe scheitern.',
      descEN: 'As long as the Hunter is alive, the werewolves don\'t dare to touch you – their attacks fail.',
      tip: 'Nur zusammen mit dem Jäger sinnvoll.',
      tipEN: 'Only useful together with the Hunter.'
    },
    {
      id: 'fuchs', nameEN: 'Fox', name: 'Fuchs', emoji: '🦊', team: 'dorf', isNew: true,
      wakes: ['fuchs'], weight: 4, tags: ['neu'],
      desc: 'Jede Nacht schnupperst du an einem Spieler und seinen beiden Sitznachbarn. Ist ein Werwolf darunter, behältst du deine Nase. Wenn nicht, verlierst du deine Fähigkeit.',
      descEN: 'Each night you sniff a player and their two neighbours. If a werewolf is among them, you keep your nose. If not, you lose your power.'
    },
    {
      id: 'baerenfuehrer', nameEN: 'Bear Tamer', name: 'Bärenführer', emoji: '🐻', team: 'dorf', isNew: true,
      wakes: [], weight: 3, tags: ['neu'],
      desc: 'Jeden Morgen brummt dein Bär, wenn einer deiner beiden lebenden Sitznachbarn ein Werwolf ist. Das ganze Dorf hört es.',
      descEN: 'Every morning your bear growls if one of your two living neighbours is a werewolf. The whole village hears it.',
      tip: 'Die App sagt dir morgens automatisch, ob der Bär brummt.',
      tipEN: 'The app tells you every morning whether the bear growls.'
    },
    {
      id: 'richter', nameEN: 'Stuttering Judge', name: 'Stotternder Richter', emoji: '⚖️', team: 'dorf', isNew: true,
      wakes: [], weight: 2, tags: ['neu'],
      desc: 'Einmal im Spiel kannst du nach einer Abstimmung eine zweite Abstimmung am selben Tag erzwingen. Gib der Spielleitung vorher heimlich ein Zeichen.',
      descEN: 'Once per game you can force a second vote on the same day. Give the game master a secret sign beforehand.'
    },
    {
      id: 'suendenbock', nameEN: 'Scapegoat', name: 'Sündenbock', emoji: '🐐', team: 'dorf', isNew: true,
      wakes: [], weight: 1, tags: ['neu'],
      desc: 'Endet eine Abstimmung unentschieden, wirst du statt der anderen gehängt. Pech gehabt – aber das Dorf verliert keinen Unschuldigen mehr durch Zufall.',
      descEN: 'If a vote ends in a tie, you are executed instead. Tough luck – but the village no longer loses someone at random.'
    },
    {
      id: 'rabe', nameEN: 'Raven', name: 'Rabe', emoji: '🐦‍⬛', team: 'dorf', isNew: true,
      wakes: ['rabe'], weight: 3, tags: ['neu'],
      desc: 'Jede Nacht darfst du einen Verdächtigen markieren. Am nächsten Tag startet er mit zwei Stimmen gegen sich in die Abstimmung.',
      descEN: 'Each night you may mark a suspect. The next day they start the vote with two votes against them.'
    },
    {
      id: 'detektiv', nameEN: 'Detective', name: 'Detektiv', emoji: '🕵️', team: 'dorf', isNew: true,
      wakes: ['detektiv'], weight: 4, tags: ['neu'],
      desc: 'Jede Nacht zeigst du auf zwei Spieler und erfährst, ob sie zum selben Lager gehören.',
      descEN: 'Each night you point at two players and learn whether they belong to the same side.'
    },
    {
      id: 'engel', nameEN: 'Angel', name: 'Engel', emoji: '😇', team: 'dorf', isNew: true,
      wakes: [], weight: 0, tags: ['neu', 'chaos'],
      desc: 'Stirbst du in der ersten Runde (erste Nacht oder erster Tag), gewinnst du sofort allein. Überlebst du sie, bist du ein normaler Dorfbewohner.',
      descEN: 'If you die in the first round (first night or first day), you win alone immediately. If you survive it, you are a normal villager.'
    },

    // ---------------------------------------------------------------- Others
    {
      id: 'vampir', nameEN: 'Vampire', name: 'Vampir', emoji: '🧛', team: 'vampir', max: 3,
      wakes: ['vampire'], weight: -6, tags: ['klassisch', 'chaos'],
      desc: 'Eigenes Lager. Jede Nacht beißt du ein Opfer – es stirbt am Ende des nächsten Tages. Werwölfe können dir nichts anhaben. Ihr gewinnt, wenn nur noch Vampire übrig sind.',
      descEN: 'Your own side. Each night you bite a victim – it dies at the end of the next day. Werewolves can\'t hurt you. You win when only vampires remain.'
    },
    {
      id: 'serienmoerder', nameEN: 'Serial Killer', name: 'Serienmörder', emoji: '🔪', team: 'solo', isNew: true,
      wakes: ['serienmoerder'], weight: -6, tags: ['neu', 'chaos'],
      desc: 'Du spielst allein. Jede Nacht tötest du einen Spieler. Werwölfe können dir nichts anhaben. Du gewinnst als letzter Überlebender.',
      descEN: 'You play alone. Each night you kill a player. Werewolves can\'t hurt you. You win as the last survivor.'
    },
    {
      id: 'babywolf', nameEN: 'Wolf Cub', name: 'Baby-Werwolf', emoji: '🍼', team: 'wolf', appearsWolf: true, isNew: true,
      wakes: ['werwoelfe'], max: 2, weight: -5, tags: ['neu'],
      desc: 'Du bist ein junger Werwolf und jagst mit dem Rudel. Wirst du getötet, sind die Werwölfe so wütend und entsetzt, dass sie in der nächsten Nacht zwei Opfer reißen.',
      descEN: 'You are a young werewolf and hunt with the pack. If you are killed, the werewolves are so furious and shocked that they take two victims the following night.'
    },
    {
      id: 'moench', nameEN: 'Monk', name: 'Mönch', emoji: '💧', team: 'dorf', isNew: true,
      wakes: ['moench'], weight: 4, tags: ['neu'],
      desc: 'Einmal im Spiel wirfst du nachts Weihwasser auf einen Spieler. Ist er ein Werwolf, stirbt er. Ist er keiner, stirbst du.',
      descEN: 'Once per game you throw holy water at a player at night. If they are a werewolf, they die. If not, you die.',
      tip: 'Nur einsetzen, wenn du dir sehr sicher bist.',
      tipEN: 'Only use it when you are very sure.'
    },
    {
      id: 'geisterhand', nameEN: 'Ghost Hand', name: 'Geisterhand', emoji: '✍️', team: 'dorf', isNew: true,
      wakes: ['geisterhand'], weight: 2, tags: ['neu'],
      desc: 'Nach deinem Tod erwachst du jede Nacht und hinterlässt ein geheimes Zeichen – gemalt auf dem Handy oder auf Papier. Am Morgen sieht es das ganze Dorf. Keine Buchstaben, keine Namen.',
      descEN: 'After your death you wake every night and leave a secret sign – drawn on the phone or on paper. In the morning the whole village sees it. No letters, no names.'
    }
  ];

  /* ------------------------------------------------------------------------
     NIGHT ORDER – the app calls the steps in this order.
       order    position (small = early)
       when     'first' (night 1 only) | 'always' | 'even' (nights 2, 4, …)
       kind     'pick' (choose players) | 'info' (hint only) |
                'yesno' | 'hexe' (witch potions) | 'draw' (drawing pad)
     Custom roles created in the app are added at runtime (engine.js → setCustomRoles).
       count    how many players are chosen
       targets  filter name (see engine.js → TARGETS)
       title/wake/sleep (+ …EN)  narration to read aloud
     ------------------------------------------------------------------------ */
  const NIGHT_STEPS = [
    { id: 'amor', order: 10, when: 'first', kind: 'pick', count: 2, targets: 'alive', title: 'Amor',
      wake: 'Amor erwacht und zeigt auf zwei Menschen, die sich unsterblich verlieben.',
      sleep: 'Amor schläft wieder ein.',
      titleEN: 'Cupid', wakeEN: 'Cupid wakes up and points at two people who will fall madly in love.', sleepEN: 'Cupid goes back to sleep.' },
    { id: 'liebende', order: 11, when: 'first', kind: 'info', title: 'Die Verliebten',
      wake: 'Die beiden Verliebten öffnen die Augen und erkennen einander.',
      sleep: 'Die Verliebten schließen die Augen wieder.',
      titleEN: 'The Lovers', wakeEN: 'The two lovers open their eyes and recognise each other.', sleepEN: 'The lovers close their eyes again.' },
    { id: 'wildeskind', order: 12, when: 'first', kind: 'pick', count: 1, targets: 'others', title: 'Wildes Kind',
      wake: 'Das wilde Kind erwacht und zeigt auf sein Vorbild.',
      sleep: 'Das wilde Kind schläft wieder ein.',
      titleEN: 'Wild Child', wakeEN: 'The wild child wakes up and points at its role model.', sleepEN: 'The wild child goes back to sleep.' },
    { id: 'freimaurer', order: 13, when: 'first', kind: 'info', title: 'Freimaurer',
      wake: 'Die Freimaurer erwachen und erkennen einander.',
      sleep: 'Die Freimaurer schlafen wieder ein.',
      titleEN: 'Freemasons', wakeEN: 'The freemasons wake up and recognise each other.', sleepEN: 'The freemasons go back to sleep.' },
    { id: 'guenstling', order: 14, when: 'first', kind: 'info', title: 'Günstling',
      wake: 'Günstling, öffne die Augen. Werwölfe, hebt die Hand – aber lasst die Augen geschlossen.',
      sleep: 'Werwölfe, Hand runter. Günstling, schließ die Augen.',
      titleEN: 'Minion', wakeEN: 'Minion, open your eyes. Werewolves, raise your hand – but keep your eyes closed.', sleepEN: 'Werewolves, hands down. Minion, close your eyes.' },
    { id: 'seherin', order: 20, when: 'always', kind: 'pick', count: 1, targets: 'others', title: 'Seherin',
      wake: 'Die Seherin erwacht und zeigt auf einen Menschen, dessen Wesen sie erkennen möchte.',
      sleep: 'Die Seherin schläft wieder ein.',
      titleEN: 'Seer', wakeEN: 'The seer wakes up and points at a person whose true nature she wants to see.', sleepEN: 'The seer goes back to sleep.' },
    { id: 'fuchs', order: 21, when: 'always', kind: 'pick', count: 1, targets: 'alive', title: 'Fuchs',
      wake: 'Der Fuchs erwacht und schnuppert an einem Menschen und seinen Nachbarn.',
      sleep: 'Der Fuchs schläft wieder ein.',
      titleEN: 'Fox', wakeEN: 'The fox wakes up and sniffs at a person and their neighbours.', sleepEN: 'The fox goes back to sleep.' },
    { id: 'detektiv', order: 22, when: 'always', kind: 'pick', count: 2, targets: 'alive', title: 'Detektiv',
      wake: 'Der Detektiv erwacht und zeigt auf zwei Menschen, die er vergleichen will.',
      sleep: 'Der Detektiv schläft wieder ein.',
      titleEN: 'Detective', wakeEN: 'The detective wakes up and points at two people to compare.', sleepEN: 'The detective goes back to sleep.' },
    { id: 'wolfsseherin', order: 23, when: 'always', kind: 'pick', count: 1, targets: 'others', title: 'Wolfsseherin',
      wake: 'Die Wolfsseherin erwacht und zeigt auf einen Menschen, dessen Rolle sie erfahren will.',
      sleep: 'Die Wolfsseherin schläft wieder ein.',
      titleEN: 'Wolf Seer', wakeEN: 'The wolf seer wakes up and points at a person whose role she wants to learn.', sleepEN: 'The wolf seer goes back to sleep.' },
    { id: 'leibwaechter', order: 30, when: 'always', kind: 'pick', count: 1, targets: 'bodyguard', title: 'Leibwächter',
      wake: 'Der Leibwächter erwacht und zeigt auf den Menschen, den er heute Nacht beschützt.',
      sleep: 'Der Leibwächter schläft wieder ein.',
      titleEN: 'Bodyguard', wakeEN: 'The bodyguard wakes up and points at the person to protect tonight.', sleepEN: 'The bodyguard goes back to sleep.' },
    { id: 'priester', order: 31, when: 'always', kind: 'pick', count: 1, targets: 'alive', title: 'Priester',
      wake: 'Der Priester erwacht und segnet einen Menschen.',
      sleep: 'Der Priester schläft wieder ein.',
      titleEN: 'Priest', wakeEN: 'The priest wakes up and blesses a person.', sleepEN: 'The priest goes back to sleep.' },
    { id: 'dorfmatratze', order: 32, when: 'always', kind: 'pick', count: 1, targets: 'others', title: 'Dorfmatratze',
      wake: 'Die Dorfmatratze erwacht und zeigt, bei wem sie heute übernachtet.',
      sleep: 'Die Dorfmatratze schläft wieder ein.',
      titleEN: 'Village Harlot', wakeEN: 'The village harlot wakes up and points at where she spends the night.', sleepEN: 'The village harlot goes back to sleep.' },
    { id: 'rabe', order: 33, when: 'always', kind: 'pick', count: 1, targets: 'alive', title: 'Rabe',
      wake: 'Der Rabe erwacht und markiert einen Verdächtigen.',
      sleep: 'Der Rabe schläft wieder ein.',
      titleEN: 'Raven', wakeEN: 'The raven wakes up and marks a suspect.', sleepEN: 'The raven goes back to sleep.' },
    { id: 'moench', order: 34, when: 'always', kind: 'pick', count: 1, targets: 'others', title: 'Mönch',
      wake: 'Der Mönch erwacht. Will er heute Nacht sein Weihwasser auf jemanden werfen?',
      sleep: 'Der Mönch schläft wieder ein.',
      titleEN: 'Monk', wakeEN: 'The monk wakes up. Will he throw his holy water at someone tonight?', sleepEN: 'The monk goes back to sleep.' },
    { id: 'werwoelfe', order: 40, when: 'always', kind: 'pick', count: 1, targets: 'nonWolf', title: 'Werwölfe',
      wake: 'Die Werwölfe erwachen, erkennen einander und einigen sich lautlos auf ein Opfer.',
      sleep: 'Die Werwölfe schlafen wieder ein.',
      titleEN: 'Werewolves', wakeEN: 'The werewolves awaken, recognise each other and silently agree on a victim.', sleepEN: 'The werewolves go back to sleep.' },
    { id: 'urwolf', order: 41, when: 'always', kind: 'yesno', title: 'Urwolf',
      wake: 'Urwolf, willst du das Opfer infizieren statt töten? Daumen hoch für Ja.',
      sleep: '',
      titleEN: 'Alpha Wolf', wakeEN: 'Alpha wolf, do you want to infect the victim instead of killing it? Thumbs up for yes.', sleepEN: '' },
    { id: 'weisserwolf', order: 42, when: 'even', kind: 'pick', count: 1, targets: 'otherWolves', title: 'Weißer Werwolf',
      wake: 'Der weiße Werwolf erwacht und darf einen Werwolf töten.',
      sleep: 'Der weiße Werwolf schläft wieder ein.',
      titleEN: 'White Werewolf', wakeEN: 'The white werewolf wakes up and may kill a werewolf.', sleepEN: 'The white werewolf goes back to sleep.' },
    { id: 'vampire', order: 45, when: 'always', kind: 'pick', count: 1, targets: 'nonVampire', title: 'Vampire',
      wake: 'Die Vampire erwachen und wählen ein Opfer für ihren Biss.',
      sleep: 'Die Vampire schlafen wieder ein.',
      titleEN: 'Vampires', wakeEN: 'The vampires wake up and choose a victim to bite.', sleepEN: 'The vampires go back to sleep.' },
    { id: 'serienmoerder', order: 46, when: 'always', kind: 'pick', count: 1, targets: 'others', title: 'Serienmörder',
      wake: 'Der Serienmörder erwacht und wählt sein Opfer.',
      sleep: 'Der Serienmörder schläft wieder ein.',
      titleEN: 'Serial Killer', wakeEN: 'The serial killer wakes up and chooses a victim.', sleepEN: 'The serial killer goes back to sleep.' },
    { id: 'hexe', order: 50, when: 'always', kind: 'hexe', title: 'Hexe',
      wake: 'Die Hexe erwacht und erfährt das Opfer der Werwölfe. Will sie heilen? Will sie vergiften?',
      sleep: 'Die Hexe schläft wieder ein.',
      titleEN: 'Witch', wakeEN: 'The witch wakes up and learns who the werewolves chose. Will she heal? Will she poison?', sleepEN: 'The witch goes back to sleep.' },
    { id: 'geisterhand', order: 60, when: 'always', kind: 'draw', title: 'Geisterhand',
      wake: 'Die Geisterhand erwacht und hinterlässt ein geheimes Zeichen.',
      sleep: 'Die Geisterhand verschwindet wieder.',
      titleEN: 'Ghost Hand', wakeEN: 'The ghost hand awakens and leaves a secret sign.', sleepEN: 'The ghost hand fades away again.' }
  ];

  const TEAMS = {
    dorf:     { name: 'Dorf', nameEN: 'Village',        emoji: '🏡', color: 'var(--team-dorf)' },
    wolf:     { name: 'Werwölfe', nameEN: 'Werewolves',    emoji: '🐺', color: 'var(--team-wolf)' },
    vampir:   { name: 'Vampire', nameEN: 'Vampires',     emoji: '🧛', color: 'var(--team-vampir)' },
    solo:     { name: 'Einzelgänger', nameEN: 'Loners', emoji: '🎭', color: 'var(--team-solo)' },
    liebende: { name: 'Liebende', nameEN: 'Lovers',    emoji: '💞', color: 'var(--team-love)' }
  };

  global.WW_DATA = { ROLES, NIGHT_STEPS, TEAMS };
  if (typeof module !== 'undefined') module.exports = global.WW_DATA;
})(typeof globalThis !== 'undefined' ? globalThis : window);
