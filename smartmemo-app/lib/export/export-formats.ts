import { Database } from '@/types/database'

type Memo = Database['public']['Tables']['memos']['Row']

export interface ExportOptions {
  format: 'markdown' | 'json' | 'csv' | 'obsidian' | 'roam'
  includeMetadata: boolean
  includeAIGenerated: boolean
  groupBy?: 'category' | 'date' | 'tags' | 'none'
  dateRange?: {
    start: Date
    end: Date
  }
}

export interface ExportResult {
  filename: string
  content: string | Blob
  mimeType: string
}

// Markdown形式でのエクスポート
export function exportToMarkdown(memos: Memo[], options: ExportOptions): ExportResult {
  let content = ''
  
  // フロントマター付きMarkdown
  if (options.includeMetadata) {
    content += '---\n'
    content += `exported_at: ${new Date().toISOString()}\n`
    content += `total_memos: ${memos.length}\n`
    content += `format: markdown\n`
    content += '---\n\n'
  }

  // カテゴリごとにグループ化
  if (options.groupBy === 'category') {
    const groupedMemos = groupMemosByCategory(memos)
    
    Object.entries(groupedMemos).forEach(([category, categoryMemos]) => {
      content += `# ${category || '未分類'}\n\n`
      
      categoryMemos.forEach(memo => {
        content += formatMemoAsMarkdown(memo, options)
        content += '\n---\n\n'
      })
    })
  } else {
    // 時系列順
    const sortedMemos = [...memos].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    
    sortedMemos.forEach(memo => {
      content += formatMemoAsMarkdown(memo, options)
      content += '\n---\n\n'
    })
  }

  return {
    filename: `smartmemo-export-${new Date().toISOString().split('T')[0]}.md`,
    content,
    mimeType: 'text/markdown'
  }
}

// Obsidian形式でのエクスポート
export function exportToObsidian(memos: Memo[], options: ExportOptions): ExportResult {
  const files: Record<string, string> = {}
  
  memos.forEach(memo => {
    const title = memo.content.split('\n')[0].slice(0, 50) || `Memo ${memo.id.slice(0, 8)}`
    const filename = sanitizeFilename(title)
    
    let content = ''
    
    // Obsidianフロントマター
    if (options.includeMetadata) {
      content += '---\n'
      content += `id: ${memo.id}\n`
      content += `created: ${memo.created_at}\n`
      content += `updated: ${memo.updated_at}\n`
      
      if (options.includeAIGenerated) {
        content += `tags: [${memo.tags.map(tag => `"${tag}"`).join(', ')}]\n`
        content += `category: ${memo.category}\n`
        if (memo.summary) {
          content += `summary: "${memo.summary}"\n`
        }
      }
      content += '---\n\n'
    }

    // メモコンテンツ
    content += memo.content_markdown

    // 関連メモへのリンク（将来実装）
    if (options.includeAIGenerated) {
      content += '\n\n## Related\n'
      // TODO: 関連メモの[[wikilink]]を追加
    }

    files[`${filename}.md`] = content
  })

  // ZIP形式で複数ファイルを返す
  const zipContent = createZipFromFiles(files)
  
  return {
    filename: `smartmemo-obsidian-vault-${new Date().toISOString().split('T')[0]}.zip`,
    content: zipContent,
    mimeType: 'application/zip'
  }
}

// JSON形式でのエクスポート
export function exportToJSON(memos: Memo[], options: ExportOptions): ExportResult {
  const exportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      totalMemos: memos.length,
      includeAIGenerated: options.includeAIGenerated,
      version: '1.0'
    },
    memos: memos.map(memo => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const exportMemo: any = {
        id: memo.id,
        content: memo.content,
        content_markdown: memo.content_markdown,
        created_at: memo.created_at,
        updated_at: memo.updated_at,
        source: memo.source,
        source_url: memo.source_url,
        source_title: memo.source_title,
        view_count: memo.view_count
      }

      if (options.includeAIGenerated) {
        exportMemo.tags = memo.tags
        exportMemo.category = memo.category
        exportMemo.summary = memo.summary
        exportMemo.keywords = memo.keywords
        exportMemo.processed_at = memo.processed_at
        // embedding は除外（サイズが大きいため）
      }

      return exportMemo
    })
  }

  return {
    filename: `smartmemo-export-${new Date().toISOString().split('T')[0]}.json`,
    content: JSON.stringify(exportData, null, 2),
    mimeType: 'application/json'
  }
}

// CSV形式でのエクスポート（統計用）
export function exportToCSV(memos: Memo[], options: ExportOptions): ExportResult {
  const headers = [
    'ID',
    '作成日',
    '更新日',
    'カテゴリ',
    'タグ数',
    '文字数',
    '閲覧数',
    'AI処理済み'
  ]

  if (options.includeAIGenerated) {
    headers.push('要約', 'キーワード数')
  }

  const rows = memos.map(memo => {
    const row = [
      memo.id,
      memo.created_at,
      memo.updated_at,
      memo.category || '',
      memo.tags.length.toString(),
      memo.content.length.toString(),
      memo.view_count.toString(),
      memo.processed_at ? 'Yes' : 'No'
    ]

    if (options.includeAIGenerated) {
      row.push(
        memo.summary || '',
        memo.keywords.length.toString()
      )
    }

    return row
  })

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  return {
    filename: `smartmemo-stats-${new Date().toISOString().split('T')[0]}.csv`,
    content: csvContent,
    mimeType: 'text/csv'
  }
}

// ヘルパー関数
function formatMemoAsMarkdown(memo: Memo, options: ExportOptions): string {
  let content = ''
  
  // タイトル（最初の行から生成）
  const title = memo.content.split('\n')[0] || `Memo ${memo.id.slice(0, 8)}`
  content += `# ${title}\n\n`
  
  // メタデータ
  if (options.includeMetadata) {
    content += `**作成日**: ${new Date(memo.created_at).toLocaleDateString('ja-JP')}\n`
    content += `**更新日**: ${new Date(memo.updated_at).toLocaleDateString('ja-JP')}\n`
    
    if (options.includeAIGenerated && memo.category) {
      content += `**カテゴリ**: ${memo.category}\n`
    }
    
    if (options.includeAIGenerated && memo.tags.length > 0) {
      content += `**タグ**: ${memo.tags.map(tag => `#${tag}`).join(', ')}\n`
    }
    
    content += '\n'
  }

  // AI要約
  if (options.includeAIGenerated && memo.summary) {
    content += `> **AI要約**: ${memo.summary}\n\n`
  }

  // メインコンテンツ
  content += memo.content_markdown

  return content
}

function groupMemosByCategory(memos: Memo[]): Record<string, Memo[]> {
  return memos.reduce((groups, memo) => {
    const category = memo.category || '未分類'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(memo)
    return groups
  }, {} as Record<string, Memo[]>)
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^\w\s-]/g, '') // 特殊文字を除去
    .replace(/\s+/g, '-') // スペースをハイフンに
    .slice(0, 50) // 長さ制限
}

function createZipFromFiles(files: Record<string, string>): Blob {
  // TODO: JSZipライブラリを使用してZIPファイルを作成
  // 今回は仮実装
  const jsonContent = JSON.stringify(files, null, 2)
  return new Blob([jsonContent], { type: 'application/json' })
}