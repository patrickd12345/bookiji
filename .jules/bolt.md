## 2026-01-01 - React Mapbox Re-initialization
**Learning:** Mapbox GL JS is expensive to initialize. React components often accidentally re-initialize the map on every prop change if not careful. The pattern of separating map initialization (once) from data updates (via `setData` or `setFilter`) is critical for performance.
**Action:** Always use a ref to store the map instance and split `useEffect` into init (once) and update (dependent on data). Ensure proper cleanup.
