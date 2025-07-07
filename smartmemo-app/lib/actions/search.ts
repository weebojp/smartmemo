'use server'

import { createClient } from '@/lib/supabase/server'
import { processContent } from '@/lib/ai/openai'
import { redirect } from 'next/navigation'
import { SearchEngine, EnhancedSearchResult } from '@/lib/search/search-engine'
import { TextNormalizer } from '@/lib/search/text-normalizer'
import { FuzzySearch } from '@/lib/search/fuzzy-search'

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

    // 正規化されたクエリで検索
    const normalizedQuery = TextNormalizer.normalizeForSearch(query)
    const searchTerms = normalizedQuery.toLowerCase().trim()

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
      .limit(limit * 2) // より多くのデータを取得してクライアントサイドでフィルタ

    if (error) {
      console.error('Error in text search:', error)
      return []
    }

    // 検索エンジンを使用してより高度な検索を実行
    const enhancedResults = SearchEngine.enhancedTextSearch(data || [], {
      query,
      useNormalization: true,
      useFuzzySearch: true,
      fuzzyThreshold: 0.6,
      searchMode: 'hybrid',
      includeHighlights: true,
      maxResults: limit
    })

    return enhancedResults.map(memo => ({
      ...memo,
      searchType: 'text' as const,
      similarity: memo.rankScore || 0.5
    }))
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

// Advanced search with filters
export interface AdvancedSearchFilters {
  query: string
  tags: string[]
  categories: string[]
  dateRange: {
    start?: Date
    end?: Date
  }
  contentLength: {
    min?: number
    max?: number
  }
  aiProcessed: boolean | null
  sortBy: 'relevance' | 'date' | 'length' | 'similarity'
  sortOrder: 'asc' | 'desc'
}

export async function advancedSearch(filters: AdvancedSearchFilters, limit: number = 20) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    // Start with base query
    let query = supabase
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
        processed_at
      `)
      .eq('user_id', user.id)

    // Apply content search if query is provided
    if (filters.query.trim()) {
      const searchTerms = filters.query.toLowerCase().trim()
      query = query.or(`
        content.ilike.%${searchTerms}%,
        tags.cs.{${searchTerms}},
        category.ilike.%${searchTerms}%,
        summary.ilike.%${searchTerms}%,
        keywords.cs.{${searchTerms}}
      `)
    }

    // Apply tag filters with enhanced search
    if (filters.tags.length > 0) {
      // Get all memos first for enhanced tag search
      const { data: allMemos } = await supabase
        .from('memos')
        .select('id, tags')
        .eq('user_id', user.id)
      
      if (allMemos) {
        const matchingMemoIds: string[] = []
        
        for (const memo of allMemos) {
          if (!memo.tags) continue
          
          const tagQuery = filters.tags.join(' ')
          const tagSearchResult = SearchEngine.enhancedTagSearch([memo], {
            query: tagQuery,
            mode: 'any',
            partial: true,
            fuzzy: true,
            threshold: 0.7
          })
          
          if (tagSearchResult.length > 0) {
            matchingMemoIds.push(memo.id)
          }
        }
        
        if (matchingMemoIds.length > 0) {
          query = query.in('id', matchingMemoIds)
        } else {
          // No matches found, return empty result
          return []
        }
      }
    }

    // Apply category filters
    if (filters.categories.length > 0) {
      query = query.in('category', filters.categories)
    }

    // Apply date range filters
    if (filters.dateRange.start) {
      query = query.gte('created_at', filters.dateRange.start.toISOString())
    }
    if (filters.dateRange.end) {
      query = query.lte('created_at', filters.dateRange.end.toISOString())
    }

    // Apply AI processing filter
    if (filters.aiProcessed !== null) {
      if (filters.aiProcessed) {
        query = query.not('processed_at', 'is', null)
      } else {
        query = query.is('processed_at', null)
      }
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'date':
        query = query.order('created_at', { ascending: filters.sortOrder === 'asc' })
        break
      case 'length':
        // Note: We'll sort by content length on the client side since Supabase doesn't have length() in order
        query = query.order('created_at', { ascending: false })
        break
      case 'similarity':
        // For similarity, we need semantic search results
        if (filters.query.trim()) {
          // Fall back to hybrid search for similarity-based sorting
          const results = await hybridSearch(filters.query, limit * 2)
          return applyAdvancedFilters(results, filters, limit)
        }
        query = query.order('created_at', { ascending: filters.sortOrder === 'asc' })
        break
      case 'relevance':
      default:
        if (filters.query.trim()) {
          // Use hybrid search for relevance-based sorting
          const results = await hybridSearch(filters.query, limit * 2)
          return applyAdvancedFilters(results, filters, limit)
        }
        query = query.order('created_at', { ascending: false })
        break
    }

    const { data, error } = await query.limit(limit)

    if (error) {
      console.error('Error in advanced search:', error)
      return []
    }

    let results = data?.map(memo => ({
      ...memo,
      searchType: 'advanced' as const,
      similarity: 0.5 // Default similarity for advanced search
    })) || []

    // Apply content length filtering and sorting if needed
    if (filters.contentLength.min || filters.contentLength.max || filters.sortBy === 'length') {
      results = results.filter(memo => {
        const length = memo.content.length
        if (filters.contentLength.min && length < filters.contentLength.min) return false
        if (filters.contentLength.max && length > filters.contentLength.max) return false
        return true
      })

      if (filters.sortBy === 'length') {
        results.sort((a, b) => {
          const comparison = a.content.length - b.content.length
          return filters.sortOrder === 'asc' ? comparison : -comparison
        })
      }
    }

    return results
  } catch (error) {
    console.error('Error in advanced search:', error)
    return []
  }
}

// Helper function to apply advanced filters to hybrid search results
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyAdvancedFilters(results: any[], filters: AdvancedSearchFilters, limit: number) {
  let filteredResults = results

  // Apply tag filters
  if (filters.tags.length > 0) {
    filteredResults = filteredResults.filter(memo =>
      filters.tags.some(tag => memo.tags.includes(tag))
    )
  }

  // Apply category filters
  if (filters.categories.length > 0) {
    filteredResults = filteredResults.filter(memo =>
      filters.categories.includes(memo.category)
    )
  }

  // Apply date range filters
  if (filters.dateRange.start || filters.dateRange.end) {
    filteredResults = filteredResults.filter(memo => {
      const memoDate = new Date(memo.created_at)
      if (filters.dateRange.start && memoDate < filters.dateRange.start) return false
      if (filters.dateRange.end && memoDate > filters.dateRange.end) return false
      return true
    })
  }

  // Apply content length filters
  if (filters.contentLength.min || filters.contentLength.max) {
    filteredResults = filteredResults.filter(memo => {
      const length = memo.content.length
      if (filters.contentLength.min && length < filters.contentLength.min) return false
      if (filters.contentLength.max && length > filters.contentLength.max) return false
      return true
    })
  }

  // Apply AI processing filter
  if (filters.aiProcessed !== null) {
    filteredResults = filteredResults.filter(memo => {
      const isProcessed = !!memo.processed_at
      return filters.aiProcessed ? isProcessed : !isProcessed
    })
  }

  // Apply additional sorting if needed
  if (filters.sortBy === 'date') {
    filteredResults.sort((a, b) => {
      const comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return filters.sortOrder === 'asc' ? comparison : -comparison
    })
  } else if (filters.sortBy === 'length') {
    filteredResults.sort((a, b) => {
      const comparison = a.content.length - b.content.length
      return filters.sortOrder === 'asc' ? comparison : -comparison
    })
  }

  return filteredResults.slice(0, limit)
}

// 新しい検索機能: 複合検索クエリ
export async function complexSearch(query: string, limit: number = 20) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    // 全てのメモを取得（クライアントサイドで複合検索を実行）
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
        processed_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error in complex search:', error)
      return []
    }

    // 検索エンジンで複合検索を実行
    const results = SearchEngine.complexSearch(data || [], query, {
      useNormalization: true,
      useFuzzySearch: true,
      fuzzyThreshold: 0.7,
      searchMode: 'hybrid',
      includeHighlights: true,
      maxResults: limit
    })

    return results.map(memo => ({
      ...memo,
      searchType: 'complex' as const,
      similarity: memo.rankScore || 0.5
    }))
  } catch (error) {
    console.error('Error in complex search:', error)
    return []
  }
}

// 新しい検索機能: 強化されたタグ検索
export async function enhancedTagSearch(
  query: string, 
  mode: 'any' | 'all' | 'exact' = 'any',
  limit: number = 20
) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    // 全てのメモを取得
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
      .not('tags', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error in enhanced tag search:', error)
      return []
    }

    // 検索エンジンで強化されたタグ検索を実行
    const results = SearchEngine.enhancedTagSearch(data || [], {
      query,
      mode,
      partial: true,
      fuzzy: true,
      threshold: 0.7
    })

    return results.slice(0, limit).map(memo => ({
      ...memo,
      searchType: 'tag' as const,
      similarity: memo.rankScore || 0.5
    }))
  } catch (error) {
    console.error('Error in enhanced tag search:', error)
    return []
  }
}

// 新しい検索機能: ファジー検索
export async function fuzzySearch(query: string, limit: number = 20, threshold: number = 0.6) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    // 全てのメモを取得
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
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error in fuzzy search:', error)
      return []
    }

    // 検索エンジンでファジー検索を実行
    const results = SearchEngine.enhancedTextSearch(data || [], {
      query,
      useNormalization: true,
      useFuzzySearch: true,
      fuzzyThreshold: threshold,
      searchMode: 'fuzzy',
      includeHighlights: true,
      maxResults: limit
    })

    return results.map(memo => ({
      ...memo,
      searchType: 'fuzzy' as const,
      similarity: memo.fuzzyScore || memo.rankScore || 0.5
    }))
  } catch (error) {
    console.error('Error in fuzzy search:', error)
    return []
  }
}