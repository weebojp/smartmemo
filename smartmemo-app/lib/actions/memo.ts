'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { processAndUpdateMemo } from './ai'

const createMemoSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  contentMarkdown: z.string().min(1, 'Content is required'),
  source: z.enum(['manual', 'web', 'api']).default('manual'),
  sourceUrl: z.string().optional(),
  sourceTitle: z.string().optional(),
})

export async function createMemo(data: z.infer<typeof createMemoSchema>) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const validatedData = createMemoSchema.parse(data)
  
  const { data: newMemo, error } = await supabase
    .from('memos')
    .insert({
      user_id: user.id,
      content: validatedData.content,
      content_markdown: validatedData.contentMarkdown,
      source: validatedData.source,
      source_url: validatedData.sourceUrl,
      source_title: validatedData.sourceTitle,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // Process memo with AI in background
  if (newMemo) {
    processAndUpdateMemo(newMemo.id)
      .then(result => {
        if (!result.success) {
          console.error('AI processing failed:', result.error)
        } else {
          console.log('AI processing completed successfully for memo:', newMemo.id)
        }
      })
      .catch(error => {
        console.error('AI processing error:', error)
      })
  }

  revalidatePath('/memos')
}

export async function getMemos() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data, error } = await supabase
    .from('memos')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

const updateMemoSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1, 'Content is required'),
  contentMarkdown: z.string().min(1, 'Content is required'),
})

export async function updateMemo(data: z.infer<typeof updateMemoSchema>) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const validatedData = updateMemoSchema.parse(data)
  
  const { error } = await supabase
    .from('memos')
    .update({
      content: validatedData.content,
      content_markdown: validatedData.contentMarkdown,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validatedData.id)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }

  // Re-process with AI if content changed significantly
  processAndUpdateMemo(validatedData.id).catch(console.error)

  revalidatePath('/memos')
}

export async function deleteMemo(id: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get memo data before deletion (for undo feature)
  const { data: memoToDelete } = await supabase
    .from('memos')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  const { error } = await supabase
    .from('memos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
  
  return memoToDelete
}

// Permanently delete memo (bypasses undo)
export async function permanentlyDeleteMemo(id: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('memos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
}

export async function incrementViewCount(id: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  await supabase.rpc('increment_view_count', { memo_id: id })
}

export async function incrementRelatedClickCount(id: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  await supabase.rpc('increment_related_click_count', { memo_id: id })
}

// 手動でAI処理を再実行する関数
export async function reprocessMemoWithAI(memoId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // メモの所有者確認
  const { data: memo, error } = await supabase
    .from('memos')
    .select('id')
    .eq('id', memoId)
    .eq('user_id', user.id)
    .single()

  if (error || !memo) {
    throw new Error('Memo not found or access denied')
  }

  // AI処理を実行
  const result = await processAndUpdateMemo(memoId)
  
  revalidatePath('/')
  
  return result
}