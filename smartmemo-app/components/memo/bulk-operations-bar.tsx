'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Trash2, 
  Tag, 
  FolderOpen, 
  Download, 
  X, 
  Check
} from 'lucide-react'
import { useSelectionStore } from '@/lib/stores/selection-store'
import { Card, CardContent } from '@/components/ui/card'

interface BulkOperationsBarProps {
  onBulkDelete: (memoIds: string[]) => Promise<void>
  onBulkAddTags: (memoIds: string[], tags: string[]) => Promise<void>
  onBulkChangeCategory: (memoIds: string[], category: string) => Promise<void>
  onBulkExport: (memoIds: string[], format: 'markdown' | 'json') => Promise<void>
}

export function BulkOperationsBar({
  onBulkDelete,
  onBulkAddTags,
  onBulkChangeCategory,
  onBulkExport
}: BulkOperationsBarProps) {
  const { selectedMemoIds, clearSelection, isSelectionMode } = useSelectionStore()
  const [showTagInput, setShowTagInput] = useState(false)
  const [showCategoryInput, setShowCategoryInput] = useState(false)
  const [newTags, setNewTags] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const selectedCount = selectedMemoIds.size

  if (!isSelectionMode || selectedCount === 0) {
    return null
  }

  const handleBulkDelete = async () => {
    if (confirm(`${selectedCount}個のメモを削除しますか？`)) {
      setIsLoading(true)
      try {
        await onBulkDelete(Array.from(selectedMemoIds))
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleAddTags = async () => {
    if (!newTags.trim()) return
    
    const tags = newTags.split(',').map(tag => tag.trim()).filter(Boolean)
    setIsLoading(true)
    try {
      await onBulkAddTags(Array.from(selectedMemoIds), tags)
      setNewTags('')
      setShowTagInput(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangeCategory = async () => {
    if (!newCategory.trim()) return
    
    setIsLoading(true)
    try {
      await onBulkChangeCategory(Array.from(selectedMemoIds), newCategory)
      setNewCategory('')
      setShowCategoryInput(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async (format: 'markdown' | 'json') => {
    setIsLoading(true)
    try {
      await onBulkExport(Array.from(selectedMemoIds), format)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 border-primary shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* 選択数表示 */}
          <div className="flex items-center gap-2">
            <Badge variant="default" className="px-3 py-1">
              {selectedCount}個選択中
            </Badge>
          </div>

          {/* タグ追加 */}
          <div className="flex items-center gap-2">
            {showTagInput ? (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="タグをカンマ区切りで入力"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  className="w-48"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddTags()
                    }
                  }}
                />
                <Button 
                  size="sm" 
                  onClick={handleAddTags}
                  disabled={!newTags.trim() || isLoading}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setShowTagInput(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTagInput(true)}
                disabled={isLoading}
              >
                <Tag className="h-4 w-4 mr-2" />
                タグ追加
              </Button>
            )}
          </div>

          {/* カテゴリ変更 */}
          <div className="flex items-center gap-2">
            {showCategoryInput ? (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="新しいカテゴリ"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-32"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleChangeCategory()
                    }
                  }}
                />
                <Button 
                  size="sm" 
                  onClick={handleChangeCategory}
                  disabled={!newCategory.trim() || isLoading}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setShowCategoryInput(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCategoryInput(true)}
                disabled={isLoading}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                カテゴリ
              </Button>
            )}
          </div>

          {/* エクスポート */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('markdown')}
              disabled={isLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              MD
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('json')}
              disabled={isLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
          </div>

          {/* 削除 */}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isLoading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            削除
          </Button>

          {/* キャンセル */}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}