import type { BatchSummary } from "@/types";

/**
 * Aggregation helpers — ported verbatim from the original frontend
 * (`utils/getAllSum`, `getSumByProduct`, `getSumByOrder`). They are pure/
 * isomorphic so client and server can share one implementation. (Moving these
 * into DB aggregations is a later optimization — see PAGES_EXTRACTION.md §10 #6.)
 */

/** Geral (Overview): total per product, converted to each product's default unit. */
export interface OverviewRow {
  id?: string;
  item: string;
  amount: number;
  unit: string;
}

export const getAllSum = (batch: BatchSummary): OverviewRow[] => {
  const products: OverviewRow[] = [];

  // units in the data sometimes carry stray whitespace ("kg ", "Pimenta Bode "),
  // so comparisons trim + lowercase. Product grouping uses the stable `id`.
  const norm = (s: string) => s.toLowerCase().trim();

  batch.orders.forEach((order) => {
    order.items.forEach((item) => {
      const prodIndex = products.findIndex((p) => p.id === item.item.id);
      let amount = item.amount;
      if (norm(item.measurementUnit) !== norm(item.item.defaultMeasurementUnit)) {
        const conv = item.item.conversions.find(
          (c) => norm(c.measurementUnit) === norm(item.measurementUnit),
        );
        // if a conversion exists use it; otherwise leave the amount unchanged
        if (conv) amount = amount / conv.oneDefaultEquals;
      }
      if (prodIndex >= 0) {
        products[prodIndex].amount = parseFloat(
          (amount + products[prodIndex].amount).toFixed(2),
        );
      } else {
        products.push({
          id: item.item.id,
          item: item.item.description,
          amount: parseFloat(amount.toFixed(2)),
          unit: item.item.defaultMeasurementUnit,
        });
      }
    });
  });

  return products.sort((a, b) =>
    a.item.toLowerCase().localeCompare(b.item.toLowerCase()),
  );
};

/** Por produto (By product): per product, the list of clients ordering it. */
export interface ByProductGroup {
  item: string;
  clients: { name: string; amount: number; unit: string }[];
}

export const getSumByProduct = (batch: BatchSummary): ByProductGroup[] => {
  const products: ByProductGroup[] = [];

  batch.orders.forEach((order) => {
    const client = order.client;
    order.items.forEach((item) => {
      const prodIndex = products.findIndex(
        (p) => p.item === item.item.description,
      );
      const orderItem = {
        name: client,
        amount: item.amount,
        unit: item.measurementUnit,
      };
      if (prodIndex >= 0) {
        products[prodIndex].clients.push(orderItem);
      } else {
        products.push({ item: item.item.description, clients: [orderItem] });
      }
    });
  });

  return products.sort((a, b) =>
    a.item.toLowerCase().localeCompare(b.item.toLowerCase()),
  );
};

/** Por cliente (By client): per client, their item lines (original units). */
export interface ByClientGroup {
  client: string;
  deliverAt: string; // ISO
  items: { id: string; name: string; amount: number; unit: string }[];
}

export const getSumByOrder = (batch: BatchSummary): ByClientGroup[] => {
  const products: ByClientGroup[] = [];

  batch.orders.forEach((order) => {
    const client = order.client;
    const deliverAt = order.deliverAt;
    const items = order.items.map((item) => ({
      id: item.item.id,
      name: item.item.description,
      amount: item.amount,
      unit: item.measurementUnit,
    }));
    products.push({ client, deliverAt, items });
  });

  return products.sort((a, b) => {
    if (a.deliverAt > b.deliverAt) return 1;
    if (a.deliverAt < b.deliverAt) return -1;
    return 0;
  });
};
