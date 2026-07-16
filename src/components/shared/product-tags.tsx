"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProductTagItem {
  item: { description: string };
}

/** One-line product tags that adapt to the actual width of their table cell. */
export function ProductTags({ items }: { items: ProductTagItem[] }) {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(items.length);
  const descriptions = items.map((item) => item.item.description.trim());
  const descriptionsKey = descriptions.join("\u0000");

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure || isMobile) return;

    const calculate = () => {
      const widths = [...measure.children].map((element) => element.getBoundingClientRect().width);
      const available = container.clientWidth;
      const gap = 4;
      let used = 0;
      let count = 0;
      for (const width of widths) {
        const next = used + (count > 0 ? gap : 0) + width;
        const remainingAfter = widths.length - (count + 1);
        const overflowWidth = remainingAfter > 0 ? 64 + gap : 0;
        if (next + overflowWidth > available) break;
        used = next;
        count += 1;
      }
      setVisibleCount(Math.max(1, Math.min(count, widths.length)));
    };
    const observer = new ResizeObserver(calculate);
    observer.observe(container);
    calculate();
    return () => observer.disconnect();
  }, [descriptionsKey, isMobile]);

  if (items.length === 0) return <span className="text-muted-foreground">—</span>;
  if (isMobile) {
    return <Badge variant="secondary" className="font-normal">{items.length} {items.length === 1 ? "item" : "itens"}</Badge>;
  }

  const shown = descriptions.slice(0, visibleCount);
  const rest = descriptions.length - shown.length;
  return (
    <div ref={containerRef} className="relative min-w-0 overflow-hidden">
      <div className="flex h-6 items-center gap-1 whitespace-nowrap">
        {shown.map((description, index) => <Badge key={`${description}-${index}`} variant="secondary" className="shrink-0 font-normal">{description}</Badge>)}
        {rest > 0 && <span className="shrink-0 text-xs text-muted-foreground">+{rest} {rest === 1 ? "item" : "itens"}</span>}
      </div>
      <div ref={measureRef} aria-hidden className="pointer-events-none absolute invisible flex gap-1 whitespace-nowrap">
        {descriptions.map((description, index) => <Badge key={`${description}-${index}`} variant="secondary" className="shrink-0 font-normal">{description}</Badge>)}
      </div>
    </div>
  );
}
