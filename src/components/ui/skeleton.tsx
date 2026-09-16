import { cn } from "@/lib/utils";

/** Placeholder surface with a travelling sweep. See globals.css `.skeleton`. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton rounded-md", className)} {...props} />;
}

export { Skeleton };
