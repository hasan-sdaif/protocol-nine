// معاينة الخريطة الموجهة — يرسم vec.json بأسلوب blueprint ثم يحولها PNG للفحص البصري
const fs = require("fs");
const path = require("path");
(async () => {
  const R = JSON.parse(fs.readFileSync(path.join(__dirname, "vec.json"), "utf8"));
  const parts = [];
  // أرضية
  parts.push(`<rect width="2362" height="2362" fill="#050d18"/>`);
  // غطاء أرضي خافت
  if (R.land) parts.push(`<path d="${R.land}" fill="#0a1626" fill-rule="evenodd" stroke="none"/>`);
  // مياه
  if (R.water) parts.push(`<path d="${R.water}" fill="#0c2338" stroke="#164e7e" stroke-width="1.5"/>`);
  // طرق
  const roads = [
    ["r0", "#2e6fa8", 9, 0.9],
    ["r1", "#265d8f", 6, 0.75],
    ["r2", "#1d4a75", 3.5, 0.6],
    ["r3", "#173a5c", 2, 0.45],
    ["r4", "#14324f", 1.4, 0.35],
  ];
  for (const [k, c, w, o] of roads) {
    if (R[k]) parts.push(`<path d="${R[k]}" fill="none" stroke="${c}" stroke-width="${w}" stroke-opacity="${o}" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  // مبانٍ
  if (R.bld) parts.push(`<path d="${R.bld}" fill="#0e2238" fill-rule="evenodd" stroke="#4aa3e0" stroke-width="1.6" stroke-opacity="0.85"/>`);
  // مواقع المباني المعروفة (من build_map.py ×K)
  const K = 1.2226;
  const C = {
    S3: [825, 745, "S3"], S2: [795, 590, "S2"], S6: [777, 646, "S6"], S5: [903, 640, "S5"],
    S4: [700, 830, "S4"], S23: [838, 800, "S23"], S1A: [850, 865, "S1A"], S22: [865, 950, "S22"],
    S37: [790, 940, "S37"], S38: [880, 905, "S38"], S39: [825, 1060, "S39"], S44: [905, 860, "S44"],
    S1B: [965, 730, "S1B"], S17: [1012, 690, "S17"], S45: [995, 800, "S45"], S46: [945, 690, "S46"],
    S24: [985, 560, "S24"], S18: [1093, 470, "S18"], S41: [450, 820, "S41"], S40: [470, 870, "S40"],
    S48: [500, 900, "S48"], S50: [445, 950, "S50"], S47: [530, 960, "S47"], S51: [540, 1030, "S51"],
    S20: [1215, 1300, "S20"], S20A: [1120, 1305, "S20A"], S20B: [1260, 1245, "S20B"], S21: [1035, 1140, "S21"],
  };
  for (const [k, [x, y, n]] of Object.entries(C)) {
    const px = Math.round(x * K), py = Math.round(y * K);
    parts.push(`<circle cx="${px}" cy="${py}" r="26" fill="none" stroke="#ffb347" stroke-width="3"/>`);
    parts.push(`<text x="${px}" y="${py + 8}" text-anchor="middle" font-family="monospace" font-size="34" fill="#ffb347">${n}</text>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2362" height="2362" viewBox="0 0 2362 2362">${parts.join("\n")}</svg>`;
  fs.writeFileSync(path.join(__dirname, "preview_map.svg"), svg);
  // تحويل إلى PNG
  const sharp = require("/home/z/my-project/node_modules/sharp");
  await sharp(Buffer.from(svg)).resize(1181).png().toFile(path.join(__dirname, "preview_map.png"));
  console.log("preview written:", fs.statSync(path.join(__dirname, "preview_map.png")).size, "bytes");
})();
