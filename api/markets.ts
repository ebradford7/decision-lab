import type { VercelRequest, VercelResponse } from '@vercel/node'

interface PolymarketMarket {
  id: string
  question: string
  outcomes: string        // JSON-encoded string array e.g. '["Yes","No"]'
  outcomePrices: string   // JSON-encoded string array e.g. '["0.65","0.35"]'
  active: boolean
  closed: boolean
  volume: number
  slug?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const q = req.query.q as string | undefined
  if (!q) return res.status(400).json({ error: 'Missing query parameter q' })

  try {
    const url = `https://gamma-api.polymarket.com/markets?active=true&closed=false&q=${encodeURIComponent(q)}&limit=6&order=volume&ascending=false`
    const upstream = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    })
    if (!upstream.ok) throw new Error(`Polymarket responded ${upstream.status}`)

    const raw = await upstream.json() as PolymarketMarket[]

    const markets = raw
      .filter(m => m.active && !m.closed)
      .map(m => {
        let probability: number | null = null
        try {
          const prices = JSON.parse(m.outcomePrices) as string[]
          const outcomes = JSON.parse(m.outcomes) as string[]
          const yesIdx = outcomes.findIndex(o => o.toLowerCase() === 'yes')
          const p = yesIdx >= 0 ? prices[yesIdx] : prices[0]
          probability = Math.round(parseFloat(p) * 100)
        } catch { /* skip malformed */ }

        return {
          id: m.id,
          question: m.question,
          probability,
          volume: Math.round(m.volume),
          url: m.slug
            ? `https://polymarket.com/event/${m.slug}`
            : `https://polymarket.com`,
        }
      })
      .filter(m => m.probability !== null && m.probability >= 0 && m.probability <= 100)
      .slice(0, 5)

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    return res.status(200).json(markets)
  } catch (err) {
    console.error('Polymarket proxy error:', err)
    return res.status(502).json({ error: 'Failed to fetch from Polymarket' })
  }
}
