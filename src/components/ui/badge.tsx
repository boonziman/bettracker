import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-pill px-2 py-0.5 text-2xs font-medium uppercase tracking-wide",
  {
    variants: {
      tone: {
        muted: "bg-elevated text-muted",
        live: "bg-win-dim text-live",
        won: "bg-win-dim text-win",
        lost: "bg-lose-dim text-lose",
        leaning: "bg-lean-dim text-lean",
        threat: "bg-threat-dim text-threat",
        pending: "bg-elevated text-subtle",
        push: "bg-elevated text-muted",
        open: "bg-elevated text-muted",
      },
    },
    defaultVariants: { tone: "muted" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone, className }))} {...props} />;
}
