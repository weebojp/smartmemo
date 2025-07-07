'use client'

import { useState, useTransition, forwardRef, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Sparkles, Type, Loader2, Clock, Tag, Hash, FolderOpen, X, Brain, Zap, Filter } from 'lucide-react'
import { semanticSearch, textSearch, hybridSearch, complexSearch, fuzzySearch } from '@/lib/actions/search'
import { getSearchSuggestions, recordSearchHistory } from '@/lib/actions/search-history'

type SearchType = 'hybrid' | 'semantic' | 'text' | 'fuzzy' | 'complex'

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

interface EnhancedSearchBarProps {
  onResults: (results: SearchResult[], query?: string) => void
  onClear: () => void
}

const searchModes = [
  {
    id: 'hybrid' as SearchType,
    name: 'スマート検索',
    icon: Zap,
    description: 'AI + テキスト検索',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
  },
  {
    id: 'semantic' as SearchType,
    name: 'AI検索',
    icon: Brain,
    description: '意味で検索',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
  },
  {
    id: 'text' as SearchType,
    name: 'テキスト検索',
    icon: Type,
    description: 'キーワード検索',
    color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
  },
  {
    id: 'fuzzy' as SearchType,
    name: 'あいまい検索',
    icon: Hash,
    description: '類似文字検索',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
  },
  {
    id: 'complex' as SearchType,
    name: '高度検索',
    icon: Filter,
    description: '複合条件検索',
    color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
  }
]

export const EnhancedSearchBar = forwardRef<HTMLInputElement, EnhancedSearchBarProps>(
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
            prev < suggestions.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1)
          break
        case 'Enter':
          e.preventDefault()
          if (selectedSuggestionIndex >= 0) {
            const selectedSuggestion = suggestions[selectedSuggestionIndex]
            setQuery(selectedSuggestion.text)
            handleSearch(selectedSuggestion.text)
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = e.target.value
      setQuery(newQuery)
      setSelectedSuggestionIndex(-1)
      
      if (newQuery.trim()) {
        debouncedFetchSuggestions(newQuery)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
        onClear()
      }
    }

    const handleSuggestionClick = (suggestion: SearchSuggestion) => {
      setQuery(suggestion.text)
      handleSearch(suggestion.text)
      setShowSuggestions(false)
    }

    const handleClear = () => {
      setQuery('')
      setSuggestions([])
      setShowSuggestions(false)
      onClear()
    }

    // 外側クリック時に候補を閉じる
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
          setShowSuggestions(false)
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const currentMode = searchModes.find(mode => mode.id === searchType)

    return (
      <div className="w-full space-y-4">
        {/* 検索モード選択 */}
        <div className="flex flex-wrap gap-2">
          {searchModes.map((mode) => (
            <Button
              key={mode.id}
              variant={searchType === mode.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchType(mode.id)}
              className={`flex items-center gap-2 ${
                searchType === mode.id ? '' : 'hover:' + mode.color
              }`}
            >
              <mode.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{mode.name}</span>
              <span className="sm:hidden">{mode.name.charAt(0)}</span>
            </Button>
          ))}
        </div>

        {/* 現在のモード説明 */}
        {currentMode && (
          <div className={`p-3 rounded-lg ${currentMode.color}`}>
            <div className="flex items-center gap-2">
              <currentMode.icon className="h-4 w-4" />
              <span className="font-medium">{currentMode.name}</span>
              <span className="text-sm opacity-75">- {currentMode.description}</span>
            </div>
          </div>
        )}

        {/* 検索入力 */}
        <div className="relative" ref={suggestionsRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={ref || inputRef}
              type="text"
              placeholder={`${currentMode?.name}でメモを検索...`}
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-20"
              disabled={isPending}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {suggestionsPending && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-8 w-8 p-0 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {query && !isPending && (
                <Button
                  size="sm"
                  onClick={() => handleSearch(query)}
                  className="h-8 px-3"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* 検索候補 */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  className={`px-3 py-2 cursor-pointer border-b last:border-b-0 hover:bg-muted ${
                    index === selectedSuggestionIndex ? 'bg-muted' : ''
                  }`}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="flex items-center gap-2">
                    {suggestion.type === 'history' && <Clock className="h-3 w-3 text-muted-foreground" />}
                    {suggestion.type === 'tag' && <Tag className="h-3 w-3 text-blue-500" />}
                    {suggestion.type === 'category' && <FolderOpen className="h-3 w-3 text-green-500" />}
                    {suggestion.type === 'content' && <Type className="h-3 w-3 text-gray-500" />}
                    {suggestion.type === 'ai' && <Sparkles className="h-3 w-3 text-purple-500" />}
                    {suggestion.type === 'keyword' && <Hash className="h-3 w-3 text-orange-500" />}
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{suggestion.text}</div>
                      {suggestion.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {suggestion.description}
                        </div>
                      )}
                    </div>
                    
                    <Badge variant="outline" className="text-xs">
                      {suggestion.type === 'history' && '履歴'}
                      {suggestion.type === 'tag' && 'タグ'}
                      {suggestion.type === 'category' && 'カテゴリ'}
                      {suggestion.type === 'content' && 'コンテンツ'}
                      {suggestion.type === 'ai' && 'AI'}
                      {suggestion.type === 'keyword' && 'キーワード'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
)

EnhancedSearchBar.displayName = 'EnhancedSearchBar'