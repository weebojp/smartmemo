'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  testAIFunctionality, 
  reprocessMemo, 
  checkAIProcessingStatus 
} from '@/lib/actions/debug-ai'
import { 
  Sparkles, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Play,
  BarChart3
} from 'lucide-react'

export function AIDebugPanel() {
  const [testResult, setTestResult] = useState<any>(null)
  const [processingStats, setProcessingStats] = useState<any>(null)
  const [selectedMemoId, setSelectedMemoId] = useState('')
  const [reprocessResult, setReprocessResult] = useState<any>(null)
  const [isPending, startTransition] = useTransition()

  const handleTestAI = () => {
    startTransition(async () => {
      console.log('Starting AI functionality test...')
      const result = await testAIFunctionality()
      setTestResult(result)
      console.log('AI test completed:', result)
    })
  }

  const handleCheckStatus = () => {
    startTransition(async () => {
      console.log('Checking AI processing status...')
      const result = await checkAIProcessingStatus()
      setProcessingStats(result)
      console.log('Status check completed:', result)
    })
  }

  const handleReprocess = () => {
    if (!selectedMemoId.trim()) return
    
    startTransition(async () => {
      console.log('Reprocessing memo:', selectedMemoId)
      const result = await reprocessMemo(selectedMemoId.trim())
      setReprocessResult(result)
      console.log('Reprocess completed:', result)
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI機能デバッグパネル
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* AI機能テスト */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleTestAI}
                disabled={isPending}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                AI機能テスト実行
              </Button>
              {isPending && <div className="text-sm text-muted-foreground">実行中...</div>}
            </div>
            
            {testResult && (
              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium">
                    テスト結果: {testResult.success ? '成功' : '失敗'}
                  </span>
                </div>
                
                {testResult.success && testResult.result && (
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>AI処理結果:</strong>
                      <ul className="list-disc list-inside ml-4">
                        <li>タグ: {testResult.result.aiProcessing.tags.join(', ')}</li>
                        <li>カテゴリ: {testResult.result.aiProcessing.category}</li>
                        <li>要約: {testResult.result.aiProcessing.summary}</li>
                        <li>キーワード: {testResult.result.aiProcessing.keywords.join(', ')}</li>
                        <li>埋め込み次元: {testResult.result.aiProcessing.embeddingLength}</li>
                      </ul>
                    </div>
                    <div>
                      <strong>認証状態:</strong> {testResult.result.userAuthenticated ? '認証済み' : '未認証'}
                    </div>
                  </div>
                )}
                
                {!testResult.success && (
                  <div className="text-sm text-red-600">
                    <div><strong>エラー:</strong> {testResult.error}</div>
                    {testResult.details && (
                      <details className="mt-2">
                        <summary>詳細</summary>
                        <pre className="text-xs bg-red-50 p-2 rounded mt-1 overflow-auto">
                          {testResult.details}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 処理状況確認 */}
          <div className="space-y-3">
            <Button 
              onClick={handleCheckStatus}
              disabled={isPending}
              variant="outline"
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              処理状況確認
            </Button>
            
            {processingStats && (
              <div className="p-3 bg-muted rounded-md">
                {processingStats.success ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{processingStats.stats.total}</div>
                        <div className="text-sm text-muted-foreground">総メモ数</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{processingStats.stats.processed}</div>
                        <div className="text-sm text-muted-foreground">AI処理済み</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{processingStats.stats.unprocessed}</div>
                        <div className="text-sm text-muted-foreground">未処理</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{processingStats.stats.withEmbedding}</div>
                        <div className="text-sm text-muted-foreground">埋め込み有り</div>
                      </div>
                    </div>
                    
                    {processingStats.stats.details.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">メモ詳細:</h4>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {processingStats.stats.details.map((memo: any) => (
                            <div key={memo.id} className="flex items-center gap-2 text-sm p-2 bg-background rounded">
                              <div className="flex-1 truncate">{memo.contentPreview}</div>
                              <div className="flex gap-1">
                                {memo.isProcessed ? (
                                  <Badge variant="outline" className="text-green-600">処理済み</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-orange-600">未処理</Badge>
                                )}
                                {memo.hasEmbedding ? (
                                  <Badge variant="outline" className="text-blue-600">埋込有</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-gray-600">埋込無</Badge>
                                )}
                              </div>
                              <code className="text-xs text-muted-foreground">{memo.id.slice(0, 8)}</code>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-red-600">
                    エラー: {processingStats.error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 個別メモ再処理 */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="メモID (UUID)"
                value={selectedMemoId}
                onChange={(e) => setSelectedMemoId(e.target.value)}
                className="flex-1 px-3 py-2 border border-border rounded-md text-sm"
              />
              <Button 
                onClick={handleReprocess}
                disabled={isPending || !selectedMemoId.trim()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                再処理
              </Button>
            </div>
            
            {reprocessResult && (
              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  {reprocessResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium">
                    再処理結果: {reprocessResult.success ? '成功' : '失敗'}
                  </span>
                </div>
                
                {reprocessResult.success && reprocessResult.result && (
                  <div className="text-sm space-y-1">
                    <div><strong>タグ:</strong> {reprocessResult.result.tags.join(', ')}</div>
                    <div><strong>カテゴリ:</strong> {reprocessResult.result.category}</div>
                    <div><strong>要約:</strong> {reprocessResult.result.summary}</div>
                    <div><strong>キーワード:</strong> {reprocessResult.result.keywords.join(', ')}</div>
                    <div><strong>埋め込み次元:</strong> {reprocessResult.result.embeddingLength}</div>
                  </div>
                )}
                
                {!reprocessResult.success && (
                  <div className="text-sm text-red-600">
                    エラー: {reprocessResult.error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 使用方法 */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-600">使用方法</span>
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <div>1. 「AI機能テスト実行」でOpenAI APIとの接続をテスト</div>
              <div>2. 「処理状況確認」で既存メモのAI処理状況を確認</div>
              <div>3. 未処理のメモIDを入力して「再処理」で個別にAI処理を実行</div>
              <div>4. ブラウザの開発者ツール（F12）のConsoleタブでログを確認</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}