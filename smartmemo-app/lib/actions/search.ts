'use server'

import { createClient } from '@/lib/supabase/server'
import { processContent } from '@/lib/ai/openai'
import { redirect } from 'next/navigation'

export async function semanticSearch(query: string, limit: number = 10, threshold: number = 0.6) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    // Generate embedding for the search query
    const { embedding } = await processContent(query)
    
    if (!embedding || embedding.length === 0) {
      // Fallback to text search if embedding generation fails
      return await textSearch(query, limit)
    }

    // Convert embedding array to pgvector format
    const embeddingString = `[${embedding.join(',')}]`
    
    // Search using vector similarity
    const { data, error } = await supabase
      .from('memos')
      .select(`
        id,
        content,
        content_markdown,
        tags,
        category,
        summary,
        keywords,
        created_at,
        updated_at,
        view_count,
        embedding <=> '${embeddingString}' as similarity
      `)
      .eq('user_id', user.id)
      .not('embedding', 'is', null)
      .order('similarity', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error in semantic search:', error)
      // Fallback to text search
      return await textSearch(query, limit)
    }

    // Filter by similarity threshold and format results
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = data?.filter((memo: any) => 
      memo.similarity < (1 - threshold)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ).map((memo: any) => ({
      id: memo.id,
      content: memo.content,
      content_markdown: memo.content_markdown,
      tags: memo.tags,
      category: memo.category,
      summary: memo.summary,
      keywords: memo.keywords,
      created_at: memo.created_at,
      updated_at: memo.updated_at,
      view_count: memo.view_count,
      similarity: 1 - memo.similarity, // Convert distance to similarity score
      searchType: 'semantic' as const
    })) || []

    return results
  } catch (error) {
    console.error('Error in semantic search:', error)
    // Fallback to text search
    return await textSearch(query, limit)
  }
}

export async function textSearch(query: string, limit: number = 10) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const searchTerms = query.toLowerCase().trim()

    const { data, error } = await supabase
      .from('memos')
      .select(`
        id,
        content,
        content_markdown,
        tags,
        category,
        summary,
        keywords,
        created_at,
        updated_at,
        view_count
      `)
      .eq('user_id', user.id)
      .or(`
        content.ilike.%${searchTerms}%,
        tags.cs.{${searchTerms}},
        category.ilike.%${searchTerms}%,
        summary.ilike.%${searchTerms}%,
        keywords.cs.{${searchTerms}}
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error in text search:', error)
      return []
    }

    return data?.map(memo => ({
      ...memo,
      searchType: 'text' as const,
      similarity: 0.5 // Default similarity for text search
    })) || []
  } catch (error) {
    console.error('Error in text search:', error)
    return []
  }
}

export async function hybridSearch(query: string, limit: number = 10) {
  try {
    // Perform both semantic and text search
    const [semanticResults, textResults] = await Promise.all([
      semanticSearch(query, Math.ceil(limit * 0.7)), // 70% semantic
      textSearch(query, Math.ceil(limit * 0.3))       // 30% text
    ])

    // Combine and deduplicate results
    const combinedResults = new Map()
    
    // Add semantic results (higher priority)
    semanticResults.forEach((memo, index) => {
      combinedResults.set(memo.id, {
        ...memo,
        rankScore: memo.similarity * 0.7 + (1 - index / semanticResults.length) * 0.3
      })
    })

    // Add text results if not already present
    textResults.forEach((memo, index) => {
      if (!combinedResults.has(memo.id)) {
        combinedResults.set(memo.id, {
          ...memo,
          rankScore: memo.similarity * 0.3 + (1 - index / textResults.length) * 0.2
        })
      }
    })

    // Sort by rank score and return top results
    return Array.from(combinedResults.values())
      .sort((a, b) => b.rankScore - a.rankScore)
      .slice(0, limit)
  } catch (error) {
    console.error('Error in hybrid search:', error)
    return await textSearch(query, limit)
  }
}