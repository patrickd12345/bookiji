# SimCity Safety Feature Manifest

- id: simcity.synthetic_headers status: shipped
  description: Synthetic SimCity calls must include server-side tagging headers and enforce provenance metadata on writes.
- id: simcity.prod_guard status: shipped
  description: SimCity execution is guarded from production environments with strict allowlisting.
- id: simcity.synthetic_purge status: shipped
  description: Non-production environments can purge all SimCity-tagged data with an authenticated endpoint supporting dry runs.
