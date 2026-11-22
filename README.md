# TQuest

**Your commute, but make it a quest.**

TQuest turns a ride on Boston's MBTA into a game. Check in, and the app follows your actual train live. It tells you your stops the way that works for you (big text, voice, or vibration), and every station you reach opens a pack of hand-painted collectible stamp cards. Scan TQuest signs at Boston landmarks for bonus cards, ask Questie (our AI guide) anything about the city, and duel other riders on your train.

Built at BostonHacks by [Team names].

Supported lines: **Red Line** (all branches) and **Green Line B branch**. That's 44 stations, each with its own mascot.

---

## Features

### Ride: follow your train
- **Check in:** pick a line, a "From" station and a "To" station.
  - TQuest picks your train using GPS, then MBTA predictions, then the nearest approaching train, and locks onto it.
  - From there it follows that train stop by stop on a live map, using the MBTA V3 API.
- **Rides survive closing the app**, and stops are never rewarded twice.
- **Ride detection:** suggests "Riding the Red Line? Check in" when your phone moves with a live train.
- **Service alerts** and short-turn notices.

### Hear it your way: accessibility
- **Three channels, each optional:**
  - big on-screen text
  - Questie's voice (ElevenLabs, with the phone's built-in voice as a fallback)
  - distinct vibration patterns ("next stop", "your stop is next", "arrived", rewards).
- **Screen readers:** announcements always go to VoiceOver and TalkBack.
- **Motion comfort mode:** one calm card with no map or animation, for riders who get motion sick.
- **Voice speed** can be adjusted, and the app follows the system's reduce-motion setting.

### Collect the line
- **A stamp pack at every station.** Cards are painted procedurally in SVG from a seed, with a random pose, time of day, weather and scene.
- **Four rarities:** Common 70%, Rare 22%, Epic 7%, Legendary 1%.
- **Points:** +10 for a station's first ride card in each 24 hours. Repeats still go in your album, for 0 points.
- **QR stamp spots** at 11 Boston landmarks, each painted as its own scene, plus 2 Arts on the T artworks (+50 the first time).
- **Rewards and Board:** album, artwork stamps, monthly raffle tickets (100 points = 1 ticket), and weekly and all-time leaderboards.

### Questie: AI guide
- **Talk or type.** Voice questions go straight to Gemini as audio, which transcribes and answers in one call.
- **Grounded facts:** answers about artworks and places use Google Search grounding, and the sources are shown.
- **Stories:** one-line stories about any card, and real histories of station artworks.
- **Offline fallback:** if AI is unavailable, hand-written answers keep Questie talking.

### Train Duel: multiplayer
- **No invites needed.** Switch on **Duel me** while riding, and the server pairs you with another rider on the same line (same train first).
- **Accepting:** both riders get a 20-second "Match found!" popup. If one says no, the other is matched with the next rider right away.
- **Best of 3:**
  1. Pick a card from your collection.
  2. Charge it in a 6-second mini-game that depends on its element:
     - ☀ **Sun:** stop at noon
     - ⚡ **Storm:** connect the dots
     - ☾ **Moon:** star catcher
  3. Clash. Power = mini-game score + 25 if your element beats theirs (Sun > Storm > Moon > Sun) + a rarity bonus.
- **Winner:** gets a Legendary Champion card. The loser loses nothing.
- **Demo riders and a practice bot** make it playable with one phone.

---

## Tech stack

| Area | Built with |
|---|---|
| App | Expo SDK 58, React Native 0.88, React 19 (React Compiler), TypeScript (strict), Expo Router |
| Graphics | react-native-svg (all cards, mascots and duel art are drawn in code), react-native-maps |
| Device | expo-location, expo-camera (QR), expo-audio, expo-speech, expo-haptics |
| Backend | Supabase: Auth, Postgres with row-level security, RPC functions, Realtime (for Train Duel) |
| Live data | MBTA V3 API (`/vehicles`, `/predictions`, `/alerts`, `/stops`) |
| AI and voice | Google Gemini (with Search grounding), ElevenLabs text-to-speech |

---

## Getting started

### Requirements
- Node.js LTS (20 or 22) and npm
- The **Expo Go** app on your phone, or an iOS simulator / Android emulator
- A Supabase project (free tier is fine)

### 1. Install
```bash
git clone https://github.com/DaisyNBN/TQuest.git
cd TQuest
npm install
```

### 2. Environment variables
```bash
cp .env.example .env
```
Fill in `.env`. **Never commit it.**

| Variable | What it does |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase project. **Required** (sign-in). |
| `EXPO_PUBLIC_MBTA_API_KEY` | MBTA V3 key. Needed for live rides: 1,000 requests/min with a key, 20/min without. |
| `EXPO_PUBLIC_GEMINI_API_KEY` | Questie's AI. Empty → offline answers. |
| `EXPO_PUBLIC_ELEVENLABS_API_KEY`, `EXPO_PUBLIC_ELEVENLABS_VOICE_ID` | Questie's premium voice. Empty → the phone's voice. |
| `EXPO_PUBLIC_ELEVENLABS_DAILY_CHARS` | Daily ElevenLabs character budget (default 2000). |
| `EXPO_PUBLIC_DEMO_MODE` | `1` = pretend train, one stop every 20 s; no MBTA or GPS needed. |
| `EXPO_PUBLIC_QUESTIE_OFFLINE` | `1` = Questie uses only hand-written answers. |
| `EXPO_PUBLIC_DUEL_DEMO` | `1` = Train Duel uses scripted demo riders instead of real matchmaking. |

