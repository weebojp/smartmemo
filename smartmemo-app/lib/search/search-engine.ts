/**
 * 統合検索エンジン
 * テキスト正規化・ファジー検索・既存検索機能を統合
 */

import { TextNormalizer } from './text-normalizer'
import { FuzzySearch, FuzzyMatchResult } from './fuzzy-search'

export interface SearchOptions {
  query: string
  useNormalization?: boolean
  useFuzzySearch?: boolean
  fuzzyThreshold?: number
  searchMode?: 'exact' | 'partial' | 'fuzzy' | 'hybrid'
  includeHighlights?: boolean
  maxResults?: number
}

export interface EnhancedSearchResult {
  id: string
  content: string
  content_markdown: string
  tags: string[]
  category: string | null
  summary: string | null
  keywords: string[]
  created_at: string
  updated_at: string
  view_count: number
  similarity?: number
  searchType: 'text' | 'semantic' | 'fuzzy' | 'hybrid'
  rankScore?: number
  highlights?: Array<{
    field: string
    positions: Array<{ start: number; end: number; score: number }>
  }>
  fuzzyScore?: number
  matchedFields?: string[]
}

export interface TagSearchOptions {
  query: string
  mode: 'any' | 'all' | 'exact'
  partial?: boolean
  fuzzy?: boolean
  threshold?: number
}

