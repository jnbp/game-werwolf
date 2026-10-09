# 🐺 Werwolf Manager

Live: **[werwolf.bapo.me](https://werwolf.bapo.me)** · old version: [werwolf.bapo.me/v1](https://werwolf.bapo.me/v1/)

A game-master app for a night of *Werewolf* (*Werwölfe von Düsterwald* / Mafia) on a single phone – in **German and English**.
Enter the players, pick roles, pass the phone around to reveal them, and the app guides you through every night and day.
It runs entirely in the browser: no account, no server, the game state is stored locally.

## Features

- **33 roles** – from Villager to Serial Killer, with balanced suggestions and a balance bar per faction
- **Two ways to play**
  - **With a game master** – one person leads and sees all roles
  - **Without a game master** – the phone lies in the middle and narrates; whoever is called taps secretly,
    the screen goes black and a random pause gives nothing away. A dead player can take over as game master at any time.
- **Revealing roles** – press and hold or swipe up; or show a **QR code** so the role appears on the player's own phone (no server needed)
- **Narrator voice** – recorded narration (German: “Erzähler”, English: “Adrian”, made with Fish Audio) or the browser voice
- **Sound** – synthesised ambience (crickets & owls at night, birds by day) and effects (howl, rooster, gong, gunshot, bell, fanfare, timer signal)
- **Voting** – by show of hands with a counter, or secretly by passing the phone around; mayor, raven, scapegoat and ties handled automatically
- **All consequences resolved automatically** – broken hearts, hunter shots, nuclear plant, mayor succession, transformations
- **Undo** for every step, **auto-save**, chronicle and full reveal at the end
- **Home Assistant** (optional) – lights go bright by day and dim at night, pulse for the werewolves, flash on deaths
  and glow in the winners' colour; afterwards the previous state is restored. Five light moods (Classic, Ember, Moonlit,
  Witch wood, Cinema), lights grouped by room with search. Uses the regular HA login (HTTPS required).
- **Lovers without a game master** – after Cupid's choice the phone goes around once in the first night;
  the lovers see their partner, everyone else sees "nothing new"
- **House rules** – mayor succession (successor or new election), werewolves must kill, seer sees team or role, and more
- **Fullscreen** – button in the game header; on iPhone add the app to the home screen
- **Fully bilingual** – switch German/English on every screen, even mid-game

## Project structure

| File | Contents |
|---|---|
| `index.html` | Page skeleton |
| `manifest.webmanifest`, `icon.svg` | Lets the app be installed to the home screen (starts in fullscreen) |
| `css/style.css` | Styles and animations (colour variables at the top) |
| `js/roles.js` | **All roles and the night order** – this is where you extend the game |
| `js/i18n.js` | All UI texts in German and English |
| `js/engine.js` | Game rules without UI (resolving the night, deaths & consequences, win conditions) |
| `js/app.js` | User interface: setup, reveal, game with or without game master |
| `js/audio.js` | Synthesised ambience & effects, narration playback |
| `js/voices.js` | Links to the recorded narration |
| `js/ha.js` | Optional Home Assistant light control |
| `js/changelog.js` | Contents of the “What's new” dialog |
| `tests/engine.test.js` | Automated tests |
| `v1/` | Link to the unchanged version 1 (kept on branch `v1`) |

Role ids and team keys are the original German game terms (`werwolf`, `dorf` = village, `hexe` = witch …).
They are internal keys only; every visible text exists in both languages.

## Adding a new role

**Simple role** (no night action) – just add an entry to `ROLES` in `js/roles.js`:

```js
{
  id: 'baecker', name: 'Bäcker', nameEN: 'Baker', emoji: '🥖', team: 'dorf',
  wakes: [], weight: 1, tags: ['neu'], isNew: true,
  desc: 'Du backst das beste Brot im Dorf – aber sonst kannst du nichts.',
  descEN: 'You bake the best bread in the village – but that is all.'
}
```

**Role with a night action that only learns or chooses something:** also add a step to `NIGHT_STEPS`
(with German and English narration) and put its `id` into the role's `wakes`. If the role should see a result
(like the Seer), add a `case` to `stepResult()` in `js/engine.js` and its texts to `js/i18n.js`.

**Role with a real rule effect** (preventing a death, turning a player …): add the effect to `finishNight()` or `kill()`
in `js/engine.js` – both places are commented – and write a test in `tests/engine.test.js`.

New entries for the “What's new” dialog go into `js/changelog.js`.

## Tests

```bash
node tests/engine.test.js
```

Runs every special case as a targeted scenario, then 4,000 random games with random roles and decisions.
Every game must reach an end without errors, and every message must render cleanly in both languages.

## Running locally

Open `index.html` in a browser – or run `python3 -m http.server` in the folder and visit `http://localhost:8000`.
