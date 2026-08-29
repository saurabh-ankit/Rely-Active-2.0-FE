import * as React from 'react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react'

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  )
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul data-slot="pagination-content" className={cn('flex items-center gap-1.5', className)} {...props} />
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, 'size'> &
  React.ComponentProps<'a'>

function PaginationLink({ className, isActive, size = 'icon', ...props }: PaginationLinkProps) {
  return (
    <Button
      variant={isActive ? 'outline' : 'ghost'}
      size={size}
      className={cn(
        'cursor-pointer text-xs font-bold transition-all rounded-xl',
        isActive
          ? 'bg-[#005390] text-white border-[#005390] hover:bg-[#004170] hover:text-white shadow-xs'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
        className,
      )}
      nativeButton={false}
      render={
        <a aria-current={isActive ? 'page' : undefined} data-slot="pagination-link" data-active={isActive} {...props} />
      }
    />
  )
}

function PaginationPrevious({
  className,
  text = 'Previous',
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn(
        'px-3 py-1.5 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-2xs font-semibold rounded-xl text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200',
        className,
      )}
      {...props}
    >
      <ChevronLeftIcon className="h-4 w-4 stroke-[2.5]" data-icon="inline-start" />
      <span className="hidden sm:inline font-semibold">{text}</span>
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  text = 'Next',
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn(
        'px-3 py-1.5 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-2xs font-semibold rounded-xl text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200',
        className,
      )}
      {...props}
    >
      <span className="hidden sm:inline font-semibold">{text}</span>
      <ChevronRightIcon className="h-4 w-4 stroke-[2.5]" data-icon="inline-end" />
    </PaginationLink>
  )
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        "flex size-8 items-center justify-center text-gray-500 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <MoreHorizontalIcon />
      <span className="sr-only">More pages</span>
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
