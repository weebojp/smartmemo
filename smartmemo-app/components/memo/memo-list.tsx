'use client'

import { useState, useRef } from 'react'
import { MemoCard } from './memo-card'
import { MemoForm } from './memo-form'
import { EnhancedSearchBar } from './enhanced-search-bar'
import { MemoPlaceholder, EmptyState } from './memo-placeholder'
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
  searchType: 'text' | 'semantic' | 'hybrid' | 'complex' | 'fuzzy'
  rankScore?: number
  highlights?: Array<{
    field: string
    positions: Array<{ start: number; end: number; score: number }>
  }>
  fuzzyScore?: number
  matchedFields?: string[]
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
  const [currentSearchQuery, setCurrentSearchQuery] = useState('')
  
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

  const handleSearchResults = (results: SearchResult[], query?: string) => {
    setSearchResults(results)
    setIsSearching(true)
    setCurrentSearchQuery(query || '')
  }

  const handleClearSearch = () => {
    setSearchResults(null)
    setIsSearching(false)
    setCurrentSearchQuery('')
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
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <EnhancedSearchBar
              ref={searchInputRef}
              onResults={handleSearchResults}
              onClear={handleClearSearch}
            />
          </div>
          <div className="flex gap-2 justify-end">
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
              <span className="hidden sm:inline">New Memo</span>
              <span className="sm:hidden">新規</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Search Results Info */}
      {isSearching && (
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">
                検索結果: {displayMemos.length}件のメモ
              </div>
              {currentSearchQuery && (
                <div className="text-xs text-muted-foreground">
                  「{currentSearchQuery}」
                </div>
              )}
            </div>
            {searchResults && searchResults.length > 0 && (
              <div className="flex gap-2 text-xs">
                {searchResults.filter(m => m.searchType === 'semantic').length > 0 && (
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                    AI検索: {searchResults.filter(m => m.searchType === 'semantic').length}件
                  </span>
                )}
                {searchResults.filter(m => m.searchType === 'text').length > 0 && (
                  <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                    テキスト: {searchResults.filter(m => m.searchType === 'text').length}件
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {displayMemos.length === 0 ? (
        isSearching ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              検索条件に一致するメモが見つかりませんでした。
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              別のキーワードを試すか、検索モードを変更してみてください。
            </p>
          </div>
        ) : (
          <EmptyState onCreateMemo={() => setShowForm(true)} />
        )
      ) : (
        <div className="memo-grid">
          {displayMemos.map((memo) => (
            <MemoCard
              key={memo.id}
              memo={memo as Memo}
              onEdit={handleEdit}
              onDelete={handleDelete}
              searchQuery={isSearching ? currentSearchQuery : undefined}
              searchHighlights={'highlights' in memo ? memo.highlights : undefined}
              similarity={'similarity' in memo ? memo.similarity : undefined}
              matchedFields={'matchedFields' in memo ? memo.matchedFields : undefined}
            />
          ))}
          
          {/* メモが少ない場合にプレースホルダーを表示 */}
          {!isSearching && displayMemos.length > 0 && displayMemos.length < 6 && (
            <MemoPlaceholder onCreateMemo={() => setShowForm(true)} />
          )}
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