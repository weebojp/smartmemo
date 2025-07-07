'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Eye, Edit, Trash2, Sparkles, FileText, Tag, BarChart3 } from "lucide-react"
import { Database } from "@/types/database"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { formatDate } from "@/lib/utils/date"
import { RelatedMemos } from "./related-memos"
import { SearchHighlight, TagHighlight } from "./search-highlight"

type Memo = Database['public']['Tables']['memos']['Row']

interface MemoDetailModalProps {
  memo: Memo
  onEdit?: (memo: Memo) => void
  onDelete?: (memo: Memo) => void
  searchQuery?: string
  searchHighlights?: Array<{
    field: string
    positions: Array<{ start: number; end: number; score: number }>
  }>
  similarity?: number
  matchedFields?: string[]
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function MemoDetailModal({
  memo,
  onEdit,
  onDelete,
  searchQuery = '',
  searchHighlights,
  similarity,
  matchedFields = [],
  children,
  open,
  onOpenChange
}: MemoDetailModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showRelated, setShowRelated] = useState(false)

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  // 検索マッチ情報を表示するかどうか
  const showSearchInfo = searchQuery && (similarity !== undefined || matchedFields.length > 0)

  // 統計情報の計算
  const stats = {
    characters: memo.content.length,
    words: memo.content.split(/\s+/).filter(Boolean).length,
    lines: memo.content.split('\n').length,
    paragraphs: memo.content.split('\n\n').filter(Boolean).length
  }

  return (
    <Dialog open={open ?? isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="p-0">
        <DialogHeader className="px-6 py-3 flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <DialogTitle className="text-lg font-semibold">
                メモ詳細
              </DialogTitle>
              
              {/* 重要なメタデータのみ */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{formatDate(memo.created_at)}</span>
                {memo.category && (
                  <Badge variant="secondary" className="text-xs">
                    {memo.category}
                  </Badge>
                )}
                <span>{stats.characters} 文字</span>
                {showSearchInfo && similarity !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {Math.round(similarity * 100)}% 一致
                  </Badge>
                )}
              </div>
            </div>
            
            {/* アクションボタン（コンパクト） */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRelated(!showRelated)}
                className="h-8 px-2"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit?.(memo)}
                className="h-8 px-2"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete?.(memo)}
                className="h-8 px-2 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-6 space-y-6">
            {/* メモ本文 - ファーストビューで最優先表示 */}
            <div>
              {searchQuery ? (
                <SearchHighlight
                  text={memo.content}
                  searchQuery={searchQuery}
                  className="prose prose-base max-w-none leading-relaxed"
                  highlightClassName="bg-yellow-200 dark:bg-yellow-800 px-1 rounded font-medium"
                />
              ) : (
                <div className="prose prose-base max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-4 leading-relaxed text-base">{children}</p>,
                      h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-xl font-semibold mb-3">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-lg font-semibold mb-2">{children}</h3>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      code: ({ children }) => <code className="bg-muted px-2 py-1 rounded text-sm">{children}</code>,
                      pre: ({ children }) => <pre className="bg-muted p-4 rounded-md overflow-x-auto">{children}</pre>,
                      blockquote: ({ children }) => <blockquote className="border-l-4 border-muted pl-4 italic">{children}</blockquote>,
                    }}
                  >
                    {memo.content_markdown}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {/* 区切り線 */}
            <Separator />

            {/* コンパクトなメタデータセクション */}
            <div className="space-y-4">
              {/* タグ（コンパクト表示） */}
              {memo.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Tag className="h-3 w-3" />
                    タグ
                  </h4>
                  <TagHighlight
                    tags={memo.tags}
                    searchQuery={searchQuery}
                    className="flex flex-wrap gap-1"
                    showAllTags={true}
                  />
                </div>
              )}
              
              {/* AI要約（コンパクト表示） */}
              {memo.summary && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Sparkles className="h-3 w-3" />
                    AI要約
                  </h4>
                  <div className="bg-muted/50 p-3 rounded-md">
                    {searchQuery ? (
                      <SearchHighlight
                        text={memo.summary}
                        searchQuery={searchQuery}
                        className="text-sm leading-relaxed"
                        highlightClassName="bg-yellow-200 dark:bg-yellow-800 px-1 rounded font-medium"
                      />
                    ) : (
                      <p className="text-sm leading-relaxed">{memo.summary}</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* キーワード（コンパクト表示） */}
              {memo.keywords && memo.keywords.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <BarChart3 className="h-3 w-3" />
                    キーワード
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {memo.keywords.map((keyword, index) => (
                      <SearchHighlight
                        key={index}
                        text={keyword}
                        searchQuery={searchQuery}
                        className="inline-block"
                      >
                        <Badge variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      </SearchHighlight>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 統計情報（最小限） */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  情報
                </h4>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-muted/50 p-2 rounded">
                    <div className="text-lg font-semibold">{stats.characters}</div>
                    <div className="text-xs text-muted-foreground">文字</div>
                  </div>
                  <div className="bg-muted/50 p-2 rounded">
                    <div className="text-lg font-semibold">{stats.words}</div>
                    <div className="text-xs text-muted-foreground">単語</div>
                  </div>
                  <div className="bg-muted/50 p-2 rounded">
                    <div className="text-lg font-semibold">{stats.lines}</div>
                    <div className="text-xs text-muted-foreground">行</div>
                  </div>
                  <div className="bg-muted/50 p-2 rounded">
                    <div className="text-lg font-semibold">{memo.view_count}</div>
                    <div className="text-xs text-muted-foreground">表示</div>
                  </div>
                </div>
                
                {/* 作成・更新日時 */}
                <div className="mt-3 pt-3 border-t text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">作成</span>
                    <span>{formatDate(memo.created_at)}</span>
                  </div>
                  {memo.updated_at !== memo.created_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">更新</span>
                      <span>{formatDate(memo.updated_at)}</span>
                    </div>
                  )}
                  {memo.processed_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">AI処理</span>
                      <span>{formatDate(memo.processed_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
        
        {/* 関連メモ */}
        {showRelated && memo.embedding && memo.embedding.length > 0 && (
          <div className="border-t flex-shrink-0">
            <div className="p-6">
              <RelatedMemos 
                memoId={memo.id} 
                onMemoClick={(relatedMemoId) => {
                  // Handle navigation to related memo
                  console.log('Navigate to memo:', relatedMemoId)
                }}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}