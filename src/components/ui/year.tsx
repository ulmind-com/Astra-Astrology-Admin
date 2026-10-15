"use client";

import * as React from "react";

/**
 * The current year, rendered on the client.
 *
 * Next's prerenderer rejects `new Date()` during a static render because the
 * value can change between builds and requests. A copyright year is not worth
 * making a page dynamic for, so it is filled in after hydration instead.
 */
export function Year() {
  const [year, setYear] = React.useState<number | null>(null);
  React.useEffect(() => setYear(new Date().getFullYear()), []);
  return <>{year ?? ""}</>;
}
