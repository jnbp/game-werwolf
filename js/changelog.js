/* Was ist neu? – wird im Fenster „Neu in Version 2“ angezeigt.
   Für ein Update einfach oben einen neuen Eintrag ergänzen.          */
(function (global) {
  global.WW_CHANGELOG = [
    {
      version: '2.0',
      date: 'Oktober 2026',
      intro: 'Komplett neu gebaut: sauberer, schneller, fehlerfrei – und mit doppelt so vielen Rollen.',
      sections: [
        {
          title: '🎴 Rollen aufdecken – neu erleben',
          items: [
            'Karte gedrückt halten oder nach oben schieben – loslassen verdeckt sie sofort wieder.',
            'Großer „Gib das Handy an …“-Bildschirm, damit niemand aus Versehen spickt.',
            'Kurzes Vibrieren beim Aufdecken, Rollentext auf Deutsch und Englisch.'
          ]
        },
        {
          title: '🧭 Spielleitung auf neuem Level',
          items: [
            'Geführter Nachtablauf mit Erzähltexten zum Vorlesen – auf Wunsch liest das Handy selbst vor.',
            'Rückgängig-Knopf für jeden Schritt – Verklicken ist kein Drama mehr.',
            'Automatisches Speichern: Seite neu geladen? Das Spiel läuft einfach weiter.',
            'Abstimmung mit Stimmenzähler, Bürgermeisterstimme, Gleichstand-Regeln und „Niemand hängen“.',
            'Diskussions-Timer mit Pause, ±1 Minute und Signalton.',
            'Öffentliche Ansagen und geheime Hinweise für die Spielleitung sind klar getrennt.',
            'Chronik des ganzen Spiels und Auflösung aller Rollen am Ende.',
            'Tote Rollen werden nachts zum Schein weiter aufgerufen – niemand merkt etwas.',
            'Bildschirm bleibt während des Spiels an.'
          ]
        },
        {
          title: '🐺 16 neue Rollen (jetzt 33)',
          items: [
            'Werwölfe: Urwolf, Wolfsseherin, Weißer Werwolf',
            'Dorf: Wildes Kind, Dorfdepp, Ritter mit rostigem Schwert, Ältester, Rotkäppchen, Fuchs, Bärenführer, Stotternder Richter, Sündenbock, Rabe, Detektiv, Engel',
            'Einzelgänger: Serienmörder',
            'Geist überarbeitet: darf nach dem Tod jeden Tag ein Wort sagen.'
          ]
        },
        {
          title: '🛠️ Einrichten in Sekunden',
          items: [
            'Rollenvorschlag per Knopfdruck – passend zur Spielerzahl.',
            'Balance-Anzeige: Wer ist im Vorteil, Dorf oder die Bösen?',
            'Warnungen bei unsinnigen Kombinationen (z. B. Rotkäppchen ohne Jäger).',
            'Sitzreihenfolge festlegen – wichtig für Fuchs, Bär, Ritter und AKW.',
            'Spielergruppe wird gemerkt. „Nochmal“ startet sofort eine neue Runde.'
          ]
        },
        {
          title: '🐞 Über 20 Logikfehler behoben',
          items: [
            'Spiel blieb hängen, wenn eine Partei nachts gewann.',
            'Nach „Neues Spiel“ ließ sich keine Spielleitung mehr starten.',
            'Amor machte alle Werwölfe und Dorfbewohner gleichzeitig zu Liebenden – Wölfe konnten sich gegenseitig fressen.',
            'Blumenkind und Reinigungskraft funktionierten im ersten Spiel nie.',
            'Der Verfluchte wurde nie wirklich zum Werwolf.',
            'Starb der Jäger nachts, fiel der ganze nächste Tag samt Bürgermeisterwahl aus.',
            'Ketten (Jäger erschießt Jäger, AKW trifft Jäger, Liebeskummer) gingen verloren.',
            'Opfer des Vampirbisses lösten Jäger und AKW nicht aus.',
            'Sieg wurde verkündet, obwohl der Jäger noch schießen durfte.',
            'Leibwächter-Sperre wirkte nie, und der Priester konnte seinen Schutz löschen.',
            'Liebespaare aus demselben Lager blockierten jeden Sieg.',
            'Bürgermeister blieb nach dem Tod im Amt, Gleichstände waren nicht vorgesehen.',
            'Günstling spielte in Wahrheit fürs Dorf.',
            'Gerettete und manche Tote wurden der Spielleitung nicht angezeigt.'
          ]
        }
      ]
    }
  ];
})(typeof globalThis !== 'undefined' ? globalThis : window);
