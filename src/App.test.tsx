import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { useAuthStore } from '@/lib/stores/auth-store'

describe('Rely Active web shell', () => {
  beforeEach(() => useAuthStore.setState({ token: null }))
  it('redirects unauthenticated users to login', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByText('Welcome to Rely Active')).toBeInTheDocument()
  })
})
