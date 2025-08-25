export function JsonLd({ id, json }: { id?: string; json: unknown }) {
  return (
    <script
      type="application/ld+json"
      data-testid={id}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
