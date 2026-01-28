/**
 * Playwright Code Generator
 * Converts Stagehand execution logs into runnable Playwright test code
 */

import type { TestResult, TestLibrary } from './types.js';
import * as fs from 'fs';

/**
 * Generate Playwright test code from execution results
 */
export function generatePlaywrightCode(
  results: TestResult[],
  testLibrary: TestLibrary,
  productUrl: string
): string {

  // Group tests by category for organized output
  const testsByCategory = groupBy(results, r => {
    const test = testLibrary.templates.find(t => t.id === r.testId);
    return test?.category || 'unknown';
  });

  let code = `// Generated Playwright tests from Stagehand execution\n`;
  code += `// Generated on: ${new Date().toISOString()}\n`;
  code += `// Product URL: ${productUrl}\n\n`;
  code += `import { test, expect } from '@playwright/test';\n\n`;

  // Generate test suites by category
  for (const [category, categoryResults] of Object.entries(testsByCategory)) {
    const categoryName = testLibrary.categoryDefinitions[category] || category;
    code += `test.describe('${categoryName}', () => {\n`;
    code += `  test.beforeEach(async ({ page }) => {\n`;
    code += `    await page.goto('${productUrl}');\n`;
    code += `    await page.waitForLoadState('networkidle');\n`;
    code += `  });\n\n`;

    // Only generate code for tests that passed
    const passedTests = categoryResults.filter(r => r.status === 'pass');

    for (const result of passedTests) {
      const test = testLibrary.templates.find(t => t.id === result.testId);
      if (test) {
        code += generateTestCase(result, test);
      }
    }

    code += `});\n\n`;
  }

  return code;
}

/**
 * Generate a single test case from execution log
 */
function generateTestCase(result: TestResult, test: { id: string; name: string; description: string }): string {
  let code = `  test('${test.id} - ${test.name}', async ({ page }) => {\n`;
  code += `    // ${test.description}\n\n`;

  for (const step of result.executionLog) {
    if (step.action === 'observe' && step.selector) {
      // AI found an element - convert to Playwright locator
      const playwrightSelector = convertSelector(step.selector);
      code += `    // Found via AI: ${step.instruction}\n`;
      code += `    const element = page.locator('${playwrightSelector}');\n`;
      code += `    await expect(element).toBeVisible();\n\n`;
    }

    else if (step.action === 'act') {
      // Convert AI action to Playwright code
      if (step.instruction?.toLowerCase().includes('click')) {
        if (step.instruction.toLowerCase().includes('add to cart')) {
          code += `    // Click add to cart button\n`;
          code += `    await page.getByRole('button', { name: /add to cart/i }).click();\n\n`;
        } else if (step.selector) {
          const playwrightSelector = convertSelector(step.selector);
          code += `    // ${step.instruction}\n`;
          code += `    await page.locator('${playwrightSelector}').click();\n\n`;
        }
      }
    }

    else if (step.action === 'extract') {
      code += `    // Data extraction: ${step.instruction}\n`;
      if (step.result) {
        code += `    // Expected result: ${JSON.stringify(step.result)}\n\n`;
      }
    }

    else if (step.action === 'assert') {
      if (step.selector) {
        const playwrightSelector = convertSelector(step.selector);
        code += `    await expect(page.locator('${playwrightSelector}')).toBeVisible();\n\n`;
      } else if (step.result !== undefined) {
        code += `    // Assertion passed: ${JSON.stringify(step.result)}\n\n`;
      }
    }
  }

  code += `  });\n\n`;
  return code;
}

/**
 * Convert AI selectors (often XPath) to Playwright-friendly CSS selectors
 */
function convertSelector(aiSelector: string): string {
  // If it's already CSS, return as-is
  if (!aiSelector.startsWith('//') && !aiSelector.startsWith('xpath=')) {
    return escapeSelector(aiSelector);
  }

  // Remove xpath= prefix if present
  let xpath = aiSelector.replace(/^xpath=/, '');

  // Try to convert common XPath patterns to CSS
  // Pattern: //div[@data-testid="something"]
  const dataTestIdMatch = xpath.match(/\[@data-testid=['"]([^'"]+)['"]\]/);
  if (dataTestIdMatch) {
    return `[data-testid="${dataTestIdMatch[1]}"]`;
  }

  // Pattern: //div[@class="something"]
  const classMatch = xpath.match(/\[@class=['"]([^'"]+)['"]\]/);
  if (classMatch) {
    const firstClass = classMatch[1].split(' ')[0];
    return `.${firstClass}`;
  }

  // Pattern: //div[@id="something"]
  const idMatch = xpath.match(/\[@id=['"]([^'"]+)['"]\]/);
  if (idMatch) {
    return `#${idMatch[1]}`;
  }

  // Can't convert - keep XPath with a note
  return escapeSelector(xpath) + '" /* TODO: Convert XPath to CSS */';
}

/**
 * Escape quotes in selectors
 */
function escapeSelector(selector: string): string {
  return selector.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

/**
 * Group array items by key function
 */
function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return array.reduce((result, item) => {
    const key = keyFn(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
    return result;
  }, {} as Record<string, T[]>);
}
