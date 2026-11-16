import { useRef } from "react";
import { BUSINESS } from "@/shared/constants";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import { printDocument } from "@/shared/lib/printDocument";
import { unitLabel } from "@/features/inventory/inventoryUtils";
import { SlipLogo } from "@/shared/components/SlipLogo";

export function ReceiptPreview({ sale, actions }) {
  const printRef = useRef(null);
  if (!sale) return null;

  const handlePrint = () => {
    printDocument(printRef.current);
  };

  return (
    <div className="space-y-4">
      {actions ? (
        <div className="flex flex-wrap gap-2 print:hidden">{actions({ onPrint: handlePrint })}</div>
      ) : (
        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white"
          >
            Print / Save PDF
          </button>
        </div>
      )}

      <div
        ref={printRef}
        id="receipt-print-area"
        className="print-document mx-auto max-w-md rounded-2xl border border-slate-line bg-white p-5 text-ink shadow-sm"
      >
        <div className="text-center">
          <SlipLogo className="mx-auto h-14 w-auto object-contain" />
          <p className="mt-2 font-display text-2xl">{BUSINESS.name}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            {BUSINESS.tagline}
          </p>
        </div>

        <div className="mt-4 space-y-1 border-y border-dashed border-slate-line py-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted">Receipt</span>
            <span className="font-semibold">{sale.receiptNumber}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted">Date</span>
            <span>{formatDate(sale.saleDate || sale.createdAt)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted">Customer</span>
            <span>{sale.customerName || "Walk-in Customer"}</span>
          </div>
          {sale.customerPhone ? (
            <div className="flex justify-between gap-3">
              <span className="text-muted">Phone</span>
              <span>{sale.customerPhone}</span>
            </div>
          ) : null}
          <div className="flex justify-between gap-3">
            <span className="text-muted">Cashier</span>
            <span>{sale.createdBy?.name || "—"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted">Branch</span>
            <span>{sale.branch?.name || "—"}</span>
          </div>
        </div>

        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted">
              <th className="py-1">Item</th>
              <th className="py-1 text-right">Qty</th>
              <th className="py-1 text-right">Amt</th>
            </tr>
          </thead>
          <tbody>
            {(sale.items || []).map((item) => (
              <tr key={item._id || `${item.productName}-${item.quantity}`} className="border-t border-slate-line/60">
                <td className="py-2 pr-2">
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-xs text-muted">
                    {[item.size, item.color, item.sku].filter(Boolean).join(" · ") ||
                      item.unit}
                    {item.unitPrice != null
                      ? ` · ${formatCurrency(item.unitPrice)}/${unitLabel(item.unit)}`
                      : ""}
                  </p>
                </td>
                <td className="py-2 text-right align-top">
                  {item.quantity} {unitLabel(item.unit)}
                </td>
                <td className="py-2 text-right align-top font-medium">
                  {formatCurrency(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 space-y-1 border-t border-dashed border-slate-line pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>
          {Number(sale.discountTotal) > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted">Discount</span>
              <span>-{formatCurrency(sale.discountTotal)}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatCurrency(sale.grandTotal)}</span>
          </div>
          {(() => {
            const net = Math.max(
              0,
              Number(sale.grandTotal || 0) - Number(sale.returnedTotal || 0)
            );
            const applied = Number(
              sale.appliedToBill ??
                Math.min(Number(sale.amountPaid || 0), net)
            );
            const cashReceived = Number(
              sale.cashReceived ?? sale.amountPaid ?? 0
            );
            const credit = Number(sale.creditToAccount || 0);
            const walletApplied = Number(sale.walletApplied || 0);
            return (
              <>
                {cashReceived > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-muted">Cash received</span>
                    <span>{formatCurrency(cashReceived)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span className="text-muted">
                    Applied to bill ({sale.paymentMethod || "Cash"})
                  </span>
                  <span>{formatCurrency(applied)}</span>
                </div>
                {walletApplied > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-muted">From wallet</span>
                    <span>{formatCurrency(walletApplied)}</span>
                  </div>
                ) : null}
                {credit > 0 ? (
                  <div className="flex justify-between font-medium text-ink">
                    <span>Extra → wallet credit</span>
                    <span>{formatCurrency(credit)}</span>
                  </div>
                ) : Number(sale.changeDue) > 0 && !sale.customerId ? (
                  <div className="flex justify-between">
                    <span className="text-muted">Change</span>
                    <span>{formatCurrency(sale.changeDue)}</span>
                  </div>
                ) : null}
                {sale.walletRemaining != null &&
                Number(sale.walletRemaining) >= 0 &&
                sale.customerId ? (
                  <div className="flex justify-between text-muted">
                    <span>Wallet after</span>
                    <span>{formatCurrency(sale.walletRemaining)}</span>
                  </div>
                ) : null}
              </>
            );
          })()}
          {Number(sale.balanceDue) > 0 ? (
            <div className="flex justify-between text-danger">
              <span>Balance due</span>
              <span>{formatCurrency(sale.balanceDue)}</span>
            </div>
          ) : null}
        </div>

        <p className="mt-5 text-center text-xs text-muted">{BUSINESS.thankYou}</p>
      </div>
    </div>
  );
}
