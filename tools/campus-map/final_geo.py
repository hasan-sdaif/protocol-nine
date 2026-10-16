# تفاصيل أخيرة: المسجد، المدخل الشرقي، محطة الحافلات
import numpy as np, cv2
from PIL import Image

L = lambda n: np.array(Image.open(f'layers/map-layer-{n}.png').getchannel('A'))

# المسجد: مبنى صغير مميز قرب مركز الحرم (نطاق x 850-1150, y 700-1100)
bld = (L('building') > 40).astype(np.uint8)
sub = bld[700:1100, 850:1150].copy()
cs, _ = cv2.findContours(sub, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
print("مبانٍ صغيرة/متوسطة قرب المركز (مرشّح المسجد):")
cands = []
for c in cs:
    a = cv2.contourArea(c)
    if 400 < a < 3000:
        M = cv2.moments(c)
        x, y, w, h = cv2.boundingRect(c)
        # المسجد غالباً شبه مربع أو دائري
        ar = w / max(h, 1)
        if 0.6 < ar < 1.7:
            cx, cy = 850 + int(M['m10']/M['m00']), 700 + int(M['m01']/M['m00'])
            cands.append((cx, cy, a, ar))
            print(f"  ({cx},{cy}) area={a:.0f} aspect={ar:.2f}")

# المدخل الشرقي: أقصى نقطة طريق في نطاق y 600-1400
best = None
for n in ['road-minor-high', 'road-minor-mid', 'road-path']:
    r = (L(n) > 60).astype(np.uint8)
    sub = r[600:1400, 1500:]
    ys, xs = np.nonzero(sub)
    if len(xs):
        ex, ey = 1500 + xs.max(), 600 + ys[np.argmax(xs)]
        print(f"{n}: أقصى شرق ({ex},{ey})")
        if best is None or ex > best[0]:
            best = (ex, ey)
print(f"المدخل الشرقي المرشح: {best}")

# امتداد الطريق الدائري كاملاً (أقصى extents)
r = (L('road-minor-high') > 60).astype(np.uint8)
ys, xs = np.nonzero(r)
print(f"road-minor-high: x=[{xs.min()},{xs.max()}] y=[{ys.min()},{ys.max()}]")

# نواة الحرم: أقصى extents للمباني الكبيرة (>1000 مساحة)
cs2, _ = cv2.findContours(bld, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
xs2, ys2 = [], []
for c in cs2:
    if cv2.contourArea(c) > 1000:
        x, y, w, h = cv2.boundingRect(c)
        xs2 += [x, x+w]; ys2 += [y, y+h]
print(f"نواة مباني الحرم: x=[{min(xs2)},{max(xs2)}] y=[{min(ys2)},{max(ys2)}]")
