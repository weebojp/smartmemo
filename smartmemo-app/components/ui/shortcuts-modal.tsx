'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Keyboard } from 'lucide-react'
import { KeyboardShortcut } from '@/lib/hooks/use-keyboard-shortcuts'

interface ShortcutsModalProps {
  shortcuts: KeyboardShortcut[]
  isOpen: boolean
  onClose: () => void
  formatShortcut: (shortcut: KeyboardShortcut) => string
}

export function ShortcutsModal({ shortcuts, isOpen, onClose, formatShortcut }: ShortcutsModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }

      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!mounted || !isOpen) return null

  const groupedShortcuts = shortcuts.reduce((groups, shortcut) => {
    const category = getShortcutCategory(shortcut)
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(shortcut)
    return groups
  }, {} as Record<string, KeyboardShortcut[]>)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <Card className="relative w-full max-w-2xl max-h-[80vh] overflow-auto mx-4">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              キーボードショートカット
            </CardTitle>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <span className="text-sm">{shortcut.description}</span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {formatShortcut(shortcut)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          <div className="pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground">
              <kbd className="px-2 py-1 bg-muted rounded text-xs">?</kbd> または{' '}
              <kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd> で閉じる
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getShortcutCategory(shortcut: KeyboardShortcut): string {
  const { key, description } = shortcut
  
  if (key === 'n' || description.includes('作成') || description.includes('新規')) {
    return '作成・編集'
  }
  
  if (key === 'k' || key === 'f' || description.includes('検索') || description.includes('フォーカス')) {
    return '検索・ナビゲーション'
  }
  
  if (key === 's' || description.includes('保存')) {
    return '保存・実行'
  }
  
  if (key === '?' || key === 'Escape' || description.includes('ヘルプ') || description.includes('閉じる')) {
    return 'ヘルプ・ナビゲーション'
  }
  
  return 'その他'
}