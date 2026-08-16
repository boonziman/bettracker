import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function PulseNum({
  value,
  className,
}: {
  value: string | number;
  className?: string;
}) {
  const prev = useRef(value);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    setPop(true);
    const t = window.setTimeout(() => setPop(false), 280);
    return () => window.clearTimeout(t);
  }, [value]);

  return (
    <span className={cn("tabular inline-block", pop && "score-pop", className)}>{value}</span>
  );
}
