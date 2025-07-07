'use client'

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, Edit, Trash2 } from "lucide-react"
import { Database } from "@/types/database"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { formatDate } from "@/lib/utils/date"
import { RelatedMemos } from "./related-memos"
import { useState } from "react"

type Memo = Database['public']['Tables']['memos']['Row']

interface MemoCardProps {
  memo: Memo
  onEdit?: (memo: Memo) => void
  onDelete?: (memo: Memo) => void
  onView?: (memo: Memo) => void
}

export function MemoCard({ memo, onEdit, onDelete, onView }: MemoCardProps) {
  const [showRelated, setShowRelated] = useState(false)

  const handleViewRelated = () => {
    setShowRelated(!showRelated)
    onView?.(memo)
  }

  return (
    <div className="space-y-4">
      <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {memo.category && (
                <Badge variant="secondary" className="text-xs">
                  {memo.category}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDate(memo.created_at)}
              </span>
            </div>
            {memo.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {memo.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleViewRelated}
              className="h-8 w-8"
              title="View related memos"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit?.(memo)}
              className="h-8 w-8"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete?.(memo)}
              className="h-8 w-8 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none text-sm leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Override default paragraph styling
              p: ({ children }) => <p className="mb-2">{children}</p>,
              // Override other elements as needed
              h1: ({ children }) => <h1 className="text-lg font-semibold mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>,
              pre: ({ children }) => <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">{children}</pre>,
            }}
          >
            {memo.content_markdown.slice(0, 200) + (memo.content_markdown.length > 200 ? '...' : '')}
          </ReactMarkdown>
        </div>
        {memo.summary && (
          <div className="mt-3 p-2 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground font-medium">AI Summary:</p>
            <p className="text-sm">{memo.summary}</p>
          </div>
        )}
      </CardContent>
      </Card>

      {/* Related Memos Section */}
      {showRelated && memo.embedding && memo.embedding.length > 0 && (
        <RelatedMemos 
          memoId={memo.id} 
          onMemoClick={(relatedMemoId) => {
            // Handle navigation to related memo
            console.log('Navigate to memo:', relatedMemoId)
          }}
        />
      )}
    </div>
  )
}