'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ImportResult } from '@/lib/import/import-parser'
import { processAndUpdateMemo } from '@/lib/actions/ai'

// インポートスキーマ定義
const ImportMemosSchema = z.object({
  memos: z.array(z.object({
    title: z.string().optional(),
    content: z.string(),
    tags: z.array(z.string()),
    category: z.string().optional(),
    createdAt: z.string().optional(), // ISO string
    metadata: z.record(z.any()).optional()
  })),
  options: z.object({
    preserveTimestamps: z.boolean(),
    overwriteExisting: z.boolean(),
    processWithAI: z.boolean(),
    defaultCategory: z.string().optional(),
    tagPrefix: z.string().optional()
  })
})

// メモのインポート実行
export async function importMemos(data: z.infer<typeof ImportMemosSchema>): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')

  const validated = ImportMemosSchema.parse(data)
  const { memos, options } = validated

  const result: ImportResult = {
    success: true,
    imported: 0,
    skipped: 0,
    errors: []
  }

  try {
    for (let i = 0; i < memos.length; i++) {
      const memo = memos[i]
      
      try {
        // メモの基本データを準備
        const memoData = {
          user_id: user.id,
          content: memo.content,
          content_markdown: memo.content, // 後でAI処理で更新される
          source: 'import',
          source_url: null,
          source_title: memo.title || null,
          view_count: 0,
          tags: options.tagPrefix 
            ? memo.tags.map(tag => `${options.tagPrefix}${tag}`)
            : memo.tags,
          category: memo.category || options.defaultCategory || '一般',
          summary: null,
          keywords: [],
          processed_at: null,
          embedding: null,
          created_at: options.preserveTimestamps && memo.createdAt 
            ? memo.createdAt 
            : new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // 既存メモの重複チェック（タイトルまたはコンテンツの最初の100文字で判定）
        if (options.overwriteExisting) {
          const contentPrefix = memo.content.slice(0, 100)
          const { data: existingMemos } = await supabase
            .from('memos')
            .select('id')
            .eq('user_id', user.id)
            .or(`source_title.eq.${memo.title},content.ilike.${contentPrefix}%`)
            .limit(1)

          if (existingMemos && existingMemos.length > 0) {
            // 既存メモを更新
            const { error: updateError } = await supabase
              .from('memos')
              .update(memoData)
              .eq('id', existingMemos[0].id)

            if (updateError) {
              result.errors.push({
                line: i + 1,
                message: `更新エラー: ${updateError.message}`,
                data: memo
              })
              continue
            }

            // AI処理を実行
            if (options.processWithAI) {
              try {
                await processAndUpdateMemo(existingMemos[0].id)
              } catch (aiError) {
                console.warn(`AI processing failed for updated memo ${existingMemos[0].id}:`, aiError)
              }
            }

            result.imported++
            continue
          }
        } else {
          // 重複チェックのみ
          const contentPrefix = memo.content.slice(0, 100)
          const { data: existingMemos } = await supabase
            .from('memos')
            .select('id')
            .eq('user_id', user.id)
            .or(`source_title.eq.${memo.title},content.ilike.${contentPrefix}%`)
            .limit(1)

          if (existingMemos && existingMemos.length > 0) {
            result.skipped++
            continue
          }
        }

        // 新規メモを作成
        const { data: insertedMemo, error: insertError } = await supabase
          .from('memos')
          .insert(memoData)
          .select('id')
          .single()

        if (insertError) {
          result.errors.push({
            line: i + 1,
            message: `挿入エラー: ${insertError.message}`,
            data: memo
          })
          continue
        }

        // AI処理を実行
        if (options.processWithAI && insertedMemo) {
          try {
            await processAndUpdateMemo(insertedMemo.id)
          } catch (aiError) {
            console.warn(`AI processing failed for memo ${insertedMemo.id}:`, aiError)
          }
        }

        result.imported++

      } catch (error) {
        result.errors.push({
          line: i + 1,
          message: error instanceof Error ? error.message : '不明なエラー',
          data: memo
        })
      }
    }

    // エラーが多すぎる場合は失敗とみなす
    if (result.errors.length > memos.length / 2) {
      result.success = false
    }

    revalidatePath('/')
    return result

  } catch (error) {
    console.error('Import memos error:', error)
    return {
      success: false,
      imported: result.imported,
      skipped: result.skipped,
      errors: [
        ...result.errors,
        {
          message: error instanceof Error ? error.message : '不明なエラーが発生しました'
        }
      ]
    }
  }
}

// インポート用のプレビュー処理（実際にDBに保存せずに結果を返す）
export async function previewImport(data: z.infer<typeof ImportMemosSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')

  const validated = ImportMemosSchema.parse(data)
  const { memos, options } = validated

  try {
    const preview = memos.slice(0, 10).map((memo, index) => ({
      index: index + 1,
      title: memo.title || memo.content.split('\n')[0].slice(0, 50),
      content: memo.content.slice(0, 200),
      tags: options.tagPrefix 
        ? memo.tags.map(tag => `${options.tagPrefix}${tag}`)
        : memo.tags,
      category: memo.category || options.defaultCategory || '一般',
      createdAt: options.preserveTimestamps && memo.createdAt 
        ? memo.createdAt 
        : new Date().toISOString(),
      willProcessWithAI: options.processWithAI
    }))

    // 重複チェックの結果も含める
    const duplicateChecks = await Promise.all(
      preview.map(async (previewMemo) => {
        const contentPrefix = previewMemo.content.slice(0, 100)
        const { data: existingMemos } = await supabase
          .from('memos')
          .select('id, content')
          .eq('user_id', user.id)
          .or(`source_title.eq.${previewMemo.title},content.ilike.${contentPrefix}%`)
          .limit(1)

        return {
          ...previewMemo,
          hasDuplicate: existingMemos && existingMemos.length > 0
        }
      })
    )

    return {
      success: true,
      preview: duplicateChecks,
      totalMemos: memos.length,
      estimatedDuplicates: duplicateChecks.filter(p => p.hasDuplicate).length
    }

  } catch (error) {
    console.error('Preview import error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラーが発生しました'
    }
  }
}

// 既存メモとの重複チェック
export async function checkDuplicates(content: string, title?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')

  try {
    const contentPrefix = content.slice(0, 100)
    const { data: duplicates, error } = await supabase
      .from('memos')
      .select('id, content, source_title, created_at')
      .eq('user_id', user.id)
      .or(`source_title.eq.${title},content.ilike.${contentPrefix}%`)
      .limit(5)

    if (error) {
      throw new Error(`重複チェックエラー: ${error.message}`)
    }

    return {
      success: true,
      duplicates: duplicates || [],
      hasDuplicates: duplicates && duplicates.length > 0
    }

  } catch (error) {
    console.error('Check duplicates error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラーが発生しました'
    }
  }
}