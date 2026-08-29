import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-foreground text-background hover:opacity-90 active:scale-[0.98]",
  secondary:
    "bg-surface-elevated text-foreground border border-border-separator hover:bg-hover active:scale-[0.98]",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-[13px] font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button };
