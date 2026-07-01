"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EditActions } from "@/components/shared/edit-actions";
import { useProduct, useSaveProduct } from "@/queries/products";

type Conversion = { unit: string; defaultAmount: string; convAmount: string };

interface FormValues {
  description: string;
  unit: string;
  conversions: Conversion[];
}

/**
 * Product editor (new + edit) — ported from the original `pages/Products/Product`.
 *
 * Routed as /products/new (create) and /products/[id] (edit); `id === "new"`
 * means create. Fields: description, primary unit, and a dynamic list of unit
 * conversions expressed as the ratio `N <primaryUnit> = M <otherUnit>`. On save
 * this is normalized to the stored factor `oneDefaultEquals = convAmount / defaultAmount`.
 *
 * Conversions support push-on-blur/Enter (like the original). The wrapper waits
 * for the product to load (edit mode) and renders the inner form keyed by id, so
 * defaults are baked into `useForm` and no setState-in-effect is needed.
 */
export default function ProductEditorPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const isNew = id === "new";
  const { data: product, isLoading } = useProduct(!isNew ? id : undefined);

  if (!isNew && isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando produto...</div>;
  }

  const initialValues: FormValues = {
    description: product?.description ?? "",
    unit: product?.defaultMeasurementUnit ?? "",
    conversions:
      product?.conversions.map((c) => ({
        unit: c.measurementUnit,
        defaultAmount: "1",
        convAmount: `${c.oneDefaultEquals}`,
      })) ?? [],
  };

  return <ProductForm key={id} isNew={isNew} id={isNew ? undefined : id} initialValues={initialValues} />;
}

function ProductForm({
  id,
  isNew,
  initialValues,
}: {
  id?: string;
  isNew: boolean;
  initialValues: FormValues;
}) {
  const router = useRouter();
  const saveMutation = useSaveProduct();

  // in-progress conversion row inputs
  const [dflt, setDflt] = useState("");
  const [conv, setConv] = useState("");
  const [convUnit, setConvUnit] = useState("");

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      if (!value.description || !value.unit) return;
      // flush any in-progress conversion row first (matches original behavior)
      flushPending(value.conversions);
      try {
        await saveMutation.mutateAsync({
          id,
          data: {
            description: value.description,
            defaultMeasurementUnit: value.unit,
            conversions: value.conversions.map((c) => ({
              measurementUnit: c.unit,
              oneDefaultEquals: parseFloat(c.convAmount) / parseFloat(c.defaultAmount),
            })),
          },
        });
        toast.success(isNew ? "Produto criado" : "Produto atualizado");
        router.push("/products");
        router.refresh();
      } catch (err) {
        toast.error(`Erro ao salvar produto: ${err instanceof Error ? err.message : err}`);
      }
    },
  });

  // push the in-progress row into the form's conversions array (at the top)
  const flushPending = (current: Conversion[]) => {
    if (!dflt || !conv || !convUnit) return;
    form.setFieldValue("conversions", [
      { unit: convUnit, convAmount: conv, defaultAmount: dflt },
      ...current,
    ]);
    setDflt("");
    setConv("");
    setConvUnit("");
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6 md:p-8">
      <EditActions
        cancelHref="/products"
        onSubmit={() => form.handleSubmit()}
        submitting={saveMutation.isPending}
      />

      <h1 className="text-2xl font-semibold tracking-tight">
        {isNew ? "Novo produto" : "Alterar produto"}
      </h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="flex flex-col gap-4"
      >
        <form.Field name="description">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor={field.name}>Descrição do produto</Label>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Descrição do produto"
              />
            </div>
          )}
        </form.Field>

        <form.Field name="unit">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor={field.name}>Unidade de medida primária</Label>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Unidade de medida primária"
              />
            </div>
          )}
        </form.Field>
      </form>

      {/* Conversions: only once a primary unit is set. */}
      <form.Subscribe selector={(s) => s.values.unit}>
        {(unit) =>
          unit ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Conversões</h2>
              <Separator />

              {/* in-progress row */}
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={dflt}
                  onChange={(e) => setDflt(e.target.value)}
                  onBlur={() => flushPending(form.getFieldValue("conversions"))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      flushPending(form.getFieldValue("conversions"));
                    }
                  }}
                  placeholder="1"
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">{unit}</span>
                <span className="text-muted-foreground">=</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={conv}
                  onChange={(e) => setConv(e.target.value)}
                  onBlur={() => flushPending(form.getFieldValue("conversions"))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      flushPending(form.getFieldValue("conversions"));
                    }
                  }}
                  placeholder="2"
                  className="w-20"
                />
                <Input
                  value={convUnit}
                  onChange={(e) => setConvUnit(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      flushPending(form.getFieldValue("conversions"));
                    }
                  }}
                  placeholder="UN"
                  className="w-24"
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={() => flushPending(form.getFieldValue("conversions"))}
                  aria-label="Adicionar conversão"
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              {/* saved conversion rows */}
              <form.Field name="conversions" mode="array">
                {(field) =>
                  field.state.value.map((c, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={c.defaultAmount}
                        onChange={(e) =>
                          field.replaceValue(i, { ...c, defaultAmount: e.target.value })
                        }
                        placeholder="1"
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">{unit}</span>
                      <span className="text-muted-foreground">=</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={c.convAmount}
                        onChange={(e) =>
                          field.replaceValue(i, { ...c, convAmount: e.target.value })
                        }
                        placeholder="2"
                        className="w-20"
                      />
                      <Input
                        value={c.unit}
                        onChange={(e) => field.replaceValue(i, { ...c, unit: e.target.value })}
                        placeholder="UN"
                        className="w-24"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        onClick={() => field.removeValue(i)}
                        aria-label="Remover conversão"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))
                }
              </form.Field>
            </div>
          ) : null
        }
      </form.Subscribe>
    </div>
  );
}
