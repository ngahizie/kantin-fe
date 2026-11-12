import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { LaporanDateFilter } from '../components/LaporanDateFilter'

describe('LaporanDateFilter', () => {
  it('menyembunyikan preset rentang multi-hari ketika singleDayOnly aktif dan memicu onChange tanggal', async () => {
    const onChange = vi.fn()

    const screen = await render(
      <LaporanDateFilter initialPreset='TODAY' singleDayOnly onChange={onChange} />
    )

    const triggerBtn = screen.getByRole('button', { name: /Hari Ini/i })
    await expect.element(triggerBtn).toBeInTheDocument()

    await userEvent.click(triggerBtn)

    await expect.element(screen.getByRole('button', { name: 'Hari Ini', exact: true })).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Kemarin', exact: true })).toBeInTheDocument()
    await expect.element(screen.getByText('Pilih Satu Hari Tertentu')).toBeInTheDocument()

    await expect.element(screen.getByRole('button', { name: '7 Hari Terakhir', exact: true })).not.toBeInTheDocument()
    await expect.element(screen.getByText('Rentang Tanggal Kustom')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Kemarin', exact: true }))

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange.mock.calls[0]?.[0]).toEqual({
      tanggal: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    })
  })
})
