'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LinkIcon, Eye } from 'lucide-react'
import { getRelatedMemos, updateMemoRelatedClickCount } from '@/lib/actions/related'
import { formatDate } from '@/lib/utils/date'

interface RelatedMemo {
  id: string
  content: string
  content_markdown: string
  tags: string[]
  category: string | null
  summary: string | null
  created_at: string
  similarity: number
}

interface RelatedMemosProps {
  memoId: string
  onMemoClick?: (memoId: string) => void
}

export function RelatedMemos({ memoId, onMemoClick }: RelatedMemosProps) {
  const [relatedMemos, setRelatedMemos] = useState<RelatedMemo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadRelatedMemos = async () => {
      try {
        const related = await getRelatedMemos(memoId, 3) // Limit to top 3
        setRelatedMemos(related as RelatedMemo[])
      } catch (error) {
        console.error('Error loading related memos:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (memoId) {
      loadRelatedMemos()
    }
  }, [memoId])

  const handleMemoClick = async (relatedMemoId: string) => {
    // Track click analytics
    await updateMemoRelatedClickCount(memoId)
    onMemoClick?.(relatedMemoId)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <LinkIcon className="h-4 w-4" />
            関連メモ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (relatedMemos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <LinkIcon className="h-4 w-4" />
            関連メモ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            関連するメモが見つかりませんでした。もっとメモを作成すると、つながりが見えてきます！
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <LinkIcon className="h-4 w-4" />
          Related Memos ({relatedMemos.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {relatedMemos.map((memo) => (
          <div
            key={memo.id}
            className="p-3 rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer"
            onClick={() => handleMemoClick(memo.id)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {memo.category && (
                  <Badge variant="secondary" className="text-xs">
                    {memo.category}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {Math.round(memo.similarity * 100)}% similar
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDate(memo.created_at)}
              </span>
            </div>
            
            <p className="text-sm line-clamp-2 mb-2">
              {memo.content.slice(0, 100)}
              {memo.content.length > 100 && '...'}
            </p>
            
            {memo.summary && (
              <p className="text-xs text-muted-foreground italic line-clamp-1">
                {memo.summary}
              </p>
            )}
            
            {memo.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {memo.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {memo.tags.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{memo.tags.length - 3} more
                  </span>
                )}
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 h-8 text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              メモを見る
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}