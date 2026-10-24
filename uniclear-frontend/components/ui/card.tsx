import { cn } from '@/lib/utils/cn'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'glass' | 'tinted' | 'interactive'
  hoverEffect?: boolean
}

export function Card({
  padding = 'md',
  variant = 'default',
  hoverEffect = false,
  className,
  children,
  ...props
}: CardProps) {
  const paddings = {
    none: 'p-0',
    sm: 'p-3.5',
    md: 'p-5',
    lg: 'p-6 sm:p-7',
    xl: 'p-8 sm:p-9',
  }

  const variants = {
    default: 'bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)]',
    glass: 'glass-card border border-white/60 shadow-[var(--shadow-md)]',
    tinted: 'bg-[var(--color-surface-tint)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-xs)]',
    interactive: 'bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:border-[var(--color-primary)]/40 hover:shadow-[var(--shadow-md)] cursor-pointer',
  }

  return (
    <div
      className={cn(
        'rounded-xl transition-all duration-200 relative',
        variants[variant],
        paddings[padding],
        hoverEffect && 'hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] transition-transform',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
