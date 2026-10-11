"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/app/(shop)/compte/actions";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";

/** Formulaire relié à une Server Action, avec retour d'état accessible. */
export function ActionForm({
  action,
  submitLabel,
  children,
  className,
  variant,
}: {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  submitLabel: string;
  children: (err: (k: string) => string | undefined) => React.ReactNode;
  className?: string;
  variant?: "primary" | "danger" | "secondary";
}) {
  const [state, formAction, pending] = useActionState(action, { ok: false });
  const err = (k: string) => state.fields?.[k]?.[0];
  return (
    <form action={formAction} noValidate className={className ?? "space-y-5"}>
      {state.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
      {children(err)}
      <Button type="submit" loading={pending} variant={variant}>{submitLabel}</Button>
    </form>
  );
}
