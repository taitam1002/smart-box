"use client"

import { forwardRef } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface AnimatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
  error?: boolean
  animationDelay?: number
}

export const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ className, icon, error, animationDelay = 0, ...props }, ref) => {
    return (
      <div 
        className={cn("relative animate-input-focus", className)}
        style={{ animationDelay: `${animationDelay}ms` }}
      >
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-300">
            {icon}
          </div>
        )}
        <Input
          ref={ref}
          className={cn(
            "transition-all duration-300 hover:shadow-lg focus:shadow-xl focus:scale-105",
            error && "border-red-500 focus:border-red-500",
            className
          )}
          {...props}
        />
      </div>
    )
  }
)

AnimatedInput.displayName = "AnimatedInput"
