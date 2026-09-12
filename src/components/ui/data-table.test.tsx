import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTable } from './data-table'
const rows = Array.from({ length: 12 }, (_, i) => ({ id: String(i), name: `Record ${i + 1}` }))
const columns = [{ accessorKey: 'name', header: 'Name' }]
afterEach(cleanup)
describe('DataTable pagination', () => {
  it('retains client-side pagination by default', async () => {
    const user = userEvent.setup()
    render(<DataTable data={rows} columns={columns} />)
    expect(screen.getByText('Record 1')).toBeInTheDocument()
    expect(screen.queryByText('Record 11')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Record 11')).toBeInTheDocument()
    expect(screen.queryByText('Record 1')).not.toBeInTheDocument()
  })
  it('renders a server page without slicing it again and uses the total row count', async () => {
    const user = userEvent.setup()
    const change = vi.fn()
    render(
      <DataTable
        data={rows.slice(0, 2)}
        columns={columns}
        manualPagination
        pagination={{ pageIndex: 2, pageSize: 10 }}
        rowCount={32}
        onPaginationChange={change}
      />,
    )
    expect(screen.getByText('Record 1')).toBeInTheDocument()
    expect(screen.getByText('32')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(change).toHaveBeenCalled()
    expect(change.mock.calls[0][0]({ pageIndex: 2, pageSize: 10 })).toEqual({ pageIndex: 3, pageSize: 10 })
  })
  it('keeps search mounted and focused through loading and errors', () => {
    const change = vi.fn()
    const { rerender } = render(<DataTable data={rows} columns={columns} searchValue="" onSearchChange={change} />)
    const input = screen.getByPlaceholderText('Search records…')
    input.focus()
    rerender(<DataTable data={[]} columns={columns} searchValue="abc" onSearchChange={change} isLoading />)
    expect(input).toHaveFocus()
    rerender(<DataTable data={[]} columns={columns} searchValue="abc" onSearchChange={change} error="Failed" />)
    expect(input).toHaveFocus()
  })
})
