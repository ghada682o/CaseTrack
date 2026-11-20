
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Login page should have no critical accessibility violations', async ({ page }) => {
  await page.goto('/login');

  const accessibilityScan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const violations = accessibilityScan.violations;

  console.log(`Accessibility violations: ${violations.length}`);

  for (const violation of violations) {
    console.log(`Rule: ${violation.id}`);
    console.log(`Impact: ${violation.impact}`);
    console.log(`Description: ${violation.help}`);
    console.log(`Affected elements: ${violation.nodes.length}`);
  }

  expect(violations).toEqual([]);
});
