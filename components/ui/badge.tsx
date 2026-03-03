import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-zinc-800 text-zinc-300',
        green: 'bg-green-900/60 text-green-400',
        yellow: 'bg-yellow-900/60 text-yellow-400',
        red: 'bg-red-900/60 text-red-400',
        blue: 'bg-blue-900/60 text-blue-400',
        outline: 'border border-zinc-700 text-zinc-400',
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
