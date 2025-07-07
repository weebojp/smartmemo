'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { create } from 'zustand'

export interface Toast {
  id: string
  title?: string
  description?: string
  action?: React.ReactNode
  variant?: 'default' | 'destructive' | 'success'
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearAll: () => void
}

const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { ...toast, id }
    
    set((state) => ({
      toasts: [...state.toasts, newToast]
    }))

    // Auto remove after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, toast.duration || 5000)
    }

    return id
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }))
  },
  clearAll: () => {
    set({ toasts: [] })
  }
}))

export const useToast = () => {
  const { addToast, removeToast, clearAll } = useToastStore()
  
  return {
    toast: addToast,
    dismiss: removeToast,
    clearAll
  }
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const removeToast = useToastStore((state) => state.removeToast)

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-md flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 shadow-lg transition-all',
            'data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
            toast.variant === 'destructive' && 'destructive border-destructive bg-destructive text-destructive-foreground',
            toast.variant === 'success' && 'border-green-500 bg-green-50 text-green-900',
            toast.variant === 'default' && 'border bg-background text-foreground'
          )}
        >
          <div className="grid gap-1">
            {toast.title && (
              <div className="text-sm font-semibold">{toast.title}</div>
            )}
            {toast.description && (
              <div className="text-sm opacity-90">{toast.description}</div>
            )}
          </div>
          
          {toast.action && (
            <div className="flex items-center space-x-2">
              {toast.action}
            </div>
          )}
          
          <button
            onClick={() => removeToast(toast.id)}
            className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}