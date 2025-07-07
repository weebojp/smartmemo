import { create } from 'zustand'
import { 
  bulkDeleteMemos, 
  bulkAddTags, 
  bulkChangeCategory, 
  bulkExportMemos,
  restoreDeletedMemos
} from '@/lib/actions/bulk-operations'
import { useUndoStore } from './undo-store'
import { useToast } from '@/components/ui/toast'

interface SelectionState {
  selectedMemoIds: Set<string>
  isSelectionMode: boolean
  
  // Actions
  toggleSelectionMode: () => void
  selectMemo: (id: string) => void
  deselectMemo: (id: string) => void
  selectAll: (memoIds: string[]) => void
  clearSelection: () => void
  toggleMemo: (id: string) => void
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedMemoIds: new Set(),
  isSelectionMode: false,

  toggleSelectionMode: () => {
    const { isSelectionMode } = get()
    set({ 
      isSelectionMode: !isSelectionMode,
      selectedMemoIds: new Set() // Clear selection when toggling mode
    })
  },

  selectMemo: (id: string) => {
    const { selectedMemoIds } = get()
    const newSelection = new Set(selectedMemoIds)
    newSelection.add(id)
    set({ selectedMemoIds: newSelection })
  },

  deselectMemo: (id: string) => {
    const { selectedMemoIds } = get()
    const newSelection = new Set(selectedMemoIds)
    newSelection.delete(id)
    set({ selectedMemoIds: newSelection })
  },

  selectAll: (memoIds: string[]) => {
    set({ selectedMemoIds: new Set(memoIds) })
  },

  clearSelection: () => {
    set({ selectedMemoIds: new Set() })
  },

  toggleMemo: (id: string) => {
    const { selectedMemoIds } = get()
    if (selectedMemoIds.has(id)) {
      get().deselectMemo(id)
    } else {
      get().selectMemo(id)
    }
  }
}))

// バルク操作用のアクション（サーバーアクションと連携）
export interface BulkOperations {
  deleteSelected: () => Promise<void>
  addTagsToSelected: (tags: string[]) => Promise<void>
  changeCategoryForSelected: (category: string) => Promise<void>
  exportSelected: (format: 'markdown' | 'json') => Promise<void>
}

export const useBulkOperations = (): BulkOperations => {
  const { selectedMemoIds, clearSelection } = useSelectionStore()
  const { addPendingDeletion } = useUndoStore()
  const { toast } = useToast()

  return {
    deleteSelected: async () => {
      const idsArray = Array.from(selectedMemoIds)
      if (idsArray.length === 0) return

      try {
        const result = await bulkDeleteMemos({ memoIds: idsArray })
        
        if (result.success) {
          // Undo機能との連携
          addPendingDeletion(
            { 
              id: `bulk-${Date.now()}`,
              content: `${result.deletedCount}個のメモ`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              user_id: '',
              source: 'manual',
              content_markdown: '',
              source_url: null,
              source_title: null,
              view_count: 0,
              tags: [],
              category: null,
              summary: null,
              keywords: [],
              processed_at: null,
              embedding: null,
              related_click_count: 0
            },
            async () => {
              // Undo実行時の処理
              if (result.deletedMemos && result.deletedMemos.length > 0) {
                const restoreResult = await restoreDeletedMemos(result.deletedMemos)
                if (restoreResult.success) {
                  toast({
                    title: 'メモを復元しました',
                    description: `${restoreResult.restoredCount}個のメモを復元しました`,
                  })
                }
              }
            }
          )

          toast({
            title: '一括削除が完了しました',
            description: `${result.deletedCount}個のメモを削除しました`,
          })
          
          clearSelection()
        } else {
          toast({
            title: '削除に失敗しました',
            description: result.error || '不明なエラーが発生しました',
            variant: 'destructive'
          })
        }
      } catch (error) {
        console.error('Bulk delete error:', error)
        toast({
          title: '削除に失敗しました',
          description: 'ネットワークエラーまたはサーバーエラーが発生しました',
          variant: 'destructive'
        })
      }
    },

    addTagsToSelected: async (tags: string[]) => {
      const idsArray = Array.from(selectedMemoIds)
      if (idsArray.length === 0 || tags.length === 0) return

      try {
        const result = await bulkAddTags({ memoIds: idsArray, tags })
        
        if (result.success) {
          toast({
            title: 'タグを追加しました',
            description: `${result.updatedCount}個のメモに「${result.addedTags?.join(', ') || 'タグ'}」を追加しました`,
          })
          clearSelection()
        } else {
          toast({
            title: 'タグ追加に失敗しました',
            description: result.error || '不明なエラーが発生しました',
            variant: 'destructive'
          })
        }
      } catch (error) {
        console.error('Bulk add tags error:', error)
        toast({
          title: 'タグ追加に失敗しました',
          description: 'ネットワークエラーまたはサーバーエラーが発生しました',
          variant: 'destructive'
        })
      }
    },

    changeCategoryForSelected: async (category: string) => {
      const idsArray = Array.from(selectedMemoIds)
      if (idsArray.length === 0 || !category.trim()) return

      try {
        const result = await bulkChangeCategory({ memoIds: idsArray, category })
        
        if (result.success) {
          toast({
            title: 'カテゴリを変更しました',
            description: `${result.updatedCount}個のメモのカテゴリを「${result.newCategory}」に変更しました`,
          })
          clearSelection()
        } else {
          toast({
            title: 'カテゴリ変更に失敗しました',
            description: result.error || '不明なエラーが発生しました',
            variant: 'destructive'
          })
        }
      } catch (error) {
        console.error('Bulk change category error:', error)
        toast({
          title: 'カテゴリ変更に失敗しました',
          description: 'ネットワークエラーまたはサーバーエラーが発生しました',
          variant: 'destructive'
        })
      }
    },

    exportSelected: async (format: 'markdown' | 'json') => {
      const idsArray = Array.from(selectedMemoIds)
      if (idsArray.length === 0) return

      try {
        const result = await bulkExportMemos({ memoIds: idsArray, format })
        
        if (result.success && result.exportResult) {
          // ファイルダウンロードの処理
          const blob = typeof result.exportResult.content === 'string' 
            ? new Blob([result.exportResult.content], { type: result.exportResult.mimeType })
            : result.exportResult.content

          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = result.exportResult.filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)

          toast({
            title: 'エクスポートが完了しました',
            description: `${result.exportedCount}個のメモを${format.toUpperCase()}形式でエクスポートしました`,
          })
        } else {
          toast({
            title: 'エクスポートに失敗しました',
            description: result.error || '不明なエラーが発生しました',
            variant: 'destructive'
          })
        }
      } catch (error) {
        console.error('Bulk export error:', error)
        toast({
          title: 'エクスポートに失敗しました',
          description: 'ネットワークエラーまたはサーバーエラーが発生しました',
          variant: 'destructive'
        })
      }
    }
  }
}