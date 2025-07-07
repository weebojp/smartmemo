'use client'

import { useState, useRef } from 'react'
// Using simplified modal instead of complex Dialog component
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { 
  Upload, 
  File, 
  FileText, 
  Code, 
  Database, 
  AlertCircle, 
  CheckCircle,
  Settings
} from 'lucide-react'
import { 
  parseMarkdownImport,
  parseJSONImport,
  parseCSVImport,
  parseObsidianImport,
  ImportOptions,
  ImportResult,
  ParsedMemo
} from '@/lib/import/import-parser'

interface ImportDialogProps {
  trigger?: React.ReactNode
  onImport: (memos: ParsedMemo[], options: ImportOptions) => Promise<ImportResult>
}

const SUPPORTED_FORMATS = {
  markdown: {
    label: 'Markdown',
    icon: FileText,
    extensions: ['.md', '.markdown', '.txt'],
    description: 'Markdownファイル（フロントマター対応）'
  },
  json: {
    label: 'JSON',
    icon: Code,
    extensions: ['.json'],
    description: 'JSON形式のデータファイル'
  },
  csv: {
    label: 'CSV',
    icon: Database,
    extensions: ['.csv'],
    description: 'カンマ区切り値ファイル'
  },
  obsidian: {
    label: 'Obsidian',
    icon: File,
    extensions: ['.md', '.zip'],
    description: 'Obsidian Vault（ZIP展開済み）'
  }
}

