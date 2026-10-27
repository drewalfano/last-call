import type { ReactNode } from "react";

/**
 * THE CHOICES, IN ONE ROW ALONG THE BOTTOM.
 *
 * On a landscape board the person choosing sits in one place, so the options
 * sit together under one hand — never split to opposite edges, where one of
 * them is a reach across the table. Equal widths, so no option looks like
 * the recommended one.
 *
 * Layout only. The buttons are the app's own `.btn .btn--lg`, passed in, so a
 * choice looks like every other primary action and keeps its press.
 */
export function Choices({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="choices" role="group" aria-label={label}>
      {children}
    </div>
  );
}
