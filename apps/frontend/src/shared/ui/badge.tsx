import { type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { badgeVariants } from "@/shared/ui/badge-variants";
import { cn } from "@/shared/lib/utils";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge };
