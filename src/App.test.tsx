import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('Rely Active web shell', () => {
  it('renders dashboard shell correctly', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getAllByText(/RELY/i)[0]).toBeInTheDocument()
  })

  it('renders login page correctly', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })
})
