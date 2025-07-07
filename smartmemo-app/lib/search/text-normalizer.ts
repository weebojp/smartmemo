/**
 * 日本語テキスト正規化ライブラリ
 * ひらがな・カタカナ・全角半角・大文字小文字の統一処理
 */

export interface KanaNormalizationOptions {
  hiraganaToKatakana?: boolean
  katakanaToHiragana?: boolean
  unifyKana?: boolean
}

export interface WidthNormalizationOptions {
  fullwidthToHalfwidth?: boolean
  halfwidthToFullwidth?: boolean
  unifyWidth?: boolean
}

export interface CaseNormalizationOptions {
  toLowerCase?: boolean
  toUpperCase?: boolean
  ignoreCase?: boolean
}

export interface SymbolNormalizationOptions {
  removeSymbols?: boolean
  normalizeSymbols?: boolean
  removeSpaces?: boolean
}

export interface TextNormalizationOptions {
  kana?: KanaNormalizationOptions
  width?: WidthNormalizationOptions
  case?: CaseNormalizationOptions
  symbols?: SymbolNormalizationOptions
}

export class TextNormalizer {
  private static readonly HIRAGANA_START = 0x3041
  private static readonly HIRAGANA_END = 0x3096
  private static readonly KATAKANA_START = 0x30A1
  private static readonly KATAKANA_END = 0x30F6
  private static readonly KATAKANA_OFFSET = 0x60

  private static readonly FULLWIDTH_CHAR_MAP: Record<string, string> = {
    '０': '0', '１': '1', '２': '2', '３': '3', '４': '4', '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
    'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D', 'Ｅ': 'E', 'Ｆ': 'F', 'Ｇ': 'G', 'Ｈ': 'H', 'Ｉ': 'I',
    'Ｊ': 'J', 'Ｋ': 'K', 'Ｌ': 'L', 'Ｍ': 'M', 'Ｎ': 'N', 'Ｏ': 'O', 'Ｐ': 'P', 'Ｑ': 'Q', 'Ｒ': 'R',
    'Ｓ': 'S', 'Ｔ': 'T', 'Ｕ': 'U', 'Ｖ': 'V', 'Ｗ': 'W', 'Ｘ': 'X', 'Ｙ': 'Y', 'Ｚ': 'Z',
    'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e', 'ｆ': 'f', 'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i',
    'ｊ': 'j', 'ｋ': 'k', 'ｌ': 'l', 'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o', 'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r',
    'ｓ': 's', 'ｔ': 't', 'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x', 'ｙ': 'y', 'ｚ': 'z',
    '！': '!', '？': '?', '　': ' ', '，': ',', '．': '.', '：': ':', '；': ';', '（': '(', '）': ')',
    '「': '"', '」': '"', '『': '"', '』': '"', '【': '[', '】': ']', '〈': '<', '〉': '>', '｛': '{', '｝': '}',
    '＋': '+', '－': '-', '＝': '=', '＊': '*', '／': '/', '＼': '\\', '｜': '|', '＿': '_', '＠': '@',
    '＃': '#', '＄': '$', '％': '%', '＆': '&', '＾': '^', '～': '~', '｀': '`'
  }

  private static readonly HALFWIDTH_CHAR_MAP: Record<string, string> = Object.fromEntries(
    Object.entries(TextNormalizer.FULLWIDTH_CHAR_MAP).map(([k, v]) => [v, k])
  )

  /**
   * ひらがなをカタカナに変換
   */
  static hiraganaToKatakana(text: string): string {
    return text.replace(/[\u3041-\u3096]/g, (match) => {
      const code = match.charCodeAt(0)
      if (code >= TextNormalizer.HIRAGANA_START && code <= TextNormalizer.HIRAGANA_END) {
        return String.fromCharCode(code + TextNormalizer.KATAKANA_OFFSET)
      }
      return match
    })
  }

  /**
   * カタカナをひらがなに変換
   */
  static katakanaToHiragana(text: string): string {
    return text.replace(/[\u30A1-\u30F6]/g, (match) => {
      const code = match.charCodeAt(0)
      if (code >= TextNormalizer.KATAKANA_START && code <= TextNormalizer.KATAKANA_END) {
        return String.fromCharCode(code - TextNormalizer.KATAKANA_OFFSET)
      }
      return match
    })
  }

  /**
   * 全角文字を半角に変換
   */
  static fullwidthToHalfwidth(text: string): string {
    return text.split('').map(char => 
      TextNormalizer.FULLWIDTH_CHAR_MAP[char] || char
    ).join('')
  }

  /**
   * 半角文字を全角に変換
   */
  static halfwidthToFullwidth(text: string): string {
    return text.split('').map(char => 
      TextNormalizer.HALFWIDTH_CHAR_MAP[char] || char
    ).join('')
  }

