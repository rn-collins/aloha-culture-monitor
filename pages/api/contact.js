const MAX_FIELD = { name: 120, email: 254, inquiry: 80, message: 4000 }
const EMAIL = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/
const clean = (value, limit) => String(value || '').trim().slice(0, limit)
const escapeHtml = value => value.replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]))

async function upstash(command) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  })
  if (!response.ok) throw new Error('Storage request failed')
  return response.json()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }) }
  const name = clean(req.body?.name, MAX_FIELD.name)
  const email = clean(req.body?.email, MAX_FIELD.email).toLowerCase()
  const inquiry = clean(req.body?.inquiry, MAX_FIELD.inquiry)
  const message = clean(req.body?.message, MAX_FIELD.message)
  if (!name || !EMAIL.test(email) || !inquiry || message.length < 10) return res.status(400).json({ error: 'Enter a valid name, email, inquiry type, and message.' })

  const ip = clean(req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown', 80)
  const bucket = `culture-contact-rate:${ip}:${Math.floor(Date.now() / 600000)}`
  try {
    const rate = await upstash([['INCR', bucket], ['EXPIRE', bucket, 600]])
    const count = Number(rate?.[0]?.result || 0)
    if (count > 5) return res.status(429).json({ error: 'Too many messages. Please try again later.' })
  } catch (error) { console.error('contact rate-limit unavailable', error) }

  const timestamp = Date.now()
  const source = clean(req.headers.host || 'aloha-culture-monitor', 160)
  const record = { name, email, inquiry, message, source, timestamp }
  const delivery = { stored: false, slack: false, notified: false, confirmed: false }

  try { await upstash([['SET', `contacts:${timestamp}`, JSON.stringify(record), 'EX', 7776000]]); delivery.stored = true } catch (error) { console.error('contact storage failed', error) }
  if (process.env.SLACK_INQUIRIES_WEBHOOK) try {
    const response = await fetch(process.env.SLACK_INQUIRIES_WEBHOOK, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ text:`New inquiry via ${source}\\nName: ${name}\\nEmail: ${email}\\nType: ${inquiry}\\nMessage: ${message}` }) })
    delivery.slack = response.ok
  } catch (error) { console.error('contact Slack delivery failed', error) }

  const safe = Object.fromEntries(Object.entries({name,email,inquiry,message,source}).map(([key,value])=>[key,escapeHtml(value)]))
  const send = async body => {
    if (!process.env.RESEND_API_KEY) return false
    const response = await fetch('https://api.resend.com/emails', { method:'POST', headers:{ Authorization:`Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type':'application/json' }, body:JSON.stringify(body) })
    return response.ok
  }
  try { if (process.env.RN_EMAIL) delivery.notified = await send({ from:'Aloha AI Leads <onboarding@resend.dev>', to:process.env.RN_EMAIL, subject:`New ${safe.inquiry} inquiry from ${safe.name}`, html:`<h1>New Culture Monitor inquiry</h1><p><b>Name:</b> ${safe.name}</p><p><b>Email:</b> ${safe.email}</p><p><b>Type:</b> ${safe.inquiry}</p><p><b>Message:</b><br>${safe.message}</p><p><small>Source: ${safe.source}</small></p>` }) } catch (error) { console.error('contact notification failed', error) }
  try { delivery.confirmed = await send({ from:'RN Collins <onboarding@resend.dev>', to:email, subject:'Message received — RN Collins', html:`<h1>Hi ${safe.name} — message received.</h1><p>Thanks for reaching out about <b>${safe.inquiry}</b>. I’ll review your message and respond if the project is a fit.</p>` }) } catch (error) { console.error('contact confirmation failed', error) }

  if (!delivery.stored && !delivery.slack && !delivery.notified) return res.status(502).json({ error: 'Your message could not be delivered. Please contact RN through LinkedIn.' })
  return res.status(200).json({ ok: true, reference: String(timestamp) })
}
