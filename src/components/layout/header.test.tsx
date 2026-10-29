import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { Header } from './header'
import { SidebarProvider } from '@/components/ui/sidebar'

describe('Header & SidebarTrigger', () => {
  it('renders Header with SidebarTrigger and children', async () => {
    const { getByRole, getByTestId } = await render(
      <SidebarProvider defaultOpen={true}>
        <Header>
          <div data-testid='header-content'>Dashboard Title</div>
        </Header>
      </SidebarProvider>
    )

    await expect.element(getByTestId('header-content')).toBeInTheDocument()
    const trigger = getByRole('button', { name: /toggle sidebar/i })
    await expect.element(trigger).toBeInTheDocument()

    await userEvent.click(trigger)
    await expect.element(trigger).toBeInTheDocument()
  })
})
