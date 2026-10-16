<div dir="rtl">

# خط إنتاج خريطة الحرم الجامعي

هذه الأدوات حوّلت بيانات OpenStreetMap لجامعة البحرين (حرم الصخير) إلى هندسة SVG تفاعلية تستخدمها اللعبة في `src/lib/p9/campus-geometry.ts`.

يمكنك إعادة استخدام نفس الخط لإنتاج خريطة لأي حرم جامعي آخر — مساهمة نرحب بها كثيراً!

</div>

# Campus Map Pipeline

Turns real OpenStreetMap data into the game's interactive blueprint map.

## Pipeline

1. **Export** a layered SVG of your campus from an OSM-based exporter (e.g. a Mapbox-style layer export). Each layer (`building`, `road-major`, `road-minor-*`, `water`, `landcover`…) becomes an embedded PNG.
2. **`extract_layers.py`** — pulls every layer PNG out of the SVG into `layers/`.
3. **`vectorize.py`** — raster→vector: `cv2.findContours` for polygons (buildings/water/land) and `skimage.skeletonize` for polylines (roads). Produces `vec.json` (SVG path strings).
4. **Calibrate** — find real-world anchor points for your buildings (`analyze_geo.py`, `snap_buildings.py`, `fit_track.py` help: green areas, parking density, track ellipse fitting, building snapping).
5. **`gen_geometry.js`** — crops to a chosen viewBox, shifts coordinates, drops tiny fragments, and emits `campus-geometry.ts` + the building-spot table.

## Requirements

```
python3 -m pip install numpy opencv-python-headless scikit-image pillow
node (for gen_geometry.js) + sharp
```

## Output contract

The generated module must export:

```ts
export const CAMPUS_VIEW = { w, h };
export const CAMPUS_PATHS = { land, water, roadMajor, roadMinorHigh,
                              roadMinorMid, roadMinorLow, roadPath, buildings };
export const CAMPUS_SPOTS: Record<string, [number, number]>;
```

Then update `BUILDINGS` in `src/lib/p9/constants.ts` to the same coordinate space — the `MapView` does the rest.