> `EXPO_PUBLIC_*` values are built into the app, so they are readable by anyone with the app. Use restricted keys and don't ship real secrets in a public build.

### 3. Set up Supabase
In the Supabase Dashboard, go to **SQL Editor** and run each file in `supabase/migrations/` **in name order**:

1. `20261121000000_init.sql`: profiles, cards, art finds, points ledger, RLS, core functions
2. `20261121010000_month_points.sql`
3. `20261121020000_streak_challenge_delete.sql`
4. `20261121030000_daily_station_card.sql`: one point-earning ride card per station per 24 h
5. `20261121_train_duel_matchmaking.sql`: Train Duel queue, matches and Realtime

Then check **Database → Publications → `supabase_realtime`** includes `duel_matches`.

### 4. Run
```bash
npx expo start -c      # -c clears the cache; use it after any .env change
```
Scan the QR code with Expo Go, or press `i` / `a` for a simulator.

---

## Demo modes

To present with no dependence on trains, signal or a second phone:

```env
EXPO_PUBLIC_DEMO_MODE=1        # pretend train; the first card pull is Epic
EXPO_PUBLIC_QUESTIE_OFFLINE=1  # Questie never calls Gemini
EXPO_PUBLIC_DUEL_DEMO=1        # demo riders: Swift Ken backs out, then Sunny Davi duels
```

Other demo helpers:
- **Simulate a scan** on the Scan tab, for presenting without printed codes
- **Practice duel vs bot** on the Board tab
- **`/duel-lab`**, a sandbox for every duel step (development only)

Matchmaking also falls back to demo riders automatically if Supabase can't be reached.

---

## Scripts

```bash
npm start            # expo start
npm run ios          # open in iOS simulator
npm run android      # open in Android emulator
npm run lint         # expo lint
npx tsc --noEmit     # type check
npm run test:duel    # unit tests for the duel rules (Node's built-in test runner)
```

---

## Project structure

```
src/
├─ app/            Screens (Expo Router: one file = one screen)
│  ├─ (tabs)/      Ride · Rewards · Scan · Board · You
│  ├─ duel/        The duel screen
│  ├─ station/ art/ questie.tsx, auth and onboarding screens
├─ api/            The only code that calls external APIs (MBTA, Gemini, ElevenLabs)
├─ hooks/          Polling, live ride tracking, demo ride, ride detector
├─ lib/            Trip tracker, line planning, Supabase client, voice, haptics, paint helpers
├─ state/          Auth, game (cards, points, offline sync queue), feedback settings
├─ duel/           Train Duel: matchmaking (match/), painted UI (ui/), Realtime transport
├─ features/duel/  Duel rules (with tests), bot opponent, transport interface
├─ components/     StampCard, PullModal, RideMap, BottomSheet, Mascot, Questie, …
├─ data/           Stations and mascots, line maps, QR spots, offline Questie answers
└─ theme/          Colors and light/dark theme
supabase/migrations/   Database schema, security policies and server functions
assets/                Icons, splash, paper texture, sfx/ (duel sound effects)
```
[![Architecture diagram of daisynbn/tquest](https://gitdiagram.com/daisynbn/tquest/diagram.png)](https://gitdiagram.com/daisynbn/tquest?utm_source=readme&utm_medium=picture)
---

## QR stamp spots

Each printed sign holds `TQUEST:<CODE>` (see `src/data/places.ts`).

| Line | Landmarks | Artworks |
|---|---|---|
| Red | Harvard Yard, MIT Great Dome, Charles River Esplanade, Boston Common, Faneuil Hall, South Station | Kendall Band (Kendall/MIT), Glove Cycle (Porter) |
| Green B | City Hall Plaza, Public Garden, Boston Public Library, Fenway Park, Gasson Hall (Boston College) | |

The printable sign PDFs are kept out of the repo on purpose, so people have to visit the spots to collect.

---

## Privacy and security

- **Row-level security:** riders can only read their own rows, and all writes go through server functions.
- **Location** stays on the device. It's used only to pick your train, and the MBTA calls carry no coordinates.
- **Voice questions** are sent to Google Gemini as audio.
- **Train Duel** shows your username and mascot to your opponent and stores your line and train id while you're in the queue.
- **Delete account** (You tab) removes all your data.

## Known limitations

- The app only tracks while it's open, with no background tracking or notifications.
- API keys are built into the client. The production fix is a server proxy, for example Supabase Edge Functions.
- Some rewards are trusted from the client: rarity rolls, QR scans with no location check, and duel results.
- No transfers between lines or branches (for example Ashmont ↔ Braintree).
- Raffle partner and draw date are placeholder copy.

---

## Credits

- Live transit data from the [MBTA V3 API](https://www.mbta.com/developers/v3-api). TQuest is a student project, not affiliated with or endorsed by the MBTA.
- AI by Google Gemini. Voice by ElevenLabs.
- Card art, mascots, Questie and duel sound effects are original and made in code for this project.
