import { IStorageProvider } from './storage.interface'
import { LocalStorage } from './local.storage'
import { CloudinaryStorage } from './cloudinary.storage'
import { SupabaseStorage } from './supabase.storage'
import { env } from '@/core/config/env'

function createStorage(): IStorageProvider {
  if (env.STORAGE_PROVIDER === 'supabase') return new SupabaseStorage()
  if (env.STORAGE_PROVIDER === 'cloudinary') return new CloudinaryStorage()
  return new LocalStorage()
}

export const storage: IStorageProvider = createStorage()

