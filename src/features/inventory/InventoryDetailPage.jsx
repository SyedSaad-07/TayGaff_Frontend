import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, ShoppingBag, Wallet } from "lucide-react";
import { inventoryApi } from "@/features/inventory/api";
import { StatusBadge } from "@/features/inventory/StatusBadge";
import {
  formatMeters,
  SALE_CATEGORIES,
} from "@/features/inventory/inventoryUtils";
import { ApiError } from "@/shared/api/client";
import { formatCurrency, formatDate, toInputDate } from "@/shared/lib/format";

const emptySaleForm = () => ({
  category: "Clothing",
  customerName: "",
  lengthSold: "",
  saleAmount: "",
  saleDate: toInputDate(),
  notes: "",
});

const emptyPaymentForm = () => ({
  amount: "",
  paymentDate: toInputDate(),
  note: "",
});

const emptyEditForm = () => ({
  sourceName: "",
  clothType: "",
  quantity: "",
  lengthPerPiece: "",
  purchaseDate: toInputDate(),
  notes: "",
});

function canRecordPayment(inventory) {
  return (
    inventory?.purchaseType === "Credit" &&
    Number(inventory?.outstandingAmount || 0) > 0
  );
}

function canSell(inventory) {
  return (
    Number(inventory?.availableLength || 0) > 0 &&
    inventory?.status !== "Out of Stock"
  );
}

function ledgerTone(type) {
  switch (type) {
    case "Purchase":
      return "border-brass/40 bg-brass/10 text-brass-deep";
    case "Sale":
      return "border-success/30 bg-success/10 text-success";
    case "Payment":
      return "border-ink/20 bg-slate-canvas text-ink";
    default:
      return "border-slate-line bg-mist text-ink/70";
  }
}

