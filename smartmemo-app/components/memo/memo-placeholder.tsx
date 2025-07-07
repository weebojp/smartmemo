'use client'

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Sparkles } from "lucide-react"

interface MemoPlaceholderProps {
  onCreateMemo?: () => void
  variant?: 'empty' | 'loading' | 'skeleton'
  count?: number
}

export function MemoPlaceholder({ 
  onCreateMemo, 
  variant = 'empty',
  count = 6 
}: MemoPlaceholderProps) {
  if (variant === 'loading' || variant === 'skeleton') {
    return (
      <>
        {Array.from({ length: count }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </>
    )
  }

  return (
    <Card className="memo-card hover:shadow-lg transition-all duration-200 h-full flex flex-col border-dashed border-2 hover:border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              新しいメモを作成
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="text-xs text-muted-foreground max-w-[200px]">
              アイデアや学習内容を記録して、AIが自動的にタグ付けと要約を行います
            </div>
            
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              <span>AI による自動分析</span>
            </div>
          </div>
        </div>
        
        <div className="mt-auto pt-3">
          <Button 
            onClick={onCreateMemo}
            className="w-full"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            メモを作成
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SkeletonCard() {
  return (
    <Card className="h-full flex flex-col animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-16 bg-muted rounded"></div>
              <div className="h-3 w-20 bg-muted rounded"></div>
            </div>
            <div className="flex gap-1">
              <div className="h-5 w-12 bg-muted rounded-full"></div>
              <div className="h-5 w-16 bg-muted rounded-full"></div>
              <div className="h-5 w-10 bg-muted rounded-full"></div>
            </div>
          </div>
          <div className="flex gap-1">
            <div className="h-8 w-8 bg-muted rounded"></div>
            <div className="h-8 w-8 bg-muted rounded"></div>
            <div className="h-8 w-8 bg-muted rounded"></div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-full bg-muted rounded"></div>
          <div className="h-4 w-3/4 bg-muted rounded"></div>
          <div className="h-4 w-5/6 bg-muted rounded"></div>
          <div className="h-4 w-2/3 bg-muted rounded"></div>
        </div>
        
        <div className="mt-auto pt-3 space-y-2">
          <div className="h-12 w-full bg-muted rounded"></div>
          <div className="flex justify-between">
            <div className="h-3 w-16 bg-muted rounded"></div>
            <div className="h-3 w-20 bg-muted rounded"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function EmptyState({ onCreateMemo }: { onCreateMemo?: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
        <Sparkles className="h-12 w-12 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">
        まだメモがありません
      </h3>
      
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        最初のメモを作成して、AIによる自動タグ付けや要約機能を体験してみましょう。
        知識の整理と発見が簡単になります。
      </p>
      
      <Button onClick={onCreateMemo} size="lg">
        <Plus className="h-5 w-5 mr-2" />
        最初のメモを作成
      </Button>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
        <div className="text-center p-4">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
          </div>
          <h4 className="font-medium text-sm mb-1">AI自動分析</h4>
          <p className="text-xs text-muted-foreground">
            タグ付けと要約を自動生成
          </p>
        </div>
        
        <div className="text-center p-4">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-2">
            <div className="w-3 h-3 rounded-full bg-green-600"></div>
          </div>
          <h4 className="font-medium text-sm mb-1">知識グラフ</h4>
          <p className="text-xs text-muted-foreground">
            関連するメモを自動発見
          </p>
        </div>
        
        <div className="text-center p-4">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-2">
            <div className="w-4 h-4 rounded bg-purple-600"></div>
          </div>
          <h4 className="font-medium text-sm mb-1">高度な検索</h4>
          <p className="text-xs text-muted-foreground">
            意味理解とファジー検索
          </p>
        </div>
      </div>
    </div>
  )
}