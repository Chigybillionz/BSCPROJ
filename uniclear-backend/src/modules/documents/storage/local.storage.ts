import fs from 'fs'
import path from 'path'
import { IStorageProvider } from './storage.interface'

export class LocalStorage implements IStorageProvider {
  private baseDir = path.resolve(process.cwd(), 'uploads')

  // Strip all directory components — only the bare filename/ext survives
  private sanitize(input: string): string {
    // nosec CWE-22 — path.basename strips all directory traversal sequences
    const base = path.basename(input)
    if (!base || base === '.' || base === '..') throw new Error('Invalid file path')
    return base
  }

  private safePath(key: string): string {
    const sanitized = this.sanitize(key)
    // nosec CWE-22 — sanitized contains only a bare filename, no path components
    return path.join(this.baseDir, sanitized)
  }

  // nosec CWE-22 — filePath is sanitized before ext extraction; key is a UUID, not user input
  async upload(buffer: Buffer, filePath: string, mimeType: string): Promise<{ url: string; key: string }> {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
      'image/webp': '.webp', 'image/svg+xml': '.svg', 'application/pdf': '.pdf',
    }
    const ext = mimeToExt[mimeType] ?? path.extname(this.sanitize(filePath)) ?? ''
    const key = `${crypto.randomUUID()}${ext}`
    const fullPath = path.join(this.baseDir, key)
    fs.mkdirSync(this.baseDir, { recursive: true })
    const port = process.env.PORT ?? '5001'
    const baseUrl = process.env.API_URL ?? `http://localhost:${port}`
    return { url: `${baseUrl}/uploads/${key}`, key }
  }

  async delete(key: string): Promise<void> {
    const fullPath = this.safePath(key)
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)
  }

  async getSignedUrl(key: string): Promise<string> {
    const sanitized = this.sanitize(key)
    return `/uploads/${sanitized}`
  }
}
