# توجيه (Vectorize) طبقات خريطة جامعة البحرين من صور OSM المستخرجة إلى مسارات SVG مضغوطة
import numpy as np, cv2, json, os
from PIL import Image

L = lambda n: np.array(Image.open(f'layers/map-layer-{n}.png').getchannel('A'))

def polys(a, th=40, eps=0.8, amin=5):
    """تحويل طبقة مضلعات (مبانٍ/مياه/أراضٍ) إلى مسارات SVG مغلقة"""
    m = (a > th).astype(np.uint8)
    cs, h = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    d = []
    for c in cs:
        if cv2.contourArea(c) < amin and len(c) < 8:
            continue
        c = cv2.approxPolyDP(c, eps, True).reshape(-1, 2)
        if len(c) < 3:
            continue
        d.append('M' + 'L'.join(f'{x} {y}' for x, y in c) + 'Z')
    return ''.join(d)

D8 = [(-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1), (1, 1)]

def lines(a, th=60, eps=1.0, minlen=6):
    """تحويل طبقة خطوط (طرق) إلى مسارات SVG مفتوحة عبر الهيكلية"""
    from skimage.morphology import skeletonize
    sk = skeletonize(a > th)
    ys, xs = np.nonzero(sk)
    P = set(zip(xs.tolist(), ys.tolist()))
    nb = {p: [(p[0]+dx, p[1]+dy) for dx, dy in D8 if (p[0]+dx, p[1]+dy) in P] for p in P}
    seen = set()
    out = []

    def walk(s, n):
        path = [s, n]
        seen.add(frozenset((s, n)))
        prev, cur = s, n
        while len(nb[cur]) == 2:
            nx = [q for q in nb[cur] if q != prev]
            if not nx:
                break
            q = nx[0]
            e = frozenset((cur, q))
            if e in seen:
                break
            seen.add(e)
            path.append(q)
            prev, cur = cur, q
        return path

    for p in P:
        if len(nb[p]) != 2:
            for q in nb[p]:
                if frozenset((p, q)) not in seen:
                    out.append(walk(p, q))
    for p in P:
        for q in nb[p]:
            if frozenset((p, q)) not in seen:
                out.append(walk(p, q))
    d = []
    for pa in out:
        if len(pa) < minlen:
            continue
        c = cv2.approxPolyDP(np.array(pa, np.int32).reshape(-1, 1, 2), eps, False).reshape(-1, 2)
        d.append('M' + 'L'.join(f'{x} {y}' for x, y in c))
    return ''.join(d)

R = {}
R['bld'] = polys(L('building'), 40, 0.7, 4)
R['land'] = polys(L('landcover'), 60, 1.5, 60)
R['water'] = polys(L('water'), 60, 1.5, 60)
R['park'] = polys(L('park'), 60, 1.5, 60)
for k, n in [('r0', 'road-major'), ('r1', 'road-minor-high'), ('r2', 'road-minor-mid'),
             ('r3', 'road-minor-low'), ('r4', 'road-path')]:
    R[k] = lines(L(n))

for k, v in R.items():
    print(k, len(v))
json.dump(R, open('vec.json', 'w'))
print('saved vec.json', os.path.getsize('vec.json'))
