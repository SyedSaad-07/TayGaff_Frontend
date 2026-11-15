/** Round to 2 decimal money. */
export function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/** Prepaid credit from a category remaining (negative remaining = credit). */
export function creditFromRemaining(remaining) {
  return roundMoney(Math.max(0, -Number(remaining || 0)));
}

/**
 * Wallet usable on a stream.
 * GARMENT: garment + general credit
 * STITCHING: stitching + general credit
 */
export function walletForStream(summary, stream = "ALL") {
  if (!summary) return 0;
  const by = summary.byCategory || {};
  const general = creditFromRemaining(by.GENERAL?.remaining);
  if (stream === "GARMENT") {
    if (summary.walletGarment != null) return roundMoney(summary.walletGarment);
    return roundMoney(creditFromRemaining(by.GARMENT?.remaining) + general);
  }
  if (stream === "STITCHING") {
    if (summary.walletStitching != null) {
      return roundMoney(summary.walletStitching);
    }
    return roundMoney(creditFromRemaining(by.STITCHING?.remaining) + general);
  }
  if (summary.wallet != null) return roundMoney(summary.wallet);
  return creditFromRemaining(summary.balance);
}

/**
 * Settle order total against cash now + wallet credit.
 * Cash covers first; wallet covers remaining due; surplus cash becomes new credit.
 */
export function settleOrderPayment({ grandTotal, cashPaid, wallet }) {
  const total = roundMoney(Math.max(0, Number(grandTotal) || 0));
  const cash = roundMoney(Math.max(0, Number(cashPaid) || 0));
  const walletAvailable = roundMoney(Math.max(0, Number(wallet) || 0));

  const cashApplied = roundMoney(Math.min(cash, total));
  const dueAfterCash = roundMoney(Math.max(0, total - cashApplied));
  const walletApplied = roundMoney(Math.min(walletAvailable, dueAfterCash));
  const amountCovered = roundMoney(cashApplied + walletApplied);
  const balanceDue = roundMoney(Math.max(0, total - amountCovered));
  const newCreditFromCash = roundMoney(Math.max(0, cash - total));
  const walletRemaining = roundMoney(
    walletAvailable - walletApplied + newCreditFromCash
  );

  return {
    total,
    cash,
    walletAvailable,
    cashApplied,
    walletApplied,
    amountCovered,
    balanceDue,
    newCreditFromCash,
    walletRemaining,
  };
}
