export interface UserMetrics {
  session: {
    duration: number
    pageViews: number
    actionsPerSession: number
  }
  
  memoUsage: {
    totalMemos: number
    memosCreatedToday: number
    memosWithAIProcessing: number
    avgMemoLength: number
  }
  
  searchBehavior: {
    searchFrequency: number
    searchModes: {
      semantic: number
      text: number
      hybrid: number
    }
    avgResultsClicked: number
  }
  
  featureUsage: {
    keyboardShortcuts: Record<string, number>
    graphInteractions: number
    relatedMemoClicks: number
    helpSystemAccess: number
    undoOperations: number
  }
  
  engagement: {
    daysActive: number
    longestStreak: number
    preferredTimeOfDay: string
  }
}

export interface UserFeedback {
  usabilityScore: number
  featureRequests: Array<{
    feature: string
    priority: 'low' | 'medium' | 'high'
    votes: number
  }>
  painPoints: Array<{
    description: string
    frequency: number
    impact: 'low' | 'medium' | 'high'
  }>
}

export async function collectUserMetrics(): Promise<UserMetrics> {
  // 実装: ユーザー行動の収集と分析
  return {
    session: {
      duration: 0,
      pageViews: 0,
      actionsPerSession: 0
    },
    memoUsage: {
      totalMemos: 0,
      memosCreatedToday: 0,
      memosWithAIProcessing: 0,
      avgMemoLength: 0
    },
    searchBehavior: {
      searchFrequency: 0,
      searchModes: {
        semantic: 0,
        text: 0,
        hybrid: 0
      },
      avgResultsClicked: 0
    },
    featureUsage: {
      keyboardShortcuts: {},
      graphInteractions: 0,
      relatedMemoClicks: 0,
      helpSystemAccess: 0,
      undoOperations: 0
    },
    engagement: {
      daysActive: 0,
      longestStreak: 0,
      preferredTimeOfDay: 'morning'
    }
  }
}

export function analyzeUserPainPoints(metrics: UserMetrics): Array<{
  issue: string
  severity: 'low' | 'medium' | 'high'
  suggestedFix: string
}> {
  const painPoints = []
  
  // 検索利用率が低い場合
  if (metrics.searchBehavior.searchFrequency < 0.1) {
    painPoints.push({
      issue: '検索機能の利用率が低い',
      severity: 'high' as const,
      suggestedFix: '検索UIの改善、検索結果の質向上'
    })
  }
  
  // グラフの利用率が低い場合
  if (metrics.featureUsage.graphInteractions < 0.05) {
    painPoints.push({
      issue: 'ナレッジグラフの利用率が低い',
      severity: 'medium' as const,
      suggestedFix: 'グラフの説明改善、インタラクティブ性向上'
    })
  }
  
  return painPoints
}