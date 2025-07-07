/**
 * ファジー検索ライブラリ
 * レーベンシュタイン距離を使用した類似度検索
 */

import { TextNormalizer } from './text-normalizer'

export interface FuzzySearchOptions {
  threshold?: number  // 0.0-1.0 (0.8 = 80%一致で検索)
  maxDistance?: number  // 最大レーベンシュタイン距離
  normalizeText?: boolean  // テキスト正規化を適用
  caseSensitive?: boolean  // 大文字小文字を区別
  includeScore?: boolean  // スコアを含める
}

export interface FuzzyMatchResult {
  text: string
  score: number  // 0.0-1.0 (1.0が完全一致)
  distance: number  // レーベンシュタイン距離
  matched: boolean
}

export class FuzzySearch {
  /**
   * レーベンシュタイン距離を計算
   */
  static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []
    
    // 空文字列の場合
    if (str1.length === 0) return str2.length
    if (str2.length === 0) return str1.length
    
    // マトリックスの初期化
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    // 距離計算
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // 置換
            matrix[i][j - 1] + 1,     // 挿入
            matrix[i - 1][j] + 1      // 削除
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  /**
   * 類似度スコアを計算（0.0-1.0）
   */
  static calculateSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length)
    if (maxLength === 0) return 1.0
    
    const distance = FuzzySearch.levenshteinDistance(str1, str2)
    return 1.0 - (distance / maxLength)
  }

  /**
   * テキストの類似度を計算
   */
  static match(query: string, target: string, options: FuzzySearchOptions = {}): FuzzyMatchResult {
    const {
      threshold = 0.6,
      maxDistance = 3,
      normalizeText = true,
      caseSensitive = false,
      includeScore = true
    } = options

    let normalizedQuery = query
    let normalizedTarget = target

    // テキスト正規化
    if (normalizeText) {
      normalizedQuery = TextNormalizer.normalizeForSearch(query)
      normalizedTarget = TextNormalizer.normalizeForSearch(target)
    }

    // 大文字小文字の処理
    if (!caseSensitive) {
      normalizedQuery = normalizedQuery.toLowerCase()
      normalizedTarget = normalizedTarget.toLowerCase()
    }

    // 類似度計算
    const distance = FuzzySearch.levenshteinDistance(normalizedQuery, normalizedTarget)
    const score = FuzzySearch.calculateSimilarity(normalizedQuery, normalizedTarget)

    // 閾値チェック
    const matched = score >= threshold && distance <= maxDistance

    return {
      text: target,
      score: includeScore ? score : 0,
      distance,
      matched
    }
  }

  /**
   * 複数のテキストから最も類似したものを検索
   */
  static searchBest(query: string, targets: string[], options: FuzzySearchOptions = {}): FuzzyMatchResult | null {
    const results = targets
      .map(target => FuzzySearch.match(query, target, options))
      .filter(result => result.matched)
      .sort((a, b) => b.score - a.score)

    return results.length > 0 ? results[0] : null
  }

  /**
   * 複数のテキストから類似したものを全て検索
   */
  static searchAll(query: string, targets: string[], options: FuzzySearchOptions = {}): FuzzyMatchResult[] {
    return targets
      .map(target => FuzzySearch.match(query, target, options))
      .filter(result => result.matched)
      .sort((a, b) => b.score - a.score)
  }

  /**
   * 部分一致を含むファジー検索
   */
  static partialMatch(query: string, target: string, options: FuzzySearchOptions = {}): FuzzyMatchResult {
    const {
      threshold = 0.6,
      normalizeText = true,
      caseSensitive = false
    } = options

    let normalizedQuery = query
    let normalizedTarget = target

    // テキスト正規化
    if (normalizeText) {
      normalizedQuery = TextNormalizer.normalizeForPartialMatch(query)
      normalizedTarget = TextNormalizer.normalizeForPartialMatch(target)
    }

    // 大文字小文字の処理
    if (!caseSensitive) {
      normalizedQuery = normalizedQuery.toLowerCase()
      normalizedTarget = normalizedTarget.toLowerCase()
    }

    // 部分一致チェック
    if (normalizedTarget.includes(normalizedQuery)) {
      return {
        text: target,
        score: 1.0,
        distance: 0,
        matched: true
      }
    }

    // 単語分割して部分一致検索
    const queryWords = normalizedQuery.split(/\s+/)
    const targetWords = normalizedTarget.split(/\s+/)

    let bestScore = 0
    let bestDistance = Infinity

    for (const queryWord of queryWords) {
      for (const targetWord of targetWords) {
        const result = FuzzySearch.match(queryWord, targetWord, { ...options, includeScore: true })
        if (result.matched && result.score > bestScore) {
          bestScore = result.score
          bestDistance = result.distance
        }
      }
    }

    return {
      text: target,
      score: bestScore,
      distance: bestDistance,
      matched: bestScore >= threshold
    }
  }

  /**
   * 日本語特化のファジー検索
   */
  static japaneseMatch(query: string, target: string, options: FuzzySearchOptions = {}): FuzzyMatchResult {
    const {
      threshold = 0.6,
      maxDistance = 2
    } = options

    // 複数の正規化バリエーションを生成
    const queryVariations = TextNormalizer.generateVariations(query)
    const targetVariations = TextNormalizer.generateVariations(target)

    let bestScore = 0
    let bestDistance = Infinity

    // 全ての組み合わせで比較
    for (const queryVar of queryVariations) {
      for (const targetVar of targetVariations) {
        const distance = FuzzySearch.levenshteinDistance(queryVar, targetVar)
        const score = FuzzySearch.calculateSimilarity(queryVar, targetVar)

        if (score > bestScore) {
          bestScore = score
          bestDistance = distance
        }
      }
    }

    return {
      text: target,
      score: bestScore,
      distance: bestDistance,
      matched: bestScore >= threshold && bestDistance <= maxDistance
    }
  }

  /**
   * 複数クエリのAND検索
   */
  static multiQueryMatch(queries: string[], target: string, options: FuzzySearchOptions = {}): FuzzyMatchResult {
    const results = queries.map(query => FuzzySearch.partialMatch(query, target, options))
    
    // 全てのクエリがマッチしている場合のみ成功
    const allMatched = results.every(result => result.matched)
    
    if (!allMatched) {
      return {
        text: target,
        score: 0,
        distance: Infinity,
        matched: false
      }
    }

    // 平均スコアを計算
    const avgScore = results.reduce((sum, result) => sum + result.score, 0) / results.length
    const maxDistance = Math.max(...results.map(result => result.distance))

    return {
      text: target,
      score: avgScore,
      distance: maxDistance,
      matched: true
    }
  }

  /**
   * 複数クエリのOR検索
   */
  static multiQueryOrMatch(queries: string[], target: string, options: FuzzySearchOptions = {}): FuzzyMatchResult {
    const results = queries.map(query => FuzzySearch.partialMatch(query, target, options))
    
    // 最も高いスコアを採用
    const bestResult = results.reduce((best, current) => 
      current.score > best.score ? current : best
    )

    return bestResult
  }

  /**
   * タグ検索用の特化型ファジー検索
   */
  static tagMatch(query: string, tags: string[], options: FuzzySearchOptions = {}): FuzzyMatchResult[] {
    const { threshold = 0.7 } = options

    return tags
      .map(tag => FuzzySearch.partialMatch(query, tag, { ...options, threshold }))
      .filter(result => result.matched)
      .sort((a, b) => b.score - a.score)
  }

  /**
   * 検索結果のハイライト情報を生成
   */
  static generateHighlight(query: string, text: string, options: FuzzySearchOptions = {}): {
    text: string
    highlighted: Array<{ start: number; end: number; score: number }>
  } {
    const { normalizeText = true, caseSensitive = false } = options

    let normalizedQuery = query
    let normalizedText = text

    if (normalizeText) {
      normalizedQuery = TextNormalizer.normalizeForPartialMatch(query)
      normalizedText = TextNormalizer.normalizeForPartialMatch(text)
    }

    if (!caseSensitive) {
      normalizedQuery = normalizedQuery.toLowerCase()
      normalizedText = normalizedText.toLowerCase()
    }

    const highlighted: Array<{ start: number; end: number; score: number }> = []

    // 完全一致の検索
    let startIndex = 0
    while (true) {
      const index = normalizedText.indexOf(normalizedQuery, startIndex)
      if (index === -1) break

      highlighted.push({
        start: index,
        end: index + normalizedQuery.length,
        score: 1.0
      })

      startIndex = index + 1
    }

    // 部分一致の検索（単語単位）
    const queryWords = normalizedQuery.split(/\s+/)
    for (const word of queryWords) {
      startIndex = 0
      while (true) {
        const index = normalizedText.indexOf(word, startIndex)
        if (index === -1) break

        // 既存のハイライトと重複しないかチェック
        const overlaps = highlighted.some(h => 
          index < h.end && index + word.length > h.start
        )

        if (!overlaps) {
          highlighted.push({
            start: index,
            end: index + word.length,
            score: 0.8
          })
        }

        startIndex = index + 1
      }
    }

    return {
      text,
      highlighted: highlighted.sort((a, b) => a.start - b.start)
    }
  }
}