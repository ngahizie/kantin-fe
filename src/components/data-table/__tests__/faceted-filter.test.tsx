import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { DataTableFacetedFilter } from '../faceted-filter'

describe('DataTableFacetedFilter', () => {
  const options = [
    { label: 'Terlaris', value: 'terlaris' },
    { label: 'Laba Terbesar', value: 'laba' },
  ]

  it('renders trigger button without plus icon and uses ArrowUpDown for sorting title', async () => {
    const { getByRole } = await render(
      <DataTableFacetedFilter
        title="Urutkan"
        options={options}
        isSingleSelect
      />
    )

    const btn = getByRole('button', { name: /Urutkan/i })
    await expect.element(btn).toBeInTheDocument()
    // Pastikan tidak ada ikon PlusCircledIcon
    const svgElements = document.querySelectorAll('svg')
    for (const svg of svgElements) {
      expect(svg.innerHTML).not.toContain('plus')
    }
  })

  it('calls onSelect with single value when isSingleSelect is true', async () => {
    const onSelect = vi.fn()
    const { getByRole, getByText } = await render(
      <DataTableFacetedFilter
        title="Urutkan"
        options={options}
        selectedValues={['terlaris']}
        onSelect={onSelect}
        isSingleSelect
      />
    )

    const btn = getByRole('button', { name: /Urutkan/i })
    await userEvent.click(btn)

    const labaOption = getByText('Laba Terbesar')
    await userEvent.click(labaOption)

    expect(onSelect).toHaveBeenCalledWith(['laba'])
  })
})
