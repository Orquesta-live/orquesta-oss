'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { X, CheckCircle2, XCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const icons: Record<ToastType, ReactNode> = {
    success: <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />,
    error: <XCircle className="h-4 w-4 text-red-400 shrink-0" />,
    info: <Info className="h-4 w-4 text-blue-400 shrink-0" />,
  }

  const borderColors: Record<ToastType, string> = {
    success: 'border-green-800/50',
    error: 'border-red-800/50',
    info: 'border-blue-800/50',
  }

  return (
    <ToastContext value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 rounded-lg border ${borderColors[t.type]} bg-zinc-900 px-4 py-3 shadow-xl animate-in slide-in-from-bottom-2 duration-200`}
          >
            {icons[t.type]}
            <span className="text-sm text-zinc-200">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="ml-2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  )
}
