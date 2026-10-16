// ═══════════════════════════════════════════════════════════
// خريطة جامعة البحرين — حرم الصخير (هندسة حقيقية من OSM)
// ═══════════════════════════════════════════════════════════
import { CAMPUS_VIEW, CAMPUS_PATHS } from "./campus-geometry";

export { CAMPUS_VIEW, CAMPUS_PATHS };

export interface BuildingDef {
  code: string;
  name: string;
  area: string;
  x: number;
  y: number;
  w: number;
  h: number;
  external?: boolean;
  round?: boolean;
}

// مواقع مباني الحرم — الإحداثيات في فضاء 1400×2120 (الشمال للأعلى)
export const BUILDINGS: BuildingDef[] = [
  { code: "S3", name: "المكتبة الرئيسية", area: "library", x: 786, y: 760, w: 110, h: 110 },
  { code: "S47", name: "مكتبة العلوم", area: "science", x: 398, y: 1130, w: 80, h: 80 },
  { code: "S48", name: "مبنى العلوم S48", area: "science", x: 391, y: 1039, w: 70, h: 70 },
  { code: "S41", name: "كلية العلوم", area: "science", x: 307, y: 960, w: 80, h: 80 },
  { code: "S40", name: "كلية تقنية المعلومات", area: "it", x: 307, y: 1050, w: 80, h: 80 },
  { code: "S45", name: "مركز التعلم الإلكتروني", area: "it", x: 954, y: 936, w: 70, h: 70 },
  { code: "S1A", name: "كلية الآداب", area: "arts", x: 858, y: 1023, w: 80, h: 80 },
  { code: "S17", name: "قسم اللغة الإنجليزية", area: "arts", x: 973, y: 817, w: 75, h: 75 },
  { code: "S18", name: "قاعة امتحانات S18", area: "arts", x: 1088, y: 536, w: 75, h: 75 },
  { code: "S39", name: "كلية الحقوق", area: "law", x: 756, y: 1249, w: 85, h: 85 },
  { code: "S37", name: "مبنى التسجيل", area: "law", x: 752, y: 1133, w: 70, h: 70 },
  { code: "S1B", name: "كلية إدارة الأعمال", area: "business", x: 953, y: 878, w: 80, h: 80 },
  { code: "S20", name: "كلية التعليم التطبيقي", area: "education", x: 1243, y: 1553, w: 85, h: 85 },
  { code: "S22", name: "كلية المعلمين", area: "education", x: 808, y: 1121, w: 75, h: 75 },
  { code: "S21", name: "المركز الصحي", area: "health", x: 1014, y: 1357, w: 70, h: 70 },
  { code: "S4", name: "عمادة شؤون الطلبة", area: "affairs", x: 651, y: 969, w: 70, h: 70 },
  { code: "S6", name: "مسجد الجامعة", area: "mosque", x: 700, y: 750, w: 65, h: 65, round: true },
  { code: "S5", name: "قاعة الشيخ عبدالعزيز", area: "halls", x: 854, y: 742, w: 80, h: 80 },
  { code: "S50", name: "قاعة خنجي", area: "halls", x: 289, y: 1119, w: 70, h: 70 },
  { code: "SG2S", name: "الصالة الرياضية", area: "sports", x: 1194, y: 2068, w: 85, h: 85 },
  { code: "FIELD", name: "الملعب والمضمار", area: "sports", x: 573, y: 218, w: 320, h: 190, round: true },
  { code: "S51", name: "فود العلوم والآيتي", area: "food", x: 400, y: 1250, w: 65, h: 65 },
  { code: "FOOD", name: "الفود الرئيسي", area: "food", x: 884, y: 924, w: 65, h: 65 },
  { code: "BUS", name: "محطة الحافلات", area: "transport", x: 1080, y: 380, w: 65, h: 65 },
  { code: "PARK", name: "موقف السيارات الغربي", area: "transport", x: 57, y: 1023, w: 150, h: 110 },
  { code: "GARDEN", name: "البستان المركزي", area: "garden", x: 451, y: 874, w: 120, h: 120, round: true },
  { code: "EAST", name: "المدخل الشرقي", area: "east", x: 1305, y: 612, w: 65, h: 65 },
];

export const AREAS: Record<string, { name: string; desc: string }> = {
  library: { name: "منطقة المكتبة", desc: "قلب الأرشيف — حيث بدأت الحكاية." },
  science: { name: "منطقة العلوم", desc: "مكتبة العلوم وكلية العلوم." },
  it: { name: "منطقة التقنية", desc: "كلية تقنية المعلومات ومركز التعلم." },
  arts: { name: "منطقة الآداب", desc: "الآداب واللغات وقاعات الامتحانات." },
  law: { name: "منطقة الحقوق", desc: "الحقوق ومبنى التسجيل." },
  business: { name: "منطقة الإدارة", desc: "كلية إدارة الأعمال." },
  education: { name: "منطقة التعليم", desc: "التعليم التطبيقي وكلية المعلمين." },
  health: { name: "المنطقة الصحية", desc: "المركز الصحي." },
  affairs: { name: "منطقة العمادة", desc: "عمادة شؤون الطلبة." },
  mosque: { name: "منطقة المسجد", desc: "المسجد والمنطقة الخضراء." },
  halls: { name: "منطقة القاعات", desc: "قاعتا الشيخ عبدالعزيز وخنجي." },
  sports: { name: "المنطقة الرياضية", desc: "الصالة والملعب والمضمار." },
  food: { name: "منطقة الفود", desc: "الفودان — الرئيسي وفود العلوم." },
  transport: { name: "منطقة المواصلات", desc: "محطة الحافلات والموقف." },
  garden: { name: "البستان", desc: "الخضرة المركزية بين المباني." },
  east: { name: "المدخل الشرقي", desc: "بوابة الحرم الشرقية." },
};

export function buildingByCode(code: string): BuildingDef | undefined {
  return BUILDINGS.find((b) => b.code.toUpperCase() === code.toUpperCase());
}

export const GAME = {
  name: "بروتوكول التاسع",
  nameEn: "PROTOCOL NINE",
  code: "P9",
  slogan: "ما حُذف لم يختفِ. ما أُحرق لم يمت. ما نُسي ينتظر من يتذكر.",
  recordingLine: "البروتوكول العاشر: جارٍ التسجيل...",
} as const;
