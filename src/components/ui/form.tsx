import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-xl border border-guimauve-2 bg-white px-3.5 py-2.5 text-[0.95rem] text-encre placeholder:text-encre-doux/70 shadow-[inset_0_1px_0_rgba(0,0,0,.03)] focus:border-laque focus:outline-none focus:ring-2 focus:ring-laque/25 aria-[invalid=true]:border-alerte disabled:bg-guimauve/40";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(control, "h-11", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(control, "min-h-28", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn(control, "h-11 pr-8", className)} {...props} />;
});

/**
 * Champ accessible : libellé relié, message d'aide et erreur annoncés aux lecteurs d'écran.
 * L'enfant reçoit id / aria-describedby / aria-invalid via la fonction de rendu.
 */
export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean; required?: boolean }) => React.ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-semibold text-encre">
        {label}
        {required && <span className="text-laque" aria-hidden> *</span>}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined, required })}
      {hint && <p id={hintId} className="text-xs text-encre-doux">{hint}</p>}
      {error && (
        <p id={errId} className="text-sm font-medium text-alerte" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkbox({ label, error, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; error?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <input id={id} type="checkbox" className="mt-1 size-4.5 shrink-0 accent-laque" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined} {...props} />
        <label htmlFor={id} className="text-sm leading-relaxed text-encre">
          {label}
        </label>
      </div>
      {error && (
        <p id={`${id}-err`} className="mt-1 text-sm font-medium text-alerte" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
