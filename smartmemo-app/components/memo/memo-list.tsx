'use client'

import { useState, useRef } from 'react'
import { MemoCard } from './memo-card'
import { MemoForm } from './memo-form'
import { SearchBar } from './search-bar'
import { Button } from '@/components/ui/button'
import { Plus, HelpCircle, Keyboard } from 'lucide-react'
import { Database } from '@/types/database'
import { permanentlyDeleteMemo } from '@/lib/actions/memo'
import { useUndoStore } from '@/lib/stores/undo-store'
import { useToast } from '@/components/ui/toast'
import { Undo2 } from 'lucide-react'
import { useKeyboardShortcuts, KeyboardShortcut } from '@/lib/hooks/use-keyboard-shortcuts'
import { ShortcutsModal } from '@/components/ui/shortcuts-modal'
import { HelpModal } from '@/components/ui/help-modal'

type Memo = Database['public']['Tables']['memos']['Row']

interface SearchResult {
  id: string
  content: string
  content_markdown: string
  tags: string[]
  category: string | null
  summary: string | null
  keywords: string[]
  created_at: string
  updated_at: string
  view_count: number
  similarity?: number
  searchType: 'text' | 'semantic'
  rankScore?: number
}

interface MemoListProps {
  memos: Memo[]
}

export function MemoList({ memos }: MemoListProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null)
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [hiddenMemos, setHiddenMemos] = useState<Set<string>>(new Set())
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { addPendingDeletion } = useUndoStore()
  const { toast } = useToast()

  // Filter out hidden memos from display
  const filteredMemos = (searchResults || memos).filter(memo => !hiddenMemos.has(memo.id))
  const displayMemos = filteredMemos

  // Define keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'n',
      ctrlKey: true,
      description: '新規メモを作成',
      action: () => {
        if (!showForm) {
          setEditingMemo(null)
          setShowForm(true)
        }
      },
      enabled: !showForm
    },
    {
      key: 'k',
      ctrlKey: true,
      description: '検索にフォーカス',
      action: () => {
        if (!showForm && searchInputRef.current) {
          searchInputRef.current.focus()
        }
      },
      enabled: !showForm
    },
    {
      key: 'Escape',
      description: 'フォームを閉じる',
      action: () => {
        if (showForm) {
          handleFormCancel()
        }
        if (showShortcuts) {
          setShowShortcuts(false)
        }
        if (showHelp) {
          setShowHelp(false)
        }
      },
      enabled: showForm || showShortcuts || showHelp
    },
    {
      key: '?',
      description: 'キーボードショートカット一覧を表示',
      action: () => setShowShortcuts(true),
      enabled: !showShortcuts && !showHelp
    },
    {
      key: 'h',
      ctrlKey: true,
      description: 'ヘルプセンターを表示',
      action: () => setShowHelp(true),
      enabled: !showHelp && !showShortcuts
    }
  ]

  const { formatShortcut } = useKeyboardShortcuts(shortcuts)

  const handleEdit = (memo: Memo) => {
    setEditingMemo(memo)
    setShowForm(true)
  }

  const handleDelete = async (memo: Memo) => {
    try {
      // Hide the memo immediately
      setHiddenMemos(prev => new Set(prev).add(memo.id))
      
      // Show undo toast and set up pending deletion
      const handleUndo = () => {
        // Restore the memo to the display
        setHiddenMemos(prev => {
          const newSet = new Set(prev)
          newSet.delete(memo.id)
          return newSet
        })
      }

      const memoTitle = memo.content.slice(0, 50) || 'Untitled Memo'
      
      // Add to pending deletion with auto-expire
      addPendingDeletion(memo, async () => {
        try {
          await permanentlyDeleteMemo(memo.id)
        } catch (error) {
          console.error('Error permanently deleting memo:', error)
          // Restore memo if deletion fails
          handleUndo()
        }
      })

      // Show toast with undo button
      toast({
        title: 'メモを削除しました',
        description: `"${memoTitle}${memo.content.length > 50 ? '...' : ''}"`,
        duration: 5000,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            className="h-8 px-2"
          >
            <Undo2 className="h-3 w-3 mr-1" />
            取り消し
          </Button>
        )
      })

    } catch (error) {
      console.error('Error deleting memo:', error)
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingMemo(null)
    // Clear search when new memo is added
    setSearchResults(null)
    setIsSearching(false)
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingMemo(null)
  }

  const handleSearchResults = (results: SearchResult[]) => {
    setSearchResults(results)
    setIsSearching(true)
  }

  const handleClearSearch = () => {
    setSearchResults(null)
    setIsSearching(false)
  }

  if (showForm) {
    return (
      <MemoForm
        memo={editingMemo || undefined}
        onCancel={handleFormCancel}
        onSuccess={handleFormSuccess}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 max-w-2xl">
          <SearchBar
            ref={searchInputRef}
            onResults={handleSearchResults}
            onClear={handleClearSearch}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowHelp(true)}
            title="ヘルプセンター (Ctrl+H)"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowShortcuts(true)}
            title="キーボードショートカット (?)"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Memo
          </Button>
        </div>
      </div>

      {/* Search Results Info */}
      {isSearching && (
        <div className="text-sm text-muted-foreground">
          Found {displayMemos.length} memo(s)
          {searchResults && searchResults.length > 0 && (
            <span className="ml-2">
              • Mixed: {searchResults.filter(m => m.searchType === 'semantic').length} semantic, 
              {searchResults.filter(m => m.searchType === 'text').length} text matches
            </span>
          )}
        </div>
      )}

      {displayMemos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {isSearching ? 'No memos match your search.' : 'No memos yet. Create your first memo!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayMemos.map((memo) => (
            <div key={memo.id} className="relative">
              <MemoCard
                memo={memo as Memo}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
              {/* Search Result Badge */}
              {isSearching && 'similarity' in memo && memo.similarity && (
                <div className="absolute top-2 right-2 z-10">
                  <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                    {Math.round(memo.similarity * 100)}%
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        shortcuts={shortcuts}
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        formatShortcut={formatShortcut}
      />

      {/* Help Modal */}
      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </div>
  )
}