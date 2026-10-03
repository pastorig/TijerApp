"use client";

import { useDialogFocus } from "@/hooks/useDialogFocus";

/**
 * Los modales del empleado son todos un `<form>`. La lógica vive en
 * `useDialogFocus`; acá solo se fija el tipo del ref. Escape lo sigue manejando
 * cada modal.
 */
export function useStaffDialogFocus(open: boolean) {
  return useDialogFocus<HTMLFormElement>(open);
}
