import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import path from 'path'
import crypto from 'crypto'
import { env } from '@/core/config/env'
import { IStorageProvider } from './storage.interface'

export class SupabaseStorage implements IStorageProvider {
  private s3: S3Client
  private bucket: string

  constructor() {
    this.bucket = env.SUPABASE_STORAGE_BUCKET ?? 'clearance-documents'
    this.s3 = new S3Client({
      forcePathStyle: true,
      region: env.SUPABASE_S3_REGION ?? 'eu-central-2',
      endpoint: env.SUPABASE_S3_ENDPOINT ?? 'https://ltqyaavtoiqaibfcnnsj.supabase.co/storage/v1/s3',
      credentials: {
        accessKeyId: env.SUPABASE_S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: env.SUPABASE_S3_SECRET_ACCESS_KEY ?? '',
      },
    })
  }

  async upload(buffer: Buffer, filePath: string, mimeType: string): Promise<{ url: string; key: string }> {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
      'image/webp': '.webp', 'image/svg+xml': '.svg', 'application/pdf': '.pdf',
    }
    const base = path.basename(filePath)
    const ext = mimeToExt[mimeType] ?? path.extname(base) ?? ''
    const key = `${crypto.randomUUID()}${ext}`

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    )

    // Generate signed URL (default 24 hours) for the returned reference
    const signedUrl = await this.getSignedUrl(key, 86400)
    return { url: signedUrl, key }
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    )
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })
    return getSignedUrl(this.s3, command, { expiresIn })
  }
}
