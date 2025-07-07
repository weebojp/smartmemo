'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Tags, Brain, Network } from 'lucide-react'
import { Database } from '@/types/database'

type Memo = Database['public']['Tables']['memos']['Row']

interface MemoStatsProps {
  memos: Memo[]
}

export function MemoStats({ memos }: MemoStatsProps) {
  // Calculate statistics
  const totalMemos = memos.length
  const processedMemos = memos.filter(m => m.processed_at).length
  const memosWithEmbeddings = memos.filter(m => m.embedding && m.embedding.length > 0).length
  
  // Get all unique tags and categories
  const allTags = new Set<string>()
  const allCategories = new Set<string>()
  
  memos.forEach(memo => {
    memo.tags?.forEach(tag => allTags.add(tag))
    if (memo.category) allCategories.add(memo.category)
  })

  // Calculate total views and related clicks
  const totalViews = memos.reduce((sum, memo) => sum + (memo.view_count || 0), 0)
  const totalRelatedClicks = memos.reduce((sum, memo) => sum + (memo.related_click_count || 0), 0)

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Memos</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalMemos}</div>
          <p className="text-xs text-muted-foreground">
            {processedMemos} AI processed
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Knowledge Graph</CardTitle>
          <Network className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{memosWithEmbeddings}</div>
          <p className="text-xs text-muted-foreground">
            Connected nodes
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tags</CardTitle>
          <Tags className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{allTags.size}</div>
          <p className="text-xs text-muted-foreground">
            {allCategories.size} categories
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Engagement</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalViews}</div>
          <p className="text-xs text-muted-foreground">
            {totalRelatedClicks} related clicks
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function PopularTags({ memos }: { memos: Memo[] }) {
  // Count tag frequency
  const tagCounts = new Map<string, number>()
  
  memos.forEach(memo => {
    memo.tags?.forEach(tag => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    })
  })

  // Get top 10 most popular tags
  const popularTags = Array.from(tagCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  if (popularTags.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Tags className="h-4 w-4" />
          Popular Tags
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {popularTags.map(([tag, count]) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag} ({count})
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}