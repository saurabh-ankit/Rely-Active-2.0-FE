'use client'

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'

import { cn } from '@/lib/utils'
import { CheckIcon } from 'lucide-react'

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-gray-300 bg-white transition-colors outline-none cursor-pointer group-has-disabled/field:opacity-50 group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-gray-300 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-[#005390] focus-visible:ring-3 focus-visible:ring-[#005390]/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-[#005390] dark:bg-input/30 dark:border-gray-600 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-[#005390] data-checked:bg-[#005390] data-checked:text-white group-has-[:focus-visible]/field-label:data-checked:border-[#005390] dark:data-checked:border-[#005390] dark:data-checked:bg-[#005390] dark:data-checked:text-white',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
