import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold backdrop-blur-md transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#0071E3]/12 dark:bg-[#0071E3]/20 text-[#0066CC] dark:text-[#2997FF] border border-[#0071E3]/25 dark:border-[#0071E3]/35",
        positive:
          "bg-[#30D158]/15 dark:bg-[#30D158]/20 text-[#1D8348] dark:text-[#30D158] border border-[#28CD41]/30 dark:border-[#30D158]/35",
        negative:
          "bg-[#FF453A]/12 dark:bg-[#FF453A]/20 text-[#D70015] dark:text-[#FF453A] border border-[#FF453A]/25 dark:border-[#FF453A]/35",
        warning:
          "bg-[#FF9F0A]/15 dark:bg-[#FF9F0A]/20 text-[#B25000] dark:text-[#FF9F0A] border border-[#FF9F0A]/30 dark:border-[#FF9F0A]/35",
        neutral:
          "bg-black/[0.05] dark:bg-white/[0.08] text-[#424245] dark:text-[#E5E5EA] border border-[#d2d2d7] dark:border-white/10",
        navy:
          "bg-[#1d1d1f] text-white dark:bg-white/[0.12] dark:text-white border border-[#1d1d1f] dark:border-white/15",
        outline:
          "border border-[#d2d2d7] dark:border-white/20 text-[#424245] dark:text-[#E5E5EA] bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
