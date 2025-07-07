/**
 * 検索候補プロバイダー
 * 検索履歴、タグ候補、コンテンツ候補、AI生成候補を提供
 */

import { createClient } from '@/lib/supabase/server'
import { TextNormalizer } from './text-normalizer'
import { FuzzySearch } from './fuzzy-search'

export interface SearchSuggestion {
  id: string
  type: 'history' | 'tag' | 'content' | 'ai' | 'category' | 'keyword'
  text: string
  description?: string
  score: number
  metadata?: {
    originalText?: string
    memoId?: string
    category?: string
    frequency?: number
    lastUsed?: Date
  }
}

export interface SuggestionOptions {
  maxHistorySuggestions?: number
  maxTagSuggestions?: number
  maxContentSuggestions?: number
  maxCategorySuggestions?: number
  fuzzyThreshold?: number
  includeFrequency?: boolean
  sortBy?: 'score' | 'frequency' | 'alphabetical' | 'recent'
}

export class SuggestionProvider {
  /**
   * 検索候補を取得
   */
  static async getSuggestions(
    query: string,
    userId: string,
    options: SuggestionOptions = {}
  ): Promise<SearchSuggestion[]> {
    const {
      maxHistorySuggestions = 5,
      maxTagSuggestions = 8,
      maxContentSuggestions = 5,
      maxCategorySuggestions = 3,
      fuzzyThreshold = 0.6,
      includeFrequency = true,
      sortBy = 'score'
    } = options

    if (!query.trim()) {
      return await SuggestionProvider.getRecentSuggestions(userId, options)
    }

    const suggestions: SearchSuggestion[] = []

    // 並列で各種候補を取得
    const [
      historySuggestions,
      tagSuggestions,
      contentSuggestions,
      categorySuggestions,
      keywordSuggestions
    ] = await Promise.all([
      SuggestionProvider.getHistorySuggestions(query, userId, maxHistorySuggestions, fuzzyThreshold),
      SuggestionProvider.getTagSuggestions(query, userId, maxTagSuggestions, fuzzyThreshold),
      SuggestionProvider.getContentSuggestions(query, userId, maxContentSuggestions, fuzzyThreshold),
      SuggestionProvider.getCategorySuggestions(query, userId, maxCategorySuggestions, fuzzyThreshold),
      SuggestionProvider.getKeywordSuggestions(query, userId, maxTagSuggestions, fuzzyThreshold)
    ])

    suggestions.push(
      ...historySuggestions,
      ...tagSuggestions,
      ...contentSuggestions,
      ...categorySuggestions,
      ...keywordSuggestions
    )

    // 重複除去とソート
    return SuggestionProvider.deduplicateAndSort(suggestions, sortBy)
  }

