<div dir="rtl">

# المساهمة في بروتوكول التاسع

شكراً لاهتمامك! هذا المشروع مفتوح المصدر ويقبل مساهمات الجميع — طلاب جامعة البحرين وغيرها، مطورين، مصممين، وكتاب ألغاز.

</div>

# Contributing to PROTOCOL NINE

Thank you for your interest! This project welcomes contributions from everyone — developers, designers, puzzle-writers, and students from UoB and beyond.

## 🚦 Ground Rules

1. **Be kind.** This is a community project for an educational experience.
2. **No spoilers in public spaces.** If your issue/PR reveals solutions, mark the title with `[SPOILERS]`.
3. **Keep the mystery alive.** The engine's job is atmosphere first, mechanics second.

## 🛠️ Development Setup

```bash
bun install
cp .env.example .env
bun run db:push
bun prisma/seed/index.ts
bun run dev                       # app on :3000
cd mini-services/realtime && bun run dev   # socket.io on :3003
bun run lint                      # keep it clean
```

## 📋 How to Contribute

1. **Fork** the repository and create your branch:
   ```bash
   git checkout -b feature/amazing-idea
   ```
2. **Make your changes** — keep PRs focused (one feature/fix per PR).
3. **Test the golden path**: boot → register → map scan → decode → verify.
4. **Lint**: `bun run lint` must pass.
5. **Open a Pull Request** describing *what* and *why*.

## 💡 Ideas We'd Love

| Area | Ideas |
|---|---|
| Ciphers | New interactive cipher types (steganography, QR-expiring, dynamic audio) |
| Maps | Geometry pipelines for other campuses (Isa Town, Salmaniya, or other universities) |
| Story | New side-quests, testimonies, agent personas (Arabic or English) |
| Accessibility | Screen-reader mode for the CRT UI, reduced-motion variants |
| Audio | Better archival effects, new hidden-layer mechanics |
| Tooling | Organizer dashboard, seed validation scripts, i18n |

## 🐛 Reporting Issues

When reporting bugs, please include:
- What you expected vs. what happened
- Steps to reproduce (which view, which document code)
- Browser & device

For spoiler-sensitive reports (e.g., a cipher solution bug), use `[SPOILERS]` in the title.

## 🏗️ Architecture Notes

- **Single page app** at `/` — all views are client components under `src/components/p9/`.
- **API routes** under `src/app/api/p9/` — no server actions; everything through the API.
- **Game logic** lives in `src/lib/p9/` (engine, rules, constants) — shared between routes.
- **Realtime** is a separate socket.io mini-service (`mini-services/realtime/`).
- **Seeds** in `prisma/seed/` are the canonical game content.

---

<div dir="rtl">

## 📜 ميثاق المساهمين

كل مساهمة تقبلها المنظومة يجب أن تحترم روح التحدي: الغموض أولاً، والوضوح لمن يبحث.

**«ما حُذف لم يختفِ.»**

</div>
