export interface HelpSection {
  id: string
  title: string
  description: string
  content: string
  category: 'getting-started' | 'features' | 'ai' | 'shortcuts' | 'troubleshooting'
  icon?: string
}

export interface FAQ {
  id: string
  question: string
  answer: string
  category: string
  tags: string[]
}

export const helpSections: HelpSection[] = [
  // Getting Started
  {
    id: 'quick-start',
    title: 'SmartMemoを始める',
    description: '基本的な使い方を学んで、すぐにメモを作成できます',
    category: 'getting-started',
    icon: '🚀',
    content: `
# SmartMemoへようこそ！

SmartMemoは、AI機能を活用した知識管理システムです。以下の手順で始めましょう：

## 1. 最初のメモを作成
- **Ctrl+N**を押すか、**New Memo**ボタンをクリック
- メモの内容を入力
- **保存**または**Ctrl+S**で保存

## 2. AI機能を活用
- 保存後、AIが自動的にタグとカテゴリーを生成
- 要約も自動作成されます
- セマンティック検索で関連するメモを発見

## 3. 検索機能を使う
- **Ctrl+K**で検索バーにフォーカス
- 3つの検索モード：
  - **Smart**: セマンティック + キーワード検索
  - **Semantic**: 意味による検索
  - **Text**: キーワード検索

## 4. ナレッジグラフを見る
- **知識グラフ**タブで関連性を視覚化
- メモ間のつながりを発見
    `
  },
  
  // Features
  {
    id: 'search-features',
    title: '検索機能の使い方',
    description: '3つの検索モードを使い分けて、必要な情報を素早く見つけましょう',
    category: 'features',
    icon: '🔍',
    content: `
# 検索機能の詳細ガイド

SmartMemoには3つの強力な検索モードがあります：

## 🌟 Smart検索（推奨）
**最も賢い検索方法**
- セマンティック検索とキーワード検索を組み合わせ
- 70%セマンティック + 30%テキストの重み付け
- 最も関連性の高い結果を表示

**例**: "機械学習" → AI、深層学習、ニューラルネットワーク関連のメモも検索

## 🧠 Semantic検索
**意味で検索**
- AIが内容の意味を理解して検索
- 同義語や関連概念も検索対象
- キーワードが完全一致しなくても発見可能

**例**: "効率化" → "生産性向上"、"最適化"のメモも発見

## 📝 Text検索
**キーワード検索**
- 従来の文字列マッチング
- タグ、カテゴリー、内容を対象
- 確実にキーワードが含まれるメモを検索

**例**: "React" → "React"が含まれるメモのみ

## 💡 検索のコツ
1. **最初はSmart検索を試す**
2. **具体的な技術用語はText検索**
3. **概念的な検索はSemantic検索**
4. **検索結果が多すぎる場合は詳細なキーワードを追加**
    `
  },

  // AI Features
  {
    id: 'ai-features',
    title: 'AI機能の詳細',
    description: 'タグ生成、カテゴリー分類、要約、セマンティック検索のAI機能を理解しましょう',
    category: 'ai',
    icon: '🤖',
    content: `
# AI機能の完全ガイド

SmartMemoのAI機能は、あなたの知識管理を劇的に改善します。

## 🏷️ 自動タグ生成
**メモ保存時に自動実行**
- GPT-4o-miniが内容を分析
- 最大5個の関連タグを日本語で生成
- 内容に基づいた適切なタグ付け

**例**: プログラミングメモ → ["React", "フロントエンド", "JavaScript", "コンポーネント", "開発"]

## 📁 カテゴリー自動分類
**メモを適切なカテゴリーに分類**
- 主要カテゴリー: "技術", "学習", "仕事", "個人", "研究"
- 内容の文脈を理解して分類
- 統一された分類システム

## 📄 AI要約
**長いメモの要点を抽出**
- 最大100文字の簡潔な要約
- 核心的な内容を把握
- 検索結果での判断を高速化

## 🔗 セマンティック類似度
**関連メモの自動発見**
- text-embedding-3-smallでベクトル化
- コサイン類似度で関連性を計算
- 60%以上の類似度でメモを表示

## ⚙️ AI処理の流れ
1. **メモ保存** → データベース保存
2. **バックグラウンド処理** → AI分析開始
3. **メタデータ生成** → タグ、カテゴリー、要約、キーワード
4. **ベクトル化** → 検索用の数値表現作成
5. **データベース更新** → メタデータとベクトルを保存
6. **UI更新** → 結果を表示

## 🎯 AI精度向上のコツ
- **詳細な内容を記載**: 短すぎるメモは分析が困難
- **文脈を含める**: 専門用語だけでなく説明も追加
- **日本語で記載**: AI最適化は日本語向け
    `
  },

  // Shortcuts
  {
    id: 'keyboard-shortcuts',
    title: 'キーボードショートカット',
    description: '効率的な操作のためのキーボードショートカット一覧',
    category: 'shortcuts',
    icon: '⌨️',
    content: `
# キーボードショートカット完全ガイド

効率的にSmartMemoを使用するためのショートカット一覧です。

## 🚀 基本操作
| ショートカット | 機能 | 説明 |
|---|---|---|
| **Ctrl+N** (⌘+N) | 新規メモ作成 | どこからでも新しいメモを作成 |
| **Ctrl+K** (⌘+K) | 検索フォーカス | 検索バーに即座にフォーカス |
| **Ctrl+S** (⌘+S) | 保存 | 編集中のメモを保存 |
| **Esc** | キャンセル/閉じる | フォームやモーダルを閉じる |
| **?** | ヘルプ表示 | ショートカット一覧を表示 |

## 📝 編集モード
| ショートカット | 機能 |
|---|---|
| **Ctrl+S** | メモを保存 |
| **Esc** | 編集をキャンセル |

## 🔍 検索モード
| ショートカット | 機能 |
|---|---|
| **Ctrl+K** | 検索バーにフォーカス |
| **Enter** | 検索実行 |
| **Esc** | 検索をクリア |

## 💡 使用のコツ
1. **Ctrl+N** で素早くメモ作成
2. **Ctrl+K** で即座に検索開始
3. **?** でショートカットを忘れた時の確認
4. **Esc** で常に前の状態に戻る

## 🖥️ プラットフォーム対応
- **Windows/Linux**: Ctrlキー使用
- **Mac**: Cmdキー (⌘) 使用
- **自動検出**: プラットフォームを自動判別
    `
  },

  // Troubleshooting
  {
    id: 'troubleshooting',
    title: 'トラブルシューティング',
    description: 'よくある問題と解決方法',
    category: 'troubleshooting',
    icon: '🔧',
    content: `
# トラブルシューティングガイド

よくある問題と解決方法をまとめています。

## 🚫 AI機能が動作しない

### 症状
- タグが自動生成されない
- 関連メモが表示されない
- セマンティック検索ができない

### 解決方法
1. **環境変数を確認**
   - OPENAI_API_KEYが設定されているか確認
   - Supabase設定が正しいか確認

2. **メモの内容を確認**
   - 10文字以上の内容があるか
   - 日本語で記載されているか

3. **時間を置いて確認**
   - AI処理は非同期で実行されます
   - 保存後、数秒〜数分お待ちください

## 🔍 検索結果が表示されない

### Smart/Semantic検索の場合
- メモにAI処理が完了しているか確認
- 処理済みのメモは統計画面で確認可能

### Text検索の場合
- キーワードのスペルを確認
- 部分一致で検索してみる

## 📱 表示が崩れる

### 症状
- レイアウトが正しく表示されない
- ボタンが重なる

### 解決方法
1. **ブラウザをリフレッシュ**
2. **ブラウザキャッシュをクリア**
3. **対応ブラウザを使用**
   - Chrome, Firefox, Safari, Edge

## 🔐 ログインできない

### 解決方法
1. **メールアドレスを確認**
   - 正しいアドレスか確認
   - タイポがないかチェック

2. **パスワードリセット**
   - ログイン画面からリセット
   - メール受信を確認

3. **新規アカウント作成**
   - Sign Upから新規登録

## 🐛 その他の問題

問題が解決しない場合：
1. **ブラウザの開発者ツールでエラーを確認**
2. **別のブラウザで試す**
3. **インコグニート/プライベートモードで試す**

## 📊 パフォーマンスの問題

### メモが多くて動作が重い
- 検索を活用して必要なメモを絞り込み
- 古いメモの整理を検討
- ブラウザキャッシュのクリア
    `
  }
]

