import { useRef } from "react";
import { BUSINESS } from "@/shared/constants";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import { printDocument } from "@/shared/lib/printDocument";
import { SlipLogo } from "@/shared/components/SlipLogo";

function mapToEntries(mapLike) {
  if (!mapLike) return [];
  if (mapLike instanceof Map) return [...mapLike.entries()];
  return Object.entries(mapLike);
}

function safeDate(value) {
  if (!value) return "—";
  try {
    return formatDate(value);
  } catch {
    return "—";
  }
}

export function TailoringSlip({ booking, line }) {
  const printRef = useRef(null);
  if (!booking || !line) return null;
  const measures = mapToEntries(line.measurementSnapshot).filter(([, v]) => v);

  const handlePrint = () => printDocument(printRef.current);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white"
        >
          Print / Save PDF
        </button>
      </div>

      <div
        ref={printRef}
        id="tailoring-slip-print"
        className="print-document mx-auto max-w-2xl rounded-2xl border border-slate-line bg-white p-6 text-ink shadow-sm"
      >
        <div className="text-center">
          <SlipLogo className="mx-auto h-16 w-auto object-contain" />
          <p className="mt-2 font-display text-3xl">{BUSINESS.name}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Tailoring slip / measurement sheet
          </p>
        </div>

        <div className="mt-4 grid gap-2 border-y border-dashed border-slate-line py-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2 sm:col-span-2">
            <span className="text-muted">Booking No.</span>
            <span className="font-semibold tracking-wide">
              {booking.bookingNumber || "—"}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted">Slip Number</span>
            <span className="font-semibold">{line.slipNumber}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted">Folio #</span>
            <span className="font-semibold">{booking.folio}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted">Customer Code</span>
            <span className="font-semibold">{booking.customerCode}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted">Name</span>
            <span className="font-semibold">{booking.customerName}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted">Item Code</span>
            <span className="font-semibold">{line.itemCode}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted">Item</span>
            <span className="font-semibold">{line.itemName}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted">Booking Date</span>
            <span>{safeDate(booking.bookingDate)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted">Delivery Date</span>
            <span>{safeDate(booking.deliveryDate)}</span>
          </div>
        </div>

        <h3 className="mt-4 font-display text-xl">Measurements</h3>
        {measures.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No measurements on this slip.</p>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
            {measures.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-2 border-b border-slate-line/50 py-1">
                <span className="text-muted">{key}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        )}

        {line.stitchingInstructions ? (
          <div className="mt-4 text-sm">
            <p className="text-muted">Stitches / instructions</p>
            <p className="font-medium">{line.stitchingInstructions}</p>
          </div>
        ) : null}
        {line.remarks ? (
          <div className="mt-2 text-sm">
            <p className="text-muted">Remarks</p>
            <p className="font-medium">{line.remarks}</p>
          </div>
        ) : null}

        <div className="mt-4 flex justify-between text-sm">
          <span>Status: {line.status}</span>
          <span>Amount: {formatCurrency(line.amount || 0)}</span>
        </div>

        <p className="mt-4 border-t border-dashed border-slate-line pt-3 text-center text-[11px] leading-relaxed text-muted">
          Track online: use your phone number with Booking No.{" "}
          <span className="font-semibold text-ink">
            {booking.bookingNumber || "—"}
          </span>
          , Folio <span className="font-semibold text-ink">{booking.folio}</span>
          , or Slip{" "}
          <span className="font-semibold text-ink">{line.slipNumber}</span> on
          taygaff.com → Order status.
        </p>
      </div>
    </div>
  );
}
