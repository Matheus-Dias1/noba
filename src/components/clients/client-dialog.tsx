"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSaveClient } from "@/queries/clients";
import { apiFetch } from "@/lib/api-client";
import { formatCep, formatCnpj, isValidCnpj } from "@/lib/brazilian-documents";
import { useRouter } from "next/navigation";

type UnitDraft = {
  key: string;
  name: string;
  cnpj: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
  complement: string;
  cnpjOverridden: boolean;
  cnpjPrefillEligible: boolean;
};

const emptyUnit = (name = "", cnpjPrefillEligible = false): UnitDraft => ({
  key: crypto.randomUUID(),
  name,
  cnpj: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  zip: "",
  complement: "",
  cnpjOverridden: false,
  cnpjPrefillEligible,
});

export function ClientDialog({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: { id: number; name: string; cnpj: string | null; legalName: string | null };
}) {
  const [unitView, setUnitView] = useState(false);
  const [contentHeight, setContentHeight] = useState<number>();

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setUnitView(false);
          setContentHeight(undefined);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        style={{ height: contentHeight === undefined ? undefined : contentHeight + 16 }}
        className={`max-h-[calc(100vh-2rem)] overflow-y-auto transition-[width,max-width,height] duration-300 ease-out ${
          client ? "sm:max-w-md" : unitView ? "sm:max-w-2xl" : "sm:max-w-[40rem]"
        }`}
      >
        {open && (
          <ClientDialogForm
            client={client}
            onClose={() => {
              setUnitView(false);
              setContentHeight(undefined);
              onOpenChange(false);
            }}
            onUnitViewChange={setUnitView}
            onContentHeightChange={setContentHeight}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ClientDialogForm({
  client,
  onClose,
  onUnitViewChange,
  onContentHeightChange,
}: {
  client?: { id: number; name: string; cnpj: string | null; legalName: string | null };
  onClose: () => void;
  onUnitViewChange: (open: boolean) => void;
  onContentHeightChange: (height: number) => void;
}) {
  const isEdit = !!client;
  const router = useRouter();
  const [name, setName] = useState(client?.name ?? "");
  const [cnpj, setCnpj] = useState(formatCnpj(client?.cnpj ?? ""));
  const [legalName, setLegalName] = useState(client?.legalName ?? "");
  const [units, setUnits] = useState<UnitDraft[]>([]);
  const [unitEditor, setUnitEditor] = useState<{
    index: number | null;
    draft: UnitDraft;
  } | null>(null);
  const save = useSaveClient();
  const contentRef = useRef<HTMLDivElement>(null);
  const clientCnpjValid = isValidCnpj(cnpj);

  useEffect(() => {
    onUnitViewChange(unitEditor !== null);
  }, [onUnitViewChange, unitEditor]);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      onContentHeightChange(element.scrollHeight);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [onContentHeightChange]);

  const handleClientCnpjChange = (value: string) => {
    setCnpj(value);
    if (isEdit) return;
    setUnits((current) =>
      current.map((unit, index) =>
        index === 0 && unit.name.trim().toUpperCase() === "SEDE" && !unit.cnpjOverridden
          ? { ...unit, cnpj: value }
          : unit,
      ),
    );
    setUnitEditor((current) =>
      current?.draft.cnpjPrefillEligible &&
      current.draft.name.trim().toUpperCase() === "SEDE" &&
      !current.draft.cnpjOverridden
        ? { ...current, draft: { ...current.draft, cnpj: value } }
        : current,
    );
  };

  const handleSubmit = async () => {
    if (
      !name.trim() ||
      !clientCnpjValid ||
      (!isEdit && (units.length === 0 || units.some((unit) => !unit.name.trim() || !isValidCnpj(unit.cnpj))))
    ) return;
    try {
      const result = await save.mutateAsync({
        id: client?.id,
        data: {
          name: name.trim(),
          cnpj: cnpj.trim() || undefined,
          legalName: legalName.trim() || undefined,
          units: isEdit
            ? undefined
            : units.map((unit) => ({
                name: unit.name.trim(),
                cnpj: unit.cnpj.trim() || undefined,
                street: unit.street.trim() || undefined,
                number: unit.number.trim() || undefined,
                neighborhood: unit.neighborhood.trim() || undefined,
                city: unit.city.trim() || undefined,
                state: unit.state.trim() || undefined,
                zip: unit.zip.trim() || undefined,
                complement: unit.complement.trim() || undefined,
              })),
        },
      });
      toast.success(isEdit ? "Cliente atualizado" : "Cliente criado");
      onClose();
      if (!isEdit && "id" in result) router.push(`/clients/${result.id}`);
    } catch (err) {
      toast.error(
        `Erro ao ${isEdit ? "atualizar" : "criar"} cliente: ${err instanceof Error ? err.message : err}`,
      );
    }
  };

  const saveUnitDraft = () => {
    if (!unitEditor?.draft.name.trim() || !isValidCnpj(unitEditor.draft.cnpj)) return;
    setUnits((current) =>
      unitEditor.index === null
        ? [...current, unitEditor.draft]
        : current.map((unit, index) => (index === unitEditor.index ? unitEditor.draft : unit)),
    );
    setUnitEditor(null);
  };

  const startAddingUnit = () => {
    if (units.length === 0) {
      const sede = emptyUnit("SEDE", true);
      sede.cnpj = cnpj;
      setUnitEditor({ index: null, draft: sede });
      return;
    }
    setUnitEditor({ index: null, draft: emptyUnit() });
  };

  return (
    <div ref={contentRef} className="self-start">
    <AnimatePresence mode="wait" initial={false}>
      {unitEditor ? (
        <motion.div
          key="unit"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.16 }}
          className="grid gap-4"
        >
          <UnitDraftForm
            editor={unitEditor}
            clientCnpj={cnpj}
            onChange={setUnitEditor}
            onBack={() => setUnitEditor(null)}
            onSave={saveUnitDraft}
          />
        </motion.div>
      ) : (
        <motion.div
          key="client"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.16 }}
          className="grid gap-4"
        >
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar cliente" : "Novo cliente"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Atualize os dados da empresa." : "Empresa ou organização compradora."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="client-name">Nome *</Label>
                <Input
                  id="client-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="EMPRESA EXEMPLO"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-cnpj">CNPJ *</Label>
                <Input
                  id="client-cnpj"
                  value={cnpj}
                  onChange={(event) => handleClientCnpjChange(formatCnpj(event.target.value))}
                  placeholder="00.000.000/0001-00"
                  aria-invalid={cnpj.length > 0 && !clientCnpjValid}
                />
                {cnpj.length > 0 && !clientCnpjValid && (
                  <p className="text-xs text-destructive">CNPJ inválido.</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-legal">Razão social</Label>
              <Input
                id="client-legal"
                value={legalName}
                onChange={(event) => setLegalName(event.target.value)}
                placeholder="EMPRESA EXEMPLO LTDA."
              />
            </div>

            {!isEdit && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium">Unidades *</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={startAddingUnit}
                  >
                    <Plus className="size-4" />
                    Adicionar unidade
                  </Button>
                </div>

                <div className="overflow-hidden rounded-lg border">
                  <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <span>Nome</span>
                    <span>CNPJ</span>
                    <span>Localização</span>
                    <span className="sr-only">Ações</span>
                  </div>
                  <div className="max-h-[132px] overflow-y-auto">
                    {units.length === 0 ? (
                      <div className="border-t px-3 py-6 text-center text-sm text-muted-foreground">
                        Cadastre ao menos uma unidade.
                      </div>
                    ) : units.map((unit, index) => (
                      <div
                        key={unit.key}
                        className="grid min-h-11 grid-cols-[1fr_1fr_1fr_auto] items-center gap-3 border-t px-3"
                      >
                        <span className="truncate font-medium">{unit.name}</span>
                        <span className="truncate text-muted-foreground">{unit.cnpj || "—"}</span>
                        <span className="truncate text-muted-foreground">
                          {[unit.city, unit.state].filter(Boolean).join(" / ") || "—"}
                        </span>
                        <div className="flex">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setUnitEditor({ index, draft: { ...unit } })}
                            aria-label={`Editar ${unit.name}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={units.length === 1}
                            onClick={() =>
                              setUnits((current) => current.filter((_, itemIndex) => itemIndex !== index))
                            }
                            aria-label={`Remover ${unit.name}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={save.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !name.trim() ||
                !clientCnpjValid ||
                (!isEdit && (units.length === 0 || units.some((unit) => !unit.name.trim() || !isValidCnpj(unit.cnpj)))) ||
                save.isPending
              }
            >
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </motion.div>
      )}
    </AnimatePresence>
    </div>
  );
}

function UnitDraftForm({
  editor,
  clientCnpj,
  onChange,
  onBack,
  onSave,
}: {
  editor: { index: number | null; draft: UnitDraft };
  clientCnpj: string;
  onChange: (value: { index: number | null; draft: UnitDraft }) => void;
  onBack: () => void;
  onSave: () => void;
}) {
  const draft = editor.draft;
  const unitCnpjValid = isValidCnpj(draft.cnpj);
  const latestEditor = useRef(editor);
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    latestEditor.current = editor;
  }, [editor]);

  const update = (patch: Partial<UnitDraft>) => onChange({ ...editor, draft: { ...draft, ...patch } });
  const updateName = (value: string) => {
    const wasSede = draft.name.trim().toUpperCase() === "SEDE";
    const isSede = value.trim().toUpperCase() === "SEDE";
    if (draft.cnpjPrefillEligible && !draft.cnpjOverridden) {
      update({ name: value, cnpj: isSede ? clientCnpj : wasSede ? "" : draft.cnpj });
      return;
    }
    update({ name: value });
  };
  const updateCep = async (value: string) => {
    const formattedValue = formatCep(value);
    const nextEditor = { ...editor, draft: { ...draft, zip: formattedValue } };
    latestEditor.current = nextEditor;
    onChange(nextEditor);
    const cep = formattedValue.replace(/\D/g, "");
    if (cep.length !== 8) {
      setCepStatus("idle");
      return;
    }

    setCepStatus("loading");
    try {
      const address = await apiFetch<{
        street: string;
        neighborhood: string;
        city: string;
        state: string;
      }>(`/api/cep/${cep}`);
      const current = latestEditor.current;
      if (current.draft.zip.replace(/\D/g, "") !== cep) return;
      onChange({
        ...current,
        draft: {
          ...current.draft,
          street: address.street,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
        },
      });
      setCepStatus("idle");
    } catch {
      setCepStatus("error");
    }
  };

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon-sm" onClick={onBack} aria-label="Voltar">
            <ChevronLeft className="size-4" />
          </Button>
          <DialogTitle>{editor.index === null ? "Adicionar unidade" : "Editar unidade"}</DialogTitle>
        </div>
        <DialogDescription>Informe o nome, CNPJ e endereço da unidade.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 py-2">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="draft-unit-name">Nome *</Label>
            <Input id="draft-unit-name" value={draft.name} onChange={(event) => updateName(event.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="draft-unit-cnpj">CNPJ *</Label>
            <Input
              id="draft-unit-cnpj"
              value={draft.cnpj}
              onChange={(event) => update({ cnpj: formatCnpj(event.target.value), cnpjOverridden: true })}
              placeholder="00.000.000/0001-00"
              aria-invalid={draft.cnpj.length > 0 && !unitCnpjValid}
            />
            {draft.cnpj.length > 0 && !unitCnpjValid && (
              <p className="text-xs text-destructive">CNPJ inválido.</p>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="draft-unit-zip">CEP</Label>
              {cepStatus === "loading" && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" /> Buscando
                </span>
              )}
            </div>
            <Input id="draft-unit-zip" value={draft.zip} onChange={(event) => void updateCep(event.target.value)} placeholder="00000-000" aria-invalid={cepStatus === "error"} />
            {cepStatus === "error" && <p className="text-xs text-destructive">CEP não encontrado.</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="draft-unit-state">Estado</Label>
            <Input id="draft-unit-state" value={draft.state} onChange={(event) => update({ state: event.target.value })} placeholder="SP" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="draft-unit-street">Logradouro</Label>
          <Input id="draft-unit-street" value={draft.street} onChange={(event) => update({ street: event.target.value })} placeholder="Rua das Flores" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="draft-unit-number">Número</Label>
            <Input id="draft-unit-number" value={draft.number} onChange={(event) => update({ number: event.target.value })} placeholder="123" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="draft-unit-neighborhood">Bairro</Label>
            <Input id="draft-unit-neighborhood" value={draft.neighborhood} onChange={(event) => update({ neighborhood: event.target.value })} placeholder="Centro" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="draft-unit-city">Cidade</Label>
            <Input id="draft-unit-city" value={draft.city} onChange={(event) => update({ city: event.target.value })} placeholder="São Paulo" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="draft-unit-complement">Complemento</Label>
            <Input id="draft-unit-complement" value={draft.complement} onChange={(event) => update({ complement: event.target.value })} placeholder="Galpão 2" />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onBack}>Voltar</Button>
        <Button onClick={onSave} disabled={!draft.name.trim() || !unitCnpjValid}>Salvar unidade</Button>
      </DialogFooter>
    </>
  );
}