  /**
   * 検索履歴から候補を取得
   */
  private static async getHistorySuggestions(
    query: string,
    userId: string,
    maxSuggestions: number,
    fuzzyThreshold: number
  ): Promise<SearchSuggestion[]> {
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('search_history')
        .select('query, executed_at')
        .eq('user_id', userId)
        .order('executed_at', { ascending: false })
        .limit(50) // 最近の50件から検索

      if (error || !data) return []

      const normalizedQuery = TextNormalizer.normalizeForSearch(query)
      const suggestions: SearchSuggestion[] = []

      // 各履歴項目をファジー検索で評価
      for (const historyItem of data) {
        const fuzzyResult = FuzzySearch.partialMatch(normalizedQuery, historyItem.query, {
          threshold: fuzzyThreshold,
          normalizeText: true
        })

        if (fuzzyResult.matched) {
          suggestions.push({
            id: `history-${historyItem.query}-${historyItem.executed_at}`,
            type: 'history',
            text: historyItem.query,
            description: `過去の検索: ${new Date(historyItem.executed_at).toLocaleDateString()}`,
            score: fuzzyResult.score,
            metadata: {
              originalText: historyItem.query,
              lastUsed: new Date(historyItem.executed_at)
            }
          })
        }
      }

      return suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, maxSuggestions)
    } catch (error) {
      console.error('Error getting history suggestions:', error)
      return []
    }
  }

  /**
   * タグから候補を取得
   */
  private static async getTagSuggestions(
    query: string,
    userId: string,
    maxSuggestions: number,
    fuzzyThreshold: number
  ): Promise<SearchSuggestion[]> {
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('memos')
        .select('tags')
        .eq('user_id', userId)
        .not('tags', 'is', null)

      if (error || !data) return []

      // 全てのタグを収集して頻度を計算
      const tagFrequency = new Map<string, number>()
      for (const memo of data) {
        if (memo.tags) {
          for (const tag of memo.tags) {
            tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1)
          }
        }
      }

      const normalizedQuery = TextNormalizer.normalizeForSearch(query)
      const suggestions: SearchSuggestion[] = []

      // 各タグをファジー検索で評価
      for (const [tag, frequency] of tagFrequency.entries()) {
        const fuzzyResult = FuzzySearch.partialMatch(normalizedQuery, tag, {
          threshold: fuzzyThreshold,
          normalizeText: true
        })

        if (fuzzyResult.matched) {
          suggestions.push({
            id: `tag-${tag}`,
            type: 'tag',
            text: tag,
            description: `タグ (${frequency}件のメモ)`,
            score: fuzzyResult.score,
            metadata: {
              originalText: tag,
              frequency
            }
          })
        }
      }

      return suggestions
        .sort((a, b) => {
          // スコアと頻度を組み合わせてソート
          const scoreA = a.score * 0.7 + (a.metadata?.frequency || 0) * 0.3 / 100
          const scoreB = b.score * 0.7 + (b.metadata?.frequency || 0) * 0.3 / 100
          return scoreB - scoreA
        })
        .slice(0, maxSuggestions)
    } catch (error) {
      console.error('Error getting tag suggestions:', error)
      return []
    }
  }

  /**
   * コンテンツから候補を取得
   */
  private static async getContentSuggestions(
    query: string,
    userId: string,
    maxSuggestions: number,
    fuzzyThreshold: number
  ): Promise<SearchSuggestion[]> {
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('memos')
        .select('id, content, view_count')
        .eq('user_id', userId)
        .order('view_count', { ascending: false })
        .limit(100) // 人気の100件から検索

      if (error || !data) return []

      const normalizedQuery = TextNormalizer.normalizeForSearch(query)
      const suggestions: SearchSuggestion[] = []

      for (const memo of data) {
        // コンテンツから関連するフレーズを抽出
        const phrases = SuggestionProvider.extractPhrases(memo.content, normalizedQuery)
        
        for (const phrase of phrases) {
          const fuzzyResult = FuzzySearch.partialMatch(normalizedQuery, phrase, {
            threshold: fuzzyThreshold,
            normalizeText: true
          })

          if (fuzzyResult.matched) {
            suggestions.push({
              id: `content-${memo.id}-${phrase}`,
              type: 'content',
              text: phrase,
              description: `"${memo.content.substring(0, 50)}..."`,
              score: fuzzyResult.score,
              metadata: {
                originalText: phrase,
                memoId: memo.id
              }
            })
          }
        }
      }

      return suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, maxSuggestions)
    } catch (error) {
      console.error('Error getting content suggestions:', error)
      return []
    }
  }

  /**
   * カテゴリから候補を取得
   */
  private static async getCategorySuggestions(
    query: string,
    userId: string,
    maxSuggestions: number,
    fuzzyThreshold: number
  ): Promise<SearchSuggestion[]> {
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('memos')
        .select('category')
        .eq('user_id', userId)
        .not('category', 'is', null)

      if (error || !data) return []

      // カテゴリの頻度を計算
      const categoryFrequency = new Map<string, number>()
      for (const memo of data) {
        if (memo.category) {
          categoryFrequency.set(memo.category, (categoryFrequency.get(memo.category) || 0) + 1)
        }
      }

      const normalizedQuery = TextNormalizer.normalizeForSearch(query)
      const suggestions: SearchSuggestion[] = []

      for (const [category, frequency] of categoryFrequency.entries()) {
        const fuzzyResult = FuzzySearch.partialMatch(normalizedQuery, category, {
          threshold: fuzzyThreshold,
          normalizeText: true
        })

        if (fuzzyResult.matched) {
          suggestions.push({
            id: `category-${category}`,
            type: 'category',
            text: category,
            description: `カテゴリ (${frequency}件のメモ)`,
            score: fuzzyResult.score,
            metadata: {
              originalText: category,
              category,
              frequency
            }
          })
        }
      }

      return suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, maxSuggestions)
    } catch (error) {
      console.error('Error getting category suggestions:', error)
      return []
    }
  }

  /**
   * キーワードから候補を取得
   */
  private static async getKeywordSuggestions(
    query: string,
    userId: string,
    maxSuggestions: number,
    fuzzyThreshold: number
  ): Promise<SearchSuggestion[]> {
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('memos')
        .select('keywords')
        .eq('user_id', userId)
        .not('keywords', 'is', null)

      if (error || !data) return []

      // キーワードの頻度を計算
      const keywordFrequency = new Map<string, number>()
      for (const memo of data) {
        if (memo.keywords) {
          for (const keyword of memo.keywords) {
            keywordFrequency.set(keyword, (keywordFrequency.get(keyword) || 0) + 1)
          }
        }
      }

      const normalizedQuery = TextNormalizer.normalizeForSearch(query)
      const suggestions: SearchSuggestion[] = []

      for (const [keyword, frequency] of keywordFrequency.entries()) {
        const fuzzyResult = FuzzySearch.partialMatch(normalizedQuery, keyword, {
          threshold: fuzzyThreshold,
          normalizeText: true
        })

        if (fuzzyResult.matched) {
          suggestions.push({
            id: `keyword-${keyword}`,
            type: 'keyword',
            text: keyword,
            description: `キーワード (${frequency}件のメモ)`,
            score: fuzzyResult.score,
            metadata: {
              originalText: keyword,
              frequency
            }
          })
        }
      }

      return suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, maxSuggestions)
    } catch (error) {
      console.error('Error getting keyword suggestions:', error)
      return []
    }
  }

  /**
   * 最近の候補を取得（クエリが空の場合）
   */
  private static async getRecentSuggestions(
    userId: string,
    options: SuggestionOptions = {}
  ): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = []

    try {
      const supabase = await createClient()

      // 最近の検索履歴
      const { data: recentSearches } = await supabase
        .from('search_history')
        .select('query, executed_at')
        .eq('user_id', userId)
        .order('executed_at', { ascending: false })
        .limit(5)

      if (recentSearches) {
        for (const search of recentSearches) {
          suggestions.push({
            id: `recent-history-${search.query}`,
            type: 'history',
            text: search.query,
            description: `最近の検索: ${new Date(search.executed_at).toLocaleDateString()}`,
            score: 1.0,
            metadata: {
              originalText: search.query,
              lastUsed: new Date(search.executed_at)
            }
          })
        }
      }

      // 人気のタグ
      const { data: memos } = await supabase
        .from('memos')
        .select('tags')
        .eq('user_id', userId)
        .not('tags', 'is', null)
        .limit(50)

      if (memos) {
        const tagFrequency = new Map<string, number>()
        for (const memo of memos) {
          if (memo.tags) {
            for (const tag of memo.tags) {
              tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1)
            }
          }
        }

        const popularTags = Array.from(tagFrequency.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)

        for (const [tag, frequency] of popularTags) {
          suggestions.push({
            id: `popular-tag-${tag}`,
            type: 'tag',
            text: tag,
            description: `人気のタグ (${frequency}件)`,
            score: frequency / 10,
            metadata: {
              originalText: tag,
              frequency
            }
          })
        }
      }

      return suggestions
    } catch (error) {
      console.error('Error getting recent suggestions:', error)
      return []
    }
  }

  /**
   * テキストからフレーズを抽出
   */
  private static extractPhrases(text: string, query: string): string[] {
    const sentences = text.split(/[。．！？\n]/).filter(s => s.trim().length > 0)
    const phrases: string[] = []

    const normalizedQuery = TextNormalizer.normalizeForSearch(query)

    for (const sentence of sentences) {
      const normalizedSentence = TextNormalizer.normalizeForSearch(sentence)
      
      // クエリを含む文を候補に
      if (normalizedSentence.includes(normalizedQuery)) {
        const words = sentence.trim().split(/\s+/)
        if (words.length <= 10) { // 10語以下の短い文のみ
          phrases.push(sentence.trim())
        }
      }

      // 単語単位での抽出
      const words = sentence.split(/\s+/)
      for (let i = 0; i < words.length - 1; i++) {
        const phrase = words.slice(i, i + 3).join(' ') // 3語のフレーズ
        if (phrase.length > query.length && phrase.length < 50) {
          phrases.push(phrase)
        }
      }
    }

    return [...new Set(phrases)] // 重複除去
  }

  /**
   * 候補の重複除去とソート
   */
  private static deduplicateAndSort(
    suggestions: SearchSuggestion[],
    sortBy: 'score' | 'frequency' | 'alphabetical' | 'recent'
  ): SearchSuggestion[] {
    // テキストで重複除去（最高スコアを保持）
    const deduped = new Map<string, SearchSuggestion>()
    
    for (const suggestion of suggestions) {
      const existing = deduped.get(suggestion.text)
      if (!existing || suggestion.score > existing.score) {
        deduped.set(suggestion.text, suggestion)
      }
    }

    const result = Array.from(deduped.values())

    // ソート
    switch (sortBy) {
      case 'frequency':
        return result.sort((a, b) => (b.metadata?.frequency || 0) - (a.metadata?.frequency || 0))
      case 'alphabetical':
        return result.sort((a, b) => a.text.localeCompare(b.text))
      case 'recent':
        return result.sort((a, b) => {
          const aTime = a.metadata?.lastUsed?.getTime() || 0
          const bTime = b.metadata?.lastUsed?.getTime() || 0
          return bTime - aTime
        })
      case 'score':
      default:
        return result.sort((a, b) => b.score - a.score)
    }
  }
}