/* ==========================================================================
   Werwolf Manager – TEXTS (German / English)
   All visible UI texts live here. Placeholders in {curly braces}.
   Role and narration texts live in roles.js (name/nameEN, desc/descEN …).
   New language: add another block like `en`.
   ========================================================================== */
(function (global) {
  'use strict';

  const STR = {
    de: {
      // ---- General
      'common.back': 'Zurück', 'common.cancel': 'Abbrechen', 'common.close': 'Schließen', 'common.confirm': 'Bestätigen',
      'common.done': 'Fertig', 'common.next': 'Weiter', 'common.skip': 'Überspringen',
      'a11y.add': 'Spieler hinzufügen', 'a11y.up': 'nach oben', 'a11y.down': 'nach unten', 'a11y.remove': 'entfernen',
      'a11y.less': 'weniger', 'a11y.more': 'mehr', 'a11y.lang': 'Sprache wechseln', 'a11y.mute': 'Ton an/aus', 'a11y.nav': 'Spielmenü', 'a11y.read': 'Vorlesen',
      'nav.undo': 'Zurück', 'nav.players': 'Spieler', 'nav.log': 'Chronik', 'nav.options': 'Optionen', 'nav.news': 'Was ist neu?',
      // ---- Setup
      'setup.mode': 'Spielmodus', 'setup.players': 'Spieler', 'setup.roles': 'Rollen',
      'setup.seatHint': 'Reihenfolge = Sitzordnung im Uhrzeigersinn (wichtig für Fuchs, Bär, Ritter und AKW).',
      'setup.namePh': 'Name eingeben …', 'setup.clear': 'Alle entfernen', 'setup.clearQ': 'Alle Spieler entfernen?', 'setup.clearOk': 'Entfernen',
      'setup.rolesHint': 'Tippe auf eine Rolle für die Beschreibung.', 'setup.suggest': 'Vorschlag für {n} Spieler', 'setup.reset': 'Leeren',
      'setup.noRoles': 'Noch keine Rollen gewählt.', 'setup.new': 'NEU', 'setup.newV2': 'NEU in v2', 'setup.start': 'Rollen verteilen',
      'setup.lastGame': 'Letztes Spiel', 'setup.view': 'Ansehen', 'setup.running': 'Laufendes Spiel', 'setup.revealing': 'Rollen werden aufgedeckt',
      'setup.nPlayers': '{n} Spieler', 'setup.continue': 'Weiter', 'setup.discard': 'Verwerfen', 'setup.discardQ': 'Laufendes Spiel verwerfen?',
      'setup.overwriteQ': 'Das laufende Spiel wird überschrieben.', 'setup.overwriteOk': 'Neues Spiel', 'setup.v1': 'alte Version 1',
      'filter.all': 'Alle', 'filter.classic': 'Klassisch', 'filter.new': 'Neu in v2', 'filter.picked': 'Gewählt',
      'mode.gm': 'Mit Spielleitung', 'mode.gmDesc': 'Eine Person leitet und sieht alle Rollen.', 'mode.gmShort': 'Spielleitung',
      'mode.auto': 'Ohne Spielleitung', 'mode.autoDesc': 'Alle spielen mit, das Handy liegt in der Mitte und erzählt.', 'mode.autoShort': 'Ohne Spielleitung',
      'bal.title': 'Balance', 'bal.pick': 'Wähle Rollen', 'bal.even': 'Ausgeglichen ✓', 'bal.evil': 'Die Bösen im Vorteil', 'bal.village': 'Dorf im Vorteil',
      'role.wakes': 'wacht nachts auf',
      // ---- Reveal
      'reveal.title': 'Rollen aufdecken', 'reveal.passTo': 'Gib das Gerät an', 'reveal.othersLook': 'Alle anderen schauen weg 🙈',
      'reveal.iAm': 'Ich bin {name}', 'reveal.qr': 'QR-Code fürs eigene Handy', 'reveal.toSetup': 'Zum Einrichten',
      'reveal.yourRole': '{name}, deine Rolle:', 'reveal.hold': 'Gedrückt halten', 'reveal.swipe': 'oder nach oben schieben',
      'reveal.understood': 'Verstanden', 'reveal.understoodPass': 'Verstanden – weitergeben', 'reveal.secretly': 'heimlich {team}',
      'reveal.allDone': 'Alle kennen ihre Rolle', 'reveal.doneGm': 'Gib das Gerät jetzt der Spielleitung. Alle schließen die Augen – die erste Nacht beginnt.',
      'reveal.doneAuto': 'Legt das Handy in die Mitte und dreht den Ton auf. Ab jetzt erzählt das Handy.',
      'reveal.begin': 'Nacht 1 beginnen', 'reveal.lastAgain': 'Letzte Karte nochmal',
      'reveal.qrFor': 'QR-Code für {name}', 'reveal.qrHint': 'Mit der Handykamera scannen – die Rolle erscheint auf dem eigenen Handy. Nur {name} schaut hin!',
      'reveal.qrDone': 'Gescannt – weiter', 'reveal.qrFail': 'QR-Code konnte nicht geladen werden (keine Internetverbindung?).',
      'qr.invalid': 'Dieser Link enthält keine gültige Rolle.', 'qr.openApp': 'Werwolf Manager öffnen', 'qr.close': 'Wenn du deine Rolle kennst, kannst du dieses Fenster schließen.',
      // ---- Game
      'game.over': 'Spielende', 'game.noTargets': 'Keine wählbaren Spieler.',
      'label.night': 'Nacht {n}', 'label.day': 'Tag {n}', 'label.start': 'Start',
      // ---- Night
      'night.wakes': 'Wacht auf: {names}', 'night.notInGame': 'nicht mehr im Spiel', 'night.then': 'Danach:',
      'night.fake': 'Diese Rolle ist nicht mehr im Spiel. Rufe sie trotzdem auf, warte ein paar Sekunden und mach dann weiter – so verrät niemand etwas.',
      'night.pickOne': 'Wähle einen Spieler:', 'night.pickN': 'Wähle {n} Spieler ({k}/{n}):', 'night.noVictim': 'Kein Opfer',
      'night.infect': 'Ja, infizieren', 'night.kill': 'Nein, töten',
      'night.heal': 'Heiltrank', 'night.healDesc': 'Rettet das Opfer der Werwölfe', 'night.healNone': 'Kein Opfer zu retten', 'night.used': 'Bereits verbraucht',
      'night.poison': 'Gifttrank', 'night.poisonDesc': 'Tötet einen Spieler deiner Wahl', 'night.noPotion': 'Keinen Trank einsetzen',
      // ---- No game master
      'auto.nightTitle': 'Nacht {n}', 'auto.nightIntro': 'Alle schließen die Augen. Tippt auf „Los“ – ab dann erzählt das Handy. Wer aufgerufen wird, öffnet die Augen, tippt seine Wahl und schließt sie wieder.',
      'auto.go': 'Los', 'auto.eyesClosed': 'Augen zu …', 'auto.onlyYou': 'Nur du schaust jetzt hin',
      'auto.gotIt': 'Verstanden', 'auto.done': 'Erledigt', 'auto.amorTap': 'Tippe jetzt {names} an der Schulter an – sie sind verliebt. Dann tippe auf „Erledigt“.',
      // ---- Morning & verdict
      'news.morningIntro': 'Das Dorf erwacht. Verkünde, was in der Nacht geschah:', 'news.duskIntro': 'Die Sonne geht unter …',
      'news.toDay': 'Weiter zum Tag', 'news.endDay': 'Tag beenden', 'news.startNight': 'Nacht {n} beginnen',
      'news.judge': 'Richter {name}: zweite Abstimmung', 'news.judgeAuto': 'Zweite Abstimmung (Richter)', 'news.secret': 'Nur für die Spielleitung ({n})',
      'news.whatsNew': 'Neu in Version {v}', 'news.version': 'Version {v} · {d}', 'news.letsGo': 'Los geht’s',
      // ---- Interrupts
      'int.hunter': 'Letzter Schuss von {name}', 'int.hunterText': 'Der Jäger reißt im Sterben jemanden mit. Wen trifft der Schuss?', 'int.hunterSkip': 'Nicht schießen',
      'int.akw': 'Das AKW von {name}', 'int.akwText': 'Bis zu zwei Spieler werden verstrahlt. Vorgeschlagen sind die Sitznachbarn – du entscheidest.',
      'int.akwAuto': 'Die Strahlung trifft die beiden Sitznachbarn.', 'int.akwSkip': 'Niemanden treffen',
      'int.mayor': '{name} gibt das Amt weiter', 'int.mayorText': 'Der sterbende Bürgermeister bestimmt einen Nachfolger.', 'int.mayorSkip': 'Keinen Nachfolger',
      // ---- Day
      'mayor.title': 'Bürgermeisterwahl', 'mayor.day1': 'Erster Tag', 'mayor.none': 'Ohne', 'mayor.elect': 'Wählen',
      'mayor.text': 'Seine Stimme zählt bei Abstimmungen doppelt, bei Gleichstand entscheidet er. Stirbt er, bestimmt er einen Nachfolger.',
      'day.discussion': 'Diskussion', 'day.discussionText': 'Das Dorf berät, wer verdächtig ist.', 'day.startVote': 'Abstimmung starten',
      'day.mayor': '👑 Bürgermeister: {name} (Stimme zählt doppelt)', 'day.raven': '🐦‍⬛ {name} startet mit 2 Stimmen gegen sich.',
      'day.flower': '🌸 {name} steht heute unter dem Schutz des Blumenkinds.', 'day.ghost': '👻 Geist {name} darf heute ein einziges Wort sagen.',
      'day.noVote': '🔇 {name} darf nicht abstimmen.', 'day.judge': '⚖️ Achte auf das geheime Zeichen des Richters ({name}).',
      'day.flowerBtn': 'Blumenkind {name} schützt jemanden', 'day.flowerPick': 'Wen stellt das Blumenkind ({name}) unter Schutz?', 'day.protect': 'Schützen',
      'timer.start': 'Start', 'timer.pause': 'Pause', 'timer.reset': 'Zurücksetzen', 'timer.up': 'Die Zeit ist um!',
      'vote.title': 'Abstimmung', 'vote.second': 'zweite Runde', 'vote.hands': 'Handzeichen', 'vote.pass': 'Geheim reihum',
      'vote.handsText': 'Zählt die Stimmen offen aus und tippt sie hier ein.', 'vote.mayorHint': '👑 markiert, wofür der Bürgermeister stimmt (zählt doppelt).',
      'vote.resultText': 'Das Ergebnis der geheimen Abstimmung:', 'vote.mayorFor': 'Bürgermeister stimmt für {name}',
      'vote.none': 'Noch keine Stimmen.', 'vote.lead': 'Vorne: {name} mit {n} Stimmen', 'vote.tie': 'Gleichstand: {names}',
      'vote.resolve': 'Auswerten', 'vote.backTalk': 'Diskussion', 'vote.noLynch': 'Niemand hängen',
      'vote.secretHint': 'Niemand schaut zu – deine Stimme ist geheim.', 'vote.whoFor': '{name}, wen willst du hängen?',
      'vote.abstain': 'Enthalten', 'vote.cast': 'Stimme abgeben', 'vote.allVoted': 'Alle haben abgestimmt.', 'vote.showResult': 'Ergebnis zeigen',
      'tie.title': 'Gleichstand', 'tie.mayorDecides': '{name} entscheidet als Bürgermeister', 'tie.nobody': 'Niemand', 'tie.hang': 'Hängen',
      'cleaner.once': 'einmal im Spiel', 'cleaner.text': 'Soll die Rolle von {name} geheim bleiben?', 'cleaner.no': 'Nein, aufdecken', 'cleaner.yes': 'Ja, verbergen',
      // ---- End
      'over.reveal': 'Auflösung', 'over.chronicle': 'Chronik des Spiels', 'over.again': 'Nochmal – gleiche Runde', 'over.change': 'Spieler & Rollen ändern', 'over.survived': 'überlebt',
      // ---- Players & chronicle
      'players.title': 'Spieler ({a}/{n} leben)', 'players.alive': 'lebt', 'players.kill': 'Aus dem Spiel nehmen', 'players.revive': 'Zurückholen',
      'players.killHint': 'Löst alle Folgen aus (Jäger, Liebe, AKW …). Rückgängig ist jederzeit möglich.',
      'players.legend': '👑 Bürgermeister · 💘 verliebt · 🐺 verwandelt · 🦇 gebissen · 🔇 kein Stimmrecht · 💪 Extraleben · 🐾 Vorbild',
      'players.hint': 'Tippe auf einen Spieler, um ihn manuell zu entfernen oder zurückzuholen.',
      'log.hint': 'Geheime Einträge sehen nur die Spielleitung.', 'log.showSecret': 'Geheimes zeigen', 'log.secret': 'geheim',
      // ---- Options
      'set.language': 'Sprache', 'set.languageHint': 'Gilt für die ganze App',
      'set.game': 'Spielregeln', 'set.voteMode': 'Abstimmung', 'set.voteModeHint': 'Offen per Handzeichen oder geheim, Handy geht reihum',
      'set.narration': 'Erzähltexte anzeigen', 'set.narrationHint': 'Vorlesetexte für die Nacht',
      'set.reveal': 'Rollen Verstorbener aufdecken', 'set.revealHint': 'Bei jedem Tod wird die Rolle verkündet',
      'set.dead': 'Tote Rollen weiter aufrufen', 'set.deadHint': 'Zum Schein, damit niemand etwas merkt',
      'set.mayor': 'Bürgermeisterwahl', 'set.mayorHint': 'Am ersten Tag wird ein Bürgermeister gewählt',
      'set.parity': 'Böse gewinnen bei Gleichstand', 'set.parityHint': 'Sobald sie gleich viele sind wie die Übrigen',
      'set.seer': 'Seherin sieht', 'set.seerHint': 'Nur „Werwolf ja/nein“ oder die genaue Rolle', 'set.seerTeam': 'Ja/Nein', 'set.seerRole': 'Rolle',
      'set.minutes': 'Diskussionszeit', 'set.minutesHint': 'Minuten pro Tag',
      'set.sound': 'Sound', 'set.ambient': 'Hintergrundgeräusche', 'set.ambientHint': 'Nachts Grillen & Eule, tagsüber Vögel',
      'set.effects': 'Effekte', 'set.effectsHint': 'Wolfsheulen, Gong, Hahn, Glocke, Timer-Signal …',
      'set.voice': 'Erzählerstimme', 'set.voiceHint': 'Eingesprochen, Browser-Stimme oder aus', 'set.voiceRec': 'Sprecher', 'set.voiceBrowser': 'Browser', 'set.off': 'Aus',
      'set.autoRead': 'Nachts automatisch vorlesen', 'set.autoReadHint': 'Mit Spielleitung: jeder Schritt wird angesagt', 'set.volume': 'Lautstärke',
      'set.lights': 'Licht (Home Assistant)',
      'set.takeOver': 'Spielleitung übernehmen', 'set.takeOverQ': 'Ein (toter) Spieler übernimmt die Spielleitung und sieht ab jetzt alle Rollen. Fortfahren?', 'set.takeOverOk': 'Übernehmen',
      'set.abort': 'Spiel abbrechen', 'set.abortQ': 'Spiel wirklich abbrechen?', 'set.abortOk': 'Abbrechen',
      'ha.intro': 'Deine Lichter spielen mit: tagsüber hell, nachts rot gedimmt, Blinken bei Todesfällen. Home Assistant muss per HTTPS erreichbar sein – du meldest dich ganz normal an.',
      'ha.connect': 'Verbinden', 'ha.connected': 'Verbunden mit {url}', 'ha.noLights': 'Keine Lichter gefunden.', 'ha.test': 'Testen', 'ha.disconnect': 'Trennen',
      'ha.error': 'Verbindung fehlgeschlagen. Stimmt die Adresse und ist Home Assistant per HTTPS erreichbar?', 'ha.needHttps': 'Bitte eine https://-Adresse eingeben.',
      // ---- Toasts
      'toast.undone': '↶ Rückgängig gemacht', 'toast.suggested': 'Ausgewogene Rollen gewählt – gern anpassen', 'toast.removed': 'Spieler entfernt – „Zurück“ macht es rückgängig',
      'toast.dupName': '„{name}“ ist schon dabei', 'toast.max30': 'Maximal 30 Spieler', 'toast.muted': 'Ton aus', 'toast.unmuted': 'Ton an', 'toast.takenOver': 'Du leitest jetzt das Spiel',
      // ---- Narrator (fixed announcements)
      'voice.nightStart': 'Es wird Nacht im Dorf. Alle schließen die Augen.',
      'voice.dayStart': 'Die Sonne geht auf. Das Dorf erwacht. Alle öffnen die Augen.',
      'voice.mayor': 'Bevor ihr Verdächtige sucht, wählt das Dorf offen einen Bürgermeister.',
      'voice.cleaner': 'Alle schließen kurz die Augen. Reinigungskraft, öffne die Augen und entscheide.',
      'voice.eyesOpen': 'Alle öffnen wieder die Augen.',
      // ---- Engine: info & results
      'info.lovers': 'Verliebt: {names}', 'info.masons': 'Freimaurer: {names}', 'info.minion': 'Werwölfe zum Handheben: {names}',
      'info.wolves': 'Werwölfe: {names}', 'info.wolvesNew': 'Werwölfe: {names} · Neu im Rudel: {fresh} – tippt ihn/sie an der Schulter an!',
      'info.urwolf': 'Opfer der Werwölfe: {name}', 'info.hexe': 'Opfer der Werwölfe: {name}', 'info.hexeInfect': 'Opfer der Werwölfe: {name} (soll infiziert werden)',
      'info.hexeNone': 'Die Werwölfe haben niemanden gewählt.', 'info.white': 'Gerade Nacht – der weiße Werwolf darf zuschlagen.', 'info.bg': 'Letzte Nacht geschützt: {name} (heute gesperrt)',
      'res.seerYes': '🐺 Ja – {name} ist ein Werwolf.', 'res.seerNo': '🙂 Nein – {name} ist kein Werwolf.', 'res.seerRole': '{name} ist: {role}',
      'res.wseer': '{name} ist: {role}', 'res.foxYes': '🦊 Ja – bei {list} ist ein Werwolf.', 'res.foxNo': '🦊 Nein – kein Werwolf bei {list}. Der Fuchs verliert seine Nase.',
      'res.detSame': '🕵️ {a} & {b} gehören zum selben Lager.', 'res.detDiff': '🕵️ {a} & {b} gehören zu verschiedenen Lagern.',
      // ---- Engine: announcements
      'title.morning': '☀️ Morgen nach Nacht {n}', 'title.verdict': '⚖️ Urteil', 'title.evening': '🌆 Abend {n}', 'title.gm': '✋ Eingriff der Spielleitung',
      'news.death': '{emo} {name} {cause}.', 'news.deathRole': ' Rolle: {role}.',
      'cause.night.pub': 'ist in der Nacht gestorben', 'cause.liebe.pub': 'stirbt aus Liebeskummer', 'cause.jaeger.pub': 'wurde vom Jäger erschossen',
      'cause.akw.pub': 'wurde vom AKW verstrahlt', 'cause.lynch.pub': 'wurde vom Dorf gehängt', 'cause.spielleitung.pub': 'scheidet aus',
      'cause.vampir.pub': 'bricht in der Abenddämmerung tot zusammen',
      'cause.wolf.sec': 'wurde von den Werwölfen gerissen', 'cause.gift.sec': 'wurde von der Hexe vergiftet', 'cause.serienmoerder.sec': 'wurde vom Serienmörder getötet',
      'cause.weisserwolf.sec': 'wurde vom weißen Werwolf getötet', 'cause.matratze.sec': 'starb beim Besuch eines Opfers', 'cause.ritter.sec': 'starb am rostigen Schwert des Ritters',
      'news.nobodyDied': 'Niemand ist in dieser Nacht gestorben. 🌅', 'news.bearGrowl': '🐻 Der Bär brummt laut!', 'news.bearQuiet': '🐻 Der Bär bleibt ruhig.',
      'news.raven': '🐦‍⬛ Der Rabe hat {name} markiert: +2 Stimmen in der Abstimmung.',
      'news.attackFailed': 'Werwolf-Angriff auf {name} gescheitert: {reason}.', 'news.whiteFailed': 'Weißer Werwolf scheitert an {name}: {reason}.',
      'news.biteBlocked': 'Vampirbiss bei {name} abgewehrt: {reason}.', 'news.bitten': '🦇 {name} wurde gebissen und stirbt am Ende des Tages.',
      'news.skFailed': 'Serienmörder scheitert an {name}: {reason}.',
      'news.cursedTurned': '⛓️ {name} (Verfluchter) wurde zum Werwolf. Ab der nächsten Nacht wacht er mit den Wölfen auf – die Wölfe tippen ihn dann an.',
      'news.infected': '🩸 {name} wurde vom Urwolf infiziert und ist jetzt ein Werwolf.',
      'news.wildTurned': '🐾 Vorbild tot – {name} (Wildes Kind) ist jetzt Werwolf.',
      'news.rusty': '⚔️ Rostiges Schwert: {name} stirbt in der nächsten Nacht.', 'news.roleHidden': '🧹 Rolle von {name} bleibt geheim (war {role}).',
      'news.hunterNoShot': '🏹 {name} hat nicht geschossen.', 'news.akwBoom': '☢️ Das AKW von {name} explodiert!', 'news.akwStable': '☢️ Das AKW von {name} bleibt stabil.',
      'news.mayorPass': '👑 {name} übergibt das Bürgermeisteramt an {to}.', 'news.mayorNone': '👑 Das Dorf hat keinen Bürgermeister mehr.',
      'news.noVotes': 'Keine Stimmen – niemand wird gehängt.', 'news.tieNone': 'Gleichstand zwischen {names} – niemand wird gehängt.',
      'news.dorfdepp': '🤪 {name} ist der Dorfdepp! Alle lachen – er überlebt, darf aber nicht mehr abstimmen.', 'news.spare': 'Das Dorf verschont heute alle.',
      'reason.immune': '{role} ist immun gegen Werwölfe', 'reason.guarded': 'geschützt durch {roles}', 'reason.away': 'nicht zu Hause (Dorfmatratze)',
      'reason.redhood': 'Rotkäppchen – der Jäger lebt noch', 'reason.healed': 'von der Hexe geheilt', 'reason.elder': 'der Älteste übersteht den ersten Angriff',
      // ---- Engine: chronicle
      'log.dealt': 'Rollen verteilt: {list}', 'fmt.nameRole': '{name} = {role}', 'log.nightStart': '🌙 Nacht {n} beginnt.', 'log.dayStart': '☀️ Tag {n} beginnt.',
      'log.stepResult': '{step}: {res}', 'log.amor': '💘 Amor verliebt {names}.', 'log.wildModel': '🐾 Vorbild des wilden Kindes: {name}.',
      'log.deathCause': '{emo} {name} {cause}.', 'log.gameEnd': '🏁 {title} {text}', 'log.mayor': '👑 {name} wurde zum Bürgermeister gewählt.',
      'log.blumen': '🌸 Das Blumenkind schützt {name} vor der Abstimmung.', 'log.goat': '🐐 Gleichstand zwischen {names} – der Sündenbock muss dran glauben.',
      'log.richter': '⚖️ Der stotternde Richter verlangt eine zweite Abstimmung!', 'log.revive': '✋ {name} wurde von der Spielleitung zurückgeholt.',
      'log.takeover': '🧑‍⚖️ Ab jetzt gibt es wieder eine Spielleitung.',
      // ---- Engine: win
      'win.dorf.title': 'Das Dorf gewinnt!', 'win.dorf.text': 'Alle Bedrohungen wurden ausgeschaltet.',
      'win.wolf.title': 'Die Werwölfe gewinnen!', 'win.wolf.text': 'Das Dorf gehört jetzt dem Rudel.',
      'win.vampir.title': 'Die Vampire gewinnen!', 'win.vampir.text': 'Ewige Nacht über dem Dorf.',
      'win.liebende.title': 'Die Liebenden gewinnen!', 'win.liebende.text': '{names} haben allen getrotzt.',
      'win.solo.title': '{role} gewinnt!', 'win.solo.text': '{name} bleibt als Letzter übrig.',
      'win.engel.title': 'Der Engel gewinnt!', 'win.engel.text': '{name} ist in der ersten Runde gestorben und steigt triumphierend auf.',
      'win.niemand.title': 'Niemand gewinnt', 'win.niemand.text': 'Das Dorf ist ausgestorben.',
      // ---- Engine: setup validation
      'val.min4': 'Mindestens 4 Spieler nötig.', 'val.dupName': 'Zwei Spieler haben denselben Namen.', 'val.count': '{n} Spieler, aber {t} Rollen gewählt.',
      'val.max': '{role} darf höchstens {m}× vorkommen.', 'val.noEvil': 'Es fehlt eine böse Rolle (Werwolf, Vampir oder Serienmörder).',
      'warn.manyEvil': 'Sehr viele böse Rollen – das Dorf hat kaum eine Chance.', 'warn.oneEvil': 'Nur eine böse Rolle bei so vielen Spielern – eher leicht fürs Dorf.',
      'warn.mason': 'Ein einzelner Freimaurer erkennt niemanden – nimm mindestens zwei.', 'warn.redhood': 'Rotkäppchen ist ohne Jäger nicht geschützt.',
      'warn.cleaner': 'Reinigungskraft wirkt nur, wenn Rollen Verstorbener aufgedeckt werden.', 'warn.minion': 'Günstling ohne Werwölfe oder Vampire hat niemanden zum Helfen.',
      'warn.white': 'Weißer Werwolf ohne andere Werwölfe jagt allein.',
      'wolfName': 'Werwolf'
    },

    en: {
      'common.back': 'Back', 'common.cancel': 'Cancel', 'common.close': 'Close', 'common.confirm': 'Confirm',
      'common.done': 'Done', 'common.next': 'Next', 'common.skip': 'Skip',
      'a11y.add': 'Add player', 'a11y.up': 'move up', 'a11y.down': 'move down', 'a11y.remove': 'remove',
      'a11y.less': 'fewer', 'a11y.more': 'more', 'a11y.lang': 'Switch language', 'a11y.mute': 'Sound on/off', 'a11y.nav': 'Game menu', 'a11y.read': 'Read aloud',
      'nav.undo': 'Undo', 'nav.players': 'Players', 'nav.log': 'Chronicle', 'nav.options': 'Options', 'nav.news': 'What’s new?',
      'setup.mode': 'Game mode', 'setup.players': 'Players', 'setup.roles': 'Roles',
      'setup.seatHint': 'Order = seating order, clockwise (matters for Fox, Bear, Knight and Nuclear Plant).',
      'setup.namePh': 'Enter a name …', 'setup.clear': 'Remove all', 'setup.clearQ': 'Remove all players?', 'setup.clearOk': 'Remove',
      'setup.rolesHint': 'Tap a role to read its description.', 'setup.suggest': 'Suggest for {n} players', 'setup.reset': 'Clear',
      'setup.noRoles': 'No roles selected yet.', 'setup.new': 'NEW', 'setup.newV2': 'NEW in v2', 'setup.start': 'Deal roles',
      'setup.lastGame': 'Last game', 'setup.view': 'View', 'setup.running': 'Game in progress', 'setup.revealing': 'Roles are being revealed',
      'setup.nPlayers': '{n} players', 'setup.continue': 'Continue', 'setup.discard': 'Discard', 'setup.discardQ': 'Discard the running game?',
      'setup.overwriteQ': 'The running game will be overwritten.', 'setup.overwriteOk': 'New game', 'setup.v1': 'old version 1',
      'filter.all': 'All', 'filter.classic': 'Classic', 'filter.new': 'New in v2', 'filter.picked': 'Selected',
      'mode.gm': 'With game master', 'mode.gmDesc': 'One person leads and sees all roles.', 'mode.gmShort': 'Game master',
      'mode.auto': 'No game master', 'mode.autoDesc': 'Everyone plays, the phone lies in the middle and narrates.', 'mode.autoShort': 'No game master',
      'bal.title': 'Balance', 'bal.pick': 'Choose roles', 'bal.even': 'Balanced ✓', 'bal.evil': 'Evil has the edge', 'bal.village': 'Village has the edge',
      'role.wakes': 'wakes at night',
      'reveal.title': 'Reveal roles', 'reveal.passTo': 'Hand the device to', 'reveal.othersLook': 'Everyone else looks away 🙈',
      'reveal.iAm': 'I am {name}', 'reveal.qr': 'QR code for your own phone', 'reveal.toSetup': 'Back to setup',
      'reveal.yourRole': '{name}, your role:', 'reveal.hold': 'Press and hold', 'reveal.swipe': 'or swipe up',
      'reveal.understood': 'Got it', 'reveal.understoodPass': 'Got it – pass it on', 'reveal.secretly': 'secretly {team}',
      'reveal.allDone': 'Everyone knows their role', 'reveal.doneGm': 'Hand the device to the game master. Everyone closes their eyes – the first night begins.',
      'reveal.doneAuto': 'Put the phone in the middle and turn the sound up. From now on the phone narrates.',
      'reveal.begin': 'Start night 1', 'reveal.lastAgain': 'Show last card again',
      'reveal.qrFor': 'QR code for {name}', 'reveal.qrHint': 'Scan with your phone camera – the role appears on your own phone. Only {name} looks!',
      'reveal.qrDone': 'Scanned – next', 'reveal.qrFail': 'Could not load the QR code (no internet connection?).',
      'qr.invalid': 'This link does not contain a valid role.', 'qr.openApp': 'Open Werwolf Manager', 'qr.close': 'Once you know your role, you can close this window.',
      'game.over': 'Game over', 'game.noTargets': 'No players to choose.',
      'label.night': 'Night {n}', 'label.day': 'Day {n}', 'label.start': 'Start',
      'night.wakes': 'Wakes up: {names}', 'night.notInGame': 'no longer in the game', 'night.then': 'Then:',
      'night.fake': 'This role is no longer in the game. Call it anyway, wait a few seconds and continue – so nobody notices.',
      'night.pickOne': 'Choose one player:', 'night.pickN': 'Choose {n} players ({k}/{n}):', 'night.noVictim': 'No victim',
      'night.infect': 'Yes, infect', 'night.kill': 'No, kill',
      'night.heal': 'Healing potion', 'night.healDesc': 'Saves the werewolves’ victim', 'night.healNone': 'No victim to save', 'night.used': 'Already used',
      'night.poison': 'Poison', 'night.poisonDesc': 'Kills a player of your choice', 'night.noPotion': 'Use no potion',
      'auto.nightTitle': 'Night {n}', 'auto.nightIntro': 'Everyone closes their eyes. Tap “Go” – from then on the phone narrates. Whoever is called opens their eyes, taps their choice and closes them again.',
      'auto.go': 'Go', 'auto.eyesClosed': 'Eyes closed …', 'auto.onlyYou': 'Only you are looking now',
      'auto.gotIt': 'Got it', 'auto.done': 'Done', 'auto.amorTap': 'Now tap {names} on the shoulder – they are in love. Then tap “Done”.',
      'news.morningIntro': 'The village wakes up. Announce what happened during the night:', 'news.duskIntro': 'The sun is setting …',
      'news.toDay': 'Continue to the day', 'news.endDay': 'End the day', 'news.startNight': 'Start night {n}',
      'news.judge': 'Judge {name}: second vote', 'news.judgeAuto': 'Second vote (Judge)', 'news.secret': 'Game master only ({n})',
      'news.whatsNew': 'New in version {v}', 'news.version': 'Version {v} · {d}', 'news.letsGo': 'Let’s go',
      'int.hunter': '{name}’s last shot', 'int.hunterText': 'The hunter takes someone with them. Who gets shot?', 'int.hunterSkip': 'Don’t shoot',
      'int.akw': '{name}’s nuclear plant', 'int.akwText': 'Up to two players get irradiated. The neighbours are suggested – you decide.',
      'int.akwAuto': 'The radiation hits both seat neighbours.', 'int.akwSkip': 'Hit nobody',
      'int.mayor': '{name} passes on the office', 'int.mayorText': 'The dying mayor names a successor.', 'int.mayorSkip': 'No successor',
      'mayor.title': 'Mayor election', 'mayor.day1': 'First day', 'mayor.none': 'None', 'mayor.elect': 'Elect',
      'mayor.text': 'Their vote counts double, and they break ties. When they die, they name a successor.',
      'day.discussion': 'Discussion', 'day.discussionText': 'The village debates who is suspicious.', 'day.startVote': 'Start the vote',
      'day.mayor': '👑 Mayor: {name} (vote counts double)', 'day.raven': '🐦‍⬛ {name} starts with 2 votes against them.',
      'day.flower': '🌸 {name} is protected by the Flower Child today.', 'day.ghost': '👻 Ghost {name} may say a single word today.',
      'day.noVote': '🔇 {name} may not vote.', 'day.judge': '⚖️ Watch for the judge’s secret sign ({name}).',
      'day.flowerBtn': 'Flower Child {name} protects someone', 'day.flowerPick': 'Who does the Flower Child ({name}) protect?', 'day.protect': 'Protect',
      'timer.start': 'Start', 'timer.pause': 'Pause', 'timer.reset': 'Reset', 'timer.up': 'Time is up!',
      'vote.title': 'Vote', 'vote.second': 'second round', 'vote.hands': 'Show of hands', 'vote.pass': 'Secret, pass around',
      'vote.handsText': 'Count the votes openly and enter them here.', 'vote.mayorHint': '👑 marks the mayor’s choice (counts double).',
      'vote.resultText': 'The result of the secret vote:', 'vote.mayorFor': 'Mayor votes for {name}',
      'vote.none': 'No votes yet.', 'vote.lead': 'Leading: {name} with {n} votes', 'vote.tie': 'Tie: {names}',
      'vote.resolve': 'Evaluate', 'vote.backTalk': 'Discussion', 'vote.noLynch': 'Lynch nobody',
      'vote.secretHint': 'Nobody watches – your vote is secret.', 'vote.whoFor': '{name}, who do you want to lynch?',
      'vote.abstain': 'Abstain', 'vote.cast': 'Cast vote', 'vote.allVoted': 'Everyone has voted.', 'vote.showResult': 'Show result',
      'tie.title': 'Tie', 'tie.mayorDecides': '{name} decides as mayor', 'tie.nobody': 'Nobody', 'tie.hang': 'Lynch',
      'cleaner.once': 'once per game', 'cleaner.text': 'Should {name}’s role stay secret?', 'cleaner.no': 'No, reveal', 'cleaner.yes': 'Yes, hide',
      'over.reveal': 'All roles', 'over.chronicle': 'Chronicle of the game', 'over.again': 'Play again – same group', 'over.change': 'Change players & roles', 'over.survived': 'survived',
      'players.title': 'Players ({a}/{n} alive)', 'players.alive': 'alive', 'players.kill': 'Remove from game', 'players.revive': 'Bring back',
      'players.killHint': 'Triggers all consequences (Hunter, lovers, Nuclear Plant …). You can always undo.',
      'players.legend': '👑 mayor · 💘 in love · 🐺 turned · 🦇 bitten · 🔇 no vote · 💪 extra life · 🐾 role model',
      'players.hint': 'Tap a player to remove them manually or bring them back.',
      'log.hint': 'Secret entries are for the game master only.', 'log.showSecret': 'Show secrets', 'log.secret': 'secret',
      'set.language': 'Language', 'set.languageHint': 'Applies to the whole app',
      'set.game': 'Game rules', 'set.voteMode': 'Voting', 'set.voteModeHint': 'Openly by show of hands or secretly, passing the phone around',
      'set.narration': 'Show narration', 'set.narrationHint': 'Read-aloud texts for the night',
      'set.reveal': 'Reveal roles of the dead', 'set.revealHint': 'Every death announces the role',
      'set.dead': 'Keep calling dead roles', 'set.deadHint': 'For show, so nobody notices',
      'set.mayor': 'Mayor election', 'set.mayorHint': 'A mayor is elected on the first day',
      'set.parity': 'Evil wins at parity', 'set.parityHint': 'As soon as they equal the rest in number',
      'set.seer': 'The Seer sees', 'set.seerHint': 'Just “werewolf yes/no” or the exact role', 'set.seerTeam': 'Yes/No', 'set.seerRole': 'Role',
      'set.minutes': 'Discussion time', 'set.minutesHint': 'Minutes per day',
      'set.sound': 'Sound', 'set.ambient': 'Background sounds', 'set.ambientHint': 'Crickets & owls at night, birds by day',
      'set.effects': 'Effects', 'set.effectsHint': 'Howling, gong, rooster, bell, timer signal …',
      'set.voice': 'Narrator voice', 'set.voiceHint': 'Recorded, browser voice or off', 'set.voiceRec': 'Narrator', 'set.voiceBrowser': 'Browser', 'set.off': 'Off',
      'set.autoRead': 'Read the night aloud automatically', 'set.autoReadHint': 'With game master: every step is announced', 'set.volume': 'Volume',
      'set.lights': 'Lights (Home Assistant)',
      'set.takeOver': 'Take over as game master', 'set.takeOverQ': 'A (dead) player takes over as game master and will see all roles from now on. Continue?', 'set.takeOverOk': 'Take over',
      'set.abort': 'Abort game', 'set.abortQ': 'Really abort the game?', 'set.abortOk': 'Abort',
      'ha.intro': 'Your lights play along: bright by day, dim red at night, flashing when someone dies. Home Assistant must be reachable via HTTPS – you simply log in.',
      'ha.connect': 'Connect', 'ha.connected': 'Connected to {url}', 'ha.noLights': 'No lights found.', 'ha.test': 'Test', 'ha.disconnect': 'Disconnect',
      'ha.error': 'Connection failed. Is the address right and is Home Assistant reachable via HTTPS?', 'ha.needHttps': 'Please enter an https:// address.',
      'toast.undone': '↶ Undone', 'toast.suggested': 'Balanced roles chosen – adjust as you like', 'toast.removed': 'Player removed – “Undo” reverts it',
      'toast.dupName': '“{name}” is already in', 'toast.max30': 'At most 30 players', 'toast.muted': 'Sound off', 'toast.unmuted': 'Sound on', 'toast.takenOver': 'You are now the game master',
      'voice.nightStart': 'Night falls over the village. Everyone, close your eyes.',
      'voice.dayStart': 'The sun rises. The village wakes up. Everyone, open your eyes.',
      'voice.mayor': 'Before you hunt for suspects, the village openly elects a mayor.',
      'voice.cleaner': 'Everyone, close your eyes for a moment. Cleaner, open your eyes and decide.',
      'voice.eyesOpen': 'Everyone, open your eyes again.',
      'info.lovers': 'In love: {names}', 'info.masons': 'Freemasons: {names}', 'info.minion': 'Werewolves raising hands: {names}',
      'info.wolves': 'Werewolves: {names}', 'info.wolvesNew': 'Werewolves: {names} · New in the pack: {fresh} – tap them on the shoulder!',
      'info.urwolf': 'Werewolves’ victim: {name}', 'info.hexe': 'Werewolves’ victim: {name}', 'info.hexeInfect': 'Werewolves’ victim: {name} (to be infected)',
      'info.hexeNone': 'The werewolves chose nobody.', 'info.white': 'Even night – the white werewolf may strike.', 'info.bg': 'Protected last night: {name} (blocked tonight)',
      'res.seerYes': '🐺 Yes – {name} is a werewolf.', 'res.seerNo': '🙂 No – {name} is not a werewolf.', 'res.seerRole': '{name} is: {role}',
      'res.wseer': '{name} is: {role}', 'res.foxYes': '🦊 Yes – there is a werewolf among {list}.', 'res.foxNo': '🦊 No – no werewolf among {list}. The fox loses its nose.',
      'res.detSame': '🕵️ {a} & {b} are on the same side.', 'res.detDiff': '🕵️ {a} & {b} are on different sides.',
      'title.morning': '☀️ Morning after night {n}', 'title.verdict': '⚖️ Verdict', 'title.evening': '🌆 Evening {n}', 'title.gm': '✋ Game master intervention',
      'news.death': '{emo} {name} {cause}.', 'news.deathRole': ' Role: {role}.',
      'cause.night.pub': 'died during the night', 'cause.liebe.pub': 'dies of a broken heart', 'cause.jaeger.pub': 'was shot by the hunter',
      'cause.akw.pub': 'was irradiated by the nuclear plant', 'cause.lynch.pub': 'was lynched by the village', 'cause.spielleitung.pub': 'is out',
      'cause.vampir.pub': 'collapses dead at dusk',
      'cause.wolf.sec': 'was mauled by the werewolves', 'cause.gift.sec': 'was poisoned by the witch', 'cause.serienmoerder.sec': 'was killed by the serial killer',
      'cause.weisserwolf.sec': 'was killed by the white werewolf', 'cause.matratze.sec': 'died while visiting a victim', 'cause.ritter.sec': 'died from the knight’s rusty sword',
      'news.nobodyDied': 'Nobody died this night. 🌅', 'news.bearGrowl': '🐻 The bear growls loudly!', 'news.bearQuiet': '🐻 The bear stays quiet.',
      'news.raven': '🐦‍⬛ The raven marked {name}: +2 votes in the vote.',
      'news.attackFailed': 'Werewolf attack on {name} failed: {reason}.', 'news.whiteFailed': 'White werewolf fails against {name}: {reason}.',
      'news.biteBlocked': 'Vampire bite on {name} blocked: {reason}.', 'news.bitten': '🦇 {name} was bitten and dies at the end of the day.',
      'news.skFailed': 'Serial killer fails against {name}: {reason}.',
      'news.cursedTurned': '⛓️ {name} (Cursed) became a werewolf. From next night on they wake with the wolves – who will tap them then.',
      'news.infected': '🩸 {name} was infected by the alpha wolf and is now a werewolf.',
      'news.wildTurned': '🐾 Role model dead – {name} (Wild Child) is now a werewolf.',
      'news.rusty': '⚔️ Rusty sword: {name} dies next night.', 'news.roleHidden': '🧹 {name}’s role stays secret (was {role}).',
      'news.hunterNoShot': '🏹 {name} did not shoot.', 'news.akwBoom': '☢️ {name}’s nuclear plant explodes!', 'news.akwStable': '☢️ {name}’s nuclear plant stays stable.',
      'news.mayorPass': '👑 {name} hands the mayor’s office to {to}.', 'news.mayorNone': '👑 The village no longer has a mayor.',
      'news.noVotes': 'No votes – nobody is lynched.', 'news.tieNone': 'Tie between {names} – nobody is lynched.',
      'news.dorfdepp': '🤪 {name} is the village idiot! Everyone laughs – they survive but may no longer vote.', 'news.spare': 'The village spares everyone today.',
      'reason.immune': '{role} is immune to werewolves', 'reason.guarded': 'protected by {roles}', 'reason.away': 'not at home (Village Harlot)',
      'reason.redhood': 'Red Riding Hood – the hunter is still alive', 'reason.healed': 'healed by the witch', 'reason.elder': 'the elder survives the first attack',
      'log.dealt': 'Roles dealt: {list}', 'fmt.nameRole': '{name} = {role}', 'log.nightStart': '🌙 Night {n} begins.', 'log.dayStart': '☀️ Day {n} begins.',
      'log.stepResult': '{step}: {res}', 'log.amor': '💘 Cupid makes {names} fall in love.', 'log.wildModel': '🐾 The wild child’s role model: {name}.',
      'log.deathCause': '{emo} {name} {cause}.', 'log.gameEnd': '🏁 {title} {text}', 'log.mayor': '👑 {name} was elected mayor.',
      'log.blumen': '🌸 The Flower Child protects {name} from the vote.', 'log.goat': '🐐 Tie between {names} – the scapegoat has to go.',
      'log.richter': '⚖️ The stuttering judge demands a second vote!', 'log.revive': '✋ {name} was brought back by the game master.',
      'log.takeover': '🧑‍⚖️ From now on there is a game master again.',
      'win.dorf.title': 'The village wins!', 'win.dorf.text': 'All threats have been eliminated.',
      'win.wolf.title': 'The werewolves win!', 'win.wolf.text': 'The village now belongs to the pack.',
      'win.vampir.title': 'The vampires win!', 'win.vampir.text': 'Eternal night over the village.',
      'win.liebende.title': 'The lovers win!', 'win.liebende.text': '{names} defied everyone.',
      'win.solo.title': '{role} wins!', 'win.solo.text': '{name} is the last one standing.',
      'win.engel.title': 'The angel wins!', 'win.engel.text': '{name} died in the first round and ascends triumphantly.',
      'win.niemand.title': 'Nobody wins', 'win.niemand.text': 'The village has died out.',
      'val.min4': 'At least 4 players needed.', 'val.dupName': 'Two players have the same name.', 'val.count': '{n} players, but {t} roles selected.',
      'val.max': '{role} may appear at most {m}×.', 'val.noEvil': 'An evil role is missing (werewolf, vampire or serial killer).',
      'warn.manyEvil': 'Lots of evil roles – the village barely stands a chance.', 'warn.oneEvil': 'Only one evil role for this many players – rather easy for the village.',
      'warn.mason': 'A single freemason recognises nobody – use at least two.', 'warn.redhood': 'Red Riding Hood is not protected without the Hunter.',
      'warn.cleaner': 'The Cleaner only works if roles of the dead are revealed.', 'warn.minion': 'A Minion without werewolves or vampires has nobody to help.',
      'warn.white': 'A white werewolf without other werewolves hunts alone.',
      'wolfName': 'Werewolf'
    }
  };

  let lang = 'de';
  const DATA = () => global.WW_DATA;

  function t(key, params, l) {
    const L = l || lang;
    let s = (STR[L] && STR[L][key]) || STR.de[key];
    if (s === undefined) return key;
    if (params) s = s.replace(/\{(\w+)\}/g, (_, k) => (k in params ? fmtVal(params[k], L) : ''));
    return s;
  }
  function role(id, l) {
    const r = DATA().ROLES.find(x => x.id === id);
    const en = (l || lang) === 'en';
    return { name: en ? r.nameEN : r.name, desc: en ? r.descEN : r.desc, tip: en ? r.tipEN : r.tip, emoji: r.emoji };
  }
  function roleLabel(v, l) {
    const r = role(v.r, l);
    return `${r.emoji} ${r.name}` + (v.w ? ` → 🐺 ${t('wolfName', null, l)}` : '');
  }
  function teamName(id, l) {
    const tm = DATA().TEAMS[id];
    return tm ? ((l || lang) === 'en' ? tm.nameEN : tm.name) : id;
  }
  function step(id, l) {
    const s = DATA().NIGHT_STEPS.find(x => x.id === id);
    const en = (l || lang) === 'en';
    return { title: en ? s.titleEN : s.title, wake: en ? s.wakeEN : s.wake, sleep: en ? s.sleepEN : s.sleep };
  }
  function fmtVal(v, l) {
    if (v === null || v === undefined) return '';
    if (Array.isArray(v)) { const parts = v.map(x => fmtVal(x, l)); return parts.length > 2 ? parts.join(', ') : parts.join(' & '); }
    if (typeof v === 'object') {
      if ('r' in v) return roleLabel(v, l);
      if ('k' in v) return msg(v, l);
    }
    return String(v);
  }
  /** Translate an engine message {k, p} into the current language. */
  function msg(m, l) {
    if (!m) return '';
    if (typeof m === 'string') return m;
    const p = Object.assign({}, m.p || {});
    if (m.k === 'log.stepResult') p.step = step(p.step, l).title;
    let s = t(m.k, p, l);
    if (m.k === 'news.death' && p.role) s += t('news.deathRole', { role: p.role }, l);
    return s;
  }

  global.WW_I18N = {
    STR, t, msg, role, roleLabel, teamName, step,
    setLang(l) { lang = STR[l] ? l : 'de'; },
    get lang() { return lang; }
  };
  if (typeof module !== 'undefined') module.exports = global.WW_I18N;
})(typeof globalThis !== 'undefined' ? globalThis : window);
