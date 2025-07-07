'use server'

import { createClient } from '@/lib/supabase/server'
import { processContent } from '@/lib/ai/openai'

export async function processAndUpdateMemo(memoId: string) {
  try {
    const supabase = await createClient()
    
    // Get the memo
    const { data: memo, error: fetchError } = await supabase
      .from('memos')
      .select('*')
      .eq('id', memoId)
      .single()

    if (fetchError || !memo) {
      throw new Error('Memo not found')
    }

    // Process content with AI
    const aiResult = await processContent(memo.content)

    // Update memo with AI results
    const { error: updateError } = await supabase
      .from('memos')
      .update({
        tags: aiResult.tags,
        category: aiResult.category,
        summary: aiResult.summary,
        keywords: aiResult.keywords,
        embedding: aiResult.embedding,
        processed_at: new Date().toISOString(),
      })
      .eq('id', memoId)

    if (updateError) {
      throw new Error(updateError.message)
    }

    return { success: true }
  } catch (error) {
    console.error('Error processing memo:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}