  /**
   * 記号を除去
   */
  static removeSymbols(text: string): string {
    return text.replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ' ')
  }

  /**
   * 記号を正規化
   */
  static normalizeSymbols(text: string): string {
    return text
      .replace(/[！]/g, '!')
      .replace(/[？]/g, '?')
      .replace(/[，]/g, ',')
      .replace(/[．]/g, '.')
      .replace(/[：]/g, ':')
      .replace(/[；]/g, ';')
      .replace(/[（]/g, '(')
      .replace(/[）]/g, ')')
      .replace(/[「」『』]/g, '"')
      .replace(/[【】]/g, '[')
      .replace(/[〈〉]/g, '<')
  }

  /**
   * ひらがな・カタカナ正規化
   */
  static normalizeKana(text: string, options: KanaNormalizationOptions = {}): string {
    let result = text

    if (options.hiraganaToKatakana) {
      result = TextNormalizer.hiraganaToKatakana(result)
    }

    if (options.katakanaToHiragana) {
      result = TextNormalizer.katakanaToHiragana(result)
    }

    if (options.unifyKana) {
      result = TextNormalizer.katakanaToHiragana(result)
    }

    return result
  }

  /**
   * 文字幅正規化
   */
  static normalizeWidth(text: string, options: WidthNormalizationOptions = {}): string {
    let result = text

    if (options.fullwidthToHalfwidth) {
      result = TextNormalizer.fullwidthToHalfwidth(result)
    }

    if (options.halfwidthToFullwidth) {
      result = TextNormalizer.halfwidthToFullwidth(result)
    }

    if (options.unifyWidth) {
      result = TextNormalizer.fullwidthToHalfwidth(result)
    }

    return result
  }

  /**
   * 大文字小文字正規化
   */
  static normalizeCase(text: string, options: CaseNormalizationOptions = {}): string {
    let result = text

    if (options.toLowerCase) {
      result = result.toLowerCase()
    }

    if (options.toUpperCase) {
      result = result.toUpperCase()
    }

    return result
  }

  /**
   * 記号正規化
   */
  static normalizeSymbols(text: string, options: SymbolNormalizationOptions = {}): string {
    let result = text

    if (options.normalizeSymbols) {
      result = TextNormalizer.normalizeSymbols(result)
    }

    if (options.removeSymbols) {
      result = TextNormalizer.removeSymbols(result)
    }

    return result
  }

  /**
   * 包括的正規化
   */
  static normalize(text: string, options: TextNormalizationOptions = {}): string {
    let result = text

    // 1. 大文字小文字正規化
    if (options.case) {
      result = TextNormalizer.normalizeCase(result, options.case)
    }

    // 2. 文字幅正規化
    if (options.width) {
      result = TextNormalizer.normalizeWidth(result, options.width)
    }

    // 3. ひらがなカタカナ正規化
    if (options.kana) {
      result = TextNormalizer.normalizeKana(result, options.kana)
    }

    // 4. 記号正規化
    if (options.symbols) {
      result = TextNormalizer.normalizeSymbols(result, options.symbols)
    }

    // 5. 連続空白を単一空白に変換
    result = result.replace(/\s+/g, ' ').trim()

    return result
  }

  /**
   * 検索用正規化（デフォルト設定）
   */
  static normalizeForSearch(text: string): string {
    return TextNormalizer.normalize(text, {
      case: { toLowerCase: true },
      width: { unifyWidth: true },
      kana: { unifyKana: true },
      symbols: { removeSymbols: true }
    })
  }

  /**
   * 2つのテキストが正規化後に一致するかを判定
   */
  static isNormalizedMatch(text1: string, text2: string, options?: TextNormalizationOptions): boolean {
    const normalized1 = TextNormalizer.normalize(text1, options)
    const normalized2 = TextNormalizer.normalize(text2, options)
    return normalized1 === normalized2
  }

  /**
   * 部分一致検索用の正規化
   */
  static normalizeForPartialMatch(text: string): string {
    return TextNormalizer.normalize(text, {
      case: { toLowerCase: true },
      width: { unifyWidth: true },
      kana: { unifyKana: true },
      symbols: { removeSymbols: false }
    })
  }

  /**
   * 複数のテキストバリエーションを生成
   */
  static generateVariations(text: string): string[] {
    const variations = new Set<string>()
    
    // 元のテキスト
    variations.add(text)
    
    // 基本正規化
    variations.add(TextNormalizer.normalizeForSearch(text))
    
    // ひらがな・カタカナバリエーション
    variations.add(TextNormalizer.hiraganaToKatakana(text))
    variations.add(TextNormalizer.katakanaToHiragana(text))
    
    // 大文字小文字バリエーション
    variations.add(text.toLowerCase())
    variations.add(text.toUpperCase())
    
    // 全角半角バリエーション
    variations.add(TextNormalizer.fullwidthToHalfwidth(text))
    variations.add(TextNormalizer.halfwidthToFullwidth(text))
    
    return Array.from(variations)
  }
}