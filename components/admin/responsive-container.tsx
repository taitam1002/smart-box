"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ResponsiveContainerProps {
  children: ReactNode
  className?: string
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
  padding?: "none" | "sm" | "md" | "lg" | "xl"
}

export function ResponsiveContainer({ 
  children, 
  className,
  maxWidth = "full",
  padding = "md"
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md", 
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-7xl"
  }

  const paddingClasses = {
    none: "",
    sm: "p-2 sm:p-4",
    md: "p-4 sm:p-6 lg:p-8", 
    lg: "p-6 sm:p-8 lg:p-12",
    xl: "p-8 sm:p-12 lg:p-16"
  }

  return (
    <div className={cn(
      "min-h-screen bg-gray-50/50",
      maxWidthClasses[maxWidth],
      paddingClasses[padding],
      "mx-auto",
      className
    )}>
      {children}
    </div>
  )
}

interface ResponsiveGridProps {
  children: ReactNode
  className?: string
  cols?: 1 | 2 | 3 | 4 | 5 | 6
  gap?: "sm" | "md" | "lg"
}

export function ResponsiveGrid({ 
  children, 
  className,
  cols = 1,
  gap = "md"
}: ResponsiveGridProps) {
  const gridColsClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 xs:grid-cols-2",
    3: "grid-cols-1 xs:grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    6: "grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
  }

  const gapClasses = {
    sm: "gap-2 sm:gap-4",
    md: "gap-4 sm:gap-6", 
    lg: "gap-6 sm:gap-8"
  }

  return (
    <div className={cn(
      "grid",
      gridColsClasses[cols],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  )
}

interface ResponsiveCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
}

export function ResponsiveCard({ 
  children, 
  className,
  hover = true
}: ResponsiveCardProps) {
  return (
    <div className={cn(
      "bg-white rounded-lg border shadow-sm",
      hover && "hover:shadow-lg transition-shadow duration-200",
      className
    )}>
      {children}
    </div>
  )
}

interface ResponsiveTextProps {
  children: ReactNode
  className?: string
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl"
  weight?: "normal" | "medium" | "semibold" | "bold"
  color?: "default" | "muted" | "primary" | "secondary"
}

export function ResponsiveText({ 
  children, 
  className,
  size = "base",
  weight = "normal",
  color = "default"
}: ResponsiveTextProps) {
  const sizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
    "4xl": "text-4xl"
  }

  const weightClasses = {
    normal: "font-normal",
    medium: "font-medium", 
    semibold: "font-semibold",
    bold: "font-bold"
  }

  const colorClasses = {
    default: "text-foreground",
    muted: "text-muted-foreground",
    primary: "text-primary",
    secondary: "text-secondary-foreground"
  }

  return (
    <span className={cn(
      sizeClasses[size],
      weightClasses[weight],
      colorClasses[color],
      className
    )}>
      {children}
    </span>
  )
}
