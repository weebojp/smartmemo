'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { X, Search, HelpCircle } from 'lucide-react'
import { helpSections, faqs, searchHelp, HelpSection, FAQ } from '@/lib/data/help-content'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: string
}

// Category icons for future use
// const categoryIcons = {
//   'getting-started': Lightbulb,
//   'features': Settings,
//   'ai': HelpCircle,
//   'shortcuts': Keyboard,
//   'troubleshooting': AlertCircle
// }

const categoryLabels = {
  'getting-started': '🚀 はじめに',
  'features': '⚡ 機能',
  'ai': '🤖 AI機能',
  'shortcuts': '⌨️ ショートカット',
  'troubleshooting': '🔧 トラブルシューティング'
}

export function HelpModal({ isOpen, onClose, initialTab = 'getting-started' }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ sections: HelpSection[], faqs: FAQ[] } | null>(null)
  const [selectedSection, setSelectedSection] = useState<HelpSection | null>(null)

  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }

      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (searchQuery.trim()) {
      const results = searchHelp(searchQuery)
      setSearchResults(results)
    } else {
      setSearchResults(null)
    }
  }, [searchQuery])

  if (!isOpen) return null

  const handleSectionClick = (section: HelpSection) => {
    setSelectedSection(section)
  }

  const handleBackToList = () => {
    setSelectedSection(null)
  }

  const renderSectionContent = (section: HelpSection) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={handleBackToList}>
          ← 戻る
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{section.icon}</span>
          <h2 className="text-xl font-semibold">{section.title}</h2>
        </div>
      </div>
      
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="text-lg font-bold mb-3 text-primary">{children}</h1>,
            h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-4">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-3">{children}</h3>,
            p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="text-sm">{children}</li>,
            code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
            table: ({ children }) => <table className="w-full border-collapse border border-gray-300 mb-4">{children}</table>,
            th: ({ children }) => <th className="border border-gray-300 bg-gray-50 px-2 py-1 text-left text-xs font-semibold">{children}</th>,
            td: ({ children }) => <td className="border border-gray-300 px-2 py-1 text-xs">{children}</td>,
            blockquote: ({ children }) => <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">{children}</blockquote>
          }}
        >
          {section.content}
        </ReactMarkdown>
      </div>
    </div>
  )

  const renderSectionsList = (sections: HelpSection[]) => (
    <div className="space-y-3">
      {sections.map((section) => {
        return (
          <Card
            key={section.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleSectionClick(section)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{section.icon}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">{section.title}</h3>
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )

  const renderFAQs = (faqList: FAQ[]) => (
    <div className="space-y-3">
      {faqList.map((faq) => (
        <Card key={faq.id}>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm">{faq.question}</h3>
                <Badge variant="outline" className="text-xs">
                  {faq.category}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {faq.answer}
              </p>
              <div className="flex flex-wrap gap-1">
                {faq.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <Card className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden mx-4">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              SmartMemo ヘルプセンター
            </CardTitle>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ヘルプを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        
        <CardContent className="p-0 overflow-auto max-h-[calc(85vh-140px)]">
          {searchResults ? (
            // Search Results
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">
                  検索結果: &quot;{searchQuery}&quot;
                </h2>
                
                {searchResults.sections.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground">ガイド</h3>
                    {renderSectionsList(searchResults.sections)}
                  </div>
                )}
                
                {searchResults.faqs.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground">よくある質問</h3>
                    {renderFAQs(searchResults.faqs)}
                  </div>
                )}
                
                {searchResults.sections.length === 0 && searchResults.faqs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>検索結果が見つかりませんでした。</p>
                    <p className="text-xs mt-2">別のキーワードで検索してみてください。</p>
                  </div>
                )}
              </div>
            </div>
          ) : selectedSection ? (
            // Section Detail
            <div className="p-6">
              {renderSectionContent(selectedSection)}
            </div>
          ) : (
            // Main Help Content
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mx-6 mt-6">
                <TabsTrigger value="guides" className="text-xs">ガイド</TabsTrigger>
                <TabsTrigger value="faq" className="text-xs">FAQ</TabsTrigger>
                <TabsTrigger value="categories" className="text-xs">カテゴリー別</TabsTrigger>
              </TabsList>
              
              <TabsContent value="guides" className="p-6 space-y-4">
                <h2 className="text-lg font-semibold mb-4">クイックガイド</h2>
                {renderSectionsList(helpSections.slice(0, 3))}
              </TabsContent>
              
              <TabsContent value="faq" className="p-6 space-y-4">
                <h2 className="text-lg font-semibold mb-4">よくある質問</h2>
                {renderFAQs(faqs)}
              </TabsContent>
              
              <TabsContent value="categories" className="p-6 space-y-6">
                {Object.entries(categoryLabels).map(([category, label]) => {
                  const categorySections = helpSections.filter(s => s.category === category)
                  if (categorySections.length === 0) return null
                  
                  return (
                    <div key={category}>
                      <h3 className="text-sm font-semibold mb-3 text-muted-foreground">{label}</h3>
                      {renderSectionsList(categorySections)}
                    </div>
                  )
                })}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}