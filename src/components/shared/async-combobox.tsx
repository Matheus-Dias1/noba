"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface AsyncComboboxOption<V = string> {
  value: V;
  label: string;
  /** Extra fields may be carried along (e.g. unit/conversion metadata). */
  [key: string]: unknown;
}

export interface LoadResult<V> {
  options: AsyncComboboxOption<V>[];
  hasMore: boolean;
  /** Cursor to pass to the next `loadOptions` call, or undefined if no more. */
  nextCursor?: string;
}

interface AsyncComboboxProps<V extends string> {
  /** Load a page of options for a search query + cursor. */
  loadOptions: (search: string, cursor?: string) => Promise<LoadResult<V>>;
  value?: AsyncComboboxOption<V> | null;
  onChange: (option: AsyncComboboxOption<V> | null) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Async combobox with search + infinite scroll.
 *
 * Replaces the original `react-select-async-paginate`. Built on cmdk (via the
 * shadcn Command primitive) inside a Popover. Search is debounced; scrolling to
 * the bottom of the list loads the next cursor page.
 *
 * `shouldFilter={false}` is set on the Command because the server already
 * filters — cmdk's client-side fuzzy filter would hide server results.
 */
export function AsyncCombobox<V extends string>({
  loadOptions,
  value,
  onChange,
  placeholder = "Selecionar...",
  emptyText = "Nenhum resultado",
  disabled,
  className,
}: AsyncComboboxProps<V>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<AsyncComboboxOption<V>[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorRef = useRef<string | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const apply = (res: LoadResult<V>, reset: boolean) => {
    setOptions((prev) => (reset ? res.options : dedupe([...prev, ...res.options])));
    setHasMore(res.hasMore);
    cursorRef.current = res.hasMore ? res.nextCursor : undefined;
  };

  // Load (or reload from scratch) whenever the search term changes (debounced)
  // or the popover opens.
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      loadOptions(search, undefined)
        .then((res) => apply(res, true))
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, search]);

  const loadMore = () => {
    if (loadingMore || !hasMore || !cursorRef.current) return;
    setLoadingMore(true);
    loadOptions(search, cursorRef.current)
      .then((res) => apply(res, false))
      .finally(() => setLoadingMore(false));
  };

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40 && hasMore && !loadingMore) {
      loadMore();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal",
              !value && "text-muted-foreground",
              className,
            )}
            disabled={disabled}
          />
        }
      >
        <span className="truncate">{value?.label || placeholder}</span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar..." value={search} onValueChange={setSearch} />
          <CommandList onScroll={handleListScroll}>
            {loading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Carregando...
              </div>
            )}
            {!loading && options.length === 0 && <CommandEmpty>{emptyText}</CommandEmpty>}
            {!loading && options.length > 0 && (
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={() => {
                      onChange(opt.value === value?.value ? null : opt);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-1 size-4",
                        value?.value === opt.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{opt.label}</span>
                  </CommandItem>
                ))}
                {loadingMore && (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function dedupe<V>(opts: AsyncComboboxOption<V>[]): AsyncComboboxOption<V>[] {
  const seen = new Set<V>();
  const out: AsyncComboboxOption<V>[] = [];
  for (const o of opts) {
    if (seen.has(o.value)) continue;
    seen.add(o.value);
    out.push(o);
  }
  return out;
}
