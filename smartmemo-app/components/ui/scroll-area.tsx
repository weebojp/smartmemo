'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("relative overflow-y-auto overflow-x-hidden custom-scrollbar", className)}
      style={{ 
        maxHeight: '100%'
      }}
      {...props}
    >
      <div className="w-full">
        {children}
      </div>
    </div>
  )
)

ScrollArea.displayName = "ScrollArea"