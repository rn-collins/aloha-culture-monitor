export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const host = req.headers.host
  const proto = host?.includes('localhost') ? 'http' : 'https'
  try {
    const response = await fetch(`${proto}://${host}/api/signals?refresh=1`, {
      signal: AbortSignal.timeout(25000)
    })
    const data = await response.json()
    return res.status(response.ok ? 200 : response.status).json({
      ok: response.ok && data.meta?.status === 'healthy',
      preservedPriorData: data.meta?.source === 'preserved-cache',
      status: data.meta?.status || 'unknown',
      count: data.signals?.length || 0,
      updatedAt: data.meta?.updatedAt || null,
      lastAttemptAt: data.meta?.lastAttemptAt || null,
      failureReason: data.meta?.failureReason || data.error || null
    })
  } catch (error) {
    return res.status(504).json({
      ok: false,
      status: 'failed',
      failureReason: error?.name === 'TimeoutError' ? 'Refresh exceeded 25 seconds.' : 'Refresh request failed.'
    })
  }
}
