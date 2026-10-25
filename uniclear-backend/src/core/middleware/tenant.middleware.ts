/// <reference path="../../lib/utils/express.d.ts" />
import { Request, Response, NextFunction } from 'express'
import { db } from '@/lib/db'
import { NotFoundError } from '@/core/errors/AppError'

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const host = req.hostname
    const rawTenant = req.query.tenant || req.headers['x-tenant-slug']
    let slug: string | undefined

    if (rawTenant) {
      if (Array.isArray(rawTenant)) {
        slug = (rawTenant[0] as string)?.trim()
      } else if (typeof rawTenant === 'string') {
        slug = rawTenant.trim()
      }
    } else {
      // Prevent IP addresses and platform hosting domains from being treated as tenant subdomains
      const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || /^\d+$/.test(host)
      const isPlatformHost = ['onrender.com', 'render.com', 'vercel.app', 'localhost'].some(d => host.endsWith(d))
      if (!isIp && !isPlatformHost) {
        const parts = host.split('.')
        if (parts.length >= 3 && !/^\d+$/.test(parts[0])) slug = parts[0]
      }
    }

    if (slug && slug !== 'www' && !/^\d+$/.test(slug)) {
      const university = await db.university.findUnique({
        where: { slug },
        select: { id: true, isActive: true },
      })
      if (university) {
        if (!university.isActive) throw new NotFoundError('University is suspended')
        req.universityId = university.id
        return next()
      }

      // Do not block public, branding, or auth endpoints if slug is unknown
      const isPublic = req.path.includes('/public') || req.path.includes('/branding') || req.path.startsWith('/auth')
      if (!isPublic) {
        throw new NotFoundError('University not found')
      }
    }

    // Fallback: resolve from JWT universityId (already verified by authMiddleware)
    if (req.user?.universityId) {
      req.universityId = req.user.universityId
      return next()
    }

    next()
  } catch (err) {
    next(err)
  }
}
