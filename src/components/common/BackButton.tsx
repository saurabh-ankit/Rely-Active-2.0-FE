import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BackButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode
  label?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export const BackButton: React.FC<BackButtonProps> = ({
  children,
  label,
  icon,
  className,
  type = 'button',
  ...props
}) => {
  const content = children ?? label
  const isIconOnly = !content

  return (
    <button
      type={type}
      className={cn(
        'group inline-flex items-center justify-center gap-2 rounded-full border border-transparent bg-transparent text-xs font-semibold text-gray-600 transition-all duration-150 hover:border-gray-200/90 hover:bg-white hover:text-gray-900 hover:shadow-xs active:scale-[0.98] cursor-pointer dark:text-gray-400 dark:hover:border-gray-700 dark:hover:bg-slate-800 dark:hover:text-white',
        isIconOnly ? 'h-8 w-8 p-0 shrink-0' : 'px-3 py-1.5',
        className,
      )}
      {...props}
    >
      {icon ?? (
        <ArrowLeft
          className={cn(
            'text-gray-600 transition-colors group-hover:text-gray-900 shrink-0 dark:text-gray-400 dark:group-hover:text-white',
            isIconOnly ? 'h-4 w-4' : 'h-3.5 w-3.5',
          )}
        />
      )}
      {content ? <span>{content}</span> : null}
    </button>
  )
}

export default BackButton
