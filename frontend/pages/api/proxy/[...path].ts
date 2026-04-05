import type { NextApiRequest, NextApiResponse } from 'next'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query
  const urlPath = Array.isArray(path) ? path.join('/') : path
  const queryString = req.url?.split('?')[1]
  
  const targetUrl = `https://dscibackend-v1.onrender.com/${urlPath}${queryString ? `?${queryString}` : ''}`
  
  try {
    // Forward relevant headers
    const headers: Record<string, string> = {}
    if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'] as string
    
    // Convert readable stream to something fetch can handle (using a helper or just forwarding the request)
    // For simplicity in Next.js, we can forward the request stream directly if the environment supports it,
    // or use a buffer.
    const body = req.method !== 'GET' ? await getRawBody(req) : undefined

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
    })

    const data = await response.json()
    res.status(response.status).json(data)
  } catch (error) {
    console.error('Proxy error:', error)
    res.status(500).json({ detail: 'Proxy failed to reach backend' })
  }
}

// Helper to get raw body
async function getRawBody(req: NextApiRequest) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}
