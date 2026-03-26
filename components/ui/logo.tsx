import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  href?: string
}

const sizes = {
  sm: { icon: 24, text: 'text-sm' },
  md: { icon: 32, text: 'text-base' },
  lg: { icon: 40, text: 'text-xl' },
}

export function Logo({ size = 'md', showText = true, href }: LogoProps) {
  const s = sizes[size]

  const content = (
    <div className="flex items-center gap-2.5">
      <Image
        src="/logo.svg"
        alt="Orquesta"
        width={s.icon}
        height={s.icon}
        className="shrink-0"
        priority
      />
      {showText && (
        <span className={`font-semibold text-white ${s.text}`}>
          Orquesta <span className="text-zinc-500 font-normal">OSS</span>
        </span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
        {content.props.children}
      </Link>
    )
  }

  return content
}
