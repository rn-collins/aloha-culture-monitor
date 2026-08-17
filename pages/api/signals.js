// Replacement signals.js — drops Reddit, adds Google News RSS + Google Trends
// Google Trends via unofficial endpoint (works from Vercel)
// Google News RSS via news.google.com/rss (works from Vercel, no key)

const CACHE_KEY = 'cim:signals:v4'
const CACHE_TTL = 60 * 60 * 48
const CADENCE_HOURS = 24
const STALE_AFTER_HOURS = 30

function ageHours(timestamp) {
  const ms = timestamp ? Date.now() - new Date(timestamp).getTime() : NaN
  return Number.isFinite(ms) ? Math.max(0, Math.round((ms / 36e5) * 10) / 10) : null
}

function withHealth(payload, overrides = {}) {
  const updatedAt = payload?.meta?.updatedAt || payload?.signals?.[0]?.fetchedAt || null
  const age = ageHours(updatedAt)
  return {
    ...payload,
    meta: {
      ...(payload?.meta || {}),
      updatedAt,
      ageHours: age,
      cadence: 'Daily at 00:00 UTC',
      staleAfterHours: STALE_AFTER_HOURS,
      stale: age == null || age > STALE_AFTER_HOURS,
      sourceDocumentation: [
        { name: 'Wikimedia Pageviews API', role: 'Seven-day attention volume', status: 'queried' },
        { name: 'Google News RSS', role: 'News-result volume and leading source', status: 'queried' },
        { name: 'Google Trends', role: 'Directional search-interest signal', status: 'experimental; may be unavailable' }
      ],
      ...overrides
    }
  }
}

async function redisGet(key) {
  try {
    const r = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
    })
    const d = await r.json()
    if (!d.result) return null
    const val = typeof d.result === 'string' ? JSON.parse(d.result) : d.result
    if (Array.isArray(val)) return typeof val[0] === 'string' ? JSON.parse(val[0]) : val[0]
    return val
  } catch { return null }
}

async function redisSet(key, value, ttl) {
  try {
    await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([JSON.stringify(value), 'EX', ttl])
    })
  } catch {}
}

const SIGNALS_CONFIG = [
  { id:'bridgerton', title:'Bridgerton universe', source:'Netflix', category:'Film & TV', trendsKeyword:'bridgerton fashion', wikiArticle:'Bridgerton', newsQuery:'Bridgerton brand fashion', riskLevel:'Low', riskNote:'Standard licensed partnerships. No AI content exposure identified.' },
  { id:'mj_biopic', title:'Michael Jackson biopic', source:'Universal / TikTok', category:'Music & Artists', trendsKeyword:'michael jackson style 2026', wikiArticle:'Michael_Jackson', newsQuery:'Michael Jackson biopic fashion style', riskLevel:'High', riskNote:'AI vocal recreation tools create digital likeness exposure for MJ-adjacent commercial activations.' },
  { id:'euphoria', title:'Euphoria S3 — Feral Glam', source:'HBO / TikTok', category:'Fashion & Style', trendsKeyword:'feral glam aesthetic', wikiArticle:'Euphoria_(American_TV_series)', newsQuery:'Euphoria season 3 fashion feral glam', riskLevel:'Medium', riskNote:'AI-generated Euphoria aesthetic content proliferating on TikTok — verify creator content authenticity before amplification.' },
  { id:'yellowstone', title:'Dutton Ranch — Texas effect', source:'Paramount+', category:'Film & TV', trendsKeyword:'dutton ranch texas', wikiArticle:'Yellowstone_(TV_series)', newsQuery:'Dutton Ranch Yellowstone fashion tourism', riskLevel:'None', riskNote:'No AI governance exposure identified.' },
  { id:'ai_influencers', title:'AI-generated creator activations', source:'FTC / Industry', category:'AI & Synthetic Media', trendsKeyword:'ai influencer marketing brand', wikiArticle:'Virtual_influencer', newsQuery:'AI influencer synthetic creator FTC disclosure', riskLevel:'High', riskNote:'FTC disclosure requirements for AI-generated personas not yet codified — enforcement risk rising.' },
  { id:'puma_bembury', title:'PUMA × Bembury World Cup drop', source:'PUMA / Hypebeast', category:'Sports Culture', trendsKeyword:'puma world cup 2026 fashion', wikiArticle:'PUMA', newsQuery:'PUMA Bembury World Cup kit fashion drop', riskLevel:'Low', riskNote:'Standard licensed collaboration. No AI governance exposure identified.' }
]

