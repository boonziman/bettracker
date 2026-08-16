import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("text-2xs font-medium uppercase tracking-wide text-subtle", className)}
      {...props}
    />
  );
}
