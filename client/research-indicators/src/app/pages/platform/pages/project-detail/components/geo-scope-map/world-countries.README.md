# World Countries Geometry Asset (`world-countries.geo.json`)

## Source & Provenance
- **Source:** Natural Earth 1:110m Cultural Vectors (Admin 0 – Countries, `ne_110m_admin_0_countries.geojson`).
- **Source URL:** https://www.naturalearthdata.com / https://github.com/nvkelso/natural-earth-vector
- **License:** Public Domain (CC0 / Natural Earth Terms of Use). Free for personal and commercial use in any medium.
- **Simplification & Optimization:** Coordinates rounded to 3 decimal places (~100m ground resolution, appropriate for world-scale choropleths); non-essential properties stripped, retaining `NAME`, `NAME_LONG`, `ISO_A2`, `ISO_A2_EH`, `ISO_A3`, and `ADMIN`. Asset size: ~207 kB.

## Edition Quirks & ISO Mapping
- Natural Earth 1:110m contains certain features where `ISO_A2` is `"-99"` due to overseas territories or disputed boundaries:
  - **France (FR):** `ISO_A2` is `"-99"` on the mainland polygon; `ISO_A2_EH` is `"FR"`.
  - **Norway (NO):** `ISO_A2` is `"-99"` on the mainland polygon; `ISO_A2_EH` is `"NO"`.
  - **Northern Cyprus (-99):** `ISO_A2` is `"-99"`.
  - **Somaliland (-99):** `ISO_A2` is `"-99"`.
  - **Kosovo (-99):** `ISO_A2` is `"-99"`.
- Small island nations and microstates (e.g. Monaco, San Marino, Singapore, Barbados, Hong Kong) may not have distinct 1:110m land polygons. In accordance with R-GEO-003 and R-GEO-005, results for these countries are preserved in the accessible `tableModel` and ranked lists even when not visible as shaded polygons on the world map.
- The code-level `GEO_ISO_EXCEPTIONS_MAP` in `geo-choropleth.util.ts` maps any required exception codes to the corresponding feature identifier.