export function ImportDialog({ trigger, onImport }: ImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [parsedMemos, setParsedMemos] = useState<ParsedMemo[]>([])
  const [previewMemos, setPreviewMemos] = useState<ParsedMemo[]>([])
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    preserveTimestamps: true,
    overwriteExisting: false,
    processWithAI: true,
    defaultCategory: '一般',
    tagPrefix: ''
  })
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'options' | 'result'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    setFiles(selectedFiles)
    
    if (selectedFiles.length > 0) {
      processFiles(selectedFiles)
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const droppedFiles = Array.from(event.dataTransfer.files)
    setFiles(droppedFiles)
    processFiles(droppedFiles)
  }

  const processFiles = async (filesToProcess: File[]) => {
    setIsProcessing(true)
    const allParsedMemos: ParsedMemo[] = []

    try {
      for (const file of filesToProcess) {
        const content = await file.text()
        const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
        let memos: ParsedMemo[] = []

        try {
          if (fileExtension === '.md' || fileExtension === '.markdown' || fileExtension === '.txt') {
            if (file.name.toLowerCase().includes('obsidian') || content.includes('===FILE_SEPARATOR===')) {
              memos = parseObsidianImport(content, importOptions)
            } else {
              memos = parseMarkdownImport(content, importOptions)
            }
          } else if (fileExtension === '.json') {
            memos = parseJSONImport(content, importOptions)
          } else if (fileExtension === '.csv') {
            memos = parseCSVImport(content, importOptions)
          } else {
            console.warn(`Unsupported file format: ${fileExtension}`)
            continue
          }

          allParsedMemos.push(...memos)
        } catch (error) {
          console.error(`Error parsing file ${file.name}:`, error)
        }
      }

      setParsedMemos(allParsedMemos)
      setPreviewMemos(allParsedMemos.slice(0, 10)) // 最初の10個をプレビュー
      setCurrentStep('preview')
    } catch (error) {
      console.error('File processing error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = async () => {
    if (parsedMemos.length === 0) return

    setIsProcessing(true)
    try {
      const result = await onImport(parsedMemos, importOptions)
      setImportResult(result)
      setCurrentStep('result')
    } catch (error) {
      console.error('Import error:', error)
      setImportResult({
        success: false,
        imported: 0,
        skipped: 0,
        errors: [{ message: '不明なエラーが発生しました' }]
      })
      setCurrentStep('result')
    } finally {
      setIsProcessing(false)
    }
  }

  const resetDialog = () => {
    setFiles([])
    setParsedMemos([])
    setPreviewMemos([])
    setImportResult(null)
    setCurrentStep('upload')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const closeDialog = () => {
    setIsOpen(false)
    setTimeout(resetDialog, 300) // アニメーション完了後にリセット
  }

  return (
    <>
      {/* Trigger Button */}
      <div onClick={() => setIsOpen(true)}>
        {trigger || (
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            インポート
          </Button>
        )}
      </div>
      
      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg max-w-4xl max-h-[80vh] w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="border-b p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    メモをインポート
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Markdown、JSON、CSV、Obsidian形式のファイルからメモをインポートできます
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={closeDialog}>
                  ×
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* ステップインジケーター */}
          <div className="flex items-center justify-center gap-2 pb-4 border-b">
            {['upload', 'preview', 'options', 'result'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep === step ? 'bg-primary text-primary-foreground' : 
                    ['upload', 'preview', 'options'].indexOf(currentStep) > ['upload', 'preview', 'options'].indexOf(step) || currentStep === 'result'
                      ? 'bg-green-500 text-white' 
                      : 'bg-muted text-muted-foreground'}
                `}>
                  {index + 1}
                </div>
                {index < 3 && <div className="w-8 h-px bg-border mx-2" />}
              </div>
            ))}
          </div>

          {/* Step 1: ファイルアップロード */}
          {currentStep === 'upload' && (
            <div className="space-y-6">
              {/* サポートされている形式 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(SUPPORTED_FORMATS).map(([key, format]) => {
                  const Icon = format.icon
                  return (
                    <Card key={key} className="text-center p-3">
                      <Icon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <div className="font-medium">{format.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {format.extensions.join(', ')}
                      </div>
                    </Card>
                  )
                })}
              </div>

              {/* ファイル選択エリア */}
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <div className="text-lg font-medium mb-2">ファイルをドロップまたはクリックして選択</div>
                <div className="text-sm text-muted-foreground">
                  複数ファイルの同時選択に対応しています
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".md,.markdown,.txt,.json,.csv,.zip"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* 選択されたファイル */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">選択されたファイル</h3>
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <File className="h-4 w-4" />
                      <div className="flex-1">
                        <div className="font-medium">{file.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: プレビュー */}
          {currentStep === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  インポート予定のメモ ({parsedMemos.length}個)
                </h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentStep('options')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  オプション設定
                </Button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {previewMemos.map((memo, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-2">
                      {memo.title && (
                        <div className="font-medium">{memo.title}</div>
                      )}
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {memo.content.slice(0, 150)}...
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {memo.category && (
                          <Badge variant="outline">
                            {memo.category}
                          </Badge>
                        )}
                        {memo.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {memo.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{memo.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {parsedMemos.length > 10 && (
                <div className="text-center text-sm text-muted-foreground">
                  その他 {parsedMemos.length - 10}個のメモ
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                  戻る
                </Button>
                <Button onClick={handleImport} disabled={isProcessing}>
                  {isProcessing ? 'インポート中...' : 'インポート実行'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: インポートオプション */}
          {currentStep === 'options' && (
            <div className="space-y-6">
              <h3 className="font-medium">インポートオプション</h3>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="preserveTimestamps"
                    checked={importOptions.preserveTimestamps}
                    onCheckedChange={(checked: boolean) => 
                      setImportOptions(prev => ({ ...prev, preserveTimestamps: !!checked }))
                    }
                  />
                  <Label htmlFor="preserveTimestamps">元のタイムスタンプを保持</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="overwriteExisting"
                    checked={importOptions.overwriteExisting}
                    onCheckedChange={(checked: boolean) => 
                      setImportOptions(prev => ({ ...prev, overwriteExisting: !!checked }))
                    }
                  />
                  <Label htmlFor="overwriteExisting">既存のメモを上書き</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="processWithAI"
                    checked={importOptions.processWithAI}
                    onCheckedChange={(checked: boolean) => 
                      setImportOptions(prev => ({ ...prev, processWithAI: !!checked }))
                    }
                  />
                  <Label htmlFor="processWithAI">AI処理を実行（タグ生成、要約など）</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultCategory">デフォルトカテゴリ</Label>
                  <Input
                    id="defaultCategory"
                    value={importOptions.defaultCategory || ''}
                    onChange={(e) => 
                      setImportOptions(prev => ({ ...prev, defaultCategory: e.target.value }))
                    }
                    placeholder="一般"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagPrefix">タグプレフィックス</Label>
                  <Input
                    id="tagPrefix"
                    value={importOptions.tagPrefix || ''}
                    onChange={(e) => 
                      setImportOptions(prev => ({ ...prev, tagPrefix: e.target.value }))
                    }
                    placeholder="import_"
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep('preview')}>
                  戻る
                </Button>
                <Button onClick={handleImport} disabled={isProcessing}>
                  {isProcessing ? 'インポート中...' : 'インポート実行'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: インポート結果 */}
          {currentStep === 'result' && importResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {importResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <h3 className="font-medium">
                  {importResult.success ? 'インポート完了' : 'インポートエラー'}
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card className="text-center p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {importResult.imported}
                  </div>
                  <div className="text-sm text-muted-foreground">インポート済み</div>
                </Card>
                <Card className="text-center p-4">
                  <div className="text-2xl font-bold text-yellow-600">
                    {importResult.skipped}
                  </div>
                  <div className="text-sm text-muted-foreground">スキップ</div>
                </Card>
                <Card className="text-center p-4">
                  <div className="text-2xl font-bold text-red-600">
                    {importResult.errors.length}
                  </div>
                  <div className="text-sm text-muted-foreground">エラー</div>
                </Card>
              </div>

              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-600">エラー詳細</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="text-sm bg-red-50 p-2 rounded">
                        {error.line && `Line ${error.line}: `}{error.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={closeDialog}>
                  完了
                </Button>
              </div>
            </div>
          )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}