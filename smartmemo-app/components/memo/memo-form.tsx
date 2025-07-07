'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createMemo, updateMemo } from '@/lib/actions/memo'
import { Database } from '@/types/database'
import { Loader2, Save, X } from 'lucide-react'
import { useKeyboardShortcuts, KeyboardShortcut } from '@/lib/hooks/use-keyboard-shortcuts'

type Memo = Database['public']['Tables']['memos']['Row']

interface MemoFormProps {
  memo?: Memo
  onCancel?: () => void
  onSuccess?: () => void
}

export function MemoForm({ memo, onCancel, onSuccess }: MemoFormProps) {
  const [content, setContent] = useState(memo?.content || '')
  const [isLoading, setIsLoading] = useState(false)

  // Define form-specific keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 's',
      ctrlKey: true,
      description: 'メモを保存',
      action: () => {
        if (!isLoading && content.trim()) {
          const fakeEvent = { preventDefault: () => {} } as React.FormEvent
          handleSubmit(fakeEvent)
        }
      },
      enabled: !isLoading && content.trim().length > 0
    },
    {
      key: 'Escape',
      description: 'フォームをキャンセル',
      action: () => {
        if (!isLoading) {
          onCancel?.()
        }
      },
      enabled: !isLoading
    }
  ]

  useKeyboardShortcuts(shortcuts)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (memo) {
        await updateMemo(memo.id, {
          content,
          contentMarkdown: content,
        })
      } else {
        await createMemo({
          content,
          contentMarkdown: content,
          source: 'manual'
        })
      }
      onSuccess?.()
    } catch (error) {
      console.error('Error saving memo:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {memo ? 'Edit Memo' : 'New Memo'}
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="content" className="block text-sm font-medium mb-2">
              Content (Markdown supported)
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your memo here..."
              className="min-h-[200px]"
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading || !content.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}