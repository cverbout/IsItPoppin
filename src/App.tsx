import { useState } from 'react'
import { fetchSubredditPosts } from './api'
import { aggregatePostsByDay } from './utils'
import { computeTrendMetrics } from './utils/metrics'
import { classifyTrend, buildTrendWarnings } from './utils/signals'
import type { DailyAggregate, RedditPost } from './types'

const CHART_WIDTH = 520
const CHART_HEIGHT = 180
const CHART_PADDING = 32

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(Math.round(value))
}

function formatPercent(value: number) {
  const rounded = value.toFixed(1)
  return `${value >= 0 ? '+' : ''}${rounded}%`
}

function buildLinePath(values: number[], maxValue: number) {
  if (values.length === 0) {
    return ''
  }

  const step = values.length === 1 ? 0 : (CHART_WIDTH - CHART_PADDING * 2) / (values.length - 1)
  const points = values.map((value, index) => {
    const x = CHART_PADDING + index * step
    const y = CHART_HEIGHT - CHART_PADDING - (value / Math.max(maxValue, 1)) * (CHART_HEIGHT - CHART_PADDING * 2)
    return `${x},${y}`
  })

  return `M${points.join(' L')}`
}

function Chart({
  data,
  valueKey,
  label,
  color,
  rollingValues,
  rollingColor
}: {
  data: DailyAggregate[];
  valueKey: keyof DailyAggregate;
  label: string;
  color: string;
  rollingValues?: number[];
  rollingColor?: string;
}) {
  const values = data.map((item) => Number(item[valueKey]))
  const maxValue = Math.max(...values, ...(rollingValues ?? [0]), 1)
  const path = buildLinePath(values, maxValue)
  const rollingPath = rollingValues ? buildLinePath(rollingValues, maxValue) : ''

  return (
    <div className="card">
      <div className="chartHeader">{label}</div>
      <svg width={CHART_WIDTH} height={CHART_HEIGHT} role="img" aria-label={label}>
        <line
          x1={CHART_PADDING}
          y1={CHART_HEIGHT - CHART_PADDING}
          x2={CHART_WIDTH - CHART_PADDING}
          y2={CHART_HEIGHT - CHART_PADDING}
          stroke="#d1d5db"
          strokeWidth="1"
        />
        <line
          x1={CHART_PADDING}
          y1={CHART_PADDING}
          x2={CHART_PADDING}
          y2={CHART_HEIGHT - CHART_PADDING}
          stroke="#d1d5db"
          strokeWidth="1"
        />
        {rollingPath ? (
          <path
            d={rollingPath}
            fill="none"
            stroke={rollingColor ?? '#9ca3af'}
            strokeWidth="2"
            strokeDasharray="8 6"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {values.map((value, index) => {
          const step = values.length === 1 ? 0 : (CHART_WIDTH - CHART_PADDING * 2) / (values.length - 1)
          const x = CHART_PADDING + index * step
          const y = CHART_HEIGHT - CHART_PADDING - (value / maxValue) * (CHART_HEIGHT - CHART_PADDING * 2)
          return (
            <circle key={index} cx={x} cy={y} r="4" fill={color} />
          )
        })}
      </svg>
    </div>
  )
}

function App() {
  const [subreddit, setSubreddit] = useState('reactjs')
  const [historyWindow, setHistoryWindow] = useState(300)
  const [aggregates, setAggregates] = useState<DailyAggregate[]>([])
  const [posts, setPosts] = useState<RedditPost[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFetch = async () => {
    setLoading(true)
    setError(null)
    setAggregates([])

    try {
      const rawPosts = await fetchSubredditPosts(subreddit || 'reactjs', historyWindow)
      setPosts(rawPosts)
      setAggregates(aggregatePostsByDay(rawPosts))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error fetching subreddit data')
    } finally {
      setLoading(false)
    }
  }

  const hasData = aggregates.length > 0
  const metrics = hasData ? computeTrendMetrics(aggregates) : null
  const warnings = metrics ? buildTrendWarnings(aggregates, metrics) : []
  const trendLabel = metrics ? classifyTrend(metrics.activityScore) : ''

  return (
    <div className="App">
      <header className="header">
        <h1>Reddit Trend Analyzer</h1>
        <p>Fetch recent subreddit data and view daily post/comment activity.</p>
      </header>

      <section className="card controls">
        <label htmlFor="subreddit">Subreddit</label>
        <input
          id="subreddit"
          value={subreddit}
          onChange={(event) => setSubreddit(event.target.value)}
          placeholder="e.g. reactjs"
        />
        <label htmlFor="historyWindow">Window</label>
        <input
          id="historyWindow"
          type="number"
          min={100}
          step={100}
          value={historyWindow}
          onChange={(event) => setHistoryWindow(Math.max(100, Number(event.target.value) || 100))}
        />
        <button onClick={handleFetch} disabled={loading || subreddit.trim() === ''}>
          {loading ? 'Loading...' : 'Fetch Data'}
        </button>
      </section>

      {error ? <div className="error">{error}</div> : null}

      {hasData ? (
        <>
          <section className="card signalSummary">
            <div className="signalRow">
              <div className="signalItem">
                <span>{trendLabel}</span>
                <small>Trend classification</small>
              </div>
              <div className="signalItem">
                <span>{metrics?.activityScore.toFixed(1)}</span>
                <small>Activity score</small>
              </div>
              <div className="signalItem">
                <span>{metrics ? formatPercent(metrics.commentGrowthRate) : '0.0%'}</span>
                <small>7-day comment growth</small>
              </div>
              <div className="signalItem">
                <span>{metrics ? formatPercent(metrics.postGrowthRate) : '0.0%'}</span>
                <small>7-day post growth</small>
              </div>
              <div className="signalItem">
                <span>{metrics ? formatPercent(metrics.uniquePosterGrowthRate) : '0.0%'}</span>
                <small>7-day unique poster growth</small>
              </div>
              <div className="signalItem">
                <span>{metrics?.averageCommentsPerPost.toFixed(1)}</span>
                <small>Avg comments/post</small>
              </div>
            </div>
            {warnings.length > 0 ? (
              <div className="warnings">
                <strong>Signals:</strong>
                <ul>
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="card stats">
            <div className="summaryItem">
              <span>{formatNumber(posts.length)}</span>
              <small>Posts fetched</small>
            </div>
            <div className="summaryItem">
              <span>{formatNumber(aggregates.length)}</span>
              <small>Days aggregated</small>
            </div>
          </section>

          <section className="tableWrapper card">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Posts</th>
                  <th>Comments</th>
                  <th>Avg Comments/Post</th>
                  <th>Unique Posters</th>
                </tr>
              </thead>
              <tbody>
                {aggregates.map((item) => (
                  <tr key={item.date}>
                    <td>{item.date}</td>
                    <td>{item.posts_count}</td>
                    <td>{item.total_comments}</td>
                    <td>{item.avg_comments_per_post.toFixed(1)}</td>
                    <td>{item.unique_posters_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="chartGrid">
            <Chart
              data={aggregates}
              valueKey="total_comments"
              label="Comments per Day"
              color="#2563eb"
              rollingValues={metrics?.commentsRollingAvg}
              rollingColor="#93c5fd"
            />
            <Chart
              data={aggregates}
              valueKey="posts_count"
              label="Posts per Day"
              color="#10b981"
              rollingValues={metrics?.postsRollingAvg}
              rollingColor="#86efac"
            />
          </section>
        </>
      ) : (
        <div className="placeholder card">
          Enter a subreddit and click <strong>Fetch Data</strong> to load daily activity.
        </div>
      )}
    </div>
  )
}

export default App
