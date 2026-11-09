import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#121214] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary:
          "bg-[#0071E3] text-white shadow-[0_2px_12px_rgba(0,113,227,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] hover:bg-[#0077ED] font-semibold",
        navy:
          "bg-black/[0.06] dark:bg-white/[0.12] text-[#1d1d1f] dark:text-white hover:bg-black/[0.10] dark:hover:bg-white/[0.18] border border-[#e8e8ed] dark:border-white/[0.15] backdrop-blur-md shadow-2xs",
        secondary:
          "bg-[#0071e3]/10 dark:bg-white/[0.08] text-[#0071e3] dark:text-[#2997FF] hover:bg-[#0071e3]/15 dark:hover:bg-white/[0.14] border border-[#0071e3]/20 dark:border-[#0071e3]/30 backdrop-blur-md font-semibold",
        outline:
          "border border-[#e8e8ed] dark:border-white/[0.14] bg-black/[0.03] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-[#F5F5F7] hover:bg-black/[0.06] dark:hover:bg-white/[0.10] hover:border-[#d2d2d7] dark:hover:border-white/[0.22] backdrop-blur-md font-medium",
        ghost:
          "text-[#6e6e73] dark:text-[#A1A1A6] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.08]",
        ghostInverse:
          "text-[#6e6e73] dark:text-slate-300 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/10",
        destructive:
          "bg-[#FF453A] text-white hover:bg-red-600 shadow-[0_2px_12px_rgba(255,69,58,0.35)]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-full px-3.5 text-xs",
        lg: "h-11 rounded-full px-7 text-base font-semibold",
        icon: "h-9 w-9 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
