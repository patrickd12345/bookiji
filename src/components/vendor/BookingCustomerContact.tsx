import { Phone } from "lucide-react";

export function BookingCustomerContact({
  customerName,
  customerPhone,
}: { customerName: string; customerPhone?: string }) {
  return (
    <div className="rounded-md border p-3 bg-card">
      <p className="text-sm">Need to adjust time or cancel? Call the customer directly.</p>
      <a
        href={customerPhone ? `tel:${customerPhone}` : undefined}
        className="mt-2 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent aria-disabled:opacity-50"
        aria-disabled={!customerPhone}
      >
        <Phone size={16} />
        {customerPhone ? `Call ${customerName}` : "No phone on file"}
      </a>
    </div>
  );
}

