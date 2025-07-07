'use server'

import { createClient } from '@/lib/supabase/server'
import { findSimilarMemos } from '@/lib/ai/openai'
import { redirect } from 'next/navigation'

export async function getRelatedMemos(memoId: string, limit: number = 5) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    // Get the source memo with its embedding
    const { data: sourceMemo, error: memoError } = await supabase
      .from('memos')
      .select('embedding')
      .eq('id', memoId)
      .eq('user_id', user.id)
      .single()

    if (memoError || !sourceMemo) {
      console.error('Error fetching source memo:', memoError)
      return []
    }

    // If no embedding, return empty array
    if (!sourceMemo.embedding || sourceMemo.embedding.length === 0) {
      return []
    }

    // Find similar memos
    const relatedMemos = await findSimilarMemos(
      sourceMemo.embedding,
      user.id,
      memoId, // Exclude the source memo
      limit,
      0.6 // Lower threshold for more related memos
    )

    return relatedMemos
  } catch (error) {
    console.error('Error getting related memos:', error)
    return []
  }
}

export async function updateMemoViewCount(memoId: string) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return
    }

    await supabase
      .from('memos')
      .update({ view_count: 'view_count + 1' })
      .eq('id', memoId)
      .eq('user_id', user.id)
  } catch (error) {
    console.error('Error updating view count:', error)
  }
}

export async function updateMemoRelatedClickCount(memoId: string) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return
    }

    await supabase
      .rpc('increment_related_click_count', { memo_id: memoId })
  } catch (error) {
    console.error('Error updating related click count:', error)
  }
}