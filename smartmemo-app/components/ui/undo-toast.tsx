'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useUndoStore } from '@/lib/stores/undo-store'
import { Undo2 } from 'lucide-react'

interface UndoToastProps {
  memoId: string
  memoTitle: string
  onUndo: () => void
}

export function UndoToast({ memoId, memoTitle, onUndo }: UndoToastProps) {
  const { toast } = useToast()
  const undoDelete = useUndoStore((state) => state.undoDelete)

  useEffect(() => {
    toast({
      title: 'メモを削除しました',
      description: `"${memoTitle.slice(0, 50)}${memoTitle.length > 50 ? '...' : ''}"`,
      duration: 5000,
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const memo = undoDelete(memoId)
            if (memo) {
              onUndo()
            }
          }}
          className="h-8 px-2"
        >
          <Undo2 className="h-3 w-3 mr-1" />
          取り消し
        </Button>
      )
    })

    return () => {
      // Cleanup function
    }
  }, [memoId, memoTitle, onUndo, toast, undoDelete])

  return null
}

// Helper function removed - implementation is handled directly in memo-list component