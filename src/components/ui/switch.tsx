import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default";
}

function Switch({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  className,
  size = "default",
  ...props
}: SwitchProps) {
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked ?? false);
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : internalChecked;

  function handleClick() {
    if (disabled) return;
    const next = !isChecked;
    if (!isControlled) setInternalChecked(next);
    onCheckedChange?.(next);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      data-slot="switch"
      data-checked={isChecked || undefined}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        size === "default" ? "h-5 w-9" : "h-4 w-7",
        isChecked ? "bg-primary" : "bg-input",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform",
          size === "default" ? "h-4 w-4" : "h-3 w-3",
          isChecked
            ? size === "default" ? "translate-x-4" : "translate-x-3"
            : "translate-x-0"
        )}
      />
    </button>
  )
}

export { Switch }
