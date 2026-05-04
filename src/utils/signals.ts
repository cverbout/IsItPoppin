import type { DailyAggregate } from '../types'
import type { TrendMetrics } from './metrics'

export function classifyTrend(activityScore: number) {
  if (activityScore > 20) {
    return 'Heating Up'
  }

  if (activityScore < -20) {
    return 'Cooling Down'
  }

  return 'Stable'
}

function avg(values: number[]) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
}

export function buildTrendWarnings(aggregates: DailyAggregate[], metrics: TrendMetrics) {
  const warnings: string[] = []
  const totalDays = aggregates.length
  const lastDay = aggregates[totalDays - 1]
  const previousDays = aggregates.slice(Math.max(0, totalDays - 7), Math.max(0, totalDays - 1))

  const recentPostAvg = metrics.postsRollingAvg[metrics.postsRollingAvg.length - 1] ?? 0
  const recentCommentAvg = metrics.commentsRollingAvg[metrics.commentsRollingAvg.length - 1] ?? 0
  const recentUniqueAvg = metrics.uniquePostersRollingAvg[metrics.uniquePostersRollingAvg.length - 1] ?? 0

  if (recentPostAvg < 1) {
    warnings.push('Weak signal: too few posts to trust the trend.')
  }

  if (recentCommentAvg < 5) {
    warnings.push('Weak signal: too few comments to trust the trend.')
  }

  if (lastDay && previousDays.length >= 3) {
    const prevCommentAvg = avg(previousDays.map((item) => item.total_comments))
    if (prevCommentAvg > 0 && lastDay.total_comments > prevCommentAvg * 2.5) {
      warnings.push('Possible viral spike: comments jumped for one day but did not stay elevated.')
    }
  }

  if (metrics.commentGrowthRate > 10 && metrics.uniquePosterGrowthRate < 5) {
    warnings.push('Activity may be concentrated: comments increased but unique posters did not.')
  }

  if (metrics.postGrowthRate > 10 && metrics.commentGrowthRate < 5) {
    warnings.push('Post volume is rising, but comment engagement is not.')
  }

  return warnings
}
