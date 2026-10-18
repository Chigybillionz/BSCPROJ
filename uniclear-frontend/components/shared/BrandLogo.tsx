import Image from 'next/image'
import { cn } from '@/lib/utils/cn'

/**
 * UniClear brand mark, used whenever a university has no logo of its own.
 * Square (512×512) with even breathing room, so it fills rounded tiles without
 * letterboxing at any breakpoint.
 */
export const UNICLEAR_LOGO = '/brand/uniclear-mark.png'

interface BrandLogoProps {
  /** Tenant logo URL; falls back to the UniClear logo when empty. */
  logoUrl?: string | null
  alt: string
  /** Rendered square size in px. */
  size: number
  className?: string
  /** Preload — use for the logo that is above the fold on auth screens. */
  priority?: boolean
}

export function BrandLogo({ logoUrl, alt, size, className, priority = false }: BrandLogoProps) {
  return (
    <Image
      src={logoUrl || UNICLEAR_LOGO}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={cn('object-contain', className)}
    />
  )
}
