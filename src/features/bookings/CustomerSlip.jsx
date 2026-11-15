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

function bookedByLabel(booking) {
  return (
    booking?.bookedByName ||
    booking?.createdBy?.name ||
    "Legacy/Unknown"
  );
}

/** Full-booking customer slip — all items, money, Booked By; no worker assignments. */
export function CustomerSlip({ booking }) {
  const printRef = useRef(null);
  if (!booking) return null;
  const lines = Array.isArray(booking.lines) ? booking.lines : [];

  const handlePrint = () => printDocument(printRef.current);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white"
        >
          Print customer slip
        </button>
      </div>

      <div
        ref={printRef}
        id="customer-slip-print"
        className="print-document mx-auto max-w-2xl rounded-2xl border border-slate-line bg-white p-6 text-ink shadow-sm"
      >
        <div className="text-center">
          <SlipLogo className="mx-auto h-16 w-auto object-contain" />
          <p className="mt-2 font-display text-3xl">{BUSINESS.name}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Customer slip
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
            <span className="text-muted">Folio #</span>
            <span className="font-semibold">{booking.folio}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted">Booked By</span>
            <span className="font-semibold">{bookedByLabel(booking)}</span>
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
            <span className="text-muted">Booking Date</span>
            <span>{safeDate(booking.bookingDate)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted">Delivery Date</span>
            <span>{safeDate(booking.deliveryDate)}</span>
          </div>
        </div>

        {lines.map((line) => {
          const measures = mapToEntries(line.measurementSnapshot).filter(
            ([, v]) => v
          );
          return (
            <div
              key={line._id || line.id || line.slipNumber}
              className="mt-4 border-t border-slate-line/60 pt-3"
            >
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-semibold">
                  {line.itemName || line.itemCode} × {line.quantity || 1}
                </span>
                <span>Slip {line.slipNumber}</span>
                <span>{formatCurrency(line.amount || 0)}</span>
              </div>
              {measures.length ? (
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
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
              {line.stitchingInstructions ? (
                <p className="mt-2 text-sm">
                  <span className="text-muted">Notes: </span>
                  {line.stitchingInstructions}
                </p>
              ) : null}
              {line.remarks ? (
                <p className="mt-1 text-sm">
                  <span className="text-muted">Remarks: </span>
                  {line.remarks}
                </p>
              ) : null}
            </div>
          );
        })}

        <div className="mt-5 space-y-1 border-t border-dashed border-slate-line pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span>{formatCurrency(booking.subtotal || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Discount</span>
            <span>{formatCurrency(booking.discountTotal || 0)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatCurrency(booking.grandTotal || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Advance / paid</span>
            <span>{formatCurrency(booking.amountPaid || 0)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Balance</span>
            <span>{formatCurrency(booking.balanceDue || 0)}</span>
          </div>
        </div>

        <p className="mt-4 border-t border-dashed border-slate-line pt-3 text-center text-[11px] leading-relaxed text-muted">
          Track online with your phone and Booking No.{" "}
          <span className="font-semibold text-ink">
            {booking.bookingNumber || "—"}
          </span>{" "}
          on taygaff.com → Order status.
        </p>
      </div>
    </div>
  );
}
