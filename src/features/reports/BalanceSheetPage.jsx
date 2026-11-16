import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { reportsApi } from "@/features/reports/api";
import { useBranch } from "@/features/branches/BranchContext";
import { ALL_BRANCHES } from "@/features/branches/branchUtils";
import { getErrorMessage } from "@/shared/api/client";
import { formatCurrency, toInputDate } from "@/shared/lib/format";

function Section({ title, rows, total, onSelect }) {
  return (
    <section className="rounded-2xl border border-slate-line/80 bg-white/90">
      <div className="border-b border-slate-line/70 px-4 py-3">
        <h2 className="font-display text-xl text-ink">{title}</h2>
      </div>
      <ul className="divide-y divide-slate-line/60">
        {(rows || []).length === 0 ? (
          <li className="px-4 py-3 text-sm text-muted">No balances</li>
        ) : (
          rows.map((row) => (
            <li key={`${row.code}-${row.name}`}>
              <button
                type="button"
                disabled={!row.accountId || row.computed}
                onClick={() => row.accountId && onSelect?.(row)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm ${
                  row.accountId && !row.computed
                    ? "hover:bg-mist/70"
                    : "cursor-default"
                }`}
              >
                <span>
                  <span className="font-mono text-xs text-muted">
                    {row.code}
                  </span>{" "}
                  <span className="text-ink">{row.name}</span>
                  {row.computed ? (
                    <span className="ml-2 text-xs text-muted">(computed)</span>
                  ) : null}
                </span>
                <span className="font-medium tabular-nums text-ink">
                  {formatCurrency(row.balance)}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
      <div className="flex items-center justify-between border-t border-slate-line/70 bg-mist/50 px-4 py-3 text-sm font-semibold">
        <span>Total {title}</span>
        <span className="tabular-nums">{formatCurrency(total)}</span>
      </div>
    </section>
  );
}

export function BalanceSheetPage() {
  const { selectedBranchId, isAllBranches } = useBranch();
  const [asOfDate, setAsOfDate] = useState(() => toInputDate(new Date()));
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drill, setDrill] = useState(null);
  const [drillLoading, setDrillLoading] = useState(false);

  const branchId = isAllBranches ? ALL_BRANCHES : selectedBranchId;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await reportsApi.ensureAccounts();
      const data = await reportsApi.getBalanceSheet({
        asOfDate,
        branchId,
      });
      setSheet(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load balance sheet"));
      setSheet(null);
    } finally {
      setLoading(false);
    }
  }, [asOfDate, branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => {
      void load();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const openDrill = async (row) => {
    if (!row?.accountId) return;
    setDrillLoading(true);
    setError("");
    try {
      const data = await reportsApi.getAccountLines(row.accountId, {
        asOfDate,
        branchId,
        limit: 100,
      });
      setDrill({ account: row, ...data });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load account lines"));
    } finally {
      setDrillLoading(false);
    }
  };

  const balanced = sheet?.isBalanced;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
            Reports · Financial statements
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Balance sheet</h1>
          <p className="mt-1 text-sm text-muted">
            Assets = Liabilities + Equity. Cash on Hand is net cash after
            purchases and payouts (not the same as Dashboard “Cash received”).
            Inventory Asset is remaining stock at cost (not total purchase
            value).
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-muted">
            As of date
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="mt-1 block rounded-xl border border-slate-line px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-line px-3 py-2 text-sm"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <Link
            to="/reports"
            className="inline-flex items-center gap-1 rounded-xl border border-slate-line px-3 py-2 text-sm"
          >
            <ArrowLeft size={14} />
            Reports
          </Link>
        </div>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {loading && !sheet ? (
        <div className="flex justify-center py-16 text-muted">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : sheet ? (
        <>
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              balanced
                ? "border-emerald-500/40 bg-emerald-50 text-emerald-900"
                : "border-danger/40 bg-red-50 text-danger"
            }`}
          >
            {balanced ? (
              <span className="font-semibold">Balanced</span>
            ) : (
              <span className="font-semibold">
                Out of balance · {formatCurrency(sheet.imbalance)}
              </span>
            )}
            <span className="ml-2 text-muted">
              Assets {formatCurrency(sheet.totals.assets)} · L+E{" "}
              {formatCurrency(sheet.totals.liabilitiesAndEquity)} · Net income{" "}
              {formatCurrency(sheet.totals.netIncome)}
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Section
              title="Assets"
              rows={sheet.assets}
              total={sheet.totals.assets}
              onSelect={openDrill}
            />
            <Section
              title="Liabilities"
              rows={sheet.liabilities}
              total={sheet.totals.liabilities}
              onSelect={openDrill}
            />
            <Section
              title="Equity"
              rows={sheet.equity}
              total={sheet.totals.equity}
              onSelect={openDrill}
            />
          </div>
        </>
      ) : null}

      {drillLoading ? (
        <p className="text-sm text-muted">Loading account activity…</p>
      ) : null}

      {drill ? (
        <div className="rounded-2xl border border-slate-line/80 bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display text-xl text-ink">
                {drill.account.code} · {drill.account.name}
              </h3>
              <p className="text-xs text-muted">
                Journal lines as of {asOfDate}. Debit/Credit are movements;
                Balance is the account total after each line.
              </p>
              {drill.endingBalance != null ? (
                <p className="mt-1 text-sm font-medium text-ink">
                  Ending balance: {formatCurrency(drill.endingBalance)}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setDrill(null)}
              className="rounded-lg border border-slate-line px-2 py-1 text-xs"
            >
              Close
            </button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Memo</th>
                  <th className="px-2 py-2">Source</th>
                  <th className="px-2 py-2">Sale</th>
                  <th className="px-2 py-2 text-right">Debit</th>
                  <th className="px-2 py-2 text-right">Credit</th>
                  <th className="px-2 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {(drill.lines || []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-2 py-6 text-center text-muted"
                    >
                      No lines yet
                    </td>
                  </tr>
                ) : (
                  drill.lines.map((line) => {
                    const sale = line.linkedSale;
                    const showSaleLink =
                      sale &&
                      Number(line.credit) > 0 &&
                      (line.journalEntry?.referenceType === "SALE_COGS" ||
                        line.journalEntry?.referenceType === "SALE");
                    return (
                    <tr
                      key={line.id || line._id}
                      className="border-t border-slate-line/60"
                    >
                      <td className="px-2 py-2 whitespace-nowrap">
                        {line.journalEntry?.entryDate
                          ? toInputDate(line.journalEntry.entryDate)
                          : "—"}
                      </td>
                      <td className="px-2 py-2">
                        {line.memo || line.journalEntry?.memo || "—"}
                      </td>
                      <td className="px-2 py-2 text-xs text-muted">
                        {line.journalEntry?.referenceType}:
                        {String(line.journalEntry?.referenceId || "").slice(0, 8)}
                      </td>
                      <td className="px-2 py-2 text-sm">
                        {showSaleLink ? (
                          <Link
                            to={sale.href}
                            className="font-medium text-brass-deep underline-offset-2 hover:underline"
                          >
                            {sale.receiptNumber || "View sale"}
                            <span className="ml-1 text-xs font-normal text-muted">
                              · sold {formatCurrency(sale.grandTotal)}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {Number(line.debit) > 0
                          ? formatCurrency(line.debit)
                          : "—"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {Number(line.credit) > 0
                          ? formatCurrency(line.credit)
                          : "—"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums font-medium">
                        {line.runningBalance != null
                          ? formatCurrency(line.runningBalance)
                          : "—"}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
