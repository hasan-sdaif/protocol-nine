# محاذاة مواقع اللعبة إلى مبانٍ حقيقية + إيجاد المداخل الشرقية
import numpy as np, cv2, json
from PIL import Image

L = lambda n: np.array(Image.open(f'layers/map-layer-{n}.png').getchannel('A'))

# استخراج مراكز كل المباني (من طبقة building)
bld = (L('building') > 40).astype(np.uint8)
cs, _ = cv2.findContours(bld, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
buildings = []
for c in cs:
    a = cv2.contourArea(c)
    if a < 300:
        continue
    M = cv2.moments(c)
    if M['m00']:
        buildings.append((int(M['m10']/M['m00']), int(M['m01']/M['m00']), a, cv2.boundingRect(c)))
print(f"عدد المباني المسجلة: {len(buildings)}")

K = 1.2226
# مواقع build_map (إحداثيات العرض × K)
RAW = {
    'S3': (825, 745), 'S2': (795, 590), 'S6': (777, 646), 'S5': (903, 640),
    'S4': (700, 830), 'S23': (838, 800), 'S1A': (850, 865), 'S22': (865, 950),
    'S37': (790, 940), 'S38': (880, 905), 'S39': (825, 1060), 'S44': (905, 860),
    'S1B': (965, 730), 'S17': (1012, 690), 'S45': (995, 800), 'S46': (945, 690),
    'S24': (985, 560), 'S18': (1093, 470), 'S41': (450, 820), 'S40': (470, 870),
    'S48': (500, 900), 'S50': (445, 950), 'S47': (530, 960), 'S51': (540, 1030),
    'S20': (1215, 1300), 'S20A': (1120, 1305), 'S20B': (1260, 1245), 'S21': (1035, 1140),
}
# مواقع خاصة
SPECIAL = {
    'SG2S': (1444, 2109),   # المركّب الرياضي جنوباً (على مبنى كبير)
    'FIELD': (823, 258),    # مركز المضمار
    'PARK': (307, 1063),    # الموقف الغربي
    'PARK_E': (1394, 732),  # الموقف الشرقي
    'GARDEN': (701, 914),   # البستان
    'BUS': (1330, 300),     # قرب البوابة الرئيسية شمالاً
}

def nearest_bld(x, y, maxd=140):
    best, bd = None, 1e9
    for bx, by, a, bb in buildings:
        d = ((bx-x)**2 + (by-y)**2) ** 0.5
        if d < bd:
            bd, best = d, (bx, by, a)
    return best, bd

print("\nمحاذاة مواقع build_map إلى أقرب مبنى:")
result = {}
for k, (dx, dy) in RAW.items():
    x, y = round(dx*K), round(dy*K)
    (bx, by, a), d = nearest_bld(x, y)
    snapped = d <= 140
    result[k] = (bx if snapped else x, by if snapped else y, round(d))
    print(f"  {k}: raw=({x},{y}) → bld=({bx},{by}) area={a} dist={d:.0f} {'✓' if snapped else '✗ بعيد'}")

print("\nمواقع خاصة:")
for k, (x, y) in SPECIAL.items():
    (bx, by, a), d = nearest_bld(x, y)
    print(f"  {k}: ({x},{y}) → nearest bld=({bx},{by}) dist={d:.0f}")

# المدخل الشرقي: أبعد نقطة طريق شرقية في نطاق y 700-1300
r2 = (L('road-minor-mid') > 60).astype(np.uint8)
sub = r2[700:1300, 1600:]
ys, xs = np.nonzero(sub)
if len(xs):
    ex, ey = 1600 + xs.max(), 700 + ys[np.argmax(xs)]
    print(f"\nأبعد طريق شرقي: ({ex},{ey})")
r1 = (L('road-minor-high') > 60).astype(np.uint8)
sub1 = r1[700:1300, 1600:]
ys1, xs1 = np.nonzero(sub1)
if len(xs1):
    print(f"أبعد طريق دائري شرقي: ({1600 + xs1.max()},{700 + ys1[np.argmax(xs1)]})")

# البوابات: تقاطع الطرق الرئيسية مع حدود n
r0 = (L('road-major') > 60).astype(np.uint8)
ys0, xs0 = np.nonzero(r0)
print(f"\nالطرق الرئيسية تغطي: x=[{xs0.min()},{xs0.max()}] y=[{ys0.min()},{ys0.max()}]")

json.dump({k: v for k, v in result.items()}, open('snap.json', 'w'))
