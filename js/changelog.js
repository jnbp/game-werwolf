/* What's new? – shown in the welcome dialog.
   For an update, add a new entry at the top (German + English).
   `seen` changes whenever the dialog should pop up again for everyone. */
(function (global) {
  global.WW_CHANGELOG = [
    {
      version: '2.0',
      seen: '2.0-d',
      de: {
        date: 'Oktober 2026',
        intro: 'Komplett neu gebaut: doppelt so viele Rollen, eine echte Erzählerstimme, zwei Sprachen – und auf Wunsch spielt ihr ganz ohne Spielleitung.',
        sections: [
          { title: '🐺 36 Rollen statt 17 – und eigene', items: [
            'Neu: Baby-Werwolf, Mönch, Geisterhand, Urwolf, Wolfsseherin, Weißer Werwolf, Wildes Kind, Dorfdepp, Ritter, Ältester, Rotkäppchen, Fuchs, Bärenführer, Richter, Sündenbock, Rabe, Detektiv, Engel, Serienmörder.',
            'Eigene Rollen: Name, Symbol und Team festlegen – die App erinnert nachts oder tagsüber daran, sie aufzurufen.',
            'Die Geisterhand malt ihr geheimes Zeichen direkt aufs Handy, am Morgen sieht es das ganze Dorf.',
            'Balance-Leiste über den Rollen zeigt, ob Dorf, Werwölfe, Vampire und Einzelgänger fair verteilt sind.'
          ] },
          { title: '📱 Spielen ohne Spielleitung', items: [
            'Das Handy liegt in der Mitte und erzählt die Nacht. Wer aufgerufen wird, tippt heimlich – danach wird der Bildschirm schwarz und eine Zufallspause verrät nichts.',
            'Tote Rollen werden zum Schein weiter aufgerufen. Ein toter Spieler kann jederzeit die Spielleitung übernehmen.',
            'Amors Verliebte erfahren es in einer kurzen Handy-Runde in der ersten Nacht.'
          ] },
          { title: '🎴 Rollen aufdecken', items: [
            'Karte gedrückt halten oder nach oben schieben – oder per QR-Code aufs eigene Handy.',
            'Jeder kann seine Karte auf Deutsch oder Englisch lesen.'
          ] },
          { title: '🧭 Spielleitung', items: [
            'Geführter Nachtablauf, Rückgängig für jeden Schritt, automatisches Speichern, Timer, Chronik.',
            'Abstimmen offen per Handzeichen oder geheim reihum. Bürgermeister, Rabe, Sündenbock und Gleichstand werden automatisch verrechnet.'
          ] },
          { title: '🔊 Sound & Licht', items: [
            'Echte Erzählerstimme, Hintergrundgeräusche (Grillen, Eule, Vögel) und Effekte – alles einzeln einstellbar.',
            'Home Assistant: Deine Lichter spielen mit – fünf Licht-Stimmungen zur Auswahl.'
          ] },
          { title: '🐞 Über 20 Fehler behoben', items: [
            'Unter anderem: Spiel hing bei einem Sieg in der Nacht, Neustart war kaputt, Amor veränderte alle Rollen, Jäger-Ketten gingen verloren.'
          ] }
        ]
      },
      en: {
        date: 'October 2026',
        intro: 'Rebuilt from scratch: twice as many roles, a real narrator voice, two languages – and if you like, you can play without a game master.',
        sections: [
          { title: '🐺 36 roles instead of 17 – plus your own', items: [
            'New: Wolf Cub, Monk, Ghost Hand, Alpha Wolf, Wolf Seer, White Werewolf, Wild Child, Village Idiot, Knight, Elder, Red Riding Hood, Fox, Bear Tamer, Judge, Scapegoat, Raven, Detective, Angel, Serial Killer.',
            'Custom roles: choose a name, symbol and team – the app reminds you to call them at night or by day.',
            'The Ghost Hand draws its secret sign right on the phone; in the morning the whole village sees it.',
            'A balance bar above the roles shows whether village, werewolves, vampires and loners are fairly matched.'
          ] },
          { title: '📱 Play without a game master', items: [
            'The phone lies in the middle and narrates the night. Whoever is called taps secretly – then the screen goes black and a random pause gives nothing away.',
            'Dead roles are still called for show. A dead player can take over as game master at any time.',
            'Cupid’s lovers find out in a short phone round during the first night.'
          ] },
          { title: '🎴 Revealing roles', items: [
            'Press and hold or swipe the card up – or use a QR code to see it on your own phone.',
            'Everyone can read their card in German or English.'
          ] },
          { title: '🧭 Game master', items: [
            'Guided night, undo for every step, auto-save, timer, chronicle.',
            'Vote openly by show of hands or secretly by passing the phone. Mayor, raven, scapegoat and ties are counted automatically.'
          ] },
          { title: '🔊 Sound & light', items: [
            'Real narrator voice, ambience (crickets, owls, birds) and effects – each one adjustable.',
            'Home Assistant: your lights play along – five light moods to choose from.'
          ] },
          { title: '🐞 More than 20 bugs fixed', items: [
            'Among others: the game froze on a night win, restarting was broken, Cupid changed every role, Hunter chains got lost.'
          ] }
        ]
      }
    }
  ];
})(typeof globalThis !== 'undefined' ? globalThis : window);
