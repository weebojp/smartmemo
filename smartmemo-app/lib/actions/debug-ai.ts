'use server'

import { createClient } from '@/lib/supabase/server'
import { processContent } from '@/lib/ai/openai'

// AI機能のデバッグ用アクション
export async function testAIFunctionality() {
  console.log('=== AI Functionality Debug Test ===')
  
  try {
    // 1. 環境変数チェック
    console.log('1. Environment Variables Check:')
    console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY)
    console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length || 0)
    
    // 2. テストコンテンツでAI処理
    const testContent = `今日はNext.jsとSupabaseを使ってWebアプリケーションを開発しました。
    リアルタイムデータベース機能とユーザー認証を実装しています。
    TypeScriptとTailwind CSSも活用して、モダンなUIを構築中です。`
    
    console.log('2. Testing AI processing with content:', testContent.substring(0, 50) + '...')
    
    const aiResult = await processContent(testContent)
    
    console.log('3. AI Processing Result:')
    console.log('Tags:', aiResult.tags)
    console.log('Category:', aiResult.category)
    console.log('Summary:', aiResult.summary)
    console.log('Keywords:', aiResult.keywords)
    console.log('Embedding length:', aiResult.embedding.length)
    
    // 4. データベース接続テスト
    console.log('4. Database Connection Test:')
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    console.log('User authenticated:', !!user)
    console.log('User ID:', user?.id)
    
    if (user) {
      // 5. メモ作成テスト
      console.log('5. Creating test memo:')
      const { data: testMemo, error: createError } = await supabase
        .from('memos')
        .insert({
          user_id: user.id,
          content: testContent,
          content_markdown: testContent,
        })
        .select()
        .single()
      
      if (createError) {
        console.error('Error creating test memo:', createError)
        return { success: false, error: createError.message }
      }
      
      console.log('Test memo created:', testMemo.id)
      
      // 6. AI処理結果でメモを更新
      console.log('6. Updating memo with AI results:')
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
        .eq('id', testMemo.id)
      
      if (updateError) {
        console.error('Error updating memo with AI results:', updateError)
        return { success: false, error: updateError.message }
      }
      
      console.log('Memo updated successfully with AI results')
      
      // 7. 更新されたメモを確認
      const { data: updatedMemo, error: fetchError } = await supabase
        .from('memos')
        .select('*')
        .eq('id', testMemo.id)
        .single()
      
      if (fetchError) {
        console.error('Error fetching updated memo:', fetchError)
      } else {
        console.log('7. Updated memo verification:')
        console.log('Tags in DB:', updatedMemo.tags)
        console.log('Category in DB:', updatedMemo.category)
        console.log('Summary in DB:', updatedMemo.summary)
        console.log('Keywords in DB:', updatedMemo.keywords)
        console.log('Embedding in DB:', updatedMemo.embedding ? 'Present' : 'Missing')
        console.log('Processed at:', updatedMemo.processed_at)
      }
      
      // 8. テストメモを削除
      await supabase
        .from('memos')
        .delete()
        .eq('id', testMemo.id)
      
      console.log('Test memo cleaned up')
    }
    
    console.log('=== AI Debug Test Completed Successfully ===')
    return { 
      success: true, 
      result: {
        aiProcessing: {
          tags: aiResult.tags,
          category: aiResult.category,
          summary: aiResult.summary,
          keywords: aiResult.keywords,
          embeddingLength: aiResult.embedding.length
        },
        userAuthenticated: !!user
      }
    }
    
  } catch (error) {
    console.error('=== AI Debug Test Failed ===')
    console.error('Error:', error)
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }
  }
}

// 既存のメモでAI処理を再実行
export async function reprocessMemo(memoId: string) {
  try {
    console.log('=== Reprocessing Memo:', memoId, '===')
    
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    // メモを取得
    const { data: memo, error: fetchError } = await supabase
      .from('memos')
      .select('*')
      .eq('id', memoId)
      .eq('user_id', user.id)
      .single()
    
    if (fetchError || !memo) {
      throw new Error('Memo not found or access denied')
    }
    
    console.log('Processing memo content:', memo.content.substring(0, 100) + '...')
    
    // AI処理実行
    const aiResult = await processContent(memo.content)
    
    console.log('AI processing completed:', {
      tags: aiResult.tags,
      category: aiResult.category,
      summary: aiResult.summary.substring(0, 50) + '...',
      keywords: aiResult.keywords,
      embeddingLength: aiResult.embedding.length
    })
    
    // メモを更新
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
      throw new Error('Failed to update memo: ' + updateError.message)
    }
    
    console.log('Memo updated successfully')
    
    return { 
      success: true, 
      result: {
        tags: aiResult.tags,
        category: aiResult.category,
        summary: aiResult.summary,
        keywords: aiResult.keywords,
        embeddingLength: aiResult.embedding.length
      }
    }
    
  } catch (error) {
    console.error('Error reprocessing memo:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// 全てのメモのAI処理状況を確認
export async function checkAIProcessingStatus() {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    const { data: memos, error } = await supabase
      .from('memos')
      .select('id, content, processed_at, tags, category, summary, keywords, embedding')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw new Error('Failed to fetch memos: ' + error.message)
    }
    
    const stats = {
      total: memos.length,
      processed: 0,
      unprocessed: 0,
      withEmbedding: 0,
      withoutEmbedding: 0,
      details: [] as Array<{
        id: string
        contentPreview: string
        isProcessed: boolean
        hasEmbedding: boolean
        tags: string[]
        category: string | null
        summary: string | null
      }>
    }
    
    for (const memo of memos) {
      const isProcessed = !!memo.processed_at
      const hasEmbedding = !!memo.embedding
      
      if (isProcessed) stats.processed++
      else stats.unprocessed++
      
      if (hasEmbedding) stats.withEmbedding++
      else stats.withoutEmbedding++
      
      stats.details.push({
        id: memo.id,
        contentPreview: memo.content.substring(0, 50) + '...',
        isProcessed,
        hasEmbedding,
        tags: memo.tags || [],
        category: memo.category,
        summary: memo.summary
      })
    }
    
    console.log('AI Processing Status:', stats)
    
    return { success: true, stats }
    
  } catch (error) {
    console.error('Error checking AI processing status:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}