// /pages/api/contact.js
// Fires on every contact form submission across all four tools
// 1. Stores to Upstash Redis under contacts:{timestamp}
// 2. Pings #inquiries Slack channel
// 3. Sends Resend confirmation email to submitter
// 4. Sends Resend notification email to RN

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { name, email, inquiry, message } = req.body
  if (!name || !email || !inquiry || !message) {
    return res.status(400).json({ error: 'All fields required' })
  }

  const timestamp = Date.now()
  const source = req.headers.host || 'unknown'

  // 1 — Store in Upstash Redis
  try {
    await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/contacts:${timestamp}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([JSON.stringify({ name, email, inquiry, message, source, timestamp }), 'EX', 60 * 60 * 24 * 90])
    })
  } catch (e) { console.error('Redis store failed:', e) }

  // 2 — Slack #inquiries alert
  try {
    await fetch(process.env.SLACK_INQUIRIES_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `📬 *New inquiry via ${source}*\n*Name:* ${name}\n*Email:* ${email}\n*Type:* ${inquiry}\n*Message:* ${message}`
      })
    })
  } catch (e) { console.error('Slack ping failed:', e) }

  // 3 — Resend confirmation to submitter
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'RN Collins <onboarding@resend.dev>',
        to: email,
        subject: 'Got your message — RN Collins · Aloha AI Consulting',
        html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#1C1B1F"><div style="font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#1B7A68;margin-bottom:16px">Aloha AI Consulting</div><h1 style="font-size:24px;font-weight:600;margin:0 0 16px">Hi ${name} — message received.</h1><p style="font-size:15px;line-height:1.7;color:#5A5857;margin:0 0 24px">Thanks for reaching out about <strong>${inquiry}</strong>. I'll review your message and be in touch within 48 hours.</p><div style="background:#F6F3EC;border-radius:8px;padding:20px 24px;margin-bottom:24px"><div style="font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#8A8784;margin-bottom:8px">Your message</div><p style="font-size:14px;line-height:1.65;color:#1C1B1F;margin:0">${message}</p></div><p style="font-size:13px;color:#8A8784;margin:0">— RN Collins<br>Neuroscientist · JD Candidate, Northeastern · Founder, Aloha AI Consulting</p></div>`
      })
    })
  } catch (e) { console.error('Resend confirmation failed:', e) }

  // 4 — Resend notification to RN
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Aloha AI Leads <onboarding@resend.dev>',
        to: process.env.RN_EMAIL,
        subject: `New ${inquiry} inquiry from ${name}`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1C1B1F"><div style="font-size:13px;font-weight:600;color:#1B7A68;margin-bottom:12px">New inquiry via ${source}</div><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:8px 0;color:#5A5857;width:100px">Name</td><td style="padding:8px 0;font-weight:500">${name}</td></tr><tr><td style="padding:8px 0;color:#5A5857">Email</td><td style="padding:8px 0"><a href="mailto:${email}">${email}</a></td></tr><tr><td style="padding:8px 0;color:#5A5857">Type</td><td style="padding:8px 0">${inquiry}</td></tr><tr><td style="padding:8px 0;color:#5A5857;vertical-align:top">Message</td><td style="padding:8px 0;line-height:1.6">${message}</td></tr></table></div>`
      })
    })
  } catch (e) { console.error('Resend notification failed:', e) }

  return res.status(200).json({ ok: true })
}
