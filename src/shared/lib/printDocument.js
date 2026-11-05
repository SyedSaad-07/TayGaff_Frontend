const PRINT_ROOT_ID = "print-root";

/**
 * Print only the given element (clone as a direct body child) so the rest of
 * the app layout cannot create blank PDF pages.
 */
export function printDocument(element) {
  if (!element || typeof window === "undefined") return;

  const existing = document.getElementById(PRINT_ROOT_ID);
  if (existing) existing.remove();

  const root = document.createElement("div");
  root.id = PRINT_ROOT_ID;
  root.setAttribute("aria-hidden", "true");

  const clone = element.cloneNode(true);
  clone.classList.add("print-document");
  root.appendChild(clone);
  document.body.appendChild(root);
  document.body.classList.add("is-printing");

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.body.classList.remove("is-printing");
    root.remove();
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);

  // Blank title so print headers do not show the app route / booking id URL.
  const previousTitle = document.title;
  document.title = " ";

  const restoreTitle = () => {
    document.title = previousTitle;
  };
  window.addEventListener("afterprint", restoreTitle, { once: true });

  // Let the browser paint the print root before opening the dialog.
  window.setTimeout(() => {
    window.print();
  }, 50);
}
