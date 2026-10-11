import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type Tone = "info" | "success" | "error" | "warning";
const tones: Record<Tone, string> = {
  info: "bg-guimauve/60 border-guimauve-2 text-encre",
  success: "bg-emerald-50 border-emerald-200 text-emerald-900",
  error: "bg-red-50 border-red-200 text-red-900",
  warning: "bg-amber-50 border-amber-300 text-amber-950",
};
const icons = { info: Info, success: CheckCircle2, error: AlertCircle, warning: AlertCircle };

export function Alert({ tone = "info", title, children, className }: { tone?: Tone; title?: string; children?: React.ReactNode; className?: string }) {
  const Icon = icons[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-2xl border p-4 text-sm", tones[tone], className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "laque" | "or" | "success" | "warning" | "danger"; className?: string }) {
  const t = {
    neutral: "bg-guimauve text-encre",
    laque: "bg-laque text-white",
    or: "bg-or-clair text-reglisse",
    success: "bg-emerald-100 text-emerald-900",
    warning: "bg-amber-100 text-amber-900",
    danger: "bg-red-100 text-red-900",
  }[tone];
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", t, className)}>{children}</span>;
}

export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-drop)] border-2 border-dashed border-guimauve-2 bg-white/60 px-6 py-12 text-center">
      <p className="font-display text-xl text-reglisse">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-encre-doux">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