export const faqs: FAQ[] = [
  {
    id: 'what-is-smartmemo',
    question: 'SmartMemoとは何ですか？',
    answer: 'SmartMemoは、AI機能を活用した知識管理システムです。メモを作成すると、AIが自動的にタグ付け、カテゴリー分類、要約を行い、セマンティック検索により関連するメモを発見できます。',
    category: '基本',
    tags: ['概要', 'AI', '機能']
  },
  {
    id: 'ai-processing-time',
    question: 'AI処理にはどのくらい時間がかかりますか？',
    answer: 'AI処理は通常数秒〜数分で完了します。処理はバックグラウンドで実行されるため、メモの作成や編集は即座に行えます。処理状況は統計画面で確認できます。',
    category: 'AI機能',
    tags: ['処理時間', 'バックグラウンド']
  },
  {
    id: 'semantic-search-explained',
    question: 'セマンティック検索とは何ですか？',
    answer: 'セマンティック検索は、キーワードの完全一致ではなく、意味の類似性に基づいて検索する機能です。例えば「効率化」と検索すると「生産性向上」や「最適化」に関するメモも見つけることができます。',
    category: '検索',
    tags: ['セマンティック', '意味', '検索']
  },
  {
    id: 'data-privacy',
    question: 'データのプライバシーは保護されますか？',
    answer: 'はい。すべてのデータはユーザーごとに分離され、Row Level Security (RLS) により保護されています。あなたのメモは他のユーザーからアクセスできません。',
    category: 'セキュリティ',
    tags: ['プライバシー', 'セキュリティ', 'RLS']
  },
  {
    id: 'supported-languages',
    question: '対応言語は何ですか？',
    answer: 'SmartMemoは主に日本語に最適化されています。AIによるタグ生成、カテゴリー分類、要約はすべて日本語で行われます。英語のメモも保存できますが、AI機能の精度は日本語の方が高くなります。',
    category: '基本',
    tags: ['言語', '日本語', '英語']
  },
  {
    id: 'export-data',
    question: 'データをエクスポートできますか？',
    answer: '現在、データのエクスポート機能は準備中です。将来のアップデートで、JSON、Markdown、CSV形式でのエクスポートが可能になる予定です。',
    category: 'データ管理',
    tags: ['エクスポート', 'データ', '将来機能']
  },
  {
    id: 'browser-support',
    question: '対応ブラウザは何ですか？',
    answer: 'モダンブラウザに対応しています：Chrome、Firefox、Safari、Microsoft Edge。最適なパフォーマンスのため、最新版の使用を推奨します。',
    category: '技術',
    tags: ['ブラウザ', '対応', '要件']
  },
  {
    id: 'mobile-support',
    question: 'スマートフォンでも使用できますか？',
    answer: 'はい。SmartMemoはレスポンシブデザインで、スマートフォンやタブレットでも使用できます。キーボードショートカットの一部は制限されますが、基本機能はすべて利用可能です。',
    category: '技術',
    tags: ['モバイル', 'レスポンシブ', 'スマートフォン']
  },
  {
    id: 'memo-limit',
    question: 'メモの作成数に制限はありますか？',
    answer: '現在、メモの作成数に制限はありません。ただし、大量のメモがある場合は検索機能を活用して効率的に管理することをお勧めします。',
    category: '制限',
    tags: ['制限', '数', 'パフォーマンス']
  }
]

export const getHelpSectionsByCategory = (category: string) => {
  return helpSections.filter(section => section.category === category)
}

export const getFAQsByCategory = (category: string) => {
  return faqs.filter(faq => faq.category === category)
}

export const searchHelp = (query: string) => {
  const lowercaseQuery = query.toLowerCase()
  
  const sections = helpSections.filter(section => 
    section.title.toLowerCase().includes(lowercaseQuery) ||
    section.description.toLowerCase().includes(lowercaseQuery) ||
    section.content.toLowerCase().includes(lowercaseQuery)
  )
  
  const faqResults = faqs.filter(faq =>
    faq.question.toLowerCase().includes(lowercaseQuery) ||
    faq.answer.toLowerCase().includes(lowercaseQuery) ||
    faq.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  )
  
  return { sections, faqs: faqResults }
}