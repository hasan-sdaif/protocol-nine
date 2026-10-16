// توليد وحدة هندسة الحرم من vec.json → src/lib/p9/campus-geometry.ts
// مع إزاحة الإحداثيات إلى viewBox 1400×2120 (قص منطقة الحرم)
const fs = require("fs");

const R = JSON.parse(fs.readFileSync("vec.json", "utf8"));
const X0 = 250, Y0 = 40; // إزاحة القص
const W = 1400, H = 2120;

function shiftPath(d) {
  if (!d) return "";
  // مسارات SVG: M x y L x y ... Z — نزيح كل زوج إحداثي
  return d.replace(/(-?\d+(\.\d+)?) (-?\d+(\.\d+)?)/g, (m, x, _dx, y) => {
    const nx = Math.round(parseFloat(x) - X0);
    const ny = Math.round(parseFloat(y) - Y0);
    // نبقي ضمن الحدود مع هامش صغير
    return `${nx} ${ny}`;
  });
}

// تنظيف الشظايا الصغيرة (أقل من 3 نقاط)
function cleanFragments(d) {
  if (!d) return "";
  const frags = d.match(/M[^M]+/g) || [];
  return frags
    .filter((f) => (f.match(/ /g) || []).length >= 3)
    .join("");
}

const geo = {
  land: cleanFragments(shiftPath(R.land)),
  water: shiftPath(R.water),
  roadMajor: shiftPath(R.r0),
  roadMinorHigh: shiftPath(R.r1),
  roadMinorMid: cleanFragments(shiftPath(R.r2)),
  roadMinorLow: cleanFragments(shiftPath(R.r3)),
  roadPath: cleanFragments(shiftPath(R.r4)),
  buildings: cleanFragments(shiftPath(R.bld)),
};

const total = Object.values(geo).reduce((s, v) => s + v.length, 0);
console.log("إجمالي أحرف المسارات:", total);

// مواقع مباني اللعبة — بإحداثيات 2362 الأصلية ثم إزاحة
const RAW_POS = {
  S3: [1036, 800], S47: [648, 1170], S48: [641, 1079], S41: [557, 1000],
  S40: [557, 1090], S45: [1204, 976], S1A: [1108, 1063], S17: [1223, 857],
  S18: [1338, 576], S39: [1006, 1289], S37: [1002, 1173], S1B: [1203, 918],
  S20: [1493, 1593], S22: [1058, 1161], S21: [1264, 1397], S4: [901, 1009],
  S6: [950, 790], S5: [1104, 782], S50: [539, 1159], SG2S: [1444, 2108],
  FIELD: [823, 258], S51: [650, 1290], FOOD: [1134, 964], BUS: [1330, 420],
  PARK: [307, 1063], GARDEN: [701, 914], EAST: [1555, 652],
};
const spots = {};
for (const [k, [x, y]] of Object.entries(RAW_POS)) {
  spots[k] = [Math.round(x - X0), Math.round(y - Y0)];
}

const ts = `// هندسة خريطة جامعة البحرين — حرم الصخير
// مولّدة آلياً من بيانات OpenStreetMap (توجيه cv2) — لا تعدل يدوياً
// viewBox: 0 0 ${W} ${H} (شمال لأعلى)

export const CAMPUS_VIEW = { w: ${W}, h: ${H} } as const;

export const CAMPUS_PATHS = {
  land: "${geo.land}",
  water: "${geo.water}",
  roadMajor: "${geo.roadMajor}",
  roadMinorHigh: "${geo.roadMinorHigh}",
  roadMinorMid: "${geo.roadMinorMid}",
  roadMinorLow: "${geo.roadMinorLow}",
  roadPath: "${geo.roadPath}",
  buildings: "${geo.buildings}",
} as const;

// مواقع علامات اللعبة على الخريطة الحقيقية (بإحداثيات viewBox)
export const CAMPUS_SPOTS: Record<string, [number, number]> = ${JSON.stringify(spots)};
`;

fs.writeFileSync("../src/lib/p9/campus-geometry.ts", ts);
console.log("كُتب src/lib/p9/campus-geometry.ts:", ts.length, "حرفاً");
