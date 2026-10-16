# ملاءمة قطع ناقص للمضمار + إيجاد حواف الحرم بدقة
import numpy as np, cv2, json
from PIL import Image

L = lambda n: np.array(Image.open(f'layers/map-layer-{n}.png').getchannel('A'))
land = (L('landcover') > 60).astype(np.uint8)

kernel = np.ones((25, 25), np.uint8)
eroded = cv2.erode(land, kernel)
ring = land & ~eroded
cs2, _ = cv2.findContours(ring, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
big = max(cs2, key=cv2.contourArea)
(cx, cy), (MA, ma), ang = cv2.fitEllipse(big)
print(f"المضمار: center=({cx:.0f},{cy:.0f}) axes=({MA:.0f},{ma:.0f}) angle={ang:.1f} area={cv2.contourArea(big):.0f}")
x, y, w, h = cv2.boundingRect(big)
print(f"bbox=({x},{y},{w},{h})")

# حفظ قناع المضمار للعرض
mask = np.zeros((2362, 2362), np.uint8)
cv2.drawContours(mask, [big], -1, 255, -1)
Image.fromarray(mask).save('track_mask.png')

# أين تلتقي الطرق الرئيسية بحافة الخريطة؟
r0 = (L('road-major') > 60).astype(np.uint8)
rows = np.nonzero(r0.any(axis=1))[0]
cols = np.nonzero(r0.any(axis=0))[0]
print(f"امتداد الطرق الرئيسية: y=[{rows.min()},{rows.max()}] x=[{cols.min()},{cols.max()}]")

# الطريق الدائري للحرم: r1 (road-minor-high)
r1 = (L('road-minor-high') > 60).astype(np.uint8)
cs3, _ = cv2.findContours(r1, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
c1 = max(cs3, key=cv2.contourArea)
x, y, w, h = cv2.boundingRect(c1)
M = cv2.moments(c1)
print(f"الطريق الدائري: bbox=({x},{y},{w},{h}) center=({M['m10']/M['m00']:.0f},{M['m01']/M['m00']:.0f})")

# أكبر تجمع مبانٍ (نواة الحرم)
bld = (L('building') > 40).astype(np.uint8)
cs4, _ = cv2.findContours(bld, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
top = sorted(cs4, key=cv2.contourArea, reverse=True)[:12]
print("\nأكبر 12 مبنى (مركز، مساحة):")
for c in top:
    M = cv2.moments(c)
    if M['m00']:
        print(f"  ({M['m10']/M['m00']:.0f},{M['m01']/M['m00']:.0f}) area={cv2.contourArea(c):.0f} bbox={cv2.boundingRect(c)}")
