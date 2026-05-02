import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import { authMiddleware, type AuthedRequest } from './auth'
import { User } from '../models/User'

export function requireRole(requiredRole: 'admin' | 'provider' | 'consumer') {
  return async (req: Request, res: Response, next: NextFunction) => {
    // First run auth middleware to ensure user is authenticated
    authMiddleware(req, res, async (err?: any) => {
      if (err) {
        return next(err)
      }

      const authedReq = req as AuthedRequest
      
      try {
        // Fetch user from database to check role
        const user = await User.findById(authedReq.userId)
        
        if (!user || user.role !== requiredRole) {
          return res.status(403).json({ error: 'insufficient_permissions' })
        }

        // Attach user to request for downstream use
        ;(req as any).user = user

        next()
      } catch (error) {
        console.error('Error checking user role:', error)
        return res.status(500).json({ error: 'role_check_failed' })
      }
    })
  }
}
