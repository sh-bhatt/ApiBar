import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { OAuth2Client } from 'google-auth-library'
import { authMiddleware, type AuthedRequest } from '../middleware/auth'
import { User } from '../models/User'

const router = Router()

type RefreshPayload = {
  sub: string
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not set')
  }
  return secret
}

function signAccessToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email }, getJwtSecret(), { expiresIn: '15m' })
}

function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, getJwtSecret(), { expiresIn: '7d' })
}

async function issueAuthTokens(user: {
  _id: mongoose.Types.ObjectId
  email: string
  refreshToken?: string | null
  save: () => Promise<unknown>
}) {
  const accessToken = signAccessToken(user._id.toString(), user.email)
  const refreshToken = signRefreshToken(user._id.toString())
  user.refreshToken = await bcrypt.hash(refreshToken, 12)
  await user.save()

  return { accessToken, refreshToken }
}

router.post('/register', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : email.split('@')[0]
    const roleRaw = req.body?.role
    const role = (roleRaw === 'admin' || roleRaw === 'provider' || roleRaw === 'consumer') ? roleRaw : 'provider'
    const planRaw = req.body?.plan
    const plan = planRaw === 'pro' ? 'pro' : 'free'

    if (!email || !password) {
      res.status(400).json({ error: 'email_and_password_required' })
      return
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'password_min_length_8' })
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await User.create({ email, passwordHash, name, role, plan })
    const { accessToken, refreshToken } = await issueAuthTokens(user)

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role, plan: user.plan },
    })
  } catch (err: unknown) {
    if (isMongoDuplicate(err)) {
      res.status(409).json({ error: 'email_already_registered' })
      return
    }
    console.error(err)
    res.status(500).json({ error: 'registration_failed' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const email =
      typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const password = typeof req.body?.password === 'string' ? req.body.password : ''

    if (!email || !password) {
      res.status(400).json({ error: 'email_and_password_required' })
      return
    }

    const user = await User.findOne({ email })
    if (!user) {
      res.status(401).json({ error: 'invalid_credentials' })
      return
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      res.status(401).json({ error: 'invalid_credentials' })
      return
    }

    const { accessToken, refreshToken } = await issueAuthTokens(user)

    res.json({
      accessToken,
      refreshToken,
      user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role, plan: user.plan },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'login_failed' })
  }
})

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : ''
    if (!refreshToken) {
      res.status(400).json({ error: 'refresh_token_required' })
      return
    }

    const decoded = jwt.verify(refreshToken, getJwtSecret()) as RefreshPayload
    const user = await User.findById(decoded.sub)

    if (!user || !user.refreshToken) {
      res.status(401).json({ error: 'invalid_refresh_token' })
      return
    }

    const ok = await bcrypt.compare(refreshToken, user.refreshToken)
    if (!ok) {
      res.status(401).json({ error: 'invalid_refresh_token' })
      return
    }

    const accessToken = signAccessToken(user._id.toString(), user.email)
    res.json({ accessToken })
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'invalid_refresh_token' })
      return
    }
    console.error(err)
    res.status(500).json({ error: 'refresh_failed' })
  }
})

router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const { userId } = req as AuthedRequest
    await User.updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $unset: { refreshToken: 1 } },
    )

    res.json({ message: 'logged out' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'logout_failed' })
  }
})

// Google OAuth client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
)

// Google OAuth route - accepts either ID token (credential) or userInfo object
router.post('/google', async (req, res) => {
  try {
    const { credential, userInfo, role } = req.body

    let email: string
    let name: string
    let picture: string | undefined

    // If credential (ID token) is provided, verify it
    if (credential) {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      })

      const payload = ticket.getPayload()
      if (!payload || !payload.email) {
        return res.status(401).json({ error: 'invalid_google_token' })
      }

      email = payload.email
      name = payload.name || payload.email.split('@')[0]
      picture = payload.picture
    }
    // If userInfo object is provided directly (from frontend Google API call)
    else if (userInfo && userInfo.email) {
      email = userInfo.email
      name = userInfo.name || userInfo.email.split('@')[0]
      picture = userInfo.picture
    }
    else {
      return res.status(400).json({ error: 'credential_or_userInfo_required' })
    }

    // Find or create user
    let user = await User.findOne({ email })

    if (!user) {
      // Create new user
      user = await User.create({
        email,
        name,
        passwordHash: await bcrypt.hash('google_oauth_' + Math.random(), 12),
        role: role || 'provider',
        plan: 'free'
      })
    }

    const { accessToken, refreshToken } = await issueAuthTokens(user)

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan
      }
    })
  } catch (err) {
    console.error('Google OAuth error:', err)
    res.status(500).json({ error: 'google_oauth_failed' })
  }
})

function isMongoDuplicate(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === 11000
  )
}

export default router
