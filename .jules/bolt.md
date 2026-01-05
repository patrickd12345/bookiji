# Bolt's Journal

## 2026-01-01 - [Mapbox GL JS React Pattern]
**Learning:** Initializing Mapbox GL maps inside a `useEffect` that depends on data props causes full map destruction and re-initialization on every update. This is a major performance bottleneck for interactive maps.
**Action:** Use a `useRef` to store the map instance. Initialize it once (empty or with initial data) in a `useEffect` with empty dependencies (or just token). Use a second `useEffect` to update the data source via `map.getSource('id').setData(...)` when props change. This preserves the WebGL context and tile cache.
