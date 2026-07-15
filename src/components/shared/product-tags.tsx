"use client";

import { Badge } from "@/components/ui/badge";

interface ProductTagItem {
  item: { description: string };
}

/**
 * Show up to `max` product chips, then a "+N" summary for the rest.
 * Used by both the orders table and client detail orders tab.
 */
export function ProductTags({
  items,
  max = 6,
}: {
  items: ProductTagItem[];
  max?: number;
}) {
  const descs = items.map((i) => i.item.description.trim());
  const shown = descs.slice(0, max);
  const rest = descs.length - shown.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((d, i) => (
        <Badge key={`${d}-${i}`} variant="secondary" className="font-normal">
          {d}
        </Badge>
      ))}
      {rest > 0 && (
        <span className="text-xs text-muted-foreground">
          +{rest} {rest === 1 ? "item" : "itens"}
        </span>
      )}
    </div>
  );
}