export function InventoryDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [panel, setPanel] = useState(null); // sale | payment | edit
  const [saleForm, setSaleForm] = useState(emptySaleForm);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [editForm, setEditForm] = useState(emptyEditForm);

  const loadHistory = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const result = await inventoryApi.history(id);
      setData(result);
    } catch (err) {
      setData(null);
      setError(
        err instanceof ApiError ? err.message : "Failed to load inventory history"
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const inventory = data?.inventory;
  const summary = data?.summary;
  const ledger = data?.ledger || [];
  const sales = data?.sales || [];
  const payments = data?.payments || [];

  const infoCards = useMemo(() => {
    if (!inventory || !summary) return [];
    return [
      { label: "Available", value: formatMeters(inventory.availableLength) },
      { label: "Total length", value: formatMeters(inventory.totalLength) },
      { label: "Sold length", value: formatMeters(summary.soldLength) },
      { label: "Purchase amount", value: formatCurrency(inventory.purchaseAmount) },
      { label: "Paid", value: formatCurrency(inventory.paidAmount) },
      {
        label: "Outstanding",
        value: formatCurrency(inventory.outstandingAmount),
      },
    ];
  }, [inventory, summary]);

  const openSalePanel = () => {
    setFormError("");
    setSaleForm(emptySaleForm());
    setPanel("sale");
  };

  const openPaymentPanel = () => {
    if (!inventory || !canRecordPayment(inventory)) return;
    setFormError("");
    setPaymentForm({
      ...emptyPaymentForm(),
      amount: String(inventory.outstandingAmount ?? ""),
    });
    setPanel("payment");
  };

  const openEditPanel = () => {
    if (!inventory) return;
    setFormError("");
    setEditForm({
      sourceName: inventory.sourceName || "",
      clothType: inventory.clothType || "",
      quantity: String(inventory.quantity ?? ""),
      lengthPerPiece: String(inventory.lengthPerPiece ?? ""),
      purchaseDate: toInputDate(inventory.purchaseDate),
      notes: inventory.notes || "",
    });
    setPanel("edit");
  };

  const closePanel = () => {
    setPanel(null);
    setFormError("");
  };

  const onCreateSale = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!inventory?._id) return;
    if (saleForm.category === "Stitching") {
      setFormError("Stitching sales are not available yet.");
      return;
    }

    const lengthSold = Number(saleForm.lengthSold);
    const saleAmount = Number(saleForm.saleAmount);
    const available = Number(inventory.availableLength || 0);

    if (!(lengthSold > 0)) {
      setFormError("Length sold must be greater than zero.");
      return;
    }
    if (lengthSold > available + 0.0001) {
      setFormError(`Cannot sell more than available (${formatMeters(available)}).`);
      return;
    }
    if (!(saleAmount >= 0)) {
      setFormError("Sale amount cannot be negative.");
      return;
    }

    setSaving(true);
    try {
      await inventoryApi.createSale(inventory._id, {
        category: saleForm.category,
        customerName: saleForm.customerName.trim(),
        lengthSold,
        saleAmount,
        saleDate: saleForm.saleDate,
        notes: saleForm.notes.trim(),
      });
      closePanel();
      await loadHistory();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Unable to record sale");
    } finally {
      setSaving(false);
    }
  };

  const onRecordPayment = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!inventory?._id) return;

    const amount = Number(paymentForm.amount);
    const outstanding = Number(inventory.outstandingAmount || 0);

    if (!(amount > 0)) {
      setFormError("Payment amount must be greater than zero.");
      return;
    }
    if (amount > outstanding + 0.0001) {
      setFormError(`Payment exceeds outstanding ${formatCurrency(outstanding)}.`);
      return;
    }

    setSaving(true);
    try {
      await inventoryApi.recordPayment(inventory._id, {
        amount,
        paymentDate: paymentForm.paymentDate,
        note: paymentForm.note.trim(),
      });
      closePanel();
      await loadHistory();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Unable to record payment"
      );
    } finally {
      setSaving(false);
    }
  };

  const onUpdateInventory = async (event) => {
    event.preventDefault();
    if (!inventory?._id) return;
    setFormError("");

    const quantity = Number(editForm.quantity);
    const lengthPerPiece = Number(editForm.lengthPerPiece);
    const hasSales =
      Number(inventory.totalLength) - Number(inventory.availableLength) > 0.00001;

    if (!editForm.sourceName.trim() || !editForm.clothType.trim()) {
      setFormError("Source and cloth type are required.");
      return;
    }
    if (!hasSales && (!(quantity > 0) || !(lengthPerPiece > 0))) {
      setFormError("Quantity and length per piece must be greater than zero.");
      return;
    }

    const payload = {
      sourceName: editForm.sourceName.trim(),
      clothType: editForm.clothType.trim(),
      purchaseDate: editForm.purchaseDate,
      notes: editForm.notes.trim(),
    };
    if (!hasSales) {
      payload.quantity = quantity;
      payload.lengthPerPiece = lengthPerPiece;
    }

    setSaving(true);
    try {
      await inventoryApi.update(inventory._id, payload);
      closePanel();
      await loadHistory();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Unable to update inventory"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-ink/50">Loading inventory details…</p>
      </div>
    );
  }

  if (error && !inventory) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      </div>
    );
  }

  if (!inventory) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-ink/50">Inventory item not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <BackLink />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
            Inventory detail
          </p>
          <h1 className="mt-1 font-display text-4xl text-ink sm:text-5xl">
            {inventory.clothType}
          </h1>
          <p className="mt-2 text-sm text-ink/55">
            From {inventory.sourceName}
            {inventory.branch?.name ? ` · ${inventory.branch.name}` : ""} · purchased{" "}
            {formatDate(inventory.purchaseDate)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={inventory.status} />
            <StatusBadge status={inventory.paymentStatus} />
            <span className="inline-flex rounded-full bg-slate-canvas px-2.5 py-1 text-xs font-medium text-ink/65">
              {inventory.purchaseType}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openEditPanel}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-line bg-mist px-4 py-3 text-sm font-semibold text-ink transition hover:border-brass/50"
          >
            <Pencil size={16} />
            Edit
          </button>
          {canSell(inventory) ? (
            <button
              type="button"
              onClick={openSalePanel}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-line bg-mist px-4 py-3 text-sm font-semibold text-ink transition hover:border-brass/50"
            >
              <ShoppingBag size={16} />
              Add Sale
            </button>
          ) : null}
          {canRecordPayment(inventory) ? (
            <button
              type="button"
              onClick={openPaymentPanel}
              className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-3 text-sm font-semibold text-white transition hover:bg-brass-deep"
            >
              <Wallet size={16} />
              Record Payment
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {infoCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-line/80 bg-mist/80 p-5"
          >
            <p className="text-sm text-ink/55">{card.label}</p>
            <p className="mt-2 font-display text-3xl text-ink">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-line/80 bg-mist/80 p-5">
          <h2 className="font-display text-2xl text-ink">Basic info</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Cloth type" value={inventory.clothType} />
            <Row label="Branch" value={inventory.branch?.name || "—"} />
            <Row label="Source" value={inventory.sourceName} />
            <Row label="Quantity" value={String(inventory.quantity)} />
            <Row
              label="Length per piece"
              value={formatMeters(inventory.lengthPerPiece)}
            />
            <Row label="Status" value={inventory.status} />
            <Row
              label="Notes"
              value={inventory.notes?.trim() ? inventory.notes : "—"}
            />
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-line/80 bg-mist/80 p-5">
          <h2 className="font-display text-2xl text-ink">Purchase & financial</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Purchase type" value={inventory.purchaseType} />
            <Row label="Purchase date" value={formatDate(inventory.purchaseDate)} />
            <Row
              label="Purchase amount"
              value={formatCurrency(inventory.purchaseAmount)}
            />
            <Row label="Paid amount" value={formatCurrency(inventory.paidAmount)} />
            <Row
              label="Outstanding"
              value={formatCurrency(inventory.outstandingAmount)}
            />
            <Row label="Payment status" value={inventory.paymentStatus} />
          </dl>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-line/80 bg-mist/80 p-5">
        <h2 className="font-display text-2xl text-ink">Transaction history</h2>
        <p className="mt-1 text-sm text-ink/50">Ledger timeline for this inventory item</p>
        <div className="mt-5 space-y-0">
          {ledger.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-line px-4 py-8 text-center text-sm text-ink/40">
              No ledger entries yet.
            </p>
          ) : (
            <ol className="relative space-y-4 border-l border-slate-line pl-5">
              {ledger.map((entry) => (
                <li key={entry._id} className="relative">
                  <span className="absolute -left-[1.41rem] top-1.5 h-2.5 w-2.5 rounded-full bg-brass" />
                  <div className="rounded-xl border border-slate-line/70 bg-white/60 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${ledgerTone(entry.type)}`}
                      >
                        {entry.type}
                      </span>
                      <span className="text-xs text-ink/45">
                        {formatDate(entry.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-ink/80">
                      {entry.note || "—"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink/50">
                      <span>
                        Δ length: {entry.lengthDelta > 0 ? "+" : ""}
                        {formatMeters(entry.lengthDelta)}
                      </span>
                      <span>Amount: {formatCurrency(entry.amount || 0)}</span>
                      <span>
                        Balance after: {formatMeters(entry.balanceLengthAfter)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-line/80 bg-mist/80">
          <div className="border-b border-slate-line/70 px-5 py-4">
            <h2 className="font-display text-2xl text-ink">Sales</h2>
            <p className="mt-1 text-sm text-ink/50">{sales.length} recorded</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-canvas/80 text-xs uppercase tracking-wide text-ink/45">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Length</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-ink/40">
                      No sales yet.
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <tr key={sale._id} className="border-t border-slate-line/70">
                      <td className="px-4 py-3 text-ink/70 whitespace-nowrap">
                        {formatDate(sale.saleDate)}
                      </td>
                      <td className="px-4 py-3 text-ink/75">
                        {sale.customerName || "—"}
                      </td>
                      <td className="px-4 py-3">{formatMeters(sale.lengthSold)}</td>
                      <td className="px-4 py-3 font-medium">
                        {formatCurrency(sale.saleAmount)}
                      </td>
                      <td className="px-4 py-3 text-ink/70">{sale.category}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-line/80 bg-mist/80">
          <div className="border-b border-slate-line/70 px-5 py-4">
            <h2 className="font-display text-2xl text-ink">Payments</h2>
            <p className="mt-1 text-sm text-ink/50">{payments.length} recorded</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-canvas/80 text-xs uppercase tracking-wide text-ink/45">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-ink/40">
                      No payments yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment._id} className="border-t border-slate-line/70">
                      <td className="px-4 py-3 text-ink/70 whitespace-nowrap">
                        {formatDate(payment.paymentDate)}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-ink/60">
                        {payment.note || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {panel === "sale" ? (
        <Modal title="Add Sale" onClose={closePanel}>
          <form onSubmit={onCreateSale} className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-dashed border-slate-line bg-slate-canvas/50 px-3 py-2.5 sm:col-span-2">
              <p className="text-xs text-ink/55">Available length</p>
              <p className="mt-0.5 font-display text-xl text-ink">
                {formatMeters(inventory.availableLength)}
              </p>
            </div>
            <label className="text-xs font-medium text-ink/60">
              Category
              <select
                required
                value={saleForm.category}
                onChange={(e) =>
                  setSaleForm((prev) => ({ ...prev, category: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
              >
                {SALE_CATEGORIES.map((category) => (
                  <option
                    key={category}
                    value={category}
                    disabled={category === "Stitching"}
                  >
                    {category}
                    {category === "Stitching" ? " (coming soon)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-ink/60">
              Customer name
              <input
                value={saleForm.customerName}
                onChange={(e) =>
                  setSaleForm((prev) => ({ ...prev, customerName: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
                placeholder="Optional"
              />
            </label>
            <label className="text-xs font-medium text-ink/60">
              Length sold (m)
              <input
                type="number"
                required
                min="0.01"
                step="any"
                value={saleForm.lengthSold}
                onChange={(e) =>
                  setSaleForm((prev) => ({ ...prev, lengthSold: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-ink/60">
              Sale amount
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={saleForm.saleAmount}
                onChange={(e) =>
                  setSaleForm((prev) => ({ ...prev, saleAmount: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-ink/60">
              Sale date
              <input
                type="date"
                required
                max={toInputDate()}
                value={saleForm.saleDate}
                onChange={(e) =>
                  setSaleForm((prev) => ({ ...prev, saleDate: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-ink/60 sm:col-span-2">
              Notes
              <input
                type="text"
                maxLength={500}
                value={saleForm.notes}
                onChange={(e) =>
                  setSaleForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
                placeholder="Optional"
              />
            </label>
            {formError ? (
              <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger sm:col-span-2">
                {formError}
              </p>
            ) : null}
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-brass px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brass-deep disabled:opacity-60"
              >
                {saving ? "Saving…" : "Record sale"}
              </button>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-xl border border-slate-line px-4 py-2.5 text-sm font-medium text-ink/70"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {panel === "payment" ? (
        <Modal title="Record Payment" onClose={closePanel}>
          <form onSubmit={onRecordPayment} className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-dashed border-slate-line bg-slate-canvas/50 px-3 py-2.5 sm:col-span-2">
              <p className="text-xs text-ink/55">Outstanding</p>
              <p className="mt-0.5 font-display text-xl text-ink">
                {formatCurrency(inventory.outstandingAmount)}
              </p>
            </div>
            <label className="text-xs font-medium text-ink/60">
              Amount
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                max={inventory.outstandingAmount}
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-ink/60">
              Payment date
              <input
                type="date"
                required
                max={toInputDate()}
                value={paymentForm.paymentDate}
                onChange={(e) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    paymentDate: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-ink/60 sm:col-span-2">
              Note
              <input
                type="text"
                maxLength={500}
                value={paymentForm.note}
                onChange={(e) =>
                  setPaymentForm((prev) => ({ ...prev, note: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
                placeholder="Optional"
              />
            </label>
            {formError ? (
              <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger sm:col-span-2">
                {formError}
              </p>
            ) : null}
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-brass px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brass-deep disabled:opacity-60"
              >
                {saving ? "Saving…" : "Record payment"}
              </button>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-xl border border-slate-line px-4 py-2.5 text-sm font-medium text-ink/70"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {panel === "edit" ? (
        <Modal title="Edit Inventory" onClose={closePanel}>
          <form onSubmit={onUpdateInventory} className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium text-ink/60">
              Source name
              <input
                required
                value={editForm.sourceName}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, sourceName: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-ink/60">
              Cloth type
              <input
                required
                value={editForm.clothType}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, clothType: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
              />
            </label>
            {Number(inventory.totalLength) - Number(inventory.availableLength) >
            0.00001 ? (
              <div className="rounded-xl border border-slate-line bg-slate-canvas/60 px-3 py-2.5 text-sm text-ink/65 sm:col-span-2">
                Quantity and length are locked because sales have been recorded for
                this item.
              </div>
            ) : (
              <>
                <label className="text-xs font-medium text-ink/60">
                  Quantity
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    value={editForm.quantity}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, quantity: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
                  />
                </label>
                <label className="text-xs font-medium text-ink/60">
                  Length per piece (m)
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    value={editForm.lengthPerPiece}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        lengthPerPiece: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
                  />
                </label>
              </>
            )}
            <label className="text-xs font-medium text-ink/60">
              Purchase date
              <input
                type="date"
                required
                value={editForm.purchaseDate}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, purchaseDate: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-ink/60 sm:col-span-2">
              Notes
              <textarea
                rows={2}
                maxLength={500}
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
                placeholder="Optional"
              />
            </label>
            {formError ? (
              <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger sm:col-span-2">
                {formError}
              </p>
            ) : null}
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-brass px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brass-deep disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-xl border border-slate-line px-4 py-2.5 text-sm font-medium text-ink/70"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/inventory"
      className="inline-flex items-center gap-2 text-sm font-medium text-brass-deep transition hover:text-brass"
    >
      <ArrowLeft size={16} />
      Back to inventory
    </Link>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-line/60 pb-2 last:border-0">
      <dt className="text-ink/50">{label}</dt>
      <dd className="max-w-[60%] text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close dialog backdrop"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-line bg-mist p-5 shadow-[0_24px_60px_-28px_rgba(28,43,70,0.55)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="font-display text-2xl text-ink">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-line px-2.5 py-1 text-sm text-ink/55"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
