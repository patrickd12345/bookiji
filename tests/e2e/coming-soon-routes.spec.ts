import { test, expect } from '@playwright/test'

/**
 * Test that the coming soon page is shown at root and main landing page is at /main
 */
test.describe('Coming Soon Page Routes', () => {
  test('root page shows coming soon page', async ({ page }) => {
    await page.goto('/')
    
    // Should show the coming soon page content
    await expect(page.getByText('Bookiji is almost ready!')).toBeVisible()
    // Match both straight and curly apostrophes ("We're" vs "We’re")
    await expect(page.getByText(/working hard behind the scenes/i)).toBeVisible()
  })

  test('/main route shows main landing page', async ({ page }) => {
    await page.goto('/main')
    
    // Should show the main landing page (not coming soon)
    // The main page should NOT show "Bookiji is almost ready!"
    await expect(page.getByText('Bookiji is almost ready!')).not.toBeVisible()
    
    // Should show some content from the main landing page
    // This will depend on what HomePageModern2025 shows, but at minimum
    // we should not see the coming soon message
    const pageContent = await page.textContent('body')
    expect(pageContent).not.toContain('Bookiji is almost ready!')
  })
})
