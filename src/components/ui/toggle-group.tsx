import * as React from "react"
import { cn } from "@/lib/utils"

interface ToggleGroupContextValue {
  value: string
  onValueChange: (value: string) => void
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({
  value: "",
  onValueChange: () => {},
})

interface ToggleGroupProps {
  value: string
  onValueChange: (value: string) => void
  className?: string
  children: React.ReactNode
}

function ToggleGroup({ value, onValueChange, className, children }: ToggleGroupProps) {
  return (
    <ToggleGroupContext.Provider value={{ value, onValueChange }}>
      <div
        data-slot="toggle-group"
        role="group"
        className={cn("inline-flex rounded-lg border border-border overflow-hidden", className)}
      >
        {children}
      </div>
    </ToggleGroupContext.Provider>
  )
}

interface ToggleGroupItemProps {
  value: string
  className?: string
  children: React.ReactNode
  disabled?: boolean
}

function ToggleGroupItem({ value, className, children, disabled }: ToggleGroupItemProps) {
  const ctx = React.useContext(ToggleGroupContext)
  const isSelected = ctx.value === value

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      disabled={disabled}
      data-slot="toggle-group-item"
      data-state={isSelected ? "on" : "off"}
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        "flex-1 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50",
        isSelected
          ? "bg-primary text-primary-foreground"
          : "bg-background text-foreground hover:bg-muted",
        className
      )}
    >
      {children}
    </button>
  )
}

export { ToggleGroup, ToggleGroupItem }
