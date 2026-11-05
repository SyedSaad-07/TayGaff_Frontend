/**
 * Brand mark for printable slips / receipts.
 * Asset copied from TayGaff_website/public/assets/logo.png
 */
export function SlipLogo({ className = "mx-auto h-14 w-auto object-contain" }) {
  return (
    <img
      src="/assets/logo.png"
      alt="TayGaff"
      className={className}
      decoding="async"
    />
  );
}
