import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { ThemeSwitch } from './theme-switch'

const mockSetTheme = vi.fn()
const currentTheme = 'light'

vi.mock('@/context/theme-provider', () => ({
  useTheme: () => ({
    theme: currentTheme,
    setTheme: mockSetTheme,
    resolvedTheme: currentTheme,
    resetTheme: vi.fn(),
    defaultTheme: 'system',
  }),
}))

describe('ThemeSwitch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders theme switch trigger button and menu options', async () => {
    const { getByRole, getByText } = await render(<ThemeSwitch />)
    const button = getByRole('button', { name: /toggle theme/i })
    await expect.element(button).toBeInTheDocument()

    await userEvent.click(button)

    const darkOption = getByText('Dark')
    await expect.element(darkOption).toBeInTheDocument()
    await userEvent.click(darkOption)
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })
})
