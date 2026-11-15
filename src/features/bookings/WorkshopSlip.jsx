import { useRef } from "react";
import { BUSINESS } from "@/shared/constants";
import { formatDate } from "@/shared/lib/format";
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

/** Internal workshop slip — booking number identity only; no customer/money. */
export function WorkshopSlip({ slip }) {
  const printRef = useRef(null);
  if (!slip) return null;
  const items = Array.isArray(slip.items) ? slip.items : [];

  const handlePrint = () => printDocument(printRef.current);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          Print workshop slip
        </button>
      </div>

      <div
        ref={printRef}
        id="workshop-slip-print"
        className="print-document mx-auto max-w-2xl rounded-2xl border border-slate-line bg-white p-6 text-ink shadow-sm"
      >
        <div className="text-center">
          <SlipLogo className="mx-auto h-14 w-auto object-contain" />
          <p className="mt-2 font-display text-2xl">{BUSINESS.name}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Workshop slip (internal)
          </p>
        </div>

        <div className="mt-4 grid gap-2 border-y border-dashed border-slate-line py-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2 sm:col-span-2">
            <span className="text-muted">Booking No.</span>
            <span className="font-semibold tracking-wide">
              {slip.bookingNumber || "—"}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted">Order date</span>
            <span>{safeDate(slip.bookingDate)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted">Delivery</span>
            <span>{safeDate(slip.deliveryDate)}</span>
          </div>
          <div className="flex justify-between gap-2 sm:col-span-2">
            <span className="text-muted">Booked by</span>
            <span className="font-semibold">{slip.bookedByName || "Legacy/Unknown"}</span>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No items for this filter.</p>
        ) : (
          items.map((item) => {
            const measures = mapToEntries(item.measurementSnapshot).filter(
              ([, v]) => v
            );
            return (
              <div
                key={item.slipNumber}
                className="mt-4 border-t border-slate-line/60 pt-3 text-sm"
              >
                <div className="flex flex-wrap justify-between gap-2 font-semibold">
                  <span>
                    {item.itemName || item.itemCode} × {item.quantity || 1}
                  </span>
                  <span>Slip {item.slipNumber}</span>
                </div>
                <p className="mt-1 text-muted">
                  Karigar: {item.karigar?.name || item.karigar?.code || "—"} ·
                  Cutter: {item.cutter?.name || item.cutter?.code || "—"}
                </p>
                {measures.length ? (
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                    {measures.map(([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between gap-2 border-b border-slate-line/50 py-1"
                      >
                        <span className="text-muted">{key}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                {item.stitchingInstructions ? (
                  <p className="mt-2">
                    <span className="text-muted">Notes: </span>
                    {item.stitchingInstructions}
                  </p>
                ) : null}
                {item.remarks ? (
                  <p className="mt-1">
                    <span className="text-muted">Remarks: </span>
                    {item.remarks}
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
