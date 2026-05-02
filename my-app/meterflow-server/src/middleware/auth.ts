import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

export type JwtUserPayload = {
  sub: string
  email: string
}

export type AuthedRequest = Request & {
  userId: string
  userEmail: string
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing_bearer_token' })
    return
  }

  const token = header.slice('Bearer '.length).trim()
  const secret = process.env.JWT_SECRET
  if (!secret) {
    res.status(500).json({ error: 'jwt_secret_not_configured' })
    return
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtUserPayload
    const authed = req as AuthedRequest
    authed.userId = decoded.sub
    authed.userEmail = decoded.email
    next()
  } catch {
    res.status(401).json({ error: 'invalid_or_expired_token' })
  }
}
