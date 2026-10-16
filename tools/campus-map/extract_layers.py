# استخراج طبقات الخريطة من ملف SVG (كل طبقة صورة base64 مدمجة)
import re, base64, os

s = open('uob_noir_20261015_235333.svg', encoding='utf-8').read()
os.makedirs('layers', exist_ok=True)

# كل مجموعة: <g id="map-layer-X"><image href="data:image/png;base64,..."
pat = re.compile(r'<g id="(map-layer-[^"]+)">\s*<image href="data:image/png;base64,([A-Za-z0-9+/=]+)"')
n = 0
for m in pat.finditer(s):
    name, b64 = m.group(1), m.group(2)
    fn = f'layers/{name}.png'
    open(fn, 'wb').write(base64.b64decode(b64))
    print(name, os.path.getsize(fn))
    n += 1
print('layers extracted:', n)
