# تحليل هندسي دقيق: المضمار، أكبر المساحات الخضراء، مداخل الطرق الرئيسية
import numpy as np, cv2, json
from PIL import Image

L = lambda n: np.array(Image.open(f'layers/map-layer-{n}.png').getchannel('A'))
H, W = 2362, 2362

# 1) أكبر المساحات الخضراء (landcover)
land = (L('landcover') > 60).astype(np.uint8)
cs, _ = cv2.findContours(land, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
areas = sorted(((cv2.contourArea(c), i, c) for i, c in enumerate(cs)), key=lambda t: -t[0])[:8]
print("أكبر المساحات الخضراء (مساحة، مركز):")
for a, _, c in areas:
    M = cv2.moments(c)
    if M['m00']:
        cx, cy = int(M['m10']/M['m00']), int(M['m01']/M['m00'])
        x, y, w, h = cv2.boundingRect(c)
        print(f"  area={int(a)} center=({cx},{cy}) bbox=({x},{y},{w},{h})")

# 2) المضمار البيضاوي: نبحث في landcover عن شكل بيضاوي مفرغ (حلقة)
# نستخدم التآكل لإيجاد حلقات
kernel = np.ones((25, 25), np.uint8)
eroded = cv2.erode(land, kernel)
ring = land & ~eroded  # الحلقات والحواف
cs2, _ = cv2.findContours(ring, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
rings = sorted(((cv2.contourArea(c), i, c) for i, c in enumerate(cs2)), key=lambda t: -t[0])[:5]
print("\nأكبر الأشكال الحلقية (مرشّح المضمار):")
for a, _, c in rings:
    M = cv2.moments(c)
    if M['m00']:
        cx, cy = int(M['m10']/M['m00']), int(M['m01']/M['m00'])
        x, y, w, h = cv2.boundingRect(c)
        ar = w / max(h, 1)
        print(f"  area={int(a)} center=({cx},{cy}) bbox=({x},{y},{w},{h}) aspect={ar:.2f}")

# 3) نقاط دخول الطرق الرئيسية: نهايات مسارات r0 قرب حواف الخريطة أو الحلقة المحيطة
r0 = (L('road-major') > 60).astype(np.uint8)
cs3, _ = cv2.findContours(r0, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
print(f"\nمسارات الطرق الرئيسية: {len(cs3)}")
for c in sorted(cs3, key=cv2.contourArea, reverse=True)[:6]:
    x, y, w, h = cv2.boundingRect(c)
    M = cv2.moments(c)
    cx, cy = int(M['m10']/M['m00']), int(M['m01']/M['m00'])
    print(f"  bbox=({x},{y},{w},{h}) center=({cx},{cy})")

# 4) مواقف السيارات: road-minor-low يحتوي خطوط المواقف المتوازية غالباً
r3 = (L('road-minor-low') > 60).astype(np.uint8)
# كثافة خطوط المواقف في شبكة 200×200
cell = 200
dens = {}
for gy in range(0, H, cell):
    for gx in range(0, W, cell):
        d = r3[gy:gy+cell, gx:gx+cell].sum()
        if d > 8000:
            dens[(gx//cell, gy//cell)] = int(d)
print("\nخلايا كثافة خطوط (مواقف مرشحة):")
for (gx, gy), d in sorted(dens.items(), key=lambda kv: -kv[1])[:10]:
    print(f"  cell=({gx*cell},{gy*200})..({gx*cell+cell},{gy*200+cell}) density={d}")