async function fetchWikiViews(article) {
  try {
    const end = new Date()
    const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const fmt = d => d.toISOString().slice(0,10).replace(/-/g,'')
    const r = await fetch(
      `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(article)}/daily/${fmt(start)}/${fmt(end)}`,
      { headers: { 'User-Agent': 'CultureIntelligenceMonitor/1.0 (aloha-ai-consulting)' } }
    )
    if (!r.ok) return null
    const d = await r.json()
    const items = d.items || []
    const total = items.reduce((s, i) => s + (i.views || 0), 0)
    const daily = Math.round(total / (items.length || 1))
    const recent = items.slice(-3).reduce((s,i) => s+(i.views||0),0) / 3
    const earlier = items.slice(0,3).reduce((s,i) => s+(i.views||0),0) / 3
    const momentum = earlier > 0 ? Math.round(((recent - earlier) / earlier) * 100) : 0
    return { daily, total, momentum, days: items.length }
  } catch { return null }
}

async function fetchGoogleNews(query) {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AlohaAIConsulting/1.0)' } })
    if (!r.ok) return null
    const xml = await r.text()
    const items = []
    const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)
    for (const m of matches) {
      const b = m[1]
      const title = b.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/<[^>]+>/g,'').trim()
      const source = b.match(/<source[^>]*>(.*?)<\/source>/)?.[1]?.trim()
      const date = b.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim()
      if (title) items.push({ title, source, date })
    }
    const count = items.length
    const topSource = items[0]?.source || null
    const topTitle = items[0]?.title?.slice(0,80) || null
    return { count, topSource, topTitle }
  } catch { return null }
}

async function fetchGoogleTrends(keyword) {
  try {
    // Use Google Trends widget API — unofficial but works from Vercel
    const comparisonItem = [{ keyword, geo: '', time: 'now 7-d' }]
    const encoded = encodeURIComponent(JSON.stringify(comparisonItem))
    const url = `https://trends.google.com/trends/api/explore?hl=en-US&tz=-300&req=${encoded}&cts=1`
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://trends.google.com/trends/explore'
      }
    })
    if (!r.ok) return null
    const text = (await r.text()).replace(/^\)\]\}',\n/, '')
    const data = JSON.parse(text)
    const widgets = data.widgets || []
    const timeWidget = widgets.find(w => w.id === 'TIMESERIES')
    if (!timeWidget?.token) return null

    // Fetch the actual time series data
    const dataUrl = `https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=-300&req=${encodeURIComponent(JSON.stringify({ time: 'now 7-d', resolution: 'HOUR', locale: 'en-US', comparisonItem: [{ geo: {}, complexKeywordsRestriction: { keyword: [{ type: 'BROAD', value: keyword }] } }], requestOptions: { property: '', backend: 'IZG', category: 0 } }))}&token=${encodeURIComponent(timeWidget.token)}&user_type=`
    const dr = await fetch(dataUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    })
    if (!dr.ok) return null
    const dtext = (await dr.text()).replace(/^\)\]\}',\n/, '')
    const ddata = JSON.parse(dtext)
    const values = (ddata.default?.timelineData || []).map(t => t.value?.[0] || 0).filter(v => v > 0)
    if (!values.length) return null
    const avg = Math.round(values.reduce((a,b) => a+b, 0) / values.length)
    const recent3 = values.slice(-3)
    const earlier3 = values.slice(0,3)
    const rAvg = recent3.reduce((a,b) => a+b,0) / recent3.length
    const eAvg = earlier3.reduce((a,b) => a+b,0) / earlier3.length
    const direction = rAvg > eAvg * 1.1 ? 'rising' : rAvg < eAvg * 0.9 ? 'falling' : 'stable'
    return { score: avg, direction, peak: Math.max(...values) }
  } catch { return null }
}

async function buildSignals() {
  const results = await Promise.allSettled(
    SIGNALS_CONFIG.map(async (cfg) => {
      const [wiki, news, trends] = await Promise.allSettled([
        fetchWikiViews(cfg.wikiArticle),
        fetchGoogleNews(cfg.newsQuery),
        fetchGoogleTrends(cfg.trendsKeyword)
      ])
      return {
        id: cfg.id,
        title: cfg.title,
        source: cfg.source,
        category: cfg.category,
        wikiViews: wiki.status === 'fulfilled' ? wiki.value : null,
        newsSignal: news.status === 'fulfilled' ? news.value : null,
        trendsSignal: trends.status === 'fulfilled' ? trends.value : null,
        riskLevel: cfg.riskLevel,
        riskNote: cfg.riskNote,
        fetchedAt: new Date().toISOString()
      }
    })
  )
  return results.filter(r => r.status === 'fulfilled').map(r => r.value)
}

export default async function handler(req, res) {
  const forceRefresh = req.query.refresh === '1'
  const cached = await redisGet(CACHE_KEY)

  if (!forceRefresh && cached?.signals?.length) {
    const payload = withHealth(cached, {
      status: ageHours(cached.meta?.updatedAt) > STALE_AFTER_HOURS ? 'stale' : 'healthy',
      source: 'verified-cache'
    })
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
    return res.status(200).json(payload)
  }

  const attemptAt = new Date().toISOString()
  try {
    const signals = await buildSignals()
    const measurementCount = signals.reduce((n, signal) =>
      n + [signal.wikiViews, signal.newsSignal, signal.trendsSignal].filter(Boolean).length, 0)
    const minimumMeasurements = SIGNALS_CONFIG.length

    if (signals.length !== SIGNALS_CONFIG.length || measurementCount < minimumMeasurements) {
      const reason = `Discovery returned ${signals.length}/${SIGNALS_CONFIG.length} signals and ${measurementCount} usable measurements; prior verified data preserved.`
      if (cached?.signals?.length) {
        return res.status(200).json(withHealth(cached, {
          status: 'failed',
          stale: true,
          source: 'preserved-cache',
          lastAttemptAt: attemptAt,
          failureReason: reason
        }))
      }
      return res.status(503).json({
        error: 'No verified signal set is currently available.',
        signals: [],
        meta: {
          status: 'failed',
          stale: true,
          lastAttemptAt: attemptAt,
          cadence: 'Daily at 00:00 UTC',
          failureReason: reason
        }
      })
    }

    const payload = withHealth({
      signals,
      meta: {
        updatedAt: attemptAt,
        lastAttemptAt: attemptAt,
        lastSuccessAt: attemptAt,
        count: signals.length,
        measurementCount
      }
    }, { status: 'healthy', stale: false, source: 'live-refresh' })
    await redisSet(CACHE_KEY, payload, CACHE_TTL)
    return res.status(200).json(payload)
  } catch (err) {
    console.error('signals error:', err)
    const reason = err instanceof Error ? err.message : 'Unknown discovery failure'
    if (cached?.signals?.length) {
      return res.status(200).json(withHealth(cached, {
        status: 'failed',
        stale: true,
        source: 'preserved-cache',
        lastAttemptAt: attemptAt,
        failureReason: reason
      }))
    }
    return res.status(503).json({
      error: 'Signal discovery failed and no prior verified set is available.',
      signals: [],
      meta: { status: 'failed', stale: true, lastAttemptAt: attemptAt, cadence: 'Daily at 00:00 UTC', failureReason: reason }
    })
  }
}
