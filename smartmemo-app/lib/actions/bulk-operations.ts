'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { exportToMarkdown, exportToJSON, ExportOptions } from '@/lib/export/export-formats'

// バルク操作のスキーマ定義
const BulkDeleteSchema = z.object({
  memoIds: z.array(z.string().uuid()).min(1)
})

const BulkAddTagsSchema = z.object({
  memoIds: z.array(z.string().uuid()).min(1),
  tags: z.array(z.string().min(1)).min(1)
})

const BulkChangeCategorySchema = z.object({
  memoIds: z.array(z.string().uuid()).min(1),
  category: z.string().min(1)
})

const BulkExportSchema = z.object({
  memoIds: z.array(z.string().uuid()).min(1),
  format: z.enum(['markdown', 'json', 'csv'])
})

// バルク削除（Undo機能と連携）
export async function bulkDeleteMemos(data: z.infer<typeof BulkDeleteSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')

  const validated = BulkDeleteSchema.parse(data)
  
  try {
    // 削除対象のメモを取得（Undo用）
    const { data: memosToDelete, error: fetchError } = await supabase
      .from('memos')
      .select('*')
      .in('id', validated.memoIds)
      .eq('user_id', user.id)

    if (fetchError) {
      throw new Error(`Failed to fetch memos: ${fetchError.message}`)
    }

    // 削除実行
    const { error } = await supabase
      .from('memos')
      .delete()
      .in('id', validated.memoIds)
      .eq('user_id', user.id)

    if (error) {
      throw new Error(`Failed to delete memos: ${error.message}`)
    }

    revalidatePath('/')
    
    return {
      success: true,
      deletedCount: validated.memoIds.length,
      deletedMemos: memosToDelete || []
    }
  } catch (error) {
    console.error('Bulk delete error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// バルクタグ追加
export async function bulkAddTags(data: z.infer<typeof BulkAddTagsSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')

  const validated = BulkAddTagsSchema.parse(data)
  
  try {
    // 既存のタグを取得
    const { data: existingMemos, error: fetchError } = await supabase
      .from('memos')
      .select('id, tags')
      .in('id', validated.memoIds)
      .eq('user_id', user.id)

    if (fetchError) {
      throw new Error(`Failed to fetch existing tags: ${fetchError.message}`)
    }

    // 各メモのタグを更新
    const updates = existingMemos?.map(memo => {
      const existingTags = memo.tags || []
      const newTags = [...new Set([...existingTags, ...validated.tags])]
      
      return supabase
        .from('memos')
        .update({ 
          tags: newTags,
          updated_at: new Date().toISOString()
        })
        .eq('id', memo.id)
        .eq('user_id', user.id)
    })

    if (updates) {
      await Promise.all(updates)
    }

    revalidatePath('/')
    
    return {
      success: true,
      updatedCount: validated.memoIds.length,
      addedTags: validated.tags
    }
  } catch (error) {
    console.error('Bulk add tags error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// バルクカテゴリ変更
export async function bulkChangeCategory(data: z.infer<typeof BulkChangeCategorySchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')

  const validated = BulkChangeCategorySchema.parse(data)
  
  try {
    const { error } = await supabase
      .from('memos')
      .update({ 
        category: validated.category,
        updated_at: new Date().toISOString()
      })
      .in('id', validated.memoIds)
      .eq('user_id', user.id)

    if (error) {
      throw new Error(`Failed to update category: ${error.message}`)
    }

    revalidatePath('/')
    
    return {
      success: true,
      updatedCount: validated.memoIds.length,
      newCategory: validated.category
    }
  } catch (error) {
    console.error('Bulk change category error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// バルクエクスポート
export async function bulkExportMemos(data: z.infer<typeof BulkExportSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')

  const validated = BulkExportSchema.parse(data)
  
  try {
    // エクスポート対象のメモを取得
    const { data: memos, error: fetchError } = await supabase
      .from('memos')
      .select('*')
      .in('id', validated.memoIds)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      throw new Error(`Failed to fetch memos: ${fetchError.message}`)
    }

    if (!memos || memos.length === 0) {
      throw new Error('No memos found for export')
    }

    // エクスポート形式に応じて処理
    const exportOptions: ExportOptions = {
      format: validated.format,
      includeMetadata: true,
      includeAIGenerated: true,
      groupBy: 'none'
    }

    let exportResult

    switch (validated.format) {
      case 'markdown':
        exportResult = exportToMarkdown(memos, exportOptions)
        break
      case 'json':
        exportResult = exportToJSON(memos, exportOptions)
        break
      default:
        throw new Error(`Unsupported export format: ${validated.format}`)
    }

    return {
      success: true,
      exportResult,
      exportedCount: memos.length
    }
  } catch (error) {
    console.error('Bulk export error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// バルク統計取得（選択されたメモの統計情報）
export async function getBulkStatistics(memoIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')

  try {
    const { data: memos, error } = await supabase
      .from('memos')
      .select('tags, category, content, created_at, view_count, processed_at')
      .in('id', memoIds)
      .eq('user_id', user.id)

    if (error) {
      throw new Error(`Failed to fetch memo statistics: ${error.message}`)
    }

    if (!memos) {
      return {
        success: false,
        error: 'No memos found'
      }
    }

    // 統計計算
    const totalMemos = memos.length
    const totalCharacters = memos.reduce((sum, memo) => sum + memo.content.length, 0)
    const totalTags = new Set(memos.flatMap(memo => memo.tags || [])).size
    const categories = new Set(memos.map(memo => memo.category).filter(Boolean)).size
    const aiProcessedCount = memos.filter(memo => memo.processed_at).length
    const totalViews = memos.reduce((sum, memo) => sum + (memo.view_count || 0), 0)

    // 作成日の範囲
    const dates = memos.map(memo => new Date(memo.created_at))
    const oldestDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const newestDate = new Date(Math.max(...dates.map(d => d.getTime())))

    // 人気タグ（上位5個）
    const tagCounts = memos
      .flatMap(memo => memo.tags || [])
      .reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    const popularTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count: count as number }))

    return {
      success: true,
      statistics: {
        totalMemos,
        totalCharacters,
        averageCharacters: Math.round(totalCharacters / totalMemos),
        totalTags,
        categories,
        aiProcessedCount,
        aiProcessedPercentage: Math.round((aiProcessedCount / totalMemos) * 100),
        totalViews,
        averageViews: Math.round(totalViews / totalMemos),
        dateRange: {
          oldest: oldestDate.toISOString(),
          newest: newestDate.toISOString()
        },
        popularTags
      }
    }
  } catch (error) {
    console.error('Get bulk statistics error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Undo操作用のメモ復元
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function restoreDeletedMemos(deletedMemos: any[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')

  try {
    // 削除されたメモを復元
    const { error } = await supabase
      .from('memos')
      .insert(
        deletedMemos.map(memo => ({
          ...memo,
          user_id: user.id, // 確実にユーザーIDを設定
          created_at: memo.created_at,
          updated_at: new Date().toISOString()
        }))
      )

    if (error) {
      throw new Error(`Failed to restore memos: ${error.message}`)
    }

    revalidatePath('/')
    
    return {
      success: true,
      restoredCount: deletedMemos.length
    }
  } catch (error) {
    console.error('Restore deleted memos error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}