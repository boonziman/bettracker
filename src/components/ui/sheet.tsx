import * as React from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      {children}
    </Drawer.Root>
  );
}

export const SheetTrigger = Drawer.Trigger;
export const SheetClose = Drawer.Close;
export const SheetPortal = Drawer.Portal;

export function SheetContent({
  className,
  children,
  side = "bottom",
}: {
  className?: string;
  children: React.ReactNode;
  side?: "bottom" | "right";
}) {
  return (
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 z-50 bg-bg/70" />
      <Drawer.Content
        className={cn(
          "fixed z-50 flex flex-col bg-surface text-fg shadow-[var(--shadow-border)] outline-none",
          side === "bottom"
            ? "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-xl"
            : "inset-y-0 right-0 h-full w-full max-w-md rounded-none sm:rounded-l-xl",
          className,
        )}
      >
        <div className="mx-auto mt-3 hidden h-1 w-10 rounded-pill bg-line-strong sm:hidden max-sm:block" />
        {children}
      </Drawer.Content>
    </Drawer.Portal>
  );
}

export function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("border-b border-line px-5 py-4", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("type-display text-xl text-fg", className)} {...props} />;
}
