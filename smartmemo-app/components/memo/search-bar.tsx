'use client'

import { useState, useTransition, forwardRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Sparkles, Type, Loader2 } from 'lucide-react'
import { semanticSearch, textSearch, hybridSearch } from '@/lib/actions/search'

type SearchType = 'text' | 'semantic' | 'hybrid'

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
  onResults: (results: SearchResult[]) => void
  onClear: () => void
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ onResults, onClear }, ref) => {
    const [query, setQuery] = useState('')
    const [searchType, setSearchType] = useState<SearchType>('hybrid')
    const [isPending, startTransition] = useTransition()

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      onClear()
      return
    }

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
          case 'hybrid':
          default:
            results = await hybridSearch(searchQuery)
            break
        }

        onResults(results)
      } catch (error) {
        console.error('Search error:', error)
        onResults([])
      }
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(query)
    }
  }

  const handleClear = () => {
    setQuery('')
    onClear()
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={ref}
            placeholder="Search your memos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10 pr-4"
          />
          {isPending && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button
          onClick={() => handleSearch(query)}
          disabled={isPending || !query.trim()}
          variant="default"
        >
          Search
        </Button>
        {query && (
          <Button
            onClick={handleClear}
            variant="outline"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Search Type Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Search mode:</span>
        <div className="flex gap-1">
          <Badge
            variant={searchType === 'hybrid' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSearchType('hybrid')}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Smart
          </Badge>
          <Badge
            variant={searchType === 'semantic' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSearchType('semantic')}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Semantic
          </Badge>
          <Badge
            variant={searchType === 'text' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSearchType('text')}
          >
            <Type className="h-3 w-3 mr-1" />
            Text
          </Badge>
        </div>
      </div>

      {/* Search Tips */}
      {searchType === 'semantic' && (
        <div className="text-xs text-muted-foreground">
          💡 Semantic search finds memos by meaning, not just keywords
        </div>
      )}
      {searchType === 'text' && (
        <div className="text-xs text-muted-foreground">
          💡 Text search looks for exact matches in content, tags, and categories
        </div>
      )}
      {searchType === 'hybrid' && (
        <div className="text-xs text-muted-foreground">
          💡 Smart search combines semantic understanding with keyword matching
        </div>
      )}
    </div>
  )
})

SearchBar.displayName = 'SearchBar'