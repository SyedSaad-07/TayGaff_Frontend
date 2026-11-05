import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search, Plus, Minus, Trash2, ShoppingCart, Link2, Copy } from "lucide-react";
import { inventoryApi } from "@/features/inventory/api";
import { salesApi } from "@/features/sales/api";
import { ReceiptPreview } from "@/features/sales/ReceiptPreview";
import { PosCustomerPicker } from "@/features/sales/PosCustomerPicker";
import { useBranch } from "@/features/branches/BranchContext";
import { ALL_BRANCHES } from "@/features/branches/branchUtils";
import { formatStockQty, unitLabel } from "@/features/inventory/inventoryUtils";
import { TENDER_METHODS } from "@/shared/constants";
import { getErrorMessage } from "@/shared/api/client";
import { formatCurrency } from "@/shared/lib/format";

function makeIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `pos-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function inventoryIdOf(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || "";
}

export function PosPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editSaleId = searchParams.get("saleId") || "";
  const seedInventoryId = searchParams.get("inventoryId") || "";

  const {
    branches,
    selectedBranchId,
    isAllBranches,
    loading: branchesLoading,
  } = useBranch();

  const [lockedBranchId, setLockedBranchId] = useState("");
  const branchId = useMemo(() => {
    if (lockedBranchId) return lockedBranchId;
    if (!isAllBranches && selectedBranchId && selectedBranchId !== ALL_BRANCHES) {
      return selectedBranchId;
    }
    return branches[0]?._id || "";
  }, [branches, isAllBranches, lockedBranchId, selectedBranchId]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingSale, setLoadingSale] = useState(Boolean(editSaleId));
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [discountTotal, setDiscountTotal] = useState("0");
  const [taxTotal, setTaxTotal] = useState("0");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(makeIdempotencyKey);
  const [editingSale, setEditingSale] = useState(null);
  const [reservedByInventory, setReservedByInventory] = useState({});
  const [linkCopied, setLinkCopied] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!editSaleId) {
      setEditingSale(null);
      setLockedBranchId("");
      setReservedByInventory({});
      setLoadingSale(false);
      return;
    }

    let cancelled = false;
    setLoadingSale(true);
    setError("");
    setCompletedSale(null);

    (async () => {
      try {
        const sale = await salesApi.getById(editSaleId);
        if (cancelled) return;
        if (sale.saleStatus !== "Completed") {
          setError("Only completed sales can be edited in POS.");
          setLoadingSale(false);
          return;
        }
        const reserved = {};
        (sale.items || []).forEach((item) => {
          const id = inventoryIdOf(item.inventory);
          if (!id) return;
          reserved[id] =
            (reserved[id] || 0) +
            Number(item.quantity || 0) -
            Number(item.returnedQuantity || 0);
        });
        setReservedByInventory(reserved);
        setEditingSale(sale);
        setLockedBranchId(sale.branch?._id || sale.branch || "");
        setCustomerName(sale.customerName || "");
        setCustomerPhone(sale.customerPhone || "");
        setSelectedCustomer(
          sale.customerId
            ? {
                _id: sale.customerId,
                id: sale.customerId,
                name: sale.customerName,
                phone1: sale.customerPhone,
              }
            : null
        );
        setPaymentMethod(sale.paymentMethod || "Cash");
        setAmountPaid(String(sale.amountPaid ?? ""));
        setDiscountTotal(String(sale.discountTotal ?? "0"));
        setTaxTotal(String(sale.taxTotal ?? "0"));
        setNotes(sale.notes || "");
        setCart(
          (sale.items || []).map((item) => {
            const id = inventoryIdOf(item.inventory);
            return {
              inventoryId: id,
              productName: item.productName,
              sku: item.sku || "",
              color: item.color || "",
              size: item.size || "",
              unit: item.unit || "METER",
              stockType: item.stockType || "FABRIC",
              available: Number(item.quantity || 0),
              unitPrice: Number(item.unitPrice || 0),
              quantity: Number(item.quantity || 0),
              discount: Number(item.discount || 0),
            };
          })
        );
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Failed to load sale"));
        }
      } finally {
        if (!cancelled) setLoadingSale(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editSaleId]);

  const loadCatalog = useCallback(async () => {
    if (branchesLoading || !branchId) return;
    setLoadingCatalog(true);
    setError((prev) => (loadingSale ? prev : ""));
    try {
      const data = await inventoryApi.list({
        branchId,
        search,
        inStockOnly: !editSaleId,
        limit: 50,
        page: 1,
      });
      const items = data.items || [];
      setCatalog(items);

      setCart((prev) =>
        prev.map((line) => {
          const match = items.find((item) => item._id === line.inventoryId);
          const live = Number(match?.availableLength || 0);
          const reserved = Number(reservedByInventory[line.inventoryId] || 0);
          return {
            ...line,
            available: live + reserved,
            productName: match?.clothType || line.productName,
            unit: match?.unit || line.unit,
            stockType: match?.stockType || line.stockType,
          };
        })
      );
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load products"));
    } finally {
      setLoadingCatalog(false);
    }
  }, [branchId, branchesLoading, search, editSaleId, reservedByInventory, loadingSale]);

  useEffect(() => {
    if (loadingSale) return;
    void loadCatalog();
  }, [loadCatalog, loadingSale]);

  useEffect(() => {
    if (!seedInventoryId || editSaleId || loadingCatalog || !catalog.length) return;
    const item = catalog.find((row) => row._id === seedInventoryId);
    if (!item) return;
    setCart((prev) => {
      if (prev.some((line) => line.inventoryId === item._id)) return prev;
      return [
        ...prev,
        {
          inventoryId: item._id,
          productName: item.clothType,
          sku: item.sku || "",
          color: item.color || "",
          size: item.size || "",
          unit: item.unit || "METER",
          stockType: item.stockType || "FABRIC",
          available: Number(item.availableLength || 0),
          unitPrice: Number(item.sellingPrice || 0),
          quantity: 1,
          discount: 0,
        },
      ];
    });
  }, [seedInventoryId, editSaleId, loadingCatalog, catalog]);

  const isPieceStock = (item) =>
    item?.stockType === "GARMENT" ||
    item?.stockType === "STITCHING" ||
    item?.unit === "PIECE";

  const addToCart = (item) => {
    const reserved = Number(reservedByInventory[item._id] || 0);
    const available = Number(item.availableLength || 0) + reserved;
    setCart((prev) => {
      const existing = prev.find((line) => line.inventoryId === item._id);
      const step = isPieceStock(item) ? 1 : 0.5;
      if (existing) {
        const nextQty = Math.min(available, Number(existing.quantity) + step);
        return prev.map((line) =>
          line.inventoryId === item._id
            ? { ...line, quantity: nextQty, available }
            : line
        );
      }
      return [
        ...prev,
        {
          inventoryId: item._id,
          productName: item.clothType,
          sku: item.sku || "",
          color: item.color || "",
          size: item.size || "",
          unit: item.unit || "METER",
          stockType: item.stockType || "FABRIC",
          available,
          unitPrice: Number(item.sellingPrice || 0),
          quantity: 1,
          discount: 0,
        },
      ];
    });
  };

  const updateLine = (inventoryId, patch) => {
    setCart((prev) =>
      prev.map((line) => {
        if (line.inventoryId !== inventoryId) return line;
        const next = { ...line, ...patch };
        if (next.quantity > next.available) next.quantity = next.available;
        if (next.quantity < 0.01) next.quantity = 0.01;
        if (next.unitPrice < 0) next.unitPrice = 0;
        return next;
      })
    );
  };

  const removeLine = (inventoryId) => {
    setCart((prev) => prev.filter((line) => line.inventoryId !== inventoryId));
  };

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, line) =>
          sum + Math.max(0, line.quantity * line.unitPrice - (line.discount || 0)),
        0
      ),
    [cart]
  );
  const discount = Number(discountTotal || 0);
  const tax = Number(taxTotal || 0);
  const grandTotal = Math.max(0, subtotal - discount + tax);
  const paid = amountPaid === "" ? grandTotal : Number(amountPaid || 0);
  const appliedPaid = Math.min(paid, grandTotal);
  const changeDue = Math.max(0, paid - grandTotal);
  const balanceDue = Math.max(0, grandTotal - appliedPaid);
  const paymentStatusLabel =
    appliedPaid <= 0
      ? "Unpaid"
      : appliedPaid + 0.0001 >= grandTotal
        ? "Paid"
        : "Partially Paid";

  const buildPayload = () => ({
    branch: branchId,
    customerId: selectedCustomer?._id || selectedCustomer?.id || undefined,
    customerName: customerName.trim() || "Walk-in Customer",
    customerPhone: customerPhone.trim(),
    items: cart.map((line) => ({
      inventoryId: line.inventoryId,
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      discount: Number(line.discount || 0),
    })),
    discountTotal: discount,
    taxTotal: tax,
    paymentMethod,
    amountPaid: paid,
    paymentReference: paymentReference.trim(),
    notes: notes.trim(),
    ...(editSaleId ? {} : { idempotencyKey }),
  });

  const buildPreviewSale = () => ({
    receiptNumber: editingSale?.receiptNumber || "PREVIEW",
    saleDate: editingSale?.saleDate || new Date().toISOString(),
    customerName: customerName.trim() || "Walk-in Customer",
    customerPhone,
    branch: branches.find((b) => b._id === branchId) || { name: "—" },
    createdBy: editingSale?.createdBy || { name: "You" },
    items: cart.map((line) => ({
      ...line,
      lineTotal: Math.max(0, line.quantity * line.unitPrice - (line.discount || 0)),
    })),
    subtotal,
    discountTotal: discount,
    taxTotal: tax,
    grandTotal,
    amountPaid: paid,
    changeDue,
    balanceDue,
    paymentMethod,
  });

  const applyCustomer = (customer) => {
    if (!customer) return;
    setSelectedCustomer(customer);
    setCustomerName(customer.name || "");
    setCustomerPhone(customer.phone1 || customer.phone2 || customer.phone3 || "");
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerName("");
    setCustomerPhone("");
  };

  const resetForm = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setSelectedCustomer(null);
    setDiscountTotal("0");
    setTaxTotal("0");
    setNotes("");
    setAmountPaid("");
    setIdempotencyKey(makeIdempotencyKey());
    setShowPreview(false);
    setEditingSale(null);
    setLockedBranchId("");
    setReservedByInventory({});
  };

  const submitSale = async () => {
    if (!branchId) {
      setError("Select a branch before checkout");
      return;
    }
    if (!cart.length) {
      setError("Add at least one item to the cart");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = buildPayload();
      const sale = editSaleId
        ? await salesApi.update(editSaleId, payload)
        : await salesApi.checkout(payload);
      setCompletedSale(sale);
      resetForm();
      if (editSaleId) {
        navigate("/inventory/pos", { replace: true });
      }
      await loadCatalog();
    } catch (err) {
      setError(getErrorMessage(err, "Checkout failed"));
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async (path, key) => {
    try {
      const url = `${window.location.origin}${path}`;
      await navigator.clipboard.writeText(url);
      setLinkCopied(key);
      setTimeout(() => setLinkCopied(""), 2000);
    } catch {
      setError("Could not copy link");
    }
  };

  if (loadingSale) {
    return <p className="text-sm text-muted">Loading sale into POS…</p>;
  }

  if (completedSale) {
    const receiptUrl = completedSale.receiptPath
      ? `${window.location.origin}${completedSale.receiptPath}`
      : "";
    const posUrl = completedSale.posPath
      ? `${window.location.origin}${completedSale.posPath}`
      : "";

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-success">
              {editSaleId ? "Sale updated" : "Sale completed"}
            </p>
            <h1 className="font-display text-3xl text-ink">
              Receipt {completedSale.receiptNumber}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/inventory/sales"
              className="rounded-xl border border-slate-line px-4 py-2 text-sm font-medium"
            >
              Sales history
            </Link>
            <button
              type="button"
              onClick={() => {
                setCompletedSale(null);
                navigate("/inventory/pos", { replace: true });
              }}
              className="rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white"
            >
              New sale
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-line/80 bg-white p-3 text-sm">
          {receiptUrl ? (
            <button
              type="button"
              onClick={() => copyLink(completedSale.receiptPath, "receipt")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-line px-3 py-1.5"
            >
              <Link2 size={14} />
              {linkCopied === "receipt" ? "Receipt link copied" : "Copy receipt link"}
            </button>
          ) : null}
          {posUrl ? (
            <button
              type="button"
              onClick={() => copyLink(completedSale.posPath, "pos")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-line px-3 py-1.5"
            >
              <Copy size={14} />
              {linkCopied === "pos" ? "POS edit link copied" : "Copy POS edit link"}
            </button>
          ) : null}
          {completedSale.posPath ? (
            <Link
              to={completedSale.posPath}
              className="inline-flex items-center gap-1.5 rounded-lg bg-mist px-3 py-1.5 font-medium"
            >
              Edit this sale in POS
            </Link>
          ) : null}
        </div>

        <ReceiptPreview sale={completedSale} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
            Point of sale
          </p>
          <h1 className="mt-1 font-display text-4xl text-ink">
            {editingSale ? `Edit ${editingSale.receiptNumber}` : "Checkout"}
          </h1>
          <p className="text-sm text-muted">
            {editingSale
              ? "Update cart, customer, and payment. Stock is restored then re-applied safely."
              : "Garment / cloth POS sales. Link any customer — booking-only, POS-only, or both."}
            {!editingSale && isAllBranches
              ? " Using first branch — switch branch for a specific shop."
              : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editingSale ? (
            <button
              type="button"
              onClick={() => navigate("/inventory/pos", { replace: true })}
              className="rounded-xl border border-slate-line px-4 py-2 text-sm"
            >
              Cancel edit
            </button>
          ) : null}
          <Link
            to="/inventory/sales"
            className="rounded-xl border border-slate-line px-4 py-2 text-sm font-medium"
          >
            Sales history
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr]">
        <section className="rounded-2xl border border-slate-line/80 bg-mist/60 p-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, SKU, barcode, color, supplier…"
              className="w-full rounded-xl border border-slate-line bg-white py-2.5 pl-9 pr-3 text-sm"
            />
          </div>

          <div className="mt-4 grid max-h-[62vh] gap-2 overflow-y-auto sm:grid-cols-2">
            {loadingCatalog ? (
              <p className="text-sm text-muted">Loading catalog…</p>
            ) : catalog.length === 0 ? (
              <p className="text-sm text-muted">No in-stock items for this branch.</p>
            ) : (
              catalog.map((item) => {
                const reserved = Number(reservedByInventory[item._id] || 0);
                const available = Number(item.availableLength || 0) + reserved;
                const supplierName =
                  item.supplier?.name || item.sourceName || "";
                const meta = [item.category, item.brand, item.color, item.size, item.sku]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => addToCart(item)}
                    disabled={available <= 0}
                    className="rounded-xl border border-slate-line bg-white p-3 text-left transition hover:border-brass/50 disabled:opacity-40"
                  >
                    <p className="font-medium text-ink">{item.clothType}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {meta || item.stockType || "FABRIC"}
                    </p>
                    <p className="mt-1 text-xs text-ink/80">
                      Supplier:{" "}
                      <span className="font-medium">
                        {supplierName || "—"}
                      </span>
                    </p>
                    {(item.purchaseType || item.branch?.name) && (
                      <p className="mt-0.5 text-[11px] text-muted">
                        {[item.purchaseType, item.branch?.name].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-muted">
                        {formatStockQty(available, item.unit)}
                      </span>
                      <span className="font-semibold text-ink">
                        {formatCurrency(item.sellingPrice || 0)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-line/80 bg-white p-4">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-brass" />
            <h2 className="font-display text-2xl text-ink">
              {editingSale ? "Editing sale" : "Current sale"}
            </h2>
          </div>

          <div className="mt-3 max-h-[34vh] space-y-2 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-sm text-muted">Cart is empty.</p>
            ) : (
              cart.map((line) => (
                <div
                  key={line.inventoryId}
                  className="rounded-xl border border-slate-line/80 bg-mist/50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{line.productName}</p>
                      <p className="text-xs text-muted">
                        Max {formatStockQty(line.available, line.unit)}
                      </p>
                    </div>
                    <button type="button" onClick={() => removeLine(line.inventoryId)}>
                      <Trash2 size={14} className="text-danger" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <label className="text-xs text-muted">
                      Qty ({unitLabel(line.unit)})
                      <div className="mt-1 flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded border border-slate-line p-1"
                          onClick={() =>
                            updateLine(line.inventoryId, {
                              quantity:
                                Number(line.quantity) - (line.unit === "PIECE" ? 1 : 0.5),
                            })
                          }
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          min="0.01"
                          step={line.unit === "PIECE" ? "1" : "0.1"}
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(line.inventoryId, {
                              quantity: Number(e.target.value),
                            })
                          }
                          className="w-full rounded-lg border border-slate-line px-2 py-1 text-sm"
                        />
                        <button
                          type="button"
                          className="rounded border border-slate-line p-1"
                          onClick={() =>
                            updateLine(line.inventoryId, {
                              quantity:
                                Number(line.quantity) + (line.unit === "PIECE" ? 1 : 0.5),
                            })
                          }
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </label>
                    <label className="text-xs text-muted">
                      Unit price
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) =>
                          updateLine(line.inventoryId, {
                            unitPrice: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-line px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="text-xs text-muted">
                      Line total
                      <p className="mt-1 rounded-lg bg-white px-2 py-1 text-sm font-semibold">
                        {formatCurrency(
                          Math.max(
                            0,
                            line.quantity * line.unitPrice - (line.discount || 0)
                          )
                        )}
                      </p>
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Customer
            </p>
            <p className="text-xs text-muted">
              Optional. Same master list as Bookings — walk-in, garment-only, or
              customers who also place stitching orders.
            </p>
            <PosCustomerPicker
              selected={selectedCustomer}
              customerName={customerName}
              customerPhone={customerPhone}
              onSelect={applyCustomer}
              onClear={clearCustomer}
              onNameChange={(value) => {
                setCustomerName(value);
                if (selectedCustomer) setSelectedCustomer(null);
              }}
              onPhoneChange={(value) => {
                setCustomerPhone(value);
                if (selectedCustomer) setSelectedCustomer(null);
              }}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs text-muted">
              Order discount
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountTotal}
                onChange={(e) => setDiscountTotal(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-muted">
              Tax
              <input
                type="number"
                min="0"
                step="0.01"
                value={taxTotal}
                onChange={(e) => setTaxTotal(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-muted">
              Payment method
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2 text-sm"
              >
                {TENDER_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted">
              Amount paid
              <input
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                placeholder={String(grandTotal.toFixed(2))}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2 text-sm"
              />
            </label>
            {paymentMethod === "Cheque" || paymentMethod === "Bank Transfer" ? (
              <label className="col-span-2 text-xs text-muted">
                Reference (cheque / transfer #)
                <input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2 text-sm"
                />
              </label>
            ) : null}
          </div>

          <div className="mt-3 space-y-1 rounded-xl bg-mist px-3 py-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Payment status</span>
              <span className="font-medium">{paymentStatusLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Change</span>
              <span>{formatCurrency(changeDue)}</span>
            </div>
            {balanceDue > 0 ? (
              <div className="flex justify-between text-danger">
                <span>Balance due</span>
                <span>{formatCurrency(balanceDue)}</span>
              </div>
            ) : null}
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Sale notes (optional)"
            rows={2}
            className="mt-3 w-full rounded-xl border border-slate-line px-3 py-2 text-sm"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!cart.length}
              onClick={() => setShowPreview(true)}
              className="rounded-xl border border-slate-line px-4 py-2.5 text-sm font-medium disabled:opacity-40"
            >
              Preview receipt
            </button>
            <button
              type="button"
              disabled={saving || !cart.length}
              onClick={submitSale}
              className="flex-1 rounded-xl bg-brass px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving
                ? "Saving…"
                : editingSale
                  ? "Save sale changes"
                  : "Confirm sale"}
            </button>
          </div>
        </section>
      </div>

      {showPreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-mist p-4">
            <div className="mb-3 flex justify-between">
              <h3 className="font-display text-xl">Receipt preview</h3>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="rounded-lg border border-slate-line px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>
            <ReceiptPreview
              sale={buildPreviewSale()}
              actions={({ onPrint }) => (
                <>
                  <button
                    type="button"
                    onClick={onPrint}
                    className="rounded-xl border border-slate-line px-4 py-2 text-sm"
                  >
                    Print preview
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={submitSale}
                    className="rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white"
                  >
                    {editingSale ? "Save changes" : "Confirm sale"}
                  </button>
                </>
              )}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
