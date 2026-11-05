import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  PackagePlus,
  ShoppingBag,
  Wallet,
  AlertTriangle,
  PackageX,
  TrendingUp,
  Landmark,
  Pencil,
  Trash2,
  Undo2,
} from "lucide-react";
import { inventoryApi } from "@/features/inventory/api";
import { supplierApi } from "@/features/suppliers/api";
import { StatusBadge } from "@/features/inventory/StatusBadge";
import {
  formatMeters,
  formatStockQty,
  PURCHASE_TYPES,
  SALE_CATEGORIES,
} from "@/features/inventory/inventoryUtils";
import { PeriodFilter } from "@/features/dashboard/PeriodFilter";
import { useBranch } from "@/features/branches/BranchContext";
import { ALL_BRANCHES } from "@/features/branches/branchUtils";
import { useAuth } from "@/features/auth/AuthContext";
import { isAdmin } from "@/features/auth/roles";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { getErrorMessage } from "@/shared/api/client";
import { formatCurrency, formatDate, toInputDate } from "@/shared/lib/format";

const STOCK_STATUSES = ["In Stock", "Low Stock", "Out of Stock"];
const PAYMENT_STATUSES = ["Unpaid", "Partially Paid", "Paid"];

const emptyInventoryForm = () => ({
  branch: "",
  supplier: "",
  sourceName: "",
  clothType: "",
  color: "",
  quantity: "",
  lengthPerPiece: "",
  purchaseType: "Cash",
  purchaseAmount: "",
  paidAmount: "",
  purchaseDate: toInputDate(),
  notes: "",
});

