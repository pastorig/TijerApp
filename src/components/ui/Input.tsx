import { forwardRef } from "react";
import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const fieldBase =
  "block w-full min-h-11 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] " +
  "bg-[color:var(--surface-1)] px-3 text-base text-[color:var(--text-primary)] " +
  "placeholder:text-[color:var(--text-subtle)] " +
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-soft)] " +
  "outline-none focus:border-[color:var(--brand-gold)] " +
  "disabled:cursor-not-allowed disabled:opacity-40 " +
  "sm:px-4 sm:min-h-12";

type InputProps = InputHTMLAttributes<HTMLInputElement>;
type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(fieldBase, className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        fieldBase,
        "appearance-none bg-[image:var(--select-caret)] bg-[length:12px] bg-[position:right_14px_center] bg-no-repeat pr-9",
        className,
      )}
      style={{
        ["--select-caret" as string]:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'><path d='M2 4l4 4 4-4' stroke='%23c9a23e' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
      }}
      {...rest}
    >
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          fieldBase,
          "min-h-[88px] py-2.5 leading-relaxed resize-none",
          className,
        )}
        {...rest}
      />
    );
  },
);
