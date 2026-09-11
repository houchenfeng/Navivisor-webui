import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("h-2 rounded bg-skeleton animate-pulse", className)}
      {...props}
    />
  );
}