// /pages/api/signals.js
// Data: Google Trends (SerpAPI-free proxy) + Reddit JSON public API + Wikipedia pageview API
// Cache: Upstash Redis REST — 6 hour TTL
// No paid APIs, no API keys beyond Upstash

const CACHE_KEY = 'cim:signals:v3'
const CACHE_TTL = 60 * 60 * 6 // 6 hours

// Upstash Redis via REST (uses existing suppression-sweep credentials)
async function redisGet(key) {
  try {
    const r = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
    })
    const d = await r.json()
    return d.result ? JSON.parse(d.result) : null
  } catch { return null }
}

async function redisSet(key, value, ttl) {
  try {
    await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/${key}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([JSON.stringify(value), 'EX', ttl])
    })
  } catch {}
}

// SIGNALS CONFIG — culture moments we monitor
// Each has: Google Trends keywords, Reddit subreddits+search, Wikipedia article, governance risk logic
const SIGNALS_CONFIG = [
  {
    id: 'bridgerton',
    title: 'Bridgerton universe',
    source: 'Netflix',
    category: 'Film & TV',
    trendsKeyword: 'bridgerton fashion',
    wikiArticle: 'Bridgerton',
    redditQuery: 'bridgerton',
    redditSubs: ['femalefashionadvice', 'television'],
    governanceKeywords: [],
    riskLevel: 'Low',
    riskNote: 'Standard licensed partnerships. No AI content exposure identified.'
  },
  {
    id: 'mj_biopic',
    title: 'Michael Jackson biopic',
    source: 'Universal / TikTok',
    category: 'Music & Artists',
    trendsKeyword: 'michael jackson style 2026',
    wikiArticle: 'Michael_Jackson',
    redditQuery: 'michael jackson biopic',
    redditSubs: ['malefashionadvice', 'movies'],
    governanceKeywords: ['ai voice', 'deepfake', 'likeness'],
    riskLevel: 'High',
    riskNote: 'AI vocal recreation tools create digital likeness exposure for MJ-adjacent commercial activations.'
  },
  {
    id: 'euphoria',
    title: 'Euphoria S3 — Feral Glam',
    source: 'HBO / TikTok',
    category: 'Fashion & Style',
    trendsKeyword: 'feral glam aesthetic',
    wikiArticle: 'Euphoria_(American_TV_series)',
    redditQuery: 'euphoria fashion maddy',
    redditSubs: ['femalefashionadvice', 'television'],
    governanceKeywords: ['ai generated', 'synthetic'],
    riskLevel: 'Medium',
    riskNote: 'AI-generated Euphoria aesthetic content proliferating on TikTok — verify creator content authenticity before amplification.'
  },
  {
    id: 'yellowstone',
    title: 'Dutton Ranch — Texas effect',
    source: 'Paramount+',
    category: 'Film & TV',
    trendsKeyword: 'dutton ranch texas',
    wikiArticle: 'Yellowstone_(TV_series)',
    redditQuery: 'yellowstone dutton ranch',
    redditSubs: ['television', 'malefashionadvice'],
    governanceKeywords: [],
    riskLevel: 'None',
    riskNote: 'No AI governance exposure identified.'
  },
  {
    id: 'ai_influencers',
    title: 'AI-generated creator activations',
    source: 'FTC / Industry',
    category: 'AI & Synthetic Media',
    trendsKeyword: 'ai influencer brand',
    wikiArticle: 'Virtual_influencer',
    redditQuery: 'ai influencer marketing',
    redditSubs: ['marketing', 'socialmedia'],
    governanceKeywords: ['ftc', 'disclosure', 'synthetic', 'virtual influencer'],
    riskLevel: 'High',
    riskNote: 'FTC disclosure requirements for AI-generated personas not yet codified — enforcement risk rising. No activations without explicit governance protocol.'
  },
  {
    id: 'puma_bembury',
    title: 'PUMA × Bembury World Cup drop',
    source: 'PUMA / Hypebeast',
    category: 'Sports Culture',
    trendsKeyword: 'puma bembury world cup',
    wikiArticle: 'PUMA',
    redditQuery: 'puma bembury world cup kit',
    redditSubs: ['streetwear', 'soccer'],
    governanceKeywords: [],
    riskLevel: 'Low',
    riskNote: 'Standard licensed collaboration. Monitor for AI-generated marketing content if activations expand.'
  }
]

// Fetch Wikipedia pageviews for a single article (last 7 days)
async function fetchWikiViews(article) {
  try {
    const end = new Date()
    const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const fmt = d => d.toISOString().slice(0,10).replace(/-/g,'')
    const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(article)}/daily/${fmt(start)}/${fmt(end)}`
    const r = await fetch(url, { headers: { 'User-Agent': 'CultureIntelligenceMonitor/1.0' } })
    if (!r.ok) return null
    const d = await r.json()
    const items = d.items || []
    const total = items.reduce((s, i) => s + (i.views || 0), 0)
    const daily = Math.round(total / (items.length || 1))
    return { total, daily, days: items.length }
  } catch { return null }
}

// Fetch Reddit post count for a query in given subreddits
async function fetchRedditSignal(query, subs) {
  try {
    const sub = subs[0] // use first subreddit to avoid rate limits
    const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&sort=hot&limit=10&t=week`
    const r = await fetch(url, { headers: { 'User-Agent': 'CultureIntelligenceMonitor/1.0' } })
    if (!r.ok) return null
    const d = await r.json()
    const posts = d.data?.children || []
    const totalScore = posts.reduce((s, p) => s + (p.data?.score || 0), 0)
    return { postCount: posts.length, totalScore, topPost: posts[0]?.data?.title || null }
  } catch { return null }
}

// Fetch Google Trends via unofficial endpoint (no key needed)
async function fetchTrends(keyword) {
  try {
    // Use the trends explore API directly
    const encodedKw = encodeURIComponent(JSON.stringify([{ keyword, geo: '', time: 'now 7-d' }]))
    const url = `https://trends.google.com/trends/api/explore?hl=en-US&tz=-300&req=${encodedKw}&cts=1`
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })
    if (!r.ok) return null
    // Google Trends prepends ")]}',\n" to the response
    const text = (await r.text()).replace(/^\)\]\}',\n/, '')
    const data = JSON.parse(text)
    // Extract trend score from widgets
    const widgets = data.widgets || []
    const timeWidget = widgets.find(w => w.id === 'TIMESERIES')
    if (!timeWidget) return null
    return { token: timeWidget.token, keyword }
  } catch { return null }
}

async function buildSignals() {
  const results = await Promise.allSettled(
    SIGNALS_CONFIG.map(async (cfg) => {
      const [wiki, reddit] = await Promise.allSettled([
        fetchWikiViews(cfg.wikiArticle),
        fetchRedditSignal(cfg.redditQuery, cfg.redditSubs)
      ])

      const wikiData = wiki.status === 'fulfilled' ? wiki.value : null
      const redditData = reddit.status === 'fulfilled' ? reddit.value : null

      // Build commercial signal text from live data
      let commercialSignal = ''
      if (wikiData?.daily) {
        commercialSignal += `${wikiData.daily.toLocaleString()} avg daily Wikipedia views this week. `
      }
      if (redditData?.postCount) {
        commercialSignal += `${redditData.postCount} active posts on r/${cfg.redditSubs[0]} (${redditData.totalScore.toLocaleString()} total upvotes). `
      }
      if (!commercialSignal) {
        commercialSignal = 'Live signal data temporarily unavailable — check back shortly.'
      }

      return {
        id: cfg.id,
        title: cfg.title,
        source: cfg.source,
        category: cfg.category,
        commercialSignal: commercialSignal.trim(),
        wikiViews: wikiData,
        redditSignal: redditData,
        riskLevel: cfg.riskLevel,
        riskNote: cfg.riskNote,
        fetchedAt: new Date().toISOString()
      }
    })
  )

  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
}

export default async function handler(req, res) {
  const forceRefresh = req.query.refresh === '1'

  if (!forceRefresh) {
    const cached = await redisGet(CACHE_KEY)
    if (cached) return res.status(200).json(cached)
  }

  try {
    const signals = await buildSignals()
    const payload = {
      signals,
      meta: { updatedAt: new Date().toISOString(), count: signals.length, source: 'live' }
    }
    await redisSet(CACHE_KEY, payload, CACHE_TTL)
    return res.status(200).json(payload)
  } catch (err) {
    console.error('signals error:', err)
    return res.status(500).json({ error: 'Failed to fetch signals', signals: [], meta: { source: 'error' } })
  }
}
