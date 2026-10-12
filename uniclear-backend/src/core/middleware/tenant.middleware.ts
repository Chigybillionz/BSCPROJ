/// <reference path="../../lib/utils/express.d.ts" />
import { Request, Response, NextFunction } from 'express'
import { db } from '@/lib/db'
import { NotFoundError } from '@/core/errors/AppError'

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const host = req.hostname
    const rawTenant = req.query.tenant
    let slug: string | undefined

    if (rawTenant) {
      if (Array.isArray(rawTenant)) {
        slug = (rawTenant[0] as string)?.trim()
      } else if (typeof rawTenant === 'string') {
        slug = rawTenant.trim()
      }
    } else {
      // Prevent IP addresses (like 127.0.0.1 or 192.168.x.x) from being treated as subdomains
      const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || /^\d+$/.test(host)
      if (!isIp) {
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

      // Do not block public endpoints if slug is unknown or from local IP test
      const isPublic = req.path.includes('/public')
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
