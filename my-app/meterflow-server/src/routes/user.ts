import { Router } from 'express'
import mongoose from 'mongoose'
import { User } from '../models/User'
import { authMiddleware, type AuthedRequest } from '../middleware/auth'

const router = Router()

// GET /api/profile - returns current user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const { userId } = req as AuthedRequest

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' })
    }

    res.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      createdAt: user.createdAt,
      avatar: user.avatar,
      bio: user.bio,
      company: user.company,
      website: user.website,
      location: user.location,
      phone: user.phone,
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    res.status(500).json({ error: 'failed_to_fetch_profile' })
  }
})

// PATCH /api/profile - update profile fields
router.patch('/profile', authMiddleware, async (req, res) => {
  try {
    const { userId } = req as AuthedRequest
    const { name, bio, company, website, location, phone } = req.body

    const updates: Record<string, string> = {}

    if (name !== undefined) updates.name = name.trim()
    if (bio !== undefined) updates.bio = bio.trim()
    if (company !== undefined) updates.company = company.trim()
    if (website !== undefined) updates.website = website.trim()
    if (location !== undefined) updates.location = location.trim()
    if (phone !== undefined) updates.phone = phone.trim()

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    )

    if (!user) {
      return res.status(404).json({ error: 'user_not_found' })
    }

    res.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      createdAt: user.createdAt,
      avatar: user.avatar,
      bio: user.bio,
      company: user.company,
      website: user.website,
      location: user.location,
      phone: user.phone,
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    res.status(500).json({ error: 'failed_to_update_profile' })
  }
})

// POST /api/profile/avatar - upload avatar as base64
router.post('/profile/avatar', authMiddleware, async (req, res) => {
  try {
    const { userId } = req as AuthedRequest
    const { avatar } = req.body

    if (!avatar || typeof avatar !== 'string') {
      return res.status(400).json({ error: 'avatar_required' })
    }

    // Validate base64 image (check if it's a valid data URL)
    if (!avatar.startsWith('data:image/')) {
      return res.status(400).json({ error: 'invalid_image_format' })
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { avatar },
      { new: true, runValidators: true }
    )

    if (!user) {
      return res.status(404).json({ error: 'user_not_found' })
    }

    res.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      createdAt: user.createdAt,
      avatar: user.avatar,
      bio: user.bio,
      company: user.company,
      website: user.website,
      location: user.location,
      phone: user.phone,
    })
  } catch (error) {
    console.error('Error updating avatar:', error)
    res.status(500).json({ error: 'failed_to_update_avatar' })
  }
})

export default router