export class SearchEngine {
  /**
   * テキスト検索の改善版（正規化・ファジー検索対応）
   */
  static enhancedTextSearch(
    memos: any[],
    options: SearchOptions
  ): EnhancedSearchResult[] {
    const {
      query,
      useNormalization = true,
      useFuzzySearch = false,
      fuzzyThreshold = 0.7,
      searchMode = 'hybrid',
      includeHighlights = true,
      maxResults = 20
    } = options

    if (!query.trim()) return []

    const normalizedQuery = useNormalization 
      ? TextNormalizer.normalizeForSearch(query) 
      : query

    const results: EnhancedSearchResult[] = []

    for (const memo of memos) {
      const searchResult = SearchEngine.searchMemo(memo, normalizedQuery, {
        useNormalization,
        useFuzzySearch,
        fuzzyThreshold,
        searchMode,
        includeHighlights
      })

      if (searchResult.matched) {
        results.push({
          ...memo,
          searchType: 'text',
          rankScore: searchResult.score,
          highlights: searchResult.highlights,
          fuzzyScore: searchResult.fuzzyScore,
          matchedFields: searchResult.matchedFields
        })
      }
    }

    // スコアでソート
    return results
      .sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0))
      .slice(0, maxResults)
  }

  /**
   * 個別メモの検索
   */
  private static searchMemo(
    memo: any,
    query: string,
    options: {
      useNormalization: boolean
      useFuzzySearch: boolean
      fuzzyThreshold: number
      searchMode: string
      includeHighlights: boolean
    }
  ): {
    matched: boolean
    score: number
    highlights: Array<{
      field: string
      positions: Array<{ start: number; end: number; score: number }>
    }>
    fuzzyScore: number
    matchedFields: string[]
  } {
    const { useNormalization, useFuzzySearch, fuzzyThreshold, searchMode, includeHighlights } = options
    
    const fields = [
      { name: 'content', value: memo.content, weight: 1.0 },
      { name: 'tags', value: memo.tags?.join(' ') || '', weight: 0.8 },
      { name: 'category', value: memo.category || '', weight: 0.6 },
      { name: 'summary', value: memo.summary || '', weight: 0.7 },
      { name: 'keywords', value: memo.keywords?.join(' ') || '', weight: 0.9 }
    ]

    let totalScore = 0
    let maxScore = 0
    const highlights: Array<{
      field: string
      positions: Array<{ start: number; end: number; score: number }>
    }> = []
    const matchedFields: string[] = []
    let fuzzyScore = 0

    for (const field of fields) {
      if (!field.value) continue

      const fieldResult = SearchEngine.searchField(
        query,
        field.value,
        {
          useNormalization,
          useFuzzySearch,
          fuzzyThreshold,
          searchMode,
          includeHighlights
        }
      )

      if (fieldResult.matched) {
        const weightedScore = fieldResult.score * field.weight
        totalScore += weightedScore
        maxScore = Math.max(maxScore, weightedScore)
        matchedFields.push(field.name)

        if (fieldResult.fuzzyScore > fuzzyScore) {
          fuzzyScore = fieldResult.fuzzyScore
        }

        if (includeHighlights && fieldResult.highlights.length > 0) {
          highlights.push({
            field: field.name,
            positions: fieldResult.highlights
          })
        }
      }
    }

    const finalScore = searchMode === 'hybrid' 
      ? (totalScore + maxScore) / 2 
      : totalScore

    return {
      matched: matchedFields.length > 0,
      score: finalScore,
      highlights,
      fuzzyScore,
      matchedFields
    }
  }

  /**
   * 個別フィールドの検索
   */
  private static searchField(
    query: string,
    fieldValue: string,
    options: {
      useNormalization: boolean
      useFuzzySearch: boolean
      fuzzyThreshold: number
      searchMode: string
      includeHighlights: boolean
    }
  ): {
    matched: boolean
    score: number
    highlights: Array<{ start: number; end: number; score: number }>
    fuzzyScore: number
  } {
    const { useNormalization, useFuzzySearch, fuzzyThreshold, searchMode, includeHighlights } = options

    let normalizedQuery = query
    let normalizedField = fieldValue

    if (useNormalization) {
      normalizedQuery = TextNormalizer.normalizeForSearch(query)
      normalizedField = TextNormalizer.normalizeForSearch(fieldValue)
    }

    // 完全一致チェック
    if (normalizedField.toLowerCase().includes(normalizedQuery.toLowerCase())) {
      const highlights = includeHighlights 
        ? FuzzySearch.generateHighlight(query, fieldValue).highlighted 
        : []

      return {
        matched: true,
        score: 1.0,
        highlights,
        fuzzyScore: 1.0
      }
    }

    // ファジー検索
    if (useFuzzySearch) {
      const fuzzyResult = FuzzySearch.partialMatch(normalizedQuery, normalizedField, {
        threshold: fuzzyThreshold,
        normalizeText: false, // 既に正規化済み
        caseSensitive: false
      })

      if (fuzzyResult.matched) {
        const highlights = includeHighlights 
          ? FuzzySearch.generateHighlight(query, fieldValue).highlighted 
          : []

        return {
          matched: true,
          score: fuzzyResult.score,
          highlights,
          fuzzyScore: fuzzyResult.score
        }
      }
    }

    // 部分一致（単語単位）
    const queryWords = normalizedQuery.split(/\s+/)
    const fieldWords = normalizedField.split(/\s+/)

    let matchedWords = 0
    for (const queryWord of queryWords) {
      for (const fieldWord of fieldWords) {
        if (fieldWord.includes(queryWord)) {
          matchedWords++
          break
        }
      }
    }

    const wordMatchScore = matchedWords / queryWords.length
    if (wordMatchScore > 0.5) {
      const highlights = includeHighlights 
        ? FuzzySearch.generateHighlight(query, fieldValue).highlighted 
        : []

      return {
        matched: true,
        score: wordMatchScore,
        highlights,
        fuzzyScore: wordMatchScore
      }
    }

    return {
      matched: false,
      score: 0,
      highlights: [],
      fuzzyScore: 0
    }
  }

  /**
   * 強化されたタグ検索
   */
  static enhancedTagSearch(
    memos: any[],
    options: TagSearchOptions
  ): EnhancedSearchResult[] {
    const {
      query,
      mode = 'any',
      partial = true,
      fuzzy = true,
      threshold = 0.7
    } = options

    if (!query.trim()) return []

    const normalizedQuery = TextNormalizer.normalizeForSearch(query)
    const results: EnhancedSearchResult[] = []

    for (const memo of memos) {
      if (!memo.tags || memo.tags.length === 0) continue

      const tagResult = SearchEngine.searchTags(memo.tags, normalizedQuery, {
        mode,
        partial,
        fuzzy,
        threshold
      })

      if (tagResult.matched) {
        results.push({
          ...memo,
          searchType: 'text',
          rankScore: tagResult.score,
          matchedFields: ['tags'],
          fuzzyScore: tagResult.fuzzyScore
        })
      }
    }

    return results.sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0))
  }

  /**
   * タグ配列の検索
   */
  private static searchTags(
    tags: string[],
    query: string,
    options: {
      mode: 'any' | 'all' | 'exact'
      partial: boolean
      fuzzy: boolean
      threshold: number
    }
  ): {
    matched: boolean
    score: number
    fuzzyScore: number
    matchedTags: string[]
  } {
    const { mode, partial, fuzzy, threshold } = options
    
    const matchedTags: string[] = []
    let totalScore = 0
    let maxFuzzyScore = 0

    for (const tag of tags) {
      const normalizedTag = TextNormalizer.normalizeForSearch(tag)
      let tagMatched = false
      let tagScore = 0

      // 完全一致
      if (normalizedTag === query) {
        tagMatched = true
        tagScore = 1.0
      }
      // 部分一致
      else if (partial && normalizedTag.includes(query)) {
        tagMatched = true
        tagScore = 0.8
      }
      // ファジー一致
      else if (fuzzy) {
        const fuzzyResult = FuzzySearch.match(query, normalizedTag, {
          threshold,
          normalizeText: false
        })

        if (fuzzyResult.matched) {
          tagMatched = true
          tagScore = fuzzyResult.score
          maxFuzzyScore = Math.max(maxFuzzyScore, fuzzyResult.score)
        }
      }

      if (tagMatched) {
        matchedTags.push(tag)
        totalScore += tagScore
      }
    }

    // モードに応じた判定
    let finalMatched = false
    switch (mode) {
      case 'exact':
        finalMatched = matchedTags.length === tags.length
        break
      case 'all':
        finalMatched = matchedTags.length > 0
        break
      case 'any':
      default:
        finalMatched = matchedTags.length > 0
        break
    }

    const finalScore = matchedTags.length > 0 ? totalScore / matchedTags.length : 0

    return {
      matched: finalMatched,
      score: finalScore,
      fuzzyScore: maxFuzzyScore,
      matchedTags
    }
  }

  /**
   * 複合検索クエリの解析
   */
  static parseComplexQuery(query: string): {
    terms: string[]
    tags: string[]
    categories: string[]
    operators: Array<{ type: 'AND' | 'OR' | 'NOT'; position: number }>
    fieldQueries: Array<{ field: string; value: string }>
  } {
    const result = {
      terms: [],
      tags: [],
      categories: [],
      operators: [],
      fieldQueries: []
    }

    // フィールド検索の抽出 (tag:value, category:value)
    const fieldRegex = /(tag|category|title|content):([^\s]+)/g
    let match
    while ((match = fieldRegex.exec(query)) !== null) {
      result.fieldQueries.push({
        field: match[1],
        value: match[2]
      })
      
      if (match[1] === 'tag') {
        result.tags.push(match[2])
      } else if (match[1] === 'category') {
        result.categories.push(match[2])
      }
    }

    // フィールド検索を除去
    let cleanQuery = query.replace(fieldRegex, '').trim()

    // 演算子の抽出
    const operators = ['AND', 'OR', 'NOT', 'かつ', 'または', '除く', '＋', '｜', '－']
    for (const op of operators) {
      const regex = new RegExp(`\\b${op}\\b`, 'gi')
      let opMatch
      while ((opMatch = regex.exec(cleanQuery)) !== null) {
        let type: 'AND' | 'OR' | 'NOT' = 'AND'
        
        if (['AND', 'かつ', '＋'].includes(op.toUpperCase())) {
          type = 'AND'
        } else if (['OR', 'または', '｜'].includes(op.toUpperCase())) {
          type = 'OR'
        } else if (['NOT', '除く', '－'].includes(op.toUpperCase())) {
          type = 'NOT'
        }

        result.operators.push({
          type,
          position: opMatch.index
        })
      }
    }

    // 演算子を除去して残りの語句を抽出
    for (const op of operators) {
      cleanQuery = cleanQuery.replace(new RegExp(`\\b${op}\\b`, 'gi'), ' ')
    }

    // 引用符内の語句を抽出
    const quotedRegex = /"([^"]+)"/g
    let quotedMatch
    while ((quotedMatch = quotedRegex.exec(cleanQuery)) !== null) {
      result.terms.push(quotedMatch[1])
    }

    // 引用符を除去
    cleanQuery = cleanQuery.replace(quotedRegex, ' ')

    // 残りの語句を分割
    const remainingTerms = cleanQuery
      .split(/\s+/)
      .filter(term => term.trim().length > 0)
    
    result.terms.push(...remainingTerms)

    return result
  }

  /**
   * 複合検索の実行
   */
  static complexSearch(
    memos: any[],
    query: string,
    options: SearchOptions = {}
  ): EnhancedSearchResult[] {
    const parsedQuery = SearchEngine.parseComplexQuery(query)
    
    // 単純な検索の場合は通常の検索を実行
    if (parsedQuery.operators.length === 0 && parsedQuery.fieldQueries.length === 0) {
      return SearchEngine.enhancedTextSearch(memos, { ...options, query })
    }

    const results: EnhancedSearchResult[] = []

    for (const memo of memos) {
      let memoMatched = true
      let totalScore = 0
      let matchCount = 0

      // フィールド検索の評価
      for (const fieldQuery of parsedQuery.fieldQueries) {
        const fieldResult = SearchEngine.evaluateFieldQuery(memo, fieldQuery.field, fieldQuery.value, options)
        if (!fieldResult.matched) {
          memoMatched = false
          break
        }
        totalScore += fieldResult.score
        matchCount++
      }

      // 通常の検索語句の評価
      if (memoMatched && parsedQuery.terms.length > 0) {
        for (const term of parsedQuery.terms) {
          const termResult = SearchEngine.searchMemo(memo, term, {
            useNormalization: options.useNormalization || true,
            useFuzzySearch: options.useFuzzySearch || false,
            fuzzyThreshold: options.fuzzyThreshold || 0.7,
            searchMode: options.searchMode || 'hybrid',
            includeHighlights: options.includeHighlights || false
          })

          if (termResult.matched) {
            totalScore += termResult.score
            matchCount++
          }
        }
      }

      if (memoMatched && matchCount > 0) {
        results.push({
          ...memo,
          searchType: 'text',
          rankScore: totalScore / matchCount,
          matchedFields: ['content']
        })
      }
    }

    return results.sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0))
  }

  /**
   * フィールド検索クエリの評価
   */
  private static evaluateFieldQuery(
    memo: any,
    field: string,
    value: string,
    options: SearchOptions
  ): { matched: boolean; score: number } {
    let fieldValue = ''
    
    switch (field) {
      case 'tag':
        fieldValue = memo.tags?.join(' ') || ''
        break
      case 'category':
        fieldValue = memo.category || ''
        break
      case 'title':
        fieldValue = memo.title || ''
        break
      case 'content':
        fieldValue = memo.content || ''
        break
      default:
        return { matched: false, score: 0 }
    }

    const normalizedValue = TextNormalizer.normalizeForSearch(value)
    const normalizedField = TextNormalizer.normalizeForSearch(fieldValue)

    if (normalizedField.includes(normalizedValue)) {
      return { matched: true, score: 1.0 }
    }

    // ファジー検索
    if (options.useFuzzySearch) {
      const fuzzyResult = FuzzySearch.partialMatch(normalizedValue, normalizedField, {
        threshold: options.fuzzyThreshold || 0.7
      })

      if (fuzzyResult.matched) {
        return { matched: true, score: fuzzyResult.score }
      }
    }

    return { matched: false, score: 0 }
  }
}