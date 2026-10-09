/* What's new? – shown in the "New in version …" dialog.
   For an update, add a new entry at the top (German + English). */
(function (global) {
  global.WW_CHANGELOG = [
    {
      version: '2.1',
      de: {
        date: 'Oktober 2026',
        intro: 'Der Werwolf Manager spricht jetzt zwei Sprachen, erzählt selbst und bringt dein Wohnzimmer zum Leuchten.',
        sections: [
          { title: '📱 Spielen ohne Spielleitung', items: [
            'Alle spielen mit: Das Handy liegt in der Mitte und erzählt die Nacht mit echter Sprecherstimme.',
            'Wer aufgerufen wird, tippt heimlich – danach wird der Bildschirm schwarz und eine Zufallspause verrät nichts.',
            'Tote Rollen werden zum Schein weiter aufgerufen. Rollen bleiben bis zum Spielende verborgen.',
            'Jederzeit umschaltbar: Ein toter Spieler kann die Spielleitung übernehmen.'
          ] },
          { title: '🗳️ Abstimmen, wie ihr wollt', items: [
            'Offen per Handzeichen – oder geheim: Das Handy geht reihum, jeder stimmt verdeckt ab.',
            'Das Ergebnis erscheint mit Animation, Bürgermeister und Rabe werden automatisch eingerechnet.'
          ] },
          { title: '🇬🇧 Deutsch & English', items: [
            'Die komplette App auf Englisch – Umschalter oben auf jedem Bildschirm, auch mitten im Spiel.',
            'Beim Aufdecken kann jeder seine Karte einzeln auf die andere Sprache stellen.'
          ] },
          { title: '🔊 Sound', items: [
            'Echte Erzählerstimme (Deutsch: „Erzähler“, Englisch: „Adrian“) – oder Browser-Stimme.',
            'Hintergrundgeräusche: nachts Grillen, Eule und fernes Heulen, tagsüber Vogelgezwitscher.',
            'Effekte: Wolfsheulen, Hahn am Morgen, Gong bei Tod, Schuss, Glocke, Fanfare, Signal wenn der Timer abläuft.',
            'Alles einzeln einstellbar, Lautstärkeregler und Stumm-Knopf oben.'
          ] },
          { title: '💡 Home Assistant', items: [
            'Lichter spielen mit: tagsüber hell, nachts rot gedimmt, Werwölfe lassen es rot pulsieren, Tote lassen es blinken.',
            'Am Ende leuchtet die Farbe der Sieger, danach kehrt alles in den vorherigen Zustand zurück.',
            'Ganz normaler Home-Assistant-Login, kein Token kopieren.'
          ] },
          { title: '✨ Feinschliff', items: [
            'Neuer Name: Werwolf Manager.',
            'QR-Code-Aufdecken: Rolle erscheint auf dem eigenen Handy – ganz ohne Server.',
            'Balance-Leiste fest über den Rollen, mit eigenen Farben für Werwölfe, Vampire und Einzelgänger.',
            'Beschriftete Leiste unten: Zurück, Spieler, Chronik, Optionen.',
            'Animationen überall: Übergänge, Karten, Listen, Fenster, Konfetti beim Sieg.',
            'Neu laden springt direkt ins laufende Spiel. Flimmern in den Einstellungen behoben.'
          ] }
        ]
      },
      en: {
        date: 'October 2026',
        intro: 'Werwolf Manager now speaks two languages, narrates by itself and lights up your living room.',
        sections: [
          { title: '📱 Play without a game master', items: [
            'Everyone plays: the phone lies in the middle and narrates the night with a real narrator voice.',
            'Whoever is called taps secretly – then the screen goes black and a random pause gives nothing away.',
            'Dead roles are still called for show. Roles stay hidden until the end of the game.',
            'Switch any time: a dead player can take over as game master.'
          ] },
          { title: '🗳️ Vote your way', items: [
            'Openly by show of hands – or secretly: the phone goes around and everyone votes in private.',
            'The result appears animated; mayor and raven are counted automatically.'
          ] },
          { title: '🇬🇧 German & English', items: [
            'The whole app in English – switch at the top of every screen, even mid-game.',
            'When revealing, everyone can flip their own card to the other language.'
          ] },
          { title: '🔊 Sound', items: [
            'Real narrator voice (German: “Erzähler”, English: “Adrian”) – or the browser voice.',
            'Ambience: crickets, owls and distant howling at night, birdsong by day.',
            'Effects: howling, rooster in the morning, gong on death, gunshot, bell, fanfare, signal when the timer runs out.',
            'Everything adjustable, volume slider and mute button at the top.'
          ] },
          { title: '💡 Home Assistant', items: [
            'Your lights play along: bright by day, dim red at night, a red pulse for the werewolves, flashing on deaths.',
            'At the end they glow in the winners’ colour, then everything returns to its previous state.',
            'Plain Home Assistant login, no token copying.'
          ] },
          { title: '✨ Polish', items: [
            'New name: Werwolf Manager.',
            'QR reveal: the role appears on your own phone – no server needed.',
            'Balance bar pinned above the roles, with separate colours for werewolves, vampires and loners.',
            'Labelled bar at the bottom: Undo, Players, Chronicle, Options.',
            'Animations everywhere: transitions, cards, lists, dialogs, confetti on victory.',
            'Reloading jumps straight into the running game. Flicker in the settings fixed.'
          ] }
        ]
      }
    },
    {
      version: '2.0',
      de: {
        date: 'Oktober 2026',
        intro: 'Komplett neu gebaut: sauberer, schneller, fehlerfrei – und mit doppelt so vielen Rollen.',
        sections: [
          { title: '🎴 Rollen aufdecken', items: ['Karte gedrückt halten oder nach oben schieben.', 'Großer „Gib das Handy an …“-Bildschirm.'] },
          { title: '🧭 Spielleitung', items: ['Geführter Nachtablauf, Rückgängig, automatisches Speichern, Abstimmung mit Zähler, Timer, Chronik.'] },
          { title: '🐺 16 neue Rollen (jetzt 33)', items: ['Urwolf, Wolfsseherin, Weißer Werwolf, Wildes Kind, Dorfdepp, Ritter, Ältester, Rotkäppchen, Fuchs, Bärenführer, Richter, Sündenbock, Rabe, Detektiv, Engel, Serienmörder.'] },
          { title: '🐞 Über 20 Logikfehler behoben', items: ['Unter anderem: Spiel hing bei Nacht-Sieg, Neustart war kaputt, Amor veränderte alle Rollen, Jäger-Ketten gingen verloren.'] }
        ]
      },
      en: {
        date: 'October 2026',
        intro: 'Rebuilt from scratch: cleaner, faster, bug-free – and with twice as many roles.',
        sections: [
          { title: '🎴 Revealing roles', items: ['Press and hold or swipe the card up.', 'Big “Hand the device to …” screen.'] },
          { title: '🧭 Game master', items: ['Guided night, undo, auto-save, vote counter, timer, chronicle.'] },
          { title: '🐺 16 new roles (now 33)', items: ['Alpha Wolf, Wolf Seer, White Werewolf, Wild Child, Village Idiot, Knight, Elder, Red Riding Hood, Fox, Bear Tamer, Judge, Scapegoat, Raven, Detective, Angel, Serial Killer.'] },
          { title: '🐞 More than 20 logic bugs fixed', items: ['Among others: the game froze on a night win, restarting was broken, Cupid changed every role, Hunter chains got lost.'] }
        ]
      }
    }
  ];
})(typeof globalThis !== 'undefined' ? globalThis : window);