const emptySaleForm = () => ({
  inventoryId: "",
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

function canRecordPayment(item) {
  return (
    item?.purchaseType === "Credit" && Number(item?.outstandingAmount || 0) > 0
  );
}

function canSell(item) {
  return Number(item?.availableLength || 0) > 0 && item?.status !== "Out of Stock";
}

export function InventoryDashboardPage() {
  const { user } = useAuth();
  const admin = isAdmin(user);
  const {
    branches,
    selectedBranchId,
    selectedBranch,
    isAllBranches,
    loading: branchesLoading,
  } = useBranch();

  const defaultBranchId = useMemo(() => {
    if (!isAllBranches && selectedBranchId) return selectedBranchId;
    return branches[0]?._id || "";
  }, [branches, isAllBranches, selectedBranchId]);

  const [period, setPeriod] = useState("monthly");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return toInputDate(d);
  });
  const [endDate, setEndDate] = useState(toInputDate());

  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [sourceOptions, setSourceOptions] = useState([]);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [panel, setPanel] = useState(null); // inventory | sale | payment | edit
  const [inventoryForm, setInventoryForm] = useState(emptyInventoryForm);
  const [editForm, setEditForm] = useState(emptyInventoryForm);
  const [editTarget, setEditTarget] = useState(null);
  const [saleForm, setSaleForm] = useState(emptySaleForm);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [saleOptions, setSaleOptions] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (panel !== "inventory") return;
    setInventoryForm((prev) => ({
      ...prev,
      branch: prev.branch || defaultBranchId,
    }));
  }, [defaultBranchId, panel]);

  useEffect(() => {
    if (panel !== "inventory" && panel !== "edit") return;
    supplierApi
      .list({ page: 1, limit: 100 })
      .then((data) => setSuppliers(data.items || []))
      .catch(() => setSuppliers([]));
  }, [panel]);

  const totalLengthPreview = useMemo(() => {
    const form = panel === "edit" ? editForm : inventoryForm;
    const qty = Number(form.quantity);
    const len = Number(form.lengthPerPiece);
    if (!Number.isFinite(qty) || !Number.isFinite(len) || qty <= 0 || len <= 0) {
      return 0;
    }
    return Math.round(qty * len * 10000) / 10000;
  }, [
    panel,
    inventoryForm.quantity,
    inventoryForm.lengthPerPiece,
    editForm.quantity,
    editForm.lengthPerPiece,
  ]);

  const selectedSaleItem = useMemo(
    () => saleOptions.find((item) => item._id === saleForm.inventoryId) || null,
    [saleOptions, saleForm.inventoryId]
  );

  const scopeLabel = isAllBranches
    ? "All branches statistics"
    : selectedBranch?.name || "Selected branch";
  const sourceLabel = sourceFilter || "All sources";

  const loadSources = useCallback(async () => {
    if (branchesLoading) return;
    try {
      const data = await inventoryApi.sources({
        branchId: selectedBranchId || ALL_BRANCHES,
      });
      const items = data.items || [];
      setSourceOptions(items);
      setSourceFilter((prev) => (prev && !items.includes(prev) ? "" : prev));
    } catch {
      setSourceOptions([]);
    }
  }, [selectedBranchId, branchesLoading]);

  const loadStats = useCallback(async () => {
    if (branchesLoading) return;
    setLoadingStats(true);
    try {
      const data = await inventoryApi.stats({
        period,
        startDate: period === "custom" ? startDate : undefined,
        endDate: period === "custom" ? endDate : undefined,
        branchId: selectedBranchId || ALL_BRANCHES,
        sourceName: sourceFilter || undefined,
      });
      setStats(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load inventory stats"));
    } finally {
      setLoadingStats(false);
    }
  }, [
    period,
    startDate,
    endDate,
    selectedBranchId,
    sourceFilter,
    branchesLoading,
  ]);

  const loadList = useCallback(async () => {
    if (branchesLoading) return;
    setLoadingList(true);
    try {
      const result = await inventoryApi.list({
        page,
        limit: 15,
        search: search || undefined,
        status: statusFilter || undefined,
        paymentStatus: paymentFilter || undefined,
        branchId: selectedBranchId || ALL_BRANCHES,
        sourceName: sourceFilter || undefined,
      });
      setItems(result.items || []);
      setPagination({
        page: result.pagination?.page || page,
        totalPages: result.pagination?.totalPages || 1,
        total: result.pagination?.total || 0,
      });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load inventory"));
    } finally {
      setLoadingList(false);
    }
  }, [
    page,
    search,
    statusFilter,
    paymentFilter,
    sourceFilter,
    selectedBranchId,
    branchesLoading,
  ]);

  const refreshAll = useCallback(async () => {
    setError("");
    await Promise.all([loadStats(), loadList(), loadSources()]);
  }, [loadStats, loadList, loadSources]);

  useEffect(() => {
    void loadSources();
  }, [loadSources]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    setPage(1);
  }, [selectedBranchId, sourceFilter]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const loadSaleOptions = async () => {
    const result = await inventoryApi.list({
      page: 1,
      limit: 100,
      branchId: selectedBranchId || ALL_BRANCHES,
      sourceName: sourceFilter || undefined,
    });
    const options = (result.items || []).filter(canSell);
    setSaleOptions(options);
    return options;
  };

  const openInventoryPanel = () => {
    setFormError("");
    setInventoryForm({
      ...emptyInventoryForm(),
      branch: defaultBranchId,
    });
    setPanel("inventory");
  };

  const openSalePanel = async (preselectId = "") => {
    setFormError("");
    setSaving(true);
    try {
      const options = await loadSaleOptions();
      const initialId =
        preselectId && options.some((o) => o._id === preselectId)
          ? preselectId
          : options[0]?._id || "";
      setSaleForm({ ...emptySaleForm(), inventoryId: initialId });
      setPanel("sale");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load sale options"));
    } finally {
      setSaving(false);
    }
  };

  const openPaymentPanel = (item) => {
    if (!canRecordPayment(item)) return;
    setFormError("");
    setPaymentTarget(item);
    setPaymentForm({
      ...emptyPaymentForm(),
      amount: String(item.outstandingAmount ?? ""),
    });
    setPanel("payment");
  };

  const openEditPanel = (item) => {
    setFormError("");
    setEditTarget(item);
    setEditForm({
      branch: item.branch?._id || item.branch || defaultBranchId,
      sourceName: item.sourceName || "",
      clothType: item.clothType || "",
      quantity: String(item.quantity ?? ""),
      lengthPerPiece: String(item.lengthPerPiece ?? ""),
      purchaseType: item.purchaseType || "Cash",
      purchaseAmount: String(item.purchaseAmount ?? ""),
      purchaseDate: toInputDate(item.purchaseDate),
      notes: item.notes || "",
    });
    setPanel("edit");
  };

  const confirmDeleteInventory = async () => {
    if (!admin || !deleteTarget?._id) return;
    setDeleting(true);
    setError("");
    try {
      await inventoryApi.remove(deleteTarget._id);
      setDeleteTarget(null);
      await Promise.all([loadList(), loadStats()]);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete inventory"));
    } finally {
      setDeleting(false);
    }
  };

  const closePanel = () => {
    setPanel(null);
    setFormError("");
    setPaymentTarget(null);
    setEditTarget(null);
  };

  const onCreateInventory = async (event) => {
    event.preventDefault();
    setFormError("");

    const quantity = Number(inventoryForm.quantity);
    const lengthPerPiece = Number(inventoryForm.lengthPerPiece);
    const purchaseAmount = Number(inventoryForm.purchaseAmount);

    if (!inventoryForm.supplier && !inventoryForm.sourceName.trim()) {
      setFormError("Select a supplier or enter a source name.");
      return;
    }
    if (!inventoryForm.clothType.trim()) {
      setFormError("Cloth type is required.");
      return;
    }
    if (!inventoryForm.branch) {
      setFormError("Please select a branch.");
      return;
    }
    if (!(quantity > 0) || !(lengthPerPiece > 0)) {
      setFormError("Quantity and length per piece must be greater than zero.");
      return;
    }
    if (!(purchaseAmount >= 0)) {
      setFormError("Purchase amount cannot be negative.");
      return;
    }

    setSaving(true);
    try {
      await inventoryApi.create({
        branch: inventoryForm.branch,
        supplier: inventoryForm.supplier || undefined,
        sourceName: inventoryForm.supplier
          ? undefined
          : inventoryForm.sourceName.trim(),
        clothType: inventoryForm.clothType.trim(),
        stockType: "FABRIC",
        category: "Fabric",
        unit: "METER",
        color: inventoryForm.color.trim(),
        sellingPrice: 0,
        quantity,
        lengthPerPiece,
        purchaseType: inventoryForm.purchaseType,
        purchaseAmount,
        ...(inventoryForm.purchaseType === "Credit" &&
        inventoryForm.paidAmount !== "" &&
        Number(inventoryForm.paidAmount) >= 0
          ? { paidAmount: Number(inventoryForm.paidAmount) }
          : {}),
        purchaseDate: inventoryForm.purchaseDate,
        notes: inventoryForm.notes.trim(),
      });
      closePanel();
      setPage(1);
      await refreshAll();
    } catch (err) {
      setFormError(getErrorMessage(err, "Unable to add inventory"));
    } finally {
      setSaving(false);
    }
  };

  const onUpdateInventory = async (event) => {
    event.preventDefault();
    if (!editTarget) return;
    setFormError("");

    const quantity = Number(editForm.quantity);
    const lengthPerPiece = Number(editForm.lengthPerPiece);
    const hasSales =
      Number(editTarget.totalLength) - Number(editTarget.availableLength) > 0.00001;

    if (!editForm.sourceName.trim() || !editForm.clothType.trim()) {
      setFormError("Source and cloth type are required.");
      return;
    }
    if (!editForm.branch) {
      setFormError("Please select a branch.");
      return;
    }
    if (!hasSales && (!(quantity > 0) || !(lengthPerPiece > 0))) {
      setFormError("Quantity and length per piece must be greater than zero.");
      return;
    }

    const payload = {
      branch: editForm.branch,
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
      await inventoryApi.update(editTarget._id, payload);
      closePanel();
      await refreshAll();
    } catch (err) {
      setFormError(getErrorMessage(err, "Unable to update inventory"));
    } finally {
      setSaving(false);
    }
  };

  const onCreateSale = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!saleForm.inventoryId) {
      setFormError("Select an inventory item.");
      return;
    }
    if (saleForm.category === "Stitching") {
      setFormError("Stitching sales are not available yet.");
      return;
    }

    const lengthSold = Number(saleForm.lengthSold);
    const saleAmount = Number(saleForm.saleAmount);
    const available = Number(selectedSaleItem?.availableLength || 0);

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
      await inventoryApi.createSale(saleForm.inventoryId, {
        category: saleForm.category,
        customerName: saleForm.customerName.trim(),
        lengthSold,
        saleAmount,
        saleDate: saleForm.saleDate,
        notes: saleForm.notes.trim(),
      });
      closePanel();
      await refreshAll();
    } catch (err) {
      setFormError(getErrorMessage(err, "Unable to record sale"));
    } finally {
      setSaving(false);
    }
  };

  const onRecordPayment = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!paymentTarget?._id) return;

    const amount = Number(paymentForm.amount);
    const outstanding = Number(paymentTarget.outstandingAmount || 0);

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
      await inventoryApi.recordPayment(paymentTarget._id, {
        amount,
        paymentDate: paymentForm.paymentDate,
        note: paymentForm.note.trim(),
      });
      closePanel();
      await refreshAll();
    } catch (err) {
      setFormError(getErrorMessage(err, "Unable to record payment"));
    } finally {
      setSaving(false);
    }
  };

  const summary = stats?.summary;
  const movement = useMemo(() => {
    const rows = stats?.movement || [];
    let purchasedRunning = 0;
    let soldRunning = 0;
    let returnedRunning = 0;
    return rows.map((row) => {
      purchasedRunning += Number(row.purchasedLength || 0);
      soldRunning += Number(row.soldLength || 0);
      returnedRunning += Number(row.returnedLength || 0);
      return {
        ...row,
        purchasedLength: Math.round(purchasedRunning * 10000) / 10000,
        soldLength: Math.round(soldRunning * 10000) / 10000,
        returnedLength: Math.round(returnedRunning * 10000) / 10000,
      };
    });
  }, [stats?.movement]);
  const salesByCloth = stats?.salesByClothType || [];

  const cards = summary
    ? [
        {
          label: "Purchase Value",
          value: formatCurrency(summary.periodPurchaseValue),
          icon: Wallet,
          hint: "Total purchase cost (cash + credit)",
        },
        {
          label: "Sales Revenue",
          value: formatCurrency(summary.periodSalesRevenue),
          icon: TrendingUp,
          hint: "Sales in selected period",
        },
        {
          label: "Stock returns",
          value: formatCurrency(summary.periodReturnValue || 0),
          icon: Undo2,
          hint: `${formatMeters(summary.periodReturnedLength || 0)} returned · ${
            summary.periodReturnCount || 0
          } txns`,
        },
        {
          label: "Outstanding Credit",
          value: formatCurrency(summary.outstandingCredit),
          icon: Landmark,
          hint: "All-time unpaid credit",
        },
        {
          label: "Out of Stock",
          value: String(summary.outOfStockCount || 0),
          icon: PackageX,
          hint: "Items fully sold",
        },
        {
          label: "Low Stock",
          value: String(summary.lowStockCount || 0),
          icon: AlertTriangle,
          hint: `Below ${stats?.lowStockThreshold ?? 10}m`,
        },
        {
          label: "Capital Invested",
          value: formatCurrency(summary.periodCapitalInvested),
          icon: Landmark,
          hint: "Cash buys + credit repayments in period",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
            Stock · Cloth ledger
          </p>
          <h1 className="mt-1 font-display text-4xl text-ink sm:text-5xl">
            Inventory
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink/55">
            Track purchases by length, clothing sales, and credit payments for{" "}
            <span className="font-medium text-ink/75">{scopeLabel}</span>
            {" · "}
            <span className="font-medium text-ink/75">{sourceLabel}</span>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/inventory/pos"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-line bg-mist px-4 py-3 text-sm font-semibold text-ink transition hover:border-brass/50"
          >
            <ShoppingBag size={16} />
            Add Sale (POS)
          </Link>
          <button
            type="button"
            onClick={openInventoryPanel}
            disabled={!branches.length}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brass px-4 py-3 text-sm font-semibold text-white transition hover:bg-brass-deep disabled:opacity-50"
          >
            <PackagePlus size={16} />
            Add Inventory
          </button>
        </div>
      </div>

      {!branchesLoading && !branches.length ? (
        <p className="rounded-xl border border-brass/30 bg-brass/5 px-4 py-3 text-sm text-ink/70">
          Create a branch before adding inventory.{" "}
          <Link to="/branches" className="font-semibold text-brass-deep underline">
            Go to Branches
          </Link>
        </p>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <PeriodFilter
          period={period}
          startDate={startDate}
          endDate={endDate}
          onPeriodChange={setPeriod}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
        <label className="text-xs font-medium text-ink/60">
          Filter by source
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="mt-1 block min-w-[12rem] rounded-xl border border-slate-line bg-mist px-3 py-2 text-sm"
          >
            <option value="">All sources</option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}

      {loadingStats && !stats ? (
        <p className="text-sm text-ink/50">Loading inventory statistics…</p>
      ) : summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card, index) => (
              <div
                key={card.label}
                className="rounded-2xl border border-slate-line/80 bg-mist/80 p-5 shadow-[0_10px_30px_-24px_rgba(18,24,32,0.45)] animate-[fadeUp_0.5s_ease-out]"
                style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm text-ink/55">{card.label}</p>
                  <div className="rounded-lg bg-brass/10 p-2 text-brass">
                    <card.icon size={16} />
                  </div>
                </div>
                <p className="mt-3 font-display text-3xl text-ink">{card.value}</p>
                <p className="mt-2 text-xs text-ink/45">{card.hint}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-line/80 bg-mist/80 p-5">
              <h3 className="font-display text-2xl text-ink">
                Purchase vs Sales vs Returns
              </h3>
              <p className="mt-1 text-sm text-ink/50">
                Cumulative length purchased, sold, and returned in the selected
                period
              </p>
              <div className="mt-4 h-72">
                {movement.length === 0 ? (
                  <EmptyChart label="No purchase or sales movement in this range" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={movement}>
                      <defs>
                        <linearGradient id="purchaseFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b5bdb" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#3b5bdb" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="soldFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2a9d8f" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#2a9d8f" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="returnFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#c45c4a" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#c45c4a" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#d5dbe5" strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9aa3b2" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#9aa3b2" />
                      <Tooltip
                        formatter={(value, name) => [
                          formatMeters(Number(value ?? 0)),
                          name,
                        ]}
                        contentStyle={{
                          borderRadius: 12,
                          borderColor: "#d5dbe5",
                          fontSize: 12,
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="purchasedLength"
                        name="Purchased"
                        stroke="#2f4ac0"
                        fill="url(#purchaseFill)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="soldLength"
                        name="Sold"
                        stroke="#2a9d8f"
                        fill="url(#soldFill)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="returnedLength"
                        name="Returned"
                        stroke="#c45c4a"
                        fill="url(#returnFill)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-line/80 bg-mist/80 p-5">
              <h3 className="font-display text-2xl text-ink">Sales by cloth type</h3>
              <p className="mt-1 text-sm text-ink/50">Length sold in the selected period</p>
              <div className="mt-4 h-72">
                {salesByCloth.length === 0 ? (
                  <EmptyChart label="No sales by cloth type in this range" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesByCloth}>
                      <CartesianGrid stroke="#d5dbe5" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="clothType"
                        tick={{ fontSize: 10 }}
                        interval={0}
                        angle={-18}
                        textAnchor="end"
                        height={70}
                        stroke="#9aa3b2"
                      />
                      <YAxis tick={{ fontSize: 11 }} stroke="#9aa3b2" />
                      <Tooltip
                        formatter={(value, name) =>
                          name === "salesRevenue"
                            ? formatCurrency(Number(value ?? 0))
                            : formatMeters(Number(value ?? 0))
                        }
                        contentStyle={{
                          borderRadius: 12,
                          borderColor: "#d5dbe5",
                          fontSize: 12,
                        }}
                      />
                      <Bar
                        dataKey="soldLength"
                        name="Sold length"
                        fill="#3b5bdb"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>
          </div>
        </>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-2xl text-ink">Inventory list</h2>
            <p className="mt-1 text-sm text-ink/50">
              {pagination.total} item{pagination.total === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="text-xs font-medium text-ink/60">
              Search
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cloth, source, notes…"
                className="mt-1 block w-48 rounded-xl border border-slate-line bg-mist px-3 py-2 text-sm sm:w-56"
              />
            </label>
            <label className="text-xs font-medium text-ink/60">
              Source
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="mt-1 block rounded-xl border border-slate-line bg-mist px-3 py-2 text-sm"
              >
                <option value="">All</option>
                {sourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-ink/60">
              Status
              <select
                value={statusFilter}
                onChange={(e) => {
                  setPage(1);
                  setStatusFilter(e.target.value);
                }}
                className="mt-1 block rounded-xl border border-slate-line bg-mist px-3 py-2 text-sm"
              >
                <option value="">All</option>
                {STOCK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-ink/60">
              Payment
              <select
                value={paymentFilter}
                onChange={(e) => {
                  setPage(1);
                  setPaymentFilter(e.target.value);
                }}
                className="mt-1 block rounded-xl border border-slate-line bg-mist px-3 py-2 text-sm"
              >
                <option value="">All</option>
                {PAYMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-line/80 bg-mist/80">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-canvas/80 text-xs uppercase tracking-wide text-ink/45">
                <tr>
                  <th className="px-4 py-3 font-medium">Cloth Type</th>
                  <th className="px-4 py-3 font-medium">Branch</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Length/Piece</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Available</th>
                  <th className="px-4 py-3 font-medium">Purchase Type</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Payment Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingList ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-10 text-center text-ink/45">
                      Loading inventory…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-10 text-center text-ink/45">
                      No inventory items match this view. Add inventory to get started.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item._id} className="border-t border-slate-line/70">
                      <td className="px-4 py-3 font-medium text-ink">
                        <p>{item.clothType}</p>
                        {item.color ? (
                          <p className="text-xs text-muted">{item.color}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-ink/75">
                        {item.branch?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-ink/75">{item.sourceName}</td>
                      <td className="px-4 py-3 text-ink/70">{item.quantity}</td>
                      <td className="px-4 py-3 text-ink/70">
                        {formatMeters(item.lengthPerPiece)}
                      </td>
                      <td className="px-4 py-3 text-ink/70">
                        {formatMeters(item.totalLength)}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">
                        {formatStockQty(item.availableLength, item.unit || "METER")}
                      </td>
                      <td className="px-4 py-3 text-ink/70">{item.purchaseType}</td>
                      <td className="px-4 py-3 font-medium">
                        {formatCurrency(item.purchaseAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.paymentStatus} />
                      </td>
                      <td className="px-4 py-3 text-ink/70 whitespace-nowrap">
                        {formatDate(item.purchaseDate)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            to={`/inventory/${item._id}`}
                            className="rounded-lg border border-slate-line px-2.5 py-1.5 text-xs font-medium text-ink/70 transition hover:border-brass/40 hover:text-ink"
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEditPanel(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-line px-2.5 py-1.5 text-xs font-medium text-ink/70 transition hover:border-brass/40 hover:text-ink"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                          {canSell(item) ? (
                            <Link
                              to={`/inventory/pos?inventoryId=${item._id}`}
                              className="rounded-lg border border-slate-line px-2.5 py-1.5 text-xs font-medium text-ink/70 transition hover:border-brass/40 hover:text-ink"
                            >
                              Add Sale
                            </Link>
                          ) : null}
                          {canRecordPayment(item) ? (
                            <button
                              type="button"
                              onClick={() => openPaymentPanel(item)}
                              className="rounded-lg border border-brass/30 bg-brass/10 px-2.5 py-1.5 text-xs font-medium text-brass-deep transition hover:bg-brass/15"
                            >
                              Record Payment
                            </button>
                          ) : null}
                          {admin ? (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="inline-flex items-center gap-1 rounded-lg border border-danger/30 px-2.5 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/5"
                              title="Soft-delete (Trash)"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-ink/45">
            Page {pagination.page} of {pagination.totalPages || 1}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-slate-line px-3 py-2 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= (pagination.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-slate-line px-3 py-2 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {panel === "inventory" ? (
        <Modal title="Add Cloth Inventory" onClose={closePanel}>
          <form onSubmit={onCreateInventory} className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium text-ink/60 sm:col-span-2">
              Branch
              <select
                required
                value={inventoryForm.branch}
                onChange={(e) =>
                  setInventoryForm((prev) => ({ ...prev, branch: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
              >
                <option value="" disabled>
                  Select branch
                </option>
                {branches.map((branch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name}
                    {branch.code ? ` (${branch.code})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-ink/60">
              Supplier
              <select
                value={inventoryForm.supplier}
                onChange={(e) =>
                  setInventoryForm((prev) => ({ ...prev, supplier: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
              >
                <option value="">Select supplier (or type source)</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Link
                to="/inventory/suppliers"
                className="mt-1 inline-block text-[11px] text-brass"
              >
                Manage / add suppliers
              </Link>
            </label>
            <label className="text-xs font-medium text-ink/60">
              Source name (if no supplier)
              <input
                value={inventoryForm.sourceName}
                disabled={Boolean(inventoryForm.supplier)}
                onChange={(e) =>
                  setInventoryForm((prev) => ({ ...prev, sourceName: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm disabled:bg-slate-canvas"
                placeholder="Supplier / mill"
              />
            </label>
            <label className="text-xs font-medium text-ink/60">
              Cloth type
              <input
                required
                value={inventoryForm.clothType}
                onChange={(e) =>
                  setInventoryForm((prev) => ({ ...prev, clothType: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
                placeholder="e.g. Lawn, Khaddar, Wash & Wear"
              />
            </label>
            <label className="text-xs font-medium text-ink/60">
              Color
              <input
                value={inventoryForm.color}
                onChange={(e) =>
                  setInventoryForm((prev) => ({ ...prev, color: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
                placeholder="Optional"
              />
            </label>
            <label className="text-xs font-medium text-ink/60">
              Rolls / pieces
              <input
                type="number"
                required
                min="0.01"
                step="any"
                value={inventoryForm.quantity}
                onChange={(e) =>
                  setInventoryForm((prev) => ({ ...prev, quantity: e.target.value }))
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
                value={inventoryForm.lengthPerPiece}
                onChange={(e) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    lengthPerPiece: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
              />
            </label>
            <div className="rounded-xl border border-dashed border-brass/40 bg-brass/5 px-3 py-2.5 sm:col-span-2">
              <p className="text-xs font-medium text-ink/55">Total length preview</p>
              <p className="mt-1 font-display text-2xl text-ink">
                {formatMeters(totalLengthPreview)}
              </p>
            </div>
            <label className="text-xs font-medium text-ink/60">
              Purchase type
              <select
                required
                value={inventoryForm.purchaseType}
                onChange={(e) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    purchaseType: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
              >
                {PURCHASE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-ink/60">
              Purchase amount
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={inventoryForm.purchaseAmount}
                onChange={(e) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    purchaseAmount: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
              />
            </label>
            {inventoryForm.purchaseType === "Credit" ? (
              <label className="text-xs font-medium text-ink/60 sm:col-span-2">
                Amount paid now (optional partial)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={Number(inventoryForm.purchaseAmount) || undefined}
                  value={inventoryForm.paidAmount}
                  onChange={(e) =>
                    setInventoryForm((prev) => ({
                      ...prev,
                      paidAmount: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
                  placeholder="0 = full credit"
                />
                {Number(inventoryForm.purchaseAmount) > 0 ? (
                  <p className="mt-1.5 text-xs text-muted">
                    Remaining on supplier ledger:{" "}
                    {formatCurrency(
                      Math.max(
                        0,
                        Number(inventoryForm.purchaseAmount) -
                          Number(inventoryForm.paidAmount || 0)
                      )
                    )}
                  </p>
                ) : null}
              </label>
            ) : (
              <p className="text-xs text-muted sm:col-span-2">
                Cash purchase: full amount is recorded as paid; supplier balance does not increase.
              </p>
            )}
            <label className="text-xs font-medium text-ink/60">
              Purchase date
              <input
                type="date"
                required
                value={inventoryForm.purchaseDate}
                onChange={(e) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    purchaseDate: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-ink/60 sm:col-span-2">
              Notes
              <input
                type="text"
                maxLength={500}
                value={inventoryForm.notes}
                onChange={(e) =>
                  setInventoryForm((prev) => ({ ...prev, notes: e.target.value }))
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
                {saving ? "Saving…" : "Add inventory"}
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

      {panel === "edit" && editTarget ? (
        <Modal title="Edit Inventory" onClose={closePanel}>
          <form onSubmit={onUpdateInventory} className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium text-ink/60 sm:col-span-2">
              Branch
              <select
                required
                value={editForm.branch}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, branch: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
              >
                <option value="" disabled>
                  Select branch
                </option>
                {branches.map((branch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name}
                    {branch.code ? ` (${branch.code})` : ""}
                  </option>
                ))}
              </select>
            </label>
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
            {Number(editTarget.totalLength) - Number(editTarget.availableLength) >
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
                <div className="rounded-xl border border-dashed border-brass/40 bg-brass/5 px-3 py-2.5 sm:col-span-2">
                  <p className="text-xs font-medium text-ink/55">Total length preview</p>
                  <p className="mt-1 font-display text-2xl text-ink">
                    {formatMeters(totalLengthPreview)}
                  </p>
                </div>
              </>
            )}
            <label className="text-xs font-medium text-ink/60">
              Purchase type
              <input
                disabled
                value={editForm.purchaseType}
                className="mt-1 w-full rounded-xl border border-slate-line bg-slate-canvas/80 px-3 py-2.5 text-sm text-ink/55"
              />
            </label>
            <label className="text-xs font-medium text-ink/60">
              Purchase amount
              <input
                disabled
                value={editForm.purchaseAmount}
                className="mt-1 w-full rounded-xl border border-slate-line bg-slate-canvas/80 px-3 py-2.5 text-sm text-ink/55"
              />
            </label>
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

      {panel === "sale" ? (
        <Modal title="Add Sale" onClose={closePanel}>
          <form onSubmit={onCreateSale} className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium text-ink/60 sm:col-span-2">
              Inventory item
              <select
                required
                value={saleForm.inventoryId}
                onChange={(e) =>
                  setSaleForm((prev) => ({ ...prev, inventoryId: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
              >
                {saleOptions.length === 0 ? (
                  <option value="">No in-stock items</option>
                ) : (
                  saleOptions.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.clothType} · {item.sourceName} ({formatMeters(item.availableLength)}{" "}
                      available)
                    </option>
                  ))
                )}
              </select>
            </label>
            {selectedSaleItem ? (
              <div className="rounded-xl border border-dashed border-slate-line bg-slate-canvas/50 px-3 py-2.5 sm:col-span-2">
                <p className="text-xs text-ink/55">Available length</p>
                <p className="mt-0.5 font-display text-xl text-ink">
                  {formatMeters(selectedSaleItem.availableLength)}
                </p>
              </div>
            ) : null}
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
                disabled={saving || saleOptions.length === 0}
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

      {panel === "payment" && paymentTarget ? (
        <Modal
          title={`Record Payment · ${paymentTarget.clothType}`}
          onClose={closePanel}
        >
          <form onSubmit={onRecordPayment} className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-dashed border-slate-line bg-slate-canvas/50 px-3 py-2.5 sm:col-span-2">
              <p className="text-xs text-ink/55">Outstanding</p>
              <p className="mt-0.5 font-display text-xl text-ink">
                {formatCurrency(paymentTarget.outstandingAmount)}
              </p>
              <p className="mt-1 text-xs text-ink/45">
                {paymentTarget.sourceName} · {paymentTarget.purchaseType}
              </p>
            </div>
            <label className="text-xs font-medium text-ink/60">
              Amount
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                max={paymentTarget.outstandingAmount}
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.clothType || "inventory"}`}
        message={
          `Move this lot from ${deleteTarget?.sourceName || "supplier"} to Trash. ` +
          "Supplier outstanding and stock leave live views. Any POS receipts that used this lot are soft-deleted too (recoverable from Trash)."
        }
        confirmLabel="Delete inventory"
        cancelLabel="Keep"
        tone="danger"
        busy={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDeleteInventory()}
      />
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

function EmptyChart({ label }) {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-line text-sm text-ink/40">
      {label}
    </div>
  );
}
