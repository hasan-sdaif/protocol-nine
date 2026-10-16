// ═══════════════════════════════════════════════════════════
// بانى صفحات التصيير — يولّد out/render-<id>.html لكل فيديو
// يضمّن: الخطوط base64 + GSAP + الخط الزمني كاملاً + متغيرات الحجم
// حسب الاتجاه (1080×1920 عمودي / 1920×1080 أفقي)
// ═══════════════════════════════════════════════════════════
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const T = resolve(import.meta.dir, "..");
const OUT = join(T, "out");

const template = readFileSync(join(T, "render/template.html"), "utf8");
const gsap = readFileSync(join(T, "assets/gsap.min.js"), "utf8");
const b64 = (p: string) => readFileSync(join(T, "assets/fonts", p)).toString("base64");
const FONTS: Record<string, string> = {
  __F_CAIRO_AR__: b64("cairo-arabic-900.woff2"),
  __F_CAIRO_LA__: b64("cairo-latin-900.woff2"),
  __F_CAIRO_AR7__: b64("cairo-arabic-700.woff2"),
  __F_ORBITRON__: b64("orbitron-900.woff2"),
  __F_JBMONO__: b64("jbmono-700.woff2"),
};

/** hex → rgba(r,g,b,a) */
function rgba(hex: string, a: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16), g = parseInt(m.slice(2, 4), 16), b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ── قيم الحجم: [عمودي, أفقي] ──
type Pair = [string, string];
const V = (portrait: string, landscape: string): Pair => [portrait, landscape];
const LAYOUT: Record<string, Pair> = {
  __BRAND_PT__: V("92px", "64px"),
  __BRAND_AR__: V("54px", "44px"),
  __BRAND_LA__: V("26px", "22px"),
  __PROG_MX__: V("120px", "220px"),
  __PROG_BM__: V("96px", "72px"),
  __PROG_FS__: V("34px", "30px"),
  __CAP_MX__: V("110px", "250px"),
  __CAP_TOP__: V("73%", "78%"),
  __CAP_FS__: V("58px", "50px"),
  __SCENE_GAP__: V("64px", "52px"),
  __SCENE_PAD__: V("250px 90px 500px", "180px 150px 200px"),
  __K_FS__: V("96px", "84px"),
  __SUB_FS__: V("56px", "48px"),
  __CARD_R__: V("34px", "30px"),
  __CARD_PAD__: V("54px 64px", "44px 60px"),
  __CHIP_FS__: V("50px", "44px"),
  __TAG_FS__: V("34px", "30px"),
};

// ── متغيرات CSS داخل :root (بكسل) ──
const CSSVARS: Record<string, Pair> = {
  "--fs-title": V("132px", "104px"),
  "--fs-title-lat": V("44px", "40px"),
  "--fs-title-sm": V("108px", "88px"),
  "--fs-end": V("92px", "76px"),
  "--fs-q": V("340px", "260px"),
  "--fs-cta": V("100px", "84px"),
  "--fs-cta-sm": V("84px", "70px"),
  "--fs-stat": V("300px", "220px"),
  "--fs-stat-sm": V("120px", "100px"),
  "--fs-stat-xl": V("360px", "280px"),
  "--fs-term": V("42px", "38px"),
  "--fs-tile": V("48px", "42px"),
  "--fs-letter": V("130px", "110px"),
  "--fs-vs": V("64px", "56px"),
  "--fs-pts": V("58px", "50px"),
  "--fs-rank": V("54px", "46px"),
  "--fs-tag2": V("40px", "34px"),
  "--gap-sm": V("26px", "22px"),
  "--gap-md": V("44px", "36px"),
  "--gap-lg": V("64px", "52px"),
  "--icon-sm": V("64px", "54px"),
  "--icon-md": V("96px", "80px"),
  "--icon-lg": V("140px", "116px"),
  "--icon-xl": V("210px", "170px"),
  "--icon-logo": V("150px", "120px"),
  "--pad-card": V("54px 64px", "44px 60px"),
  "--pad-tile": V("44px 52px", "36px 46px"),
  "--card-r": V("34px", "30px"),
  "--if-w": V("560px", "480px"),
  "--md-slot": V("170px", "140px"),
  "--tw-bg": V("10px", "9px"),
  "--tw-bw": V("16px", "14px"),
  "--tw-h": V("300px", "240px"),
  "--eq-h": V("280px", "220px"),
  "--eq-bw": V("26px", "22px"),
  "--td-rw": V("130px", "110px"),
  "--kd-rw": V("130px", "110px"),
  "--fh-w": V("620px", "560px"),
  "--fh-h": V("380px", "300px"),
  "--as-w": V("500px", "440px"),
  "--as-h": V("300px", "240px"),
  "--cm-w": V("640px", "560px"),
  "--cm-h": V("430px", "360px"),
  "--pu-w": V("500px", "420px"),
  "--ht-w": V("800px", "700px"),
  "--ic-w": V("560px", "480px"),
  "--lb-w": V("640px", "560px"),
  "--lb-rw": V("540px", "470px"),
  "--ss-w": V("300px", "260px"),
  "--mo-cg": V("60px", "52px"),
};

const VIDEOS = ["reel1", "reel2", "reel3", "reel4", "reel5", "youtube"];

for (const id of VIDEOS) {
  const tl = JSON.parse(readFileSync(join(OUT, `${id}.timeline.json`), "utf8"));
  const land = tl.orientation === "landscape";
  const i = land ? 1 : 0;

  const vars = Object.entries(CSSVARS).map(([k, v]) => `  ${k}:${v[i]};`).join("\n");

  let html = template;
  // استبدالات آمنة (دوال لتفادي أنماط $ الخاصة)
  html = html.replace("__VARS__", () => vars);
  html = html.replace("__GSAP__", () => gsap);
  html = html.replace("__TL_JSON__", () => JSON.stringify(tl));
  html = html.replace("__ACCENT__", () => tl.accent);
  html = html.replace("__ACCENT_GLOW__", () => rgba(tl.accent, 0.14));
  html = html.replace("__ACCENT_DIM__", () => tl.accentDim || rgba(tl.accent, 0.45));
  html = html.replace("__W__", () => (land ? "1920" : "1080"));
  html = html.replace("__H__", () => (land ? "1080" : "1920"));
  for (const [k, v] of Object.entries(LAYOUT)) html = html.split(k).join(v[i]);
  for (const [k, v] of Object.entries(FONTS)) html = html.split(k).join(v);

  const out = join(OUT, `render-${id}.html`);
  writeFileSync(out, html, "utf8");
  console.log(`✓ render-${id}.html — ${(html.length / 1024).toFixed(0)}KB — ${land ? "1920×1080" : "1080×1920"} — ${tl.duration.toFixed(1)}s`);
}
console.log("✓ صفحات التصيير جاهزة");
