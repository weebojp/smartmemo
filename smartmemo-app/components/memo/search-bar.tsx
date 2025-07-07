'use client'

import { useState, useTransition, forwardRef, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Sparkles, Type, Loader2, Clock, Tag, Hash, FolderOpen, X } from 'lucide-react'
import { semanticSearch, textSearch, hybridSearch, complexSearch, fuzzySearch } from '@/lib/actions/search'
import { getSearchSuggestions, recordSearchHistory } from '@/lib/actions/search-history'

type SearchType = 'text' | 'semantic' | 'hybrid' | 'complex' | 'fuzzy'

interface SearchSuggestion {
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

interface SearchResult {
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
  searchType: 'text' | 'semantic'
  rankScore?: number
}

interface SearchBarProps {
  onResults: (results: SearchResult[], query?: string) => void
  onClear: () => void
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ onResults, onClear }, ref) => {
    const [query, setQuery] = useState('')
    const [searchType, setSearchType] = useState<SearchType>('hybrid')
    const [isPending, startTransition] = useTransition()
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
    const [suggestionsPending, setSuggestionsPending] = useState(false)
    
    const suggestionTimeoutRef = useRef<NodeJS.Timeout>()
    const inputRef = useRef<HTMLInputElement>(null)
    const suggestionsRef = useRef<HTMLDivElement>(null)

  // 検索候補を取得
  const fetchSuggestions = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setSuggestionsPending(true)
    try {
      const result = await getSearchSuggestions(searchQuery)
      if (result.success) {
        setSuggestions(result.data)
        setShowSuggestions(true)
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    }
    setSuggestionsPending(false)
  }

  // デバウンス付きで検索候補を取得
  const debouncedFetchSuggestions = (searchQuery: string) => {
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current)
    }
    
    suggestionTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(searchQuery)
    }, 300)
  }

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      onClear()
      return
    }

    setShowSuggestions(false)
    const startTime = Date.now()

    startTransition(async () => {
      try {
        let results: SearchResult[] = []

        switch (searchType) {
          case 'semantic':
            results = await semanticSearch(searchQuery)
            break
          case 'text':
            results = await textSearch(searchQuery)
            break
          case 'complex':
            results = await complexSearch(searchQuery)
            break
          case 'fuzzy':
            results = await fuzzySearch(searchQuery)
            break
          case 'hybrid':
          default:
            results = await hybridSearch(searchQuery)
            break
        }

        // 検索履歴を記録
        const executionTime = Date.now() - startTime
        await recordSearchHistory(searchQuery, searchType, results.length, executionTime)

        onResults(results, searchQuery)
      } catch (error) {
        console.error('Search error:', error)
        onResults([])
      }
    })
  }

  // キーボード操作
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch(query)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedSuggestionIndex >= 0) {
          selectSuggestion(suggestions[selectedSuggestionIndex])
        } else {
          handleSearch(query)
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
        break
    }
  }

  // 候補を選択
  const selectSuggestion = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text)
    setShowSuggestions(false)
    setSelectedSuggestionIndex(-1)
    handleSearch(suggestion.text)
  }

  // 入力変更時の処理
  const handleInputChange = (value: string) => {
    setQuery(value)
    if (value.length > 1) {
      debouncedFetchSuggestions(value)
    } else {
      setShowSuggestions(false)
      setSuggestions([])
    }
  }

  const handleClear = () => {
    setQuery('')
    setShowSuggestions(false)
    setSuggestions([])
    onClear()
  }

  // アイコンを取得
  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'history':
        return <Clock className="h-3 w-3" />
      case 'tag':
        return <Tag className="h-3 w-3" />
      case 'category':
        return <FolderOpen className="h-3 w-3" />
      case 'keyword':
        return <Hash className="h-3 w-3" />
      default:
        return <Search className="h-3 w-3" />
    }
  }

  // 外部クリックで候補を閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1" ref={suggestionsRef}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="メモを検索... (例: tag:プログラミング, category:技術)"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (query.length > 1) {
                setShowSuggestions(true)
              }
            }}
            className="pl-10 pr-4"
          />
          {(isPending || suggestionsPending) && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          
          {/* 検索候補 */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent transition-colors ${
                    index === selectedSuggestionIndex ? 'bg-accent' : ''
                  }`}
                  onClick={() => selectSuggestion(suggestion)}
                >
                  <span className="text-muted-foreground">
                    {getSuggestionIcon(suggestion.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {suggestion.text}
                    </div>
                    {suggestion.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {suggestion.description}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {suggestion.type === 'history' ? '履歴' :
                     suggestion.type === 'tag' ? 'タグ' :
                     suggestion.type === 'category' ? 'カテゴリ' :
                     suggestion.type === 'keyword' ? 'キーワード' : '候補'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
        <Button
          onClick={() => handleSearch(query)}
          disabled={isPending || !query.trim()}
          variant="default"
        >
          検索
        </Button>
        {query && (
          <Button
            onClick={handleClear}
            variant="outline"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Type Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">検索モード:</span>
        <div className="flex gap-1 flex-wrap">
          <Badge
            variant={searchType === 'hybrid' ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setSearchType('hybrid')}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            スマート
          </Badge>
          <Badge
            variant={searchType === 'semantic' ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setSearchType('semantic')}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            セマンティック
          </Badge>
          <Badge
            variant={searchType === 'text' ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setSearchType('text')}
          >
            <Type className="h-3 w-3 mr-1" />
            テキスト
          </Badge>
          <Badge
            variant={searchType === 'complex' ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setSearchType('complex')}
          >
            <Search className="h-3 w-3 mr-1" />
            複合
          </Badge>
          <Badge
            variant={searchType === 'fuzzy' ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setSearchType('fuzzy')}
          >
            <Hash className="h-3 w-3 mr-1" />
            ファジー
          </Badge>
        </div>
      </div>

      {/* Search Tips */}
      {searchType === 'semantic' && (
        <div className="text-xs text-muted-foreground">
          💡 セマンティック検索は意味による検索です（キーワードだけでなく文脈も理解）
        </div>
      )}
      {searchType === 'text' && (
        <div className="text-xs text-muted-foreground">
          💡 テキスト検索はコンテンツ、タグ、カテゴリの完全一致検索です
        </div>
      )}
      {searchType === 'hybrid' && (
        <div className="text-xs text-muted-foreground">
          💡 スマート検索はセマンティック検索とキーワード検索を組み合わせます
        </div>
      )}
      {searchType === 'complex' && (
        <div className="text-xs text-muted-foreground">
          💡 複合検索はAND、OR、NOT演算子とフィールド検索（tag:AI, category:技術）に対応
        </div>
      )}
      {searchType === 'fuzzy' && (
        <div className="text-xs text-muted-foreground">
          💡 ファジー検索はタイポや表記ゆれに強い検索です（プログラム ≈ プログラミング）
        </div>
      )}
    </div>
  )
})

SearchBar.displayName = 'SearchBar'