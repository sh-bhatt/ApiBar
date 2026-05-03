import axios from 'axios'
import { Router } from 'express'
import type { MeteredGatewayRequest } from '../middleware/trackUsage'

const router = Router()

function joinUpstreamUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
}

function getForwardHeaders(req: MeteredGatewayRequest): Record<string, string> {
  const headers: Record<string, string> = {}

  for (const [key, value] of Object.entries(req.headers)) {
    if (
      value == null ||
      key === 'host' ||
      key === 'content-length' ||
      key === 'x-api-key'
    ) {
      continue
    }

    headers[key] = Array.isArray(value) ? value.join(', ') : value as string
  }

  return headers
}

async function forwardRequest(req: MeteredGatewayRequest) {
  const api = req.meterflowLinkedApi
  if (!api) {
    return null
  }

  const upstreamUrl = joinUpstreamUrl(api.baseUrl, req.path)

  return axios.request({
    url: upstreamUrl,
    method: req.method,
    params: req.query,
    data: req.body,
    headers: getForwardHeaders(req),
    validateStatus: () => true,
  })
}

router.get('/ping', async (req, res) => {
  try {
    const upstream = await forwardRequest(req as MeteredGatewayRequest)
    if (upstream) {
      const contentType = upstream.headers['content-type']
      if (contentType) {
        res.setHeader('content-type', contentType)
      }
      res.status(upstream.status).send(upstream.data)
      return
    }

    res.json({ message: 'pong' })
  } catch {
    res.status(502).json({ error: 'upstream_unavailable' })
  }
})

router.use(async (req, res) => {
  try {
    const upstream = await forwardRequest(req as MeteredGatewayRequest)
    if (!upstream) {
      res.status(404).json({ error: 'not_found' })
      return
    }

    const contentType = upstream.headers['content-type']
    if (contentType) {
      res.setHeader('content-type', contentType)
    }

    res.status(upstream.status).send(upstream.data)
  } catch {
    res.status(502).json({ error: 'upstream_unavailable' })
  }
})

export default router
