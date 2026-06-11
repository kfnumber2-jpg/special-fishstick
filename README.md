# THE BACKROOMS — Lost Tapes

A first-person, 4-player co-op horror game set in an **infinite, procedurally
generated Backrooms**. You noclipped out of reality. Somewhere in the endless
yellow halls are **8 lost video tapes**. Find them all, then find the exit door
— while the things that live in the dark hunt you.

Built with **Three.js + TypeScript + Vite** on the client and a **Node.js
WebSocket server** for multiplayer. The entire world (textures, models,
sounds) is generated procedurally at runtime — zero asset downloads.

##  Apple exclusive

The game is an **Apple special**: it only opens on iPhone, iPad, and Mac.

- **iPhone / iPad** — touch controls: virtual joystick (push to the rim to
  sprint), drag the right side of the screen to look, buttons for interact /
  flashlight / sprint.
- **Mac** — `WASD` move · mouse look · `SHIFT` sprint · `E` interact ·
  `F` flashlight.

Non-Apple devices hit an "APPLE EXCLUSIVE" gate. For development/testing on
anything else, append `?anydevice=1` to the URL.

## How to play

1. Enter a name and tap **ENTER THE BACKROOMS** (leave the room code blank to
   open a new room).
2. Share the 4-letter room code (top-right of the HUD) with up to 3 friends —
   they enter it on the lobby screen and drop into the same maze.
3. Find all **8 lost tapes**. Each one is deeper in than the last, and every
   tape you take makes the Backrooms more awake.
4. When the last tape is taken, the lights die and an **exit door**
   materialises far away. Follow the green compass arrow. Get out.
5. If you go down, a teammate can revive you (hold interact next to you). If
   the whole crew goes down… the hum continues forever.

## The things in the dark

| Entity | Behaviour |
| --- | --- |
| **Hound** | Fast pack predator. Patrols until it has line of sight, then runs you down. Sprint, break line of sight, juke corners. |
| **Smiler** | A grin floating in dark pockets. **Freezes while your flashlight beam pins it** — and closes terrifyingly fast the moment the light slips. |
| **Skin-Stealer** | Looks exactly like a fourth teammate wandering the halls. The name tag reads `????`. Do not walk up to it. |
| **Watcher** | A motionless silhouette at the edge of the light. Stare too long and it is suddenly *right behind you*. |
| **Crawler** | Nests on every tape, waiting. Grabbing the tape wakes it. |
| **Stilter** | Tall as the ceiling, all stilt legs. Walking pace, never faster — but once it has seen you it does not lose the trail, walls or no walls. Outrun it. |
| **Howler** | Lord of the red rooms. While you stand in red halls it hears you through every wall and runs you down. Leave the red and it loses interest. |
| **Mimic** | Some tapes were never tapes. Reach for the wrong one and it splits into teeth. Doesn't count toward your 8. |

Flashlight battery drains; manage it. Stamina limits sprinting. Some ceiling
panels are dead — those dark pockets are where smilers live. Some chunks are
**sunken dark halls**: black ceilings, almost no working lights, and
chest-high ledges that everything can see over. Others are **red rooms** —
hot red parallel hallways where every creature moves 20% faster and the
Howler hunts by sound. Don't linger.

**🥤 Almond water** bottles are scattered through the maze (12 per game,
glowing pale blue). Drinking one restores 40 hp. Deeper bottles are the
ones you'll need.

## 👁 The legendary

Hidden somewhere in every game is exactly one **WANDERER'S EYE**. Whoever
carries it (👁 in the roster) is saved exactly once: the hit that should have
landed instead burns the relic and turns the carrier **invisible to every
creature for 12 seconds**. Use the window to run, revive, or escape.

## Running it — the easy way

You need [Node.js](https://nodejs.org) installed (free, one-time, click the
big green button). Then:

1. On the GitHub page click the green **Code** button → **Download ZIP**, and
   unzip it.
2. **Mac:** double-click **`play.command`** in the unzipped folder.
   **Windows:** double-click **`play.bat`**.
3. That's it. The first run sets itself up (about a minute), then the game
   opens in your browser by itself.

It also prints an address like `http://192.168.x.x:8787` — type that into
Safari on an iPhone or iPad on the same Wi-Fi to play from the couch.
Friends join with the 4-letter room code at the top of the screen.

> Mac may say the file is from an unidentified developer the first time:
> right-click `play.command` → **Open** → **Open** once, and it remembers.

### Running it by hand

```bash
npm install
npm run build     # build the client into dist/
npm start         # serves the game + websocket on http://localhost:8787
```

Open `http://<host>:8787` on every device (same Wi-Fi works great for couch
co-op). For internet play, deploy to any Node host — the single server process
serves both the client and the `/ws` websocket.

### Development

```bash
npm run server    # game server on :8787
npm run dev       # vite dev server (proxies /ws to :8787)
```

## How it works

- `shared/mapgen.js` — deterministic infinite maze generator (seeded, chunked,
  guaranteed-connected, three room styles for twists and turns). Imported by
  **both** the browser and the server, so a 4-byte seed is the whole map.
- `server/server.js` — authoritative for creatures (AI ticks at 10 Hz with
  real wall collision and line-of-sight), tape pickups, damage, revives, the
  blackout and the exit. Rooms of up to 4 players.
- `src/` — Three.js client: chunk streaming, canvas-painted textures (the
  chevron wallpaper, carpet and ceiling from the reference shots), primitive-
  built creatures, WebAudio-synthesised hum/heartbeat/stingers, HUD, touch +
  pointer-lock controls.
