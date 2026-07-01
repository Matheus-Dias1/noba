"use client";

import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Sticky top action bar for editor pages — a red "cancel" and a green "confirm"
 * round button, mirroring the original app's `ButtonRound` cancel/ok pair.
 * Cancel navigates back; confirm calls `onSubmit` and shows a spinner while
 * pending.
 */
export function EditActions({
  cancelHref,
  onSubmit,
  submitting,
  submitDisabled,
}: {
  cancelHref: string;
  onSubmit: () => void;
  submitting?: boolean;
  submitDisabled?: boolean;
}) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        size="icon-lg"
        variant="destructive"
        onClick={() => router.push(cancelHref)}
        aria-label="Cancelar"
        disabled={submitting}
      >
        <X className="size-5" />
      </Button>
      <Button
        type="button"
        size="icon-lg"
        onClick={onSubmit}
        disabled={submitting || submitDisabled}
        aria-label="Confirmar"
      >
        {submitting ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
      </Button>
    </div>
  );
}
