import { DailyAggregate } from '../types'

function avg(values: number[]) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
}

export function rollingAverage(values: number[], windowSize = 7) {
  return values.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1)
    const slice = values.slice(start, index + 1)
    return avg(slice)
  })
}

export function computeGrowthRate(values: number[], windowSize = 7) {
  const n = values.length
  if (n === 0) {
    return 0
  }

  const recentStart = Math.max(0, n - windowSize)
  const previousStart = Math.max(0, n - windowSize * 2)
  const recentValues = values.slice(recentStart, n)
  const previousValues = values.slice(previousStart, recentStart)

  const recentAvg = avg(recentValues)
  const previousAvg = avg(previousValues)
  const denominator = Math.max(previousAvg, 1)

  return ((recentAvg - previousAvg) / denominator) * 100
}

export function averageCommentsPerPost(aggregates: DailyAggregate[]) {
  const totalComments = aggregates.reduce((sum, item) => sum + item.total_comments, 0)
  const totalPosts = aggregates.reduce((sum, item) => sum + item.posts_count, 0)
  return totalPosts === 0 ? 0 : totalComments / totalPosts
}

export function activityScore(
  commentGrowthRate: number,
  postGrowthRate: number,
  uniquePosterGrowthRate: number
) {
  return commentGrowthRate + postGrowthRate + uniquePosterGrowthRate
}

export interface TrendMetrics {
  commentsRollingAvg: number[]
  postsRollingAvg: number[]
  uniquePostersRollingAvg: number[]
  commentGrowthRate: number
  postGrowthRate: number
  uniquePosterGrowthRate: number
  averageCommentsPerPost: number
  activityScore: number
}

export function computeTrendMetrics(aggregates: DailyAggregate[], windowSize = 7): TrendMetrics {
  const comments = aggregates.map((item) => item.total_comments)
  const posts = aggregates.map((item) => item.posts_count)
  const uniquePosters = aggregates.map((item) => item.unique_posters_count)

  const commentsRollingAvg = rollingAverage(comments, windowSize)
  const postsRollingAvg = rollingAverage(posts, windowSize)
  const uniquePostersRollingAvg = rollingAverage(uniquePosters, windowSize)

  const commentGrowthRate = computeGrowthRate(comments, windowSize)
  const postGrowthRate = computeGrowthRate(posts, windowSize)
  const uniquePosterGrowthRate = computeGrowthRate(uniquePosters, windowSize)
  const averageComments = averageCommentsPerPost(aggregates)
  const score = activityScore(commentGrowthRate, postGrowthRate, uniquePosterGrowthRate)

  return {
    commentsRollingAvg,
    postsRollingAvg,
    uniquePostersRollingAvg,
    commentGrowthRate,
    postGrowthRate,
    uniquePosterGrowthRate,
    averageCommentsPerPost: averageComments,
    activityScore: score
  }
}
