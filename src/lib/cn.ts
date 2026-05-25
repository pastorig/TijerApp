import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases de Tailwind con merge inteligente (resuelve conflictos
 * tipo "bg-red-500 bg-blue-500" → "bg-blue-500").
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
