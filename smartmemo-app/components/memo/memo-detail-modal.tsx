'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Eye, Edit, Trash2, Sparkles, Calendar, FileText, Tag, Folder, Clock, BarChart3 } from "lucide-react"
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
  searchHighlights: _searchHighlights,
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
      <DialogContent className="max-w-3xl max-h-[85vh] w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-semibold mb-4">
                メモ詳細
              </DialogTitle>
              
              {/* メタデータ */}
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {formatDate(memo.created_at)}
                  </span>
                </div>
                
                {memo.category && (
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <SearchHighlight
                      text={memo.category}
                      searchQuery={searchQuery}
                      className="inline-block"
                    >
                      <Badge variant="secondary">
                        {memo.category}
                      </Badge>
                    </SearchHighlight>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {stats.characters} 文字
                  </span>
                </div>
                
                {memo.view_count > 0 && (
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {memo.view_count} 回表示
                    </span>
                  </div>
                )}
              </div>
              
              {/* 検索マッチ情報 */}
              {showSearchInfo && (
                <div className="flex items-center gap-2 mb-4">
                  {similarity !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {Math.round(similarity * 100)}% 一致
                    </Badge>
                  )}
                  {matchedFields.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      マッチフィールド: {matchedFields.join(', ')}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            {/* アクションボタン */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRelated(!showRelated)}
              >
                <Eye className="h-4 w-4 mr-2" />
                関連メモ
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit?.(memo)}
              >
                <Edit className="h-4 w-4 mr-2" />
                編集
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete?.(memo)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                削除
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <Separator />
        
        <ScrollArea className="flex-1 px-6 py-6">
          <div className="space-y-6">
            {/* タグ */}
            {memo.tags.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">タグ</h3>
                </div>
                <TagHighlight
                  tags={memo.tags}
                  searchQuery={searchQuery}
                  className="flex flex-wrap gap-2"
                  showAllTags={true}
                />
              </div>
            )}
            
            {/* AI要約 */}
            {memo.summary && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">AI要約</h3>
                </div>
                <Card>
                  <CardContent className="p-4">
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
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* キーワード */}
            {memo.keywords && memo.keywords.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">キーワード</h3>
                </div>
                <div className="flex flex-wrap gap-2">
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
            
            {/* メモ本文 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">内容</h3>
              </div>
              <Card>
                <CardContent className="p-6">
                  {searchQuery ? (
                    <SearchHighlight
                      text={memo.content}
                      searchQuery={searchQuery}
                      className="prose prose-sm max-w-none"
                      highlightClassName="bg-yellow-200 dark:bg-yellow-800 px-1 rounded font-medium"
                    />
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
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
                </CardContent>
              </Card>
            </div>
            
            {/* 統計情報 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">統計</h3>
              </div>
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{stats.characters}</div>
                      <div className="text-xs text-muted-foreground">文字</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{stats.words}</div>
                      <div className="text-xs text-muted-foreground">単語</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{stats.lines}</div>
                      <div className="text-xs text-muted-foreground">行</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{stats.paragraphs}</div>
                      <div className="text-xs text-muted-foreground">段落</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">作成日時</span>
                      </div>
                      <span>{formatDate(memo.created_at)}</span>
                    </div>
                    
                    {memo.updated_at !== memo.created_at && (
                      <div className="flex items-center justify-between text-sm mt-2">
                        <div className="flex items-center gap-2">
                          <Edit className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">更新日時</span>
                        </div>
                        <span>{formatDate(memo.updated_at)}</span>
                      </div>
                    )}
                    
                    {memo.processed_at && (
                      <div className="flex items-center justify-between text-sm mt-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">AI処理日時</span>
                        </div>
                        <span>{formatDate(memo.processed_at)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>
        
        {/* 関連メモ */}
        {showRelated && memo.embedding && memo.embedding.length > 0 && (
          <div className="border-t p-6">
            <RelatedMemos 
              memoId={memo.id} 
              onMemoClick={(relatedMemoId) => {
                // Handle navigation to related memo
                console.log('Navigate to memo:', relatedMemoId)
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}