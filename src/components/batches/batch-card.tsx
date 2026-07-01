"use client";

import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateRange, padBatchNumber } from "@/lib/format";

interface BatchCardItem {
  desc: string;
  // amount/unit kept in the type for callers that compute them, but not shown
  amount: number;
  unit: string;
}

interface BatchCardProps {
  id: string;
  number: number;
  startDate: string;
  endDate: string;
  /** Top products by quantity (already capped at the limit). */
  items: BatchCardItem[];
  /** How many products were hidden beyond the cap. */
  overflowCount: number;
  clients: string[];
}

/**
 * Batch list card — ported from the original `pages/Batches/BatchCard`, updated:
 * shows up to 10 item chips (description only) + a plain-text "+X itens"
 * overflow note, and the clients that have orders in the batch.
 */
export function BatchCard({
  id,
  number,
  startDate,
  endDate,
  items,
  overflowCount,
  clients,
}: BatchCardProps) {
  return (
    <Card className="p-4">
      <Link href={`/batches/${id}`} className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-semibold tabular-nums text-primary">
            {padBatchNumber(number)}
          </span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{formatDateRange(startDate, endDate)}</p>

        {items.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {items.map((item) => (
              <Badge key={item.desc} variant="secondary" className="font-normal">
                {item.desc}
              </Badge>
            ))}
            {overflowCount > 0 && (
              <span className="text-xs text-muted-foreground">+{overflowCount} itens</span>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ainda não há pedidos para esse lote
          </p>
        )}

        {clients.length > 0 && (
          <div className="flex items-start gap-1.5 border-t pt-2 text-xs text-muted-foreground">
            <Users className="mt-0.5 size-3.5 shrink-0" />
            <span className="line-clamp-2">{clients.join(", ")}</span>
          </div>
        )}
      </Link>
    </Card>
  );
}
