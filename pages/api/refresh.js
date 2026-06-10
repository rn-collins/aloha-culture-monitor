export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const host = req.headers.host
  const proto = host?.includes('localhost') ? 'http' : 'https'
  const r = await fetch(`${proto}://${host}/api/signals?refresh=1`)
  const d = await r.json()
  return res.status(200).json({ ok: true, count: d.signals?.length, updatedAt: d.meta?.updatedAt })
}
