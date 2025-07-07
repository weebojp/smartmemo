'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Filter, 
  Calendar, 
  Tag, 
  FolderOpen, 
  BarChart3,
  X,
  ChevronDown
} from 'lucide-react'

export interface AdvancedSearchFilters {
  query: string
  tags: string[]
  categories: string[]
  dateRange: {
    start?: Date
    end?: Date
  }
  contentLength: {
    min?: number
    max?: number
  }
  aiProcessed: boolean | null
  sortBy: 'relevance' | 'date' | 'length' | 'similarity'
  sortOrder: 'asc' | 'desc'
}

interface AdvancedSearchProps {
  onSearch: (filters: AdvancedSearchFilters) => void
  onClear: () => void
  availableTags: string[]
  availableCategories: string[]
}

export function AdvancedSearch({
  onSearch,
  onClear,
  availableTags,
  availableCategories
}: AdvancedSearchProps) {
  const [filters, setFilters] = useState<AdvancedSearchFilters>({
    query: '',
    tags: [],
    categories: [],
    dateRange: {},
    contentLength: {},
    aiProcessed: null,
    sortBy: 'relevance',
    sortOrder: 'desc'
  })

  const [showAdvanced, setShowAdvanced] = useState(false)

  const updateFilters = (updates: Partial<AdvancedSearchFilters>) => {
    const newFilters = { ...filters, ...updates }
    setFilters(newFilters)
    onSearch(newFilters)
  }

  const addTag = (tag: string) => {
    if (!filters.tags.includes(tag)) {
      updateFilters({ tags: [...filters.tags, tag] })
    }
  }

  const removeTag = (tag: string) => {
    updateFilters({ tags: filters.tags.filter(t => t !== tag) })
  }

  const addCategory = (category: string) => {
    if (!filters.categories.includes(category)) {
      updateFilters({ categories: [...filters.categories, category] })
    }
  }

  const removeCategory = (category: string) => {
    updateFilters({ categories: filters.categories.filter(c => c !== category) })
  }

  const clearFilters = () => {
    const defaultFilters: AdvancedSearchFilters = {
      query: '',
      tags: [],
      categories: [],
      dateRange: {},
      contentLength: {},
      aiProcessed: null,
      sortBy: 'relevance',
      sortOrder: 'desc'
    }
    setFilters(defaultFilters)
    onClear()
  }

  const hasActiveFilters = filters.query || 
    filters.tags.length > 0 || 
    filters.categories.length > 0 ||
    filters.dateRange.start ||
    filters.dateRange.end ||
    filters.contentLength.min ||
    filters.contentLength.max ||
    filters.aiProcessed !== null

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5" />
            高度な検索
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Badge variant="secondary">
                {[
                  filters.query && '検索語',
                  filters.tags.length > 0 && `タグ: ${filters.tags.length}`,
                  filters.categories.length > 0 && `カテゴリ: ${filters.categories.length}`,
                  filters.dateRange.start && '期間指定',
                  filters.contentLength.min && '文字数指定',
                  filters.aiProcessed !== null && 'AI処理'
                ].filter(Boolean).join(', ')}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Filter className="h-4 w-4 mr-2" />
              詳細
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 基本検索 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="メモを検索..."
            value={filters.query}
            onChange={(e) => updateFilters({ query: e.target.value })}
            className="pl-10"
          />
        </div>

        {/* 詳細フィルター */}
        {showAdvanced && (
          <Tabs defaultValue="filters" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="filters">フィルター</TabsTrigger>
              <TabsTrigger value="content">コンテンツ</TabsTrigger>
              <TabsTrigger value="sort">並び順</TabsTrigger>
            </TabsList>

            <TabsContent value="filters" className="space-y-4">
              {/* タグフィルター */}
              <div>
                <label className="text-sm font-medium mb-2 block">タグ</label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {filters.tags.map(tag => (
                      <Badge key={tag} variant="default" className="flex items-center gap-1">
                        {tag}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableTags
                      .filter(tag => !filters.tags.includes(tag))
                      .slice(0, 10)
                      .map(tag => (
                        <Badge 
                          key={tag} 
                          variant="outline" 
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => addTag(tag)}
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))
                    }
                  </div>
                </div>
              </div>

              {/* カテゴリフィルター */}
              <div>
                <label className="text-sm font-medium mb-2 block">カテゴリ</label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {filters.categories.map(category => (
                      <Badge key={category} variant="default" className="flex items-center gap-1">
                        {category}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeCategory(category)}
                        />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableCategories
                      .filter(category => !filters.categories.includes(category))
                      .map(category => (
                        <Badge 
                          key={category} 
                          variant="outline" 
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => addCategory(category)}
                        >
                          <FolderOpen className="h-3 w-3 mr-1" />
                          {category}
                        </Badge>
                      ))
                    }
                  </div>
                </div>
              </div>

              {/* 期間フィルター */}
              <div>
                <label className="text-sm font-medium mb-2 block">作成日時</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={filters.dateRange.start?.toISOString().split('T')[0] || ''}
                    onChange={(e) => updateFilters({
                      dateRange: {
                        ...filters.dateRange,
                        start: e.target.value ? new Date(e.target.value) : undefined
                      }
                    })}
                  />
                  <Input
                    type="date"
                    value={filters.dateRange.end?.toISOString().split('T')[0] || ''}
                    onChange={(e) => updateFilters({
                      dateRange: {
                        ...filters.dateRange,
                        end: e.target.value ? new Date(e.target.value) : undefined
                      }
                    })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              {/* 文字数フィルター */}
              <div>
                <label className="text-sm font-medium mb-2 block">文字数</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="最小"
                    value={filters.contentLength.min || ''}
                    onChange={(e) => updateFilters({
                      contentLength: {
                        ...filters.contentLength,
                        min: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    })}
                  />
                  <Input
                    type="number"
                    placeholder="最大"
                    value={filters.contentLength.max || ''}
                    onChange={(e) => updateFilters({
                      contentLength: {
                        ...filters.contentLength,
                        max: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    })}
                  />
                </div>
              </div>

              {/* AI処理状態 */}
              <div>
                <label className="text-sm font-medium mb-2 block">AI処理状態</label>
                <div className="flex gap-2">
                  <Button
                    variant={filters.aiProcessed === true ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateFilters({ aiProcessed: true })}
                  >
                    処理済み
                  </Button>
                  <Button
                    variant={filters.aiProcessed === false ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateFilters({ aiProcessed: false })}
                  >
                    未処理
                  </Button>
                  <Button
                    variant={filters.aiProcessed === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateFilters({ aiProcessed: null })}
                  >
                    すべて
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sort" className="space-y-4">
              {/* 並び順 */}
              <div>
                <label className="text-sm font-medium mb-2 block">並び順</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">基準</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={filters.sortBy === 'relevance' ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateFilters({ sortBy: 'relevance' })}
                      >
                        <BarChart3 className="h-3 w-3 mr-1" />
                        関連性
                      </Button>
                      <Button
                        variant={filters.sortBy === 'date' ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateFilters({ sortBy: 'date' })}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        日付
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">順序</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={filters.sortOrder === 'desc' ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateFilters({ sortOrder: 'desc' })}
                      >
                        降順
                      </Button>
                      <Button
                        variant={filters.sortOrder === 'asc' ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateFilters({ sortOrder: 'asc' })}
                      >
                        昇順
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* アクションボタン */}
        {hasActiveFilters && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              フィルターをクリア
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}