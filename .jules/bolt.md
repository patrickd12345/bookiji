## 2026-01-01 - ProviderMap Mapbox Optimization
**Learning:** Initializing Mapbox GL JS map instances is expensive (WebGL context creation, worker initialization). Re-creating the map on every React render or prop change causes visual flashing and performance degradation.
**Action:** Use `useRef` to store the map instance and separate initialization logic from data update logic. Use `useEffect` with `source.setData()` to update GeoJSON sources efficiently without reloading the map. Ensure `id` is included in `properties` for click handlers to work correctly.
