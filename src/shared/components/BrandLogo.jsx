/**
 * Full wordmark (TG mark + TAY GAFF) for app chrome and sign-in.
 */
export function BrandLogo({ className = "h-10 w-auto object-contain" }) {
  return (
    <img
      src="/assets/TayGaff.png"
      alt="TayGaff"
      className={className}
      decoding="async"
    />
  );
}

/**
 * Compact TG monogram for tight spaces.
 */
export function BrandMark({ className = "h-10 w-10 object-contain" }) {
  return (
    <img
      src="/assets/logo.png"
      alt="TayGaff"
      className={className}
      decoding="async"
    />
  );
}
