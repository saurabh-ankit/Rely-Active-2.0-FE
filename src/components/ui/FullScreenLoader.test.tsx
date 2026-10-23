import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { FullScreenLoader } from './FullScreenLoader'

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
})

describe('FullScreenLoader', () => {
  it('renders with role="status", aria-live="polite", and default message', () => {
    render(<FullScreenLoader />)

    const statusElement = screen.getByRole('status')
    expect(statusElement).toBeInTheDocument()
    expect(statusElement).toHaveAttribute('aria-live', 'polite')
    expect(statusElement).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders custom message string', () => {
    render(<FullScreenLoader message="Verifying authentication..." />)

    expect(screen.getByText('Verifying authentication...')).toBeInTheDocument()
  })

  it('returns null and does not render when isVisible is false', () => {
    const { container } = render(<FullScreenLoader isVisible={false} message="Hidden" />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
    expect(container).toBeEmptyDOMElement()
  })

  it('renders into document.body using portal by default', () => {
    render(
      <div data-testid="parent-container">
        <FullScreenLoader message="Portal loader" />
      </div>,
    )

    const parent = screen.getByTestId('parent-container')
    const statusElement = screen.getByRole('status')

    // It should be attached to document.body, not inside parent-container
    expect(parent).not.toContainElement(statusElement)
    expect(document.body).toContainElement(statusElement)
  })

  it('renders inside parent when usePortal is false', () => {
    render(
      <div data-testid="parent-container">
        <FullScreenLoader message="Inline loader" usePortal={false} />
      </div>,
    )

    const parent = screen.getByTestId('parent-container')
    const statusElement = screen.getByRole('status')

    expect(parent).toContainElement(statusElement)
  })

  it('provides screen reader fallback text when message is omitted or empty', () => {
    render(<FullScreenLoader message="" />)

    expect(screen.getByText('Loading')).toHaveClass('sr-only')
  })

  it('includes reduced-motion styling on the spinner', () => {
    render(<FullScreenLoader usePortal={false} />)

    const statusElement = screen.getByRole('status')
    const spinner = statusElement.querySelector('svg')
    expect(spinner).toHaveClass('motion-reduce:animate-none')
  })

  it('locks scroll while visible and unlocks on unmount', () => {
    const { unmount } = render(<FullScreenLoader />)

    expect(document.body.style.overflow).toBe('hidden')

    unmount()

    expect(document.body.style.overflow).toBe('')
  })

  it('supports custom icon override', () => {
    render(<FullScreenLoader icon={<span data-testid="custom-spinner">Custom</span>} />)

    expect(screen.getByTestId('custom-spinner')).toBeInTheDocument()
  })

  it('renders container-scoped overlay when fullScreen is false', () => {
    render(
      <div data-testid="container" className="relative">
        <FullScreenLoader fullScreen={false} message="Container loading" />
      </div>,
    )

    const container = screen.getByTestId('container')
    const statusElement = screen.getByRole('status')

    // Contained inside parent, not portaled to body root
    expect(container).toContainElement(statusElement)
    expect(statusElement).toHaveClass('absolute')
    expect(statusElement).not.toHaveClass('fixed')
    // Document body should not be scroll-locked
    expect(document.body.style.overflow).toBe('')
  })
})
