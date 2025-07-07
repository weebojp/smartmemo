'use client'

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, Edit, Trash2, Sparkles } from "lucide-react"
import { Database } from "@/types/database"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { formatDate } from "@/lib/utils/date"
import { SearchHighlight, TagHighlight } from "./search-highlight"
import { MemoDetailModal } from "./memo-detail-modal"
import { useState } from "react"

type Memo = Database['public']['Tables']['memos']['Row']

interface MemoCardProps {
  memo: Memo
  onEdit?: (memo: Memo) => void
  onDelete?: (memo: Memo) => void
  onView?: (memo: Memo) => void
  searchQuery?: string  // 検索クエリ
  searchHighlights?: Array<{
    field: string
    positions: Array<{ start: number; end: number; score: number }>
  }>  // ハイライト情報
  similarity?: number  // 類似度スコア
  matchedFields?: string[]  // マッチしたフィールド
}

export function MemoCard({ 
  memo, 
  onEdit, 
  onDelete, 
  onView,
  searchQuery = '',
  searchHighlights = [],
  similarity,
  matchedFields = []
}: MemoCardProps) {
  const [showRelated, setShowRelated] = useState(false)

  const handleViewRelated = () => {
    setShowRelated(!showRelated)
    onView?.(memo)
  }

  // 検索マッチ情報を表示するかどうか
  const showSearchInfo = searchQuery && (similarity !== undefined || matchedFields.length > 0)

  return (
    <MemoDetailModal
      memo={memo}
      onEdit={onEdit}
      onDelete={onDelete}
      searchQuery={searchQuery}
      searchHighlights={searchHighlights}
      similarity={similarity}
      matchedFields={matchedFields}
    >
      <Card className={`memo-card hover:shadow-lg cursor-pointer ${showSearchInfo ? 'ring-1 ring-blue-200 dark:ring-blue-800' : ''}`}>
        <CardHeader className="memo-header pb-3">
        <div className="flex items-start justify-between h-full">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {memo.category && (
                <SearchHighlight 
                  text={memo.category}
                  searchQuery={searchQuery}
                  className="inline-block"
                >
                  <Badge variant="secondary" className="text-xs">
                    {memo.category}
                  </Badge>
                </SearchHighlight>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDate(memo.created_at)}
              </span>
              {showSearchInfo && (
                <div className="flex items-center gap-2">
                  {similarity !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {Math.round(similarity * 100)}%
                    </Badge>
                  )}
                  {matchedFields.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {matchedFields.join(', ')}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            {memo.tags.length > 0 && (
              <TagHighlight
                tags={memo.tags}
                searchQuery={searchQuery}
                className="flex flex-wrap gap-1"
              />
            )}
          </div>
          <div className="flex items-start gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                handleViewRelated()
              }}
              className="h-8 w-8"
              title="View related memos"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.(memo)
              }}
              className="h-8 w-8"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                onDelete?.(memo)
              }}
              className="h-8 w-8 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="memo-content p-4">
        <div className="memo-content-body">
          {searchQuery ? (
            // 検索モードの場合：ハイライト付きでスニペット表示
            <div className="space-y-2">
              <SearchHighlight
                text={memo.content}
                searchQuery={searchQuery}
                showSnippets={true}
                snippetLength={200}
                maxSnippets={2}
                className="text-sm leading-relaxed search-highlight"
                highlightClassName="bg-yellow-200 dark:bg-yellow-800 px-1 rounded font-medium"
              />
              {memo.keywords && memo.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-xs text-muted-foreground">キーワード:</span>
                  {memo.keywords.slice(0, 4).map((keyword, index) => (
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
                  {memo.keywords.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{memo.keywords.length - 4}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ) : (
            // 通常モード：Markdownレンダリング
            <div className="prose prose-sm max-w-none text-sm leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2">{children}</p>,
                  h1: ({ children }) => <h1 className="text-lg font-semibold mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>,
                  pre: ({ children }) => <pre className="bg-muted p-2 rounded text-xs overflow-x-auto max-h-16">{children}</pre>,
                }}
              >
                {memo.content_markdown.slice(0, 400) + (memo.content_markdown.length > 400 ? '...' : '')}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </CardContent>
      
      {/* フッター部分 - 常に下部に固定 */}
      <div className="memo-footer p-4 pt-0 space-y-2">
        {memo.summary && (
          <div className="p-2 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground font-medium mb-1">AI 要約:</p>
            {searchQuery ? (
              <SearchHighlight
                text={memo.summary}
                searchQuery={searchQuery}
                className="text-sm line-clamp-2"
                highlightClassName="bg-yellow-200 dark:bg-yellow-800 px-1 rounded font-medium"
              />
            ) : (
              <p className="text-sm line-clamp-2">{memo.summary}</p>
            )}
          </div>
        )}
        
        {/* メモ統計 */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {memo.view_count > 0 && (
              <span>{memo.view_count} views</span>
            )}
            <span>{memo.content.length} chars</span>
          </div>
          {memo.processed_at && (
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>AI処理済み</span>
            </div>
          )}
        </div>
      </div>
      </Card>
    </MemoDetailModal>
  )
}