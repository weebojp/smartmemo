export interface ImportOptions {
  preserveTimestamps: boolean
  overwriteExisting: boolean
  processWithAI: boolean
  defaultCategory?: string
  tagPrefix?: string
}

export interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: Array<{
    line?: number
    message: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any
  }>
  preview?: ParsedMemo[]
}

export interface ParsedMemo {
  title?: string
  content: string
  tags: string[]
  category?: string
  createdAt?: Date
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
}

// Markdown形式のインポート
export function parseMarkdownImport(content: string, options: ImportOptions): ParsedMemo[] {
  const memos: ParsedMemo[] = []
  
  // '---'区切りで複数メモを分割
  const sections = content.split(/^---\s*$/m)
  
  for (const section of sections) {
    if (!section.trim()) continue
    
    try {
      const memo = parseMarkdownSection(section.trim(), options)
      if (memo) {
        memos.push(memo)
      }
    } catch (error) {
      console.error('Failed to parse markdown section:', error)
    }
  }
  
  return memos
}

function parseMarkdownSection(content: string, options: ImportOptions): ParsedMemo | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let frontmatter: Record<string, any> = {}
  let mainContent = content
  
  // YAMLフロントマターの解析
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (frontmatterMatch) {
    try {
      frontmatter = parseYAML(frontmatterMatch[1])
      mainContent = frontmatterMatch[2]
    } catch (error) {
      console.warn('Failed to parse frontmatter:', error)
    }
  }
  
  // タイトルの抽出（最初のH1またはH2）
  const titleMatch = mainContent.match(/^#{1,2}\s+(.+)$/m)
  const title = titleMatch ? titleMatch[1] : frontmatter.title
  
  // タグの抽出
  let tags: string[] = []
  
  // フロントマターのタグ
  if (frontmatter.tags) {
    if (Array.isArray(frontmatter.tags)) {
      tags.push(...frontmatter.tags)
    } else if (typeof frontmatter.tags === 'string') {
      tags.push(...frontmatter.tags.split(',').map(t => t.trim()))
    }
  }
  
  // インライン#タグの抽出
  const inlineTags = mainContent.match(/#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g)
  if (inlineTags) {
    tags.push(...inlineTags.map(tag => tag.slice(1))) // #を除去
  }
  
  // プレフィックス付きタグ
  if (options.tagPrefix) {
    tags = tags.map(tag => `${options.tagPrefix}${tag}`)
  }
  
  // 重複除去
  tags = [...new Set(tags)]
  
  const memo: ParsedMemo = {
    title,
    content: mainContent,
    tags,
    category: frontmatter.category || options.defaultCategory,
    createdAt: frontmatter.created || frontmatter.date ? new Date(frontmatter.created || frontmatter.date) : undefined,
    metadata: frontmatter
  }
  
  return memo
}

// JSON形式のインポート
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function parseJSONImport(content: string, _options: ImportOptions): ParsedMemo[] {
  try {
    const data = JSON.parse(content)
    
    // SmartMemoエクスポート形式
    if (data.metadata && data.memos) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.memos.map((memo: any) => ({
        title: extractTitleFromContent(memo.content),
        content: memo.content,
        tags: memo.tags || [],
        category: memo.category,
        createdAt: memo.created_at ? new Date(memo.created_at) : undefined,
        metadata: {
          id: memo.id,
          source: memo.source,
          summary: memo.summary
        }
      }))
    }
    
    // 汎用JSON配列形式
    if (Array.isArray(data)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((item: any) => ({
        title: item.title || extractTitleFromContent(item.content || item.text),
        content: item.content || item.text || '',
        tags: parseTagsFromVariousFormats(item.tags || item.labels || []),
        category: item.category || item.type,
        createdAt: item.createdAt || item.created_at || item.date ? new Date(item.createdAt || item.created_at || item.date) : undefined,
        metadata: item
      }))
    }
    
    throw new Error('Unsupported JSON format')
  } catch (error) {
    throw new Error(`JSON parse error: ${error}`)
  }
}

// CSV形式のインポート
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function parseCSVImport(content: string, _options: ImportOptions): ParsedMemo[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    throw new Error('CSV must have header and at least one data row')
  }
  
  const headers = parseCSVLine(lines[0])
  const memos: ParsedMemo[] = []
  
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i])
      if (values.length !== headers.length) {
        console.warn(`Row ${i + 1}: Column count mismatch`)
        continue
      }
      
      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header] = values[index]
      })
      
      const memo: ParsedMemo = {
        title: row.title || row.Title,
        content: row.content || row.Content || row.text || row.Text || '',
        tags: parseTagsFromVariousFormats(row.tags || row.Tags || ''),
        category: row.category || row.Category,
        createdAt: row.created_at || row.date ? new Date(row.created_at || row.date) : undefined,
        metadata: row
      }
      
      memos.push(memo)
    } catch (error) {
      console.error(`Error parsing CSV row ${i + 1}:`, error)
    }
  }
  
  return memos
}

// Obsidian/Roam形式のインポート
export function parseObsidianImport(content: string, options: ImportOptions): ParsedMemo[] {
  const memos: ParsedMemo[] = []
  
  // ファイルごとに分割（ZIPから展開された場合を想定）
  const files = content.split('===FILE_SEPARATOR===')
  
  for (const fileContent of files) {
    if (!fileContent.trim()) continue
    
    try {
      const memo = parseMarkdownSection(fileContent.trim(), options)
      if (memo) {
        // Obsidianの[[wikilink]]を処理
        memo.content = processWikiLinks(memo.content)
        memos.push(memo)
      }
    } catch (error) {
      console.error('Failed to parse Obsidian file:', error)
    }
  }
  
  return memos
}

// ヘルパー関数
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseYAML(yamlContent: string): Record<string, any> {
  // 簡易YAMLパーサー（本格的な実装はjs-yamlライブラリを使用）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {}
  const lines = yamlContent.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    
    const colonIndex = trimmed.indexOf(':')
    if (colonIndex === -1) continue
    
    const key = trimmed.slice(0, colonIndex).trim()
    const valueStr = trimmed.slice(colonIndex + 1).trim()
    
    // 配列の処理
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any
    if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
      value = valueStr.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''))
    } else {
      value = valueStr.replace(/^['"]|['"]$/g, '') // クォート除去
    }
    
    result[key] = value
  }
  
  return result
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTagsFromVariousFormats(tags: any): string[] {
  if (Array.isArray(tags)) {
    return tags.map(String)
  }
  
  if (typeof tags === 'string') {
    // カンマ区切り、スペース区切り、セミコロン区切りに対応
    return tags
      .split(/[,;\s]+/)
      .map(tag => tag.trim().replace(/^#/, '')) // #プレフィックス除去
      .filter(Boolean)
  }
  
  return []
}

function extractTitleFromContent(content: string): string {
  if (!content) return ''
  
  // 最初の行を取得
  const firstLine = content.split('\n')[0].trim()
  
  // Markdownヘッダーの場合、#を除去
  if (firstLine.startsWith('#')) {
    return firstLine.replace(/^#+\s*/, '')
  }
  
  // 最初の50文字を使用
  return firstLine.slice(0, 50)
}

function processWikiLinks(content: string): string {
  // [[wikilink]]を適切な形式に変換
  return content.replace(/\[\[([^\]]+)\]\]/g, (match, linkText) => {
    // 簡単なリンクテキストに変換
    return `[${linkText}]`
  })
}