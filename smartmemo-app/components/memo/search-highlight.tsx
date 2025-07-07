'use client'

import { useMemo } from 'react'
import { FuzzySearch } from '@/lib/search/fuzzy-search'
import { TextNormalizer } from '@/lib/search/text-normalizer'

interface SearchHighlightProps {
  text: string
  searchQuery: string
  className?: string
  highlightClassName?: string
  maxLength?: number
  showSnippets?: boolean
  snippetLength?: number
  maxSnippets?: number
}

interface HighlightMatch {
  start: number
  end: number
  score: number
}

export function SearchHighlight({
  text,
  searchQuery,
  className = '',
  highlightClassName = 'bg-yellow-200 dark:bg-yellow-800 px-1 rounded',
  maxLength = 500,
  showSnippets = false,
  snippetLength = 100,
  maxSnippets = 3
}: SearchHighlightProps) {
  const highlightedContent = useMemo(() => {
    if (!searchQuery.trim() || !text) {
      const displayText = maxLength && text.length > maxLength 
        ? text.substring(0, maxLength) + '...' 
        : text
      return { content: displayText, hasMatches: false }
    }

    // ハイライト情報を生成
    const highlightData = FuzzySearch.generateHighlight(searchQuery, text, {
      normalizeText: true,
      caseSensitive: false
    })

    if (!highlightData.highlighted.length) {
      const displayText = maxLength && text.length > maxLength 
        ? text.substring(0, maxLength) + '...' 
        : text
      return { content: displayText, hasMatches: false }
    }

    if (showSnippets) {
      return generateSnippets(text, highlightData.highlighted, snippetLength, maxSnippets, highlightClassName)
    } else {
      return highlightText(text, highlightData.highlighted, maxLength, highlightClassName)
    }
  }, [text, searchQuery, maxLength, showSnippets, snippetLength, maxSnippets, highlightClassName])

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: highlightedContent.content }}
    />
  )
}

// テキスト全体をハイライト
function highlightText(
  text: string, 
  matches: HighlightMatch[], 
  maxLength?: number,
  highlightClassName?: string
): { content: string; hasMatches: boolean } {
  if (!matches.length) {
    const displayText = maxLength && text.length > maxLength 
      ? text.substring(0, maxLength) + '...' 
      : text
    return { content: escapeHtml(displayText), hasMatches: false }
  }

  // 重複するマッチをマージ
  const mergedMatches = mergeOverlappingMatches(matches)
  
  // テキストを切り詰める場合は、マッチを含む範囲を優先
  let displayText = text
  let offset = 0
  
  if (maxLength && text.length > maxLength) {
    const firstMatch = mergedMatches[0]
    const start = Math.max(0, firstMatch.start - Math.floor((maxLength - (firstMatch.end - firstMatch.start)) / 2))
    const end = Math.min(text.length, start + maxLength)
    
    displayText = text.substring(start, end)
    if (start > 0) displayText = '...' + displayText
    if (end < text.length) displayText = displayText + '...'
    
    offset = start
  }

  // ハイライトを適用
  let highlightedText = ''
  let lastIndex = 0

  for (const match of mergedMatches) {
    const adjustedStart = Math.max(0, match.start - offset)
    const adjustedEnd = Math.min(displayText.length, match.end - offset)
    
    if (adjustedStart >= displayText.length || adjustedEnd <= 0) continue
    
    // マッチより前の部分
    highlightedText += escapeHtml(displayText.substring(lastIndex, adjustedStart))
    
    // マッチした部分をハイライト
    const matchText = displayText.substring(adjustedStart, adjustedEnd)
    highlightedText += `<span class="${highlightClassName}">${escapeHtml(matchText)}</span>`
    
    lastIndex = adjustedEnd
  }

  // 残りの部分
  highlightedText += escapeHtml(displayText.substring(lastIndex))

  return { content: highlightedText, hasMatches: true }
}

// スニペットを生成
function generateSnippets(
  text: string,
  matches: HighlightMatch[],
  snippetLength: number,
  maxSnippets: number,
  highlightClassName?: string
): { content: string; hasMatches: boolean } {
  if (!matches.length) {
    const snippet = text.length > snippetLength 
      ? text.substring(0, snippetLength) + '...' 
      : text
    return { content: escapeHtml(snippet), hasMatches: false }
  }

  const mergedMatches = mergeOverlappingMatches(matches)
  const snippets: string[] = []

  for (let i = 0; i < Math.min(mergedMatches.length, maxSnippets); i++) {
    const match = mergedMatches[i]
    const halfSnippet = Math.floor(snippetLength / 2)
    
    const start = Math.max(0, match.start - halfSnippet)
    const end = Math.min(text.length, match.end + halfSnippet)
    
    let snippet = text.substring(start, end)
    
    // 前後に省略記号を追加
    if (start > 0) snippet = '...' + snippet
    if (end < text.length) snippet = snippet + '...'
    
    // マッチ部分をハイライト
    const relativeMatchStart = match.start - start + (start > 0 ? 3 : 0) // '...' の分を調整
    const relativeMatchEnd = match.end - start + (start > 0 ? 3 : 0)
    
    const highlightedSnippet = 
      escapeHtml(snippet.substring(0, relativeMatchStart)) +
      `<span class="${highlightClassName}">` +
      escapeHtml(snippet.substring(relativeMatchStart, relativeMatchEnd)) +
      '</span>' +
      escapeHtml(snippet.substring(relativeMatchEnd))
    
    snippets.push(highlightedSnippet)
  }

  return { 
    content: snippets.join('<br/><br/>'), 
    hasMatches: true 
  }
}

// 重複するマッチをマージ
function mergeOverlappingMatches(matches: HighlightMatch[]): HighlightMatch[] {
  if (!matches.length) return []

  const sorted = [...matches].sort((a, b) => a.start - b.start)
  const merged: HighlightMatch[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    const last = merged[merged.length - 1]

    if (current.start <= last.end) {
      // 重複している場合はマージ
      last.end = Math.max(last.end, current.end)
      last.score = Math.max(last.score, current.score)
    } else {
      merged.push(current)
    }
  }

  return merged
}

// HTML エスケープ
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// 複数の検索語に対応したハイライト
export function MultiQueryHighlight({
  text,
  searchQueries,
  className = '',
  highlightClassName = 'bg-yellow-200 dark:bg-yellow-800 px-1 rounded',
  maxLength = 500
}: {
  text: string
  searchQueries: string[]
  className?: string
  highlightClassName?: string
  maxLength?: number
}) {
  const highlightedContent = useMemo(() => {
    if (!searchQueries.length || !text) {
      const displayText = maxLength && text.length > maxLength 
        ? text.substring(0, maxLength) + '...' 
        : text
      return escapeHtml(displayText)
    }

    const allMatches: HighlightMatch[] = []

    // 各検索語でマッチを取得
    for (const query of searchQueries) {
      if (query.trim()) {
        const highlightData = FuzzySearch.generateHighlight(query, text, {
          normalizeText: true,
          caseSensitive: false
        })
        allMatches.push(...highlightData.highlighted)
      }
    }

    if (!allMatches.length) {
      const displayText = maxLength && text.length > maxLength 
        ? text.substring(0, maxLength) + '...' 
        : text
      return escapeHtml(displayText)
    }

    return highlightText(text, allMatches, maxLength, highlightClassName).content
  }, [text, searchQueries, maxLength, highlightClassName])

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: highlightedContent }}
    />
  )
}

// タグ用のハイライト
export function TagHighlight({
  tags,
  searchQuery,
  className = '',
  maxDisplayTags = 5,
  showAllTags = false
}: {
  tags: string[]
  searchQuery: string
  className?: string
  maxDisplayTags?: number
  showAllTags?: boolean
}) {
  if (!tags.length) return null

  const normalizedQuery = TextNormalizer.normalizeForSearch(searchQuery)
  
  // 表示するタグの数を決定
  const displayTags = showAllTags ? tags : tags.slice(0, maxDisplayTags)
  const remainingCount = tags.length - displayTags.length

  return (
    <div className={className}>
      {displayTags.map((tag, index) => {
        const normalizedTag = TextNormalizer.normalizeForSearch(tag)
        const isMatch = normalizedTag.includes(normalizedQuery) || 
                       FuzzySearch.partialMatch(normalizedQuery, normalizedTag, { threshold: 0.7 }).matched

        return (
          <span
            key={index}
            className={`inline-block px-2 py-1 rounded-full text-xs mr-1 mb-1 ${
              isMatch 
                ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100'
                : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
            }`}
          >
            {tag}
          </span>
        )
      })}
      {remainingCount > 0 && (
        <span className="inline-block px-2 py-1 rounded-full text-xs mr-1 mb-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
          +{remainingCount}
        </span>
      )}
    </div>
  )
}