'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SuggestionProvider } from '@/lib/search/suggestion-provider'

export interface SearchHistoryEntry {
  id: string
  query: string
  filters?: any
  result_count: number
  search_type: string
  executed_at: string
  execution_time: number
}

export interface SavedSearch {
  id: string
  name: string
  query: string
  filters?: any
  search_type: string
  auto_update: boolean
  notifications: boolean
  created_at: string
  last_executed_at?: string
  execution_count: number
}

export interface SearchAnalytics {
  date: string
  total_searches: number
  unique_queries: number
  avg_execution_time: number
  most_common_query: string
  search_type_stats: Record<string, number>
}

// 検索履歴を記録
export async function recordSearchHistory(
  query: string,
  searchType: string = 'text',
  resultCount: number = 0,
  executionTime: number = 0,
  filters?: any
) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const { data, error } = await supabase.rpc('record_search_history', {
      p_user_id: user.id,
      p_query: query,
      p_filters: filters ? JSON.stringify(filters) : null,
      p_result_count: resultCount,
      p_search_type: searchType,
      p_execution_time: executionTime
    })

    if (error) {
      console.error('Error recording search history:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error recording search history:', error)
    return { success: false, error: 'Failed to record search history' }
  }
}

// 検索履歴を取得
export async function getSearchHistory(limit: number = 50) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', user.id)
      .order('executed_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching search history:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as SearchHistoryEntry[] }
  } catch (error) {
    console.error('Error fetching search history:', error)
    return { success: false, error: 'Failed to fetch search history' }
  }
}

// 検索履歴を削除
export async function deleteSearchHistory(historyId?: string) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    let query = supabase
      .from('search_history')
      .delete()
      .eq('user_id', user.id)

    if (historyId) {
      query = query.eq('id', historyId)
    }

    const { error } = await query

    if (error) {
      console.error('Error deleting search history:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting search history:', error)
    return { success: false, error: 'Failed to delete search history' }
  }
}

// 保存済み検索を作成
export async function createSavedSearch(
  name: string,
  query: string,
  searchType: string = 'text',
  filters?: any,
  autoUpdate: boolean = false,
  notifications: boolean = false
) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const { data, error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: user.id,
        name,
        query,
        search_type: searchType,
        filters: filters ? JSON.stringify(filters) : null,
        auto_update: autoUpdate,
        notifications
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating saved search:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as SavedSearch }
  } catch (error) {
    console.error('Error creating saved search:', error)
    return { success: false, error: 'Failed to create saved search' }
  }
}

// 保存済み検索を取得
export async function getSavedSearches() {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching saved searches:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as SavedSearch[] }
  } catch (error) {
    console.error('Error fetching saved searches:', error)
    return { success: false, error: 'Failed to fetch saved searches' }
  }
}

// 保存済み検索を更新
export async function updateSavedSearch(
  id: string,
  updates: Partial<{
    name: string
    query: string
    filters: any
    auto_update: boolean
    notifications: boolean
  }>
) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const updateData: any = { ...updates }
    if (updates.filters) {
      updateData.filters = JSON.stringify(updates.filters)
    }

    const { data, error } = await supabase
      .from('saved_searches')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating saved search:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as SavedSearch }
  } catch (error) {
    console.error('Error updating saved search:', error)
    return { success: false, error: 'Failed to update saved search' }
  }
}

// 保存済み検索を削除
export async function deleteSavedSearch(id: string) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting saved search:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting saved search:', error)
    return { success: false, error: 'Failed to delete saved search' }
  }
}

// 保存済み検索の実行回数を記録
export async function recordSavedSearchExecution(id: string) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const { error } = await supabase
      .from('saved_searches')
      .update({
        last_executed_at: new Date().toISOString(),
        execution_count: supabase.sql`execution_count + 1`
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error recording saved search execution:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error recording saved search execution:', error)
    return { success: false, error: 'Failed to record execution' }
  }
}

// 検索分析データを取得
export async function getSearchAnalytics(days: number = 30) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('search_analytics')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching search analytics:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as SearchAnalytics[] }
  } catch (error) {
    console.error('Error fetching search analytics:', error)
    return { success: false, error: 'Failed to fetch analytics' }
  }
}

// 検索候補を取得
export async function getSearchSuggestions(query: string) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const suggestions = await SuggestionProvider.getSuggestions(query, user.id, {
      maxHistorySuggestions: 3,
      maxTagSuggestions: 5,
      maxContentSuggestions: 3,
      maxCategorySuggestions: 2,
      fuzzyThreshold: 0.6,
      sortBy: 'score'
    })

    return { success: true, data: suggestions }
  } catch (error) {
    console.error('Error getting search suggestions:', error)
    return { success: false, error: 'Failed to get suggestions' }
  }
}

// 人気の検索クエリを取得
export async function getPopularQueries(limit: number = 10) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const { data, error } = await supabase
      .from('search_history')
      .select('query')
      .eq('user_id', user.id)
      .gte('executed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // 過去30日

    if (error) {
      console.error('Error fetching popular queries:', error)
      return { success: false, error: error.message }
    }

    // クエリの頻度を計算
    const queryFrequency = new Map<string, number>()
    for (const item of data) {
      const count = queryFrequency.get(item.query) || 0
      queryFrequency.set(item.query, count + 1)
    }

    // 頻度順にソート
    const popularQueries = Array.from(queryFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query, count]) => ({ query, count }))

    return { success: true, data: popularQueries }
  } catch (error) {
    console.error('Error fetching popular queries:', error)
    return { success: false, error: 'Failed to fetch popular queries' }
  }
}

// 検索履歴のクリーンアップ
export async function cleanupSearchHistory() {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    const { error } = await supabase.rpc('cleanup_search_history')

    if (error) {
      console.error('Error cleaning up search history:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error cleaning up search history:', error)
    return { success: false, error: 'Failed to cleanup search history' }
  }
}