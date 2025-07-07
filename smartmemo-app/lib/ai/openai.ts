import OpenAI from 'openai'

// Check if API key exists
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in environment variables')
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface AIProcessingResult {
  tags: string[]
  category: string
  summary: string
  keywords: string[]
  embedding: number[]
}

export async function processContent(content: string): Promise<AIProcessingResult> {
  console.log('Starting AI processing for content:', content.slice(0, 50) + '...')
  
  try {
    // Check API key again
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is missing')
    }
    
    // Generate embedding
    console.log('Generating embedding...')
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: content,
    })
    
    const embedding = embeddingResponse.data[0].embedding
    console.log('Embedding generated successfully')

    // Generate tags, category, summary, and keywords
    console.log('Generating tags and metadata...')
    const completionResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `あなたは日本語のテキストコンテンツを分析し、構造化された情報を抽出するAIアシスタントです。
          以下の形式のJSONオブジェクトで応答してください：
          
          - tags: 関連するタグの配列（最大5個、日本語のみ）
            例: ["プログラミング", "機械学習", "読書メモ", "アイデア", "会議"]
          - category: 単一のカテゴリー名（日本語）
            例: "技術", "学習", "仕事", "個人", "研究"
          - summary: 簡潔な要約（最大100文字、日本語）
          - keywords: 重要なキーワードの配列（最大10個、日本語のみ）
            例: ["React", "Next.js", "データベース", "API設計"]
          
          【重要】すべてのタグ、カテゴリー、キーワードは必ず日本語で生成してください。
          英語や他の言語は使用しないでください。
          有効なJSONフォーマットで応答することを確認してください。`
        },
        {
          role: 'user',
          content: content
        }
      ],
      temperature: 0.1,
      max_tokens: 500,
    })

    const aiResponse = completionResponse.choices[0].message.content
    
    if (!aiResponse) {
      throw new Error('No response from OpenAI')
    }

    console.log('AI response received:', aiResponse)
    
    const parsed = JSON.parse(aiResponse)
    console.log('Parsed AI response:', parsed)
    
    const result = {
      tags: parsed.tags || [],
      category: parsed.category || '一般',
      summary: parsed.summary || '',
      keywords: parsed.keywords || [],
      embedding,
    }
    
    console.log('AI processing completed successfully with result:', {
      tags: result.tags,
      category: result.category,
      summary: result.summary.slice(0, 50) + '...',
      keywords: result.keywords,
      embeddingLength: result.embedding.length
    })
    
    return result
  } catch (error) {
    console.error('Error processing content with AI:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    // Return default values if AI processing fails
    return {
      tags: [],
      category: '一般',
      summary: '',
      keywords: [],
      embedding: [],
    }
  }
}

import { createClient } from '@/lib/supabase/server'

export async function findSimilarMemos(
  targetEmbedding: number[], 
  userId: string, 
  excludeId?: string, 
  limit: number = 5,
  threshold: number = 0.7
) {
  try {
    const supabase = await createClient()
    
    // Convert embedding array to pgvector format
    const embeddingString = `[${targetEmbedding.join(',')}]`
    
    // Build the query to find similar memos using cosine similarity
    let query = supabase
      .from('memos')
      .select(`
        id,
        content,
        content_markdown,
        tags,
        category,
        summary,
        created_at,
        embedding <=> '${embeddingString}' as similarity
      `)
      .eq('user_id', userId)
      .not('embedding', 'is', null)
      .order('similarity', { ascending: true })
      .limit(limit)

    // Exclude the source memo if provided
    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error finding similar memos:', error)
      return []
    }

    // Filter by similarity threshold (cosine distance < 1 - threshold)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const similarMemos = data?.filter((memo: any) => 
      memo.similarity < (1 - threshold)
    ) || []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return similarMemos.map((memo: any) => ({
      id: memo.id,
      content: memo.content,
      content_markdown: memo.content_markdown,
      tags: memo.tags,
      category: memo.category,
      summary: memo.summary,
      created_at: memo.created_at,
      similarity: 1 - memo.similarity // Convert distance to similarity score
    }))
  } catch (error) {
    console.error('Error in findSimilarMemos:', error)
    return []
  }
}