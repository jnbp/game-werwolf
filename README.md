# 🐺 Werwolf – Spielleiter-App (Version 2)

Live: **[werwolf.bapo.me](https://werwolf.bapo.me)** · alte Version: [werwolf.bapo.me/v1](https://werwolf.bapo.me/v1/)

Eine App für einen Spielabend Werwolf auf einem einzigen Handy: Spieler eintragen, Rollen wählen,
Handy zum Aufdecken herumgeben, dann führt die App die Spielleitung durch jede Nacht und jeden Tag.
Läuft komplett im Browser, ohne Anmeldung und ohne Server – der Spielstand wird lokal gespeichert.

## Was sie kann

- **33 Rollen**, davon 16 neu in v2 – vom Dorfbewohner bis zum Serienmörder
- **Aufdecken per Gedrückthalten oder Hochschieben** – loslassen verdeckt die Karte sofort
- **Geführte Nächte** mit Erzähltexten (auf Wunsch vorgelesen) in fester Reihenfolge
- **Alle Folgen automatisch:** Liebeskummer, Jäger-Schuss, AKW, Bürgermeister-Nachfolge, Verwandlungen
- **Abstimmung** mit Stimmenzähler, Bürgermeisterstimme, Rabe, Sündenbock und Gleichstand-Regeln
- **Rückgängig** für jeden Schritt, **automatisches Speichern**, Chronik und Auflösung am Ende
- **Rollenvorschlag** und **Balance-Anzeige** beim Einrichten

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Gerüst der Seite |
| `css/style.css` | Gestaltung (Farben als Variablen ganz oben) |
| `js/roles.js` | **Alle Rollen und der Nachtablauf** – hier wird erweitert |
| `js/engine.js` | Spielregeln ohne Oberfläche (Nacht auflösen, Tod & Folgen, Sieg) |
| `js/app.js` | Oberfläche: Einrichten, Aufdecken, Spielleitung |
| `js/changelog.js` | Inhalt des Fensters „Neu in Version 2“ |
| `tests/engine.test.js` | Automatische Tests |
| `v1/` | Die alte Version 1, unverändert |

## Eine neue Rolle hinzufügen

**Einfache Rolle** (ohne Nachtaktion) – nur ein Eintrag in `ROLES` in `js/roles.js`:

```js
{
  id: 'baecker', name: 'Bäcker', emoji: '🥖', team: 'dorf',
  wakes: [], weight: 1, tags: ['neu'], isNew: true,
  desc: 'Du backst das beste Brot im Dorf – aber sonst kannst du nichts.',
  descEN: 'You bake the best bread in the village – but that is all.'
}
```

**Rolle mit Nachtaktion, die nur etwas erfährt oder auswählt:** zusätzlich einen Schritt in
`NIGHT_STEPS` anlegen und dessen `id` in `wakes` der Rolle eintragen. Soll die Rolle ein
Ergebnis sehen (wie die Seherin), kommt ein `case` in `stepResult()` in `js/engine.js` dazu.

**Rolle mit echtem Regel-Effekt** (Tod verhindern, verwandeln …): Effekt in `finishNight()` bzw.
`kill()` in `js/engine.js` ergänzen – beide Stellen sind kommentiert – und einen Test in
`tests/engine.test.js` schreiben.

Neue Infos für das „Was ist neu?“-Fenster kommen nach `js/changelog.js`.

## Testen

```bash
node tests/engine.test.js
```

Spielt alle Sonderfälle gezielt durch und danach 4.000 Zufallsspiele mit zufälligen Rollen und
Entscheidungen. Jedes Spiel muss ohne Fehler zu einem Ende kommen.

## Lokal starten

Einfach `index.html` im Browser öffnen – oder `python3 -m http.server` im Ordner und
`http://localhost:8000` aufrufen.
