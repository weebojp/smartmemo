'use client'

import { useEffect, useCallback, useRef } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  description: string
  action: () => void
  enabled?: boolean
}

interface UseKeyboardShortcutsOptions {
  enableGlobal?: boolean
}

const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enableGlobal = true } = options
  const shortcutsRef = useRef(shortcuts)

  // Update shortcuts ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Skip if typing in input fields
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      // Only allow specific shortcuts in input fields
      const inputAllowedShortcuts = ['Escape', '?']
      if (!inputAllowedShortcuts.includes(event.key)) {
        return
      }
    }

    // Find matching shortcut
    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      if (shortcut.enabled === false) return false

      const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase()
      
      // Handle modifier keys
      const ctrlMatches = shortcut.ctrlKey ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey
      const metaMatches = shortcut.metaKey ? event.metaKey : !event.metaKey
      const altMatches = shortcut.altKey ? event.altKey : !event.altKey
      const shiftMatches = shortcut.shiftKey ? event.shiftKey : !event.shiftKey

      return keyMatches && ctrlMatches && metaMatches && altMatches && shiftMatches
    })

    if (matchingShortcut) {
      event.preventDefault()
      event.stopPropagation()
      matchingShortcut.action()
    }
  }, [])

  useEffect(() => {
    if (!enableGlobal) return

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, enableGlobal])

  return {
    isMac,
    formatShortcut: (shortcut: KeyboardShortcut) => {
      const parts: string[] = []
      
      if (shortcut.ctrlKey) {
        parts.push(isMac ? '⌘' : 'Ctrl')
      }
      if (shortcut.metaKey && !isMac) {
        parts.push('Meta')
      }
      if (shortcut.altKey) {
        parts.push(isMac ? '⌥' : 'Alt')
      }
      if (shortcut.shiftKey) {
        parts.push(isMac ? '⇧' : 'Shift')
      }
      
      parts.push(shortcut.key.toUpperCase())
      
      return parts.join(isMac ? '' : '+')
    }
  }
}