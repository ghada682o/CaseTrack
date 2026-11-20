import { test, expect } from '@playwright/test';

test('User can login, create a complaint and verify it', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  expect(email, 'TEST_USER_EMAIL must be configured').toBeTruthy();
  expect(password, 'TEST_USER_PASSWORD must be configured').toBeTruthy();

  const complaintTitle = `Playwright Test ${Date.now()}`;
  const description =
    'This complaint is created automatically to verify the complete user interface workflow with Playwright.';

  // 1. Open login page
  await page.goto('/login');

  // 2. Login as a test user
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.locator('#login-submit-btn').click();

  // 3. Verify successful navigation
  await expect(page).toHaveURL(/\/dashboard/);

  // 4. Open the complaint form
  await page.locator('#new-complaint-btn').click();

  // 5. Fill and submit the complaint
  await page.locator('#complaint-title').fill(complaintTitle);
  await page.locator('#complaint-description').fill(description);
  await page.locator('#submit-complaint-btn').click();

  // 6. Verify that the new complaint appears in the dashboard
  await expect(page.getByText(complaintTitle, { exact: true }))
    .toBeVisible({ timeout: 45000 });
});
