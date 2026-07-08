import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
  {
    variants: {
      variant: {
        default: 'bg-zinc-800/80 text-zinc-300 ring-zinc-700/60',
        green: 'bg-green-500/12 text-green-300 ring-green-500/25',
        yellow: 'bg-yellow-500/12 text-yellow-300 ring-yellow-500/25',
        red: 'bg-red-500/12 text-red-300 ring-red-500/25',
        blue: 'bg-blue-500/12 text-blue-300 ring-blue-500/25',
        outline: 'bg-transparent text-zinc-400 ring-zinc-700',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
