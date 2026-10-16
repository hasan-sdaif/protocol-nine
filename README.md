<div dir="rtl">

# بروتوكول التاسع — PROTOCOL NINE

**«ما حُذف لم يختفِ. ما أُحرق لم يمت. ما نُسي ينتظر من يتذكر.»**

تجربة واقع بديل (ARG) تنافسية كاملة لطلاب جامعة البحرين — حرم الصخير.
نسختان أخوان في قصة واحدة: **أرشيف الغائبين** (الأصل، ٢٠٠٤) ثم **البروتوكول التاسع** (المختبر العاشر، ٢٠٠٧) — مدمجتان هنا في منظومة رقمية واحدة.

---

</div>

# PROTOCOL NINE — The Unified ARG Platform for University of Bahrain

A complete, production-ready **Alternate Reality Game** engine — merging the two sibling challenges (*The Absent Archive* + *The Ninth Protocol*) into one deep, competitive, story-driven cryptic experience. Students register under codenames, descend through **10 chained protocols** of genuine cryptography, race on a live leaderboard, form trust alliances (with betrayal mechanics), judge forged documents, and race to become *The Ninth*.

> **⚠️ SPOILER WARNING** — `src/lib/game/content.ts`, `src/lib/game/content-aa.ts`, `src/lib/game/content-external.ts` and `tools/game/` contain **all puzzle solutions and secrets**. If you intend to *play* rather than study/contribute, stop reading there.

---

## ✨ The Experience

| System | Description |
|---|---|
| 🌑 **Protocol Zero — The Absent Archive** | The origin chapter: مشروع الطيف (2004–2008), ف.م., the missing document AA-4-26. Arabic Caesar, Bahraini dialect, Dewey classification, the absent number |
| 🔐 **10 Chained Protocols** | 22 core puzzles across perception → shift → signal → geography → weave → concealment → numbers → layers → the ninth. Every protocol unlocks only after its predecessor falls |
| 🧪 **The Cipher Lab** | 9 interactive tools running fully client-side: Caesar (EN+AR), Vigenère, Atbash, Base64, Morse (with local Web-Audio synth playback), A1Z26, reverse, Abjad (الجُمّل), and a ZWSP steganography analyzer |
| 🗺️ **Real Campus Map** | The Sakhir campus vectorized from OpenStreetMap data — tactical night-ops style, wheel/pinch zoom & drag, fog-of-war that lights up area by area as protocols fall, geo-targeting highlights for map puzzles |
| 📡 **Daily Pulse (نبض الأرشيف)** | A deterministic daily cipher seeded by the date — solve it today or wait for tomorrow's beat. Streaks stack bonus points up to +50/day |
| 🕵️ **The Sorting Room** | 10 suspicious documents — 7 forgeries planted by «الورثة» with verifiable flaws (code deviation, fact contradiction, impossibilities, style mismatch) and 3 genuine. Judge wisely: false accusations cost blood from the third one |
| 👥 **Alliances & Quiet Secession** | Teams of up to 10 with 6-digit invite codes, a message channel that self-destructs after 24h, member IDs, and the one-way «الانفصال الهادئ» — someone left, nobody knows who |
| 🔍 **The Transparent Plate** | A point-purchased lens revealing hidden layers *between the lines* across protocols, the map, and the vault |
| 🗝️ **Verification Phrases** | Each completed protocol reveals a social passphrase — proof to other players that you crossed the same gate |
| 🏛️ **The Vault of Nine** | 9 shards (8 protocols + the origin's «الغائب») assembled in a 9-slot riddle vault — the tenth lock is you |
| 🏆 **Live Competition** | Individual + team leaderboards, podium, the Wall of Nine, the Mediator's live event feed — updated every 20 seconds |
| 🎧 **Static Phone Archive** | 31 MP3 recordings with authentic phone DSP (300–3400 Hz band-pass) — generated **once at development time** via ElevenLabs v4, stored in the repo, **zero runtime API calls** |
| 🔒 **Eternal Sessions** | httpOnly cookie + localStorage token backup, scrypt-hashed passphrases, 10-year sessions — a refresh never kicks an agent out |

## 🚀 Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env       # set DATABASE_URL (SQLite) — no API keys needed at runtime

# 3. Create the database
bun run db:push

# 4. (Optional) Seed a live-looking competitive scene
bun tools/game/seed-demo.ts

# 5. Run
bun run dev                # → http://localhost:3000
```

No API keys are required at runtime. All audio is pre-generated and committed under `public/audio/`.

## 🎮 How It Plays

1. **Boot** — a CRT terminal wakes up: `> حالة الوثيقة AA-4-26: مفقودة…`
2. **Field Manual** — a guided intro for newcomers: the story, the rules, the honor code
3. **Enlist** — codename + passphrase only, two pages of terms (read page two… or don't)
4. **Descend** — Protocol Zero → the Nine. Guardian transmissions (phone audio + transcript), cipher materials (codes, morse, numbers, stego, invisible ink, map navigation, vault slots), three-tier hint economy, wrong-answer bleed
5. **Compete** — daily pulse streaks, the sorting room, external annexes (Engineering — Isa Town, Health Sciences — Manama), alliances, the leaderboard, the Wall of Nine
6. **Finish** — the vault of nine shards, the last question, Document 101: *you*

## 🛠️ Tech Stack

- **Next.js 16** (App Router) + **TypeScript 5** + React 19
- **Tailwind CSS 4** + shadcn/ui (New York) — RTL-first, mobile-first, dark CRT aesthetic
- **Prisma ORM** + SQLite — Agent / Session / Solve / HintUnlock / Journal / DailyPulse / SortAttempt / Team / TeamMessage
- **Zero-dependency crypto** — cipher engine is pure TypeScript, shared client/server
- **scrypt** password hashing, 10-year httpOnly sessions
- Audio: ElevenLabs v4 (dev-time only) → ffmpeg phone DSP → static MP3s

## 📁 Project Structure

```
src/
  app/                    # page.tsx (the whole game) + API routes
    api/game/             # auth, state, submit, hint, pulse, sorting, team, plate, feed, leaderboard, finale
  components/game/        # BootScreen, IntroScreen, AuthPanel, GameShell, OpsView,
                          # PuzzlePanel, MaterialView, LabView, MapPanel, PulseView,
                          # SortingView, BoardView, ArchiveView, TeamView, JournalView, FinaleView
  lib/game/
    ciphers.ts            # the cipher engine (pure TS, isomorphic)
    content.ts            # protocols 1–9 + audio manifest
    content-aa.ts         # protocol zero, phrases, plate notes, mechanics config
    content-external.ts   # external annexes, sorting docs, pulse pool
    campus.ts             # buildings & areas of UOB Sakhir
    campus-geometry.ts    # OSM-derived real geometry
    engine.ts             # server game logic
    auth.ts               # eternal sessions
public/audio/             # 31 static MP3s + manifest.json
tools/game/               # dev-time audio generation, cipher verifiers, demo seeder
prisma/schema.prisma      # data model
```

## 🤝 Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Ideas that fit the world: new protocols, new cipher types, new sorting-room forgeries, accessibility improvements, and translations.

## 📜 License

MIT — see [LICENSE](LICENSE).

---

<div dir="rtl">

**أرشيف الغائبين ليس عن الذين غابوا. هو عن كل من يُقرر أن يكون حاضراً.**

</div>
