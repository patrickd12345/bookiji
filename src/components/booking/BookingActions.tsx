import { Phone } from "lucide-react";

interface Props {
  providerName: string;
  providerPhone?: string;  // E.164 if possible; display ok if not
  customerPhone?: string;  // for FYI banner
}

export default function BookingActions({ providerName, providerPhone, customerPhone }: Props) {
  return (
    <div className="mt-4 rounded-md border p-4 bg-card">
      <p className="text-sm text-muted-foreground">
        Need to change or cancel? Bookiji doesn’t offer in-app cancellations. Please call the provider directly.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <a
          href={providerPhone ? `tel:${providerPhone}` : undefined}
          onClick={(e) => { if (!providerPhone) e.preventDefault(); }}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent aria-disabled:opacity-50"
          aria-disabled={!providerPhone}
        >
          <Phone size={16} />
          {providerPhone ? `Call ${providerName}` : "Phone not available"}
        </a>
      </div>

      {customerPhone && (
        <p className="mt-2 text-xs text-muted-foreground">
          Your phone on file: <strong>{customerPhone}</strong> (shown to the provider on confirmation).
        </p>
      )}
    </div>
  );
}

