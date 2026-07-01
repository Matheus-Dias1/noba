"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Conversion } from "@/types";

interface UnitTagsProps {
  defaultUnit: string;
  conversions: Conversion[];
}

/**
 * Renders a product's default unit (highlighted) + its conversions as tags.
 * Used in the Products table and anywhere a product's units need a compact view.
 */
export function UnitTags({ defaultUnit, conversions }: UnitTagsProps) {
  return (
    <div className="flex flex-wrap gap-1">
      <Badge variant="default" className="font-medium uppercase">
        {defaultUnit.trim()}
      </Badge>
      {conversions.map((c) => (
        <Badge
          key={c.measurementUnit}
          variant="outline"
          className={cn("font-normal uppercase text-muted-foreground")}
        >
          {c.measurementUnit.trim()}
        </Badge>
      ))}
    </div>
  );
}
