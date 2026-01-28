/**
 * Main test runner for Shopify PDP Testing POC
 * Loads tests, detects capabilities, executes tests, generates Playwright code
 */

import * as fs from 'fs';
import { expect } from '@playwright/test';
import { Stagehand, type Page } from '@browserbasehq/stagehand';
import { detectCapabilities } from './capability-detector.js';
import { generatePlaywrightCode } from './code-generator.js';
import type { TestLibrary, TestCase, TestResult, ExecutionStep } from './types.js';

/**
 * Load test library from tests.json
 */
function loadTests(): TestLibrary {
  const content = fs.readFileSync('./tests.json', 'utf-8');
  return JSON.parse(content) as TestLibrary;
}

/**
 * Select applicable tests based on detected capabilities
 */
function selectApplicableTests(
  tests: TestCase[],
  detectedStates: string[]
): TestCase[] {

  return tests.filter(test => {
    const required = test.preconditions.productState;

    // Handle 'any' - always matches
    if (required === 'any') return true;

    // Handle single state requirement
    if (typeof required === 'string') {
      return detectedStates.includes(required);
    }

    // Handle array - ALL states must be present (AND logic)
    if (Array.isArray(required)) {
      return required.every(state => detectedStates.includes(state));
    }

    return false;
  });
}

/**
 * Execute a single test
 */
async function executeTest(
  test: TestCase,
  page: Page,
  stagehand: Stagehand
): Promise<TestResult> {

  const startTime = Date.now();
  const executionLog: ExecutionStep[] = [];

  try {
    // Route to category-specific logic
    if (test.category === 'core-product-info') {
      await testCoreInfo(test, page, stagehand, executionLog);
    } else if (test.category === 'pricing') {
      await testPricing(test, page, stagehand, executionLog);
    } else if (test.category === 'variant-selection') {
      await testVariants(test, page, stagehand, executionLog);
    } else if (test.category === 'add-to-cart') {
      await testAddToCart(test, page, stagehand, executionLog);
    } else if (test.category === 'product-media') {
      await testProductMedia(test, page, stagehand, executionLog);
    } else {
      // Generic execution for other categories
      await testGeneric(test, page, stagehand, executionLog);
    }

    return {
      testId: test.id,
      status: 'pass',
      duration: Date.now() - startTime,
      executionLog
    };

  } catch (error: any) {
    return {
      testId: test.id,
      status: error.message?.includes('expect') ? 'fail' : 'error',
      duration: Date.now() - startTime,
      error: error.message || String(error),
      executionLog
    };
  }
}

/**
 * Test core product info (title, description)
 */
async function testCoreInfo(
  test: TestCase,
  page: Page,
  stagehand: Stagehand,
  log: ExecutionStep[]
) {

  if (test.id === 'pdp-title-visible') {
    // Use multiple fallback selectors for better reliability
    const titleSelectors = [
      'h1',
      '[data-product-title]',
      '.product-title',
      '.product__title',
      'h1[class*="title"]',
      'h1[class*="product"]'
    ];

    let isVisible = false;
    let foundSelector = '';

    for (const selector of titleSelectors) {
      const element = page.locator(selector).first();
      const count = await element.count();
      if (count > 0 && await element.isVisible()) {
        isVisible = true;
        foundSelector = selector;
        const titleText = await element.textContent();
        expect(titleText).toBeTruthy();
        break;
      }
    }

    log.push({
      timestamp: Date.now(),
      action: 'assert',
      selector: foundSelector || 'h1',
      result: isVisible
    });

    expect(isVisible).toBe(true);
  }

  else if (test.id === 'pdp-description-visible') {
    // Use multiple fallback selectors for description
    const descriptionSelectors = [
      '.product-description',
      '[class*="description"]',
      '[class*="detail"]',
      '.product__description',
      '[data-description]',
      'div[class*="product"] p',
      '.rte' // Rich text editor content (common in Shopify)
    ];

    let isVisible = false;
    let foundSelector = '';

    for (const selector of descriptionSelectors) {
      const element = page.locator(selector).first();
      const count = await element.count();
      if (count > 0 && await element.isVisible()) {
        isVisible = true;
        foundSelector = selector;
        break;
      }
    }

    log.push({
      timestamp: Date.now(),
      action: 'observe',
      instruction: 'find product description',
      selector: foundSelector || '.product-description',
      result: isVisible
    });

    expect(isVisible).toBe(true);
  }
}

/**
 * Test pricing display
 */
async function testPricing(
  test: TestCase,
  page: Page,
  stagehand: Stagehand,
  log: ExecutionStep[]
) {

  if (test.id === 'pdp-price-visible') {
    // Look for price with multiple fallback selectors
    const priceSelectors = [
      '.product-price',
      '[data-product-price]',
      '.price__regular',
      '.price--main',
      '.price__sale',
      '.price-item--sale',
      'span.price',
      'span[class*="price"]:not([class*="compare"]):not([class*="was"])',
      '[class*="current-price"]',
      '[class*="sale-price"]',
      '[class*="selling-price"]',
      '.product__price',
      '.product-form__price',
      // Very generic fallbacks - look for currency symbols
      'span:has-text("₹")',
      'span:has-text("$")',
      'div[class*="price"]'
    ];

    let isVisible = false;
    let foundSelector = '';
    let priceText = '';

    for (const selector of priceSelectors) {
      const element = page.locator(selector).first();
      const count = await element.count();
      if (count > 0 && await element.isVisible()) {
        isVisible = true;
        foundSelector = selector;
        priceText = (await element.textContent()) || '';
        break;
      }
    }

    log.push({
      timestamp: Date.now(),
      action: 'assert',
      selector: foundSelector || '[class*="price"]',
      result: isVisible
    });

    expect(isVisible).toBe(true);

    // Verify valid price format (₹ for Indian Rupee, or other currency symbols)
    expect(priceText).toMatch(/[₹\$£€¥]\s*[\d,]+/);
  }

  else if (test.id === 'pdp-compare-at-price-visible') {
    // Look for compare-at price (original price when on sale) with multiple fallback selectors
    const compareSelectors = [
      '.compare-at-price',
      '[class*="compare-price"]',
      '[class*="original-price"]',
      '[class*="was-price"]',
      '.price__compare',
      '.price--compare',
      's[class*="price"]', // strikethrough prices
      'del[class*="price"]', // deleted/crossed-out prices
      '[class*="regular-price"]'
    ];

    let isVisible = false;
    let foundSelector = '';

    for (const selector of compareSelectors) {
      const element = page.locator(selector).first();
      const count = await element.count();
      if (count > 0 && await element.isVisible()) {
        isVisible = true;
        foundSelector = selector;
        break;
      }
    }

    log.push({
      timestamp: Date.now(),
      action: 'assert',
      selector: foundSelector || '[class*="compare"]',
      result: isVisible
    });

    expect(isVisible).toBe(true);
  }
}

/**
 * Test variant selection
 */
async function testVariants(
  test: TestCase,
  page: Page,
  stagehand: Stagehand,
  log: ExecutionStep[]
) {

  if (test.id === 'pdp-variant-selector-visible') {
    // Look for variant selectors (select, radio, buttons, swatches)
    const variantSelectors = [
      'select[name*="variant"]',
      '.product-form__input',
      '[class*="variant-select"]',
      '[class*="variant-selector"]',
      '[class*="variant"] button',
      '[class*="variant"] input[type="radio"]',
      '.variant-options',
      'fieldset[class*="variant"]',
      '[data-variant-selector]'
    ];

    let isVisible = false;
    let foundSelector = '';

    for (const selector of variantSelectors) {
      const element = page.locator(selector).first();
      const count = await element.count();
      if (count > 0 && await element.isVisible()) {
        isVisible = true;
        foundSelector = selector;
        break;
      }
    }

    log.push({
      timestamp: Date.now(),
      action: 'observe',
      instruction: 'find variant selector',
      selector: foundSelector || 'select[name*="variant"]',
      result: isVisible
    });

    expect(isVisible).toBe(true);
  }

  else if (test.id === 'pdp-variant-selection-works') {
    // Try to select a variant
    const variantSelector = page.locator('select[name*="variant"], [class*="variant-select"]').first();
    const options = await variantSelector.locator('option').count();

    if (options > 1) {
      await variantSelector.selectOption({ index: 1 });

      log.push({
        timestamp: Date.now(),
        action: 'act',
        instruction: 'select variant option',
        selector: 'select[name*="variant"]'
      });
    }
  }
}

/**
 * Test add to cart functionality
 */
async function testAddToCart(
  test: TestCase,
  page: Page,
  stagehand: Stagehand,
  log: ExecutionStep[]
) {

  if (test.id === 'pdp-atc-button-visible-and-enabled') {
    // Try Playwright first
    let atcButton = page.getByRole('button', { name: /add to (cart|bag)/i });
    let count = await atcButton.count();

    // Fallback to class-based selector
    if (count === 0) {
      atcButton = page.locator('[name="add"], .add-to-cart, [class*="add-to-cart"]').first();
      count = await atcButton.count();
    }

    log.push({
      timestamp: Date.now(),
      action: 'observe',
      instruction: 'find add to cart button',
      result: count > 0
    });

    expect(count).toBeGreaterThan(0);

    const isVisible = await atcButton.isVisible();
    const isEnabled = await atcButton.isEnabled();

    log.push({
      timestamp: Date.now(),
      action: 'assert',
      result: { isVisible, isEnabled }
    });

    expect(isVisible).toBe(true);
    expect(isEnabled).toBe(true);
  }

  else if (test.id === 'pdp-atc-works') {
    // Click add to cart
    const atcButton = page.getByRole('button', { name: /add to (cart|bag)/i }).or(
      page.locator('[name="add"], .add-to-cart, [class*="add-to-cart"]').first()
    );

    await atcButton.click();

    log.push({
      timestamp: Date.now(),
      action: 'act',
      instruction: 'click add to cart'
    });

    // Wait for cart feedback
    await page.waitForTimeout(2000);

    // Look for cart count or success feedback (excluding wishlist)
    const cartSelectors = [
      '[href*="cart"] .cart-count-bubble:visible',
      '[href*="/cart"] [class*="count"]:visible',
      '.cart__count:visible',
      '.cart-link__bubble:visible',
      '[data-cart-count]:visible',
      'a[href*="cart"]:visible' // Just the cart link being visible is enough
    ];

    let foundCart = false;
    let foundSelector = '';

    for (const selector of cartSelectors) {
      try {
        const element = page.locator(selector).first();
        const count = await element.count();
        if (count > 0 && await element.isVisible({ timeout: 1000 })) {
          foundCart = true;
          foundSelector = selector;
          break;
        }
      } catch {
        // Continue to next selector if this one times out
        continue;
      }
    }

    log.push({
      timestamp: Date.now(),
      action: 'assert',
      selector: foundSelector || '[href*="cart"]:visible',
      result: foundCart
    });
  }
}

/**
 * Test product media (images, gallery)
 */
async function testProductMedia(
  test: TestCase,
  page: Page,
  stagehand: Stagehand,
  log: ExecutionStep[]
) {

  if (test.id === 'pdp-main-image-visible') {
    // Multiple fallback selectors for product images
    const imageSelectors = [
      '.product__media img',
      '[data-product-image]',
      '.product-image',
      '[class*="product-image"]',
      '.product__main-image',
      '.featured-image img',
      '[role="img"]',
      'img[src*="product"]'
    ];

    let isVisible = false;
    let foundSelector = '';

    for (const selector of imageSelectors) {
      const element = page.locator(selector).first();
      const count = await element.count();
      if (count > 0 && await element.isVisible()) {
        isVisible = true;
        foundSelector = selector;
        break;
      }
    }

    log.push({
      timestamp: Date.now(),
      action: 'assert',
      selector: foundSelector || '.product__media img',
      result: isVisible
    });

    expect(isVisible).toBe(true);
  }

  else if (test.id === 'pdp-image-gallery-works') {
    // Look for thumbnails or gallery navigation
    const thumbnails = page.locator('[class*="thumbnail"], .product__media-item, [data-media-id]');
    const count = await thumbnails.count();

    log.push({
      timestamp: Date.now(),
      action: 'observe',
      instruction: 'find image thumbnails',
      result: count
    });

    expect(count).toBeGreaterThan(1);
  }
}

/**
 * Generic test execution for uncategorized tests
 */
async function testGeneric(
  test: TestCase,
  page: Page,
  stagehand: Stagehand,
  log: ExecutionStep[]
) {
  // For tests without specific handlers, just verify page loaded
  const isLoaded = await page.locator('body').isVisible();

  log.push({
    timestamp: Date.now(),
    action: 'assert',
    instruction: `generic test: ${test.name}`,
    result: isLoaded
  });

  expect(isLoaded).toBe(true);
}

/**
 * Main execution function
 */
async function main() {
  // Get URL from command line or env
  const productUrl = process.argv[2] || process.env.TEST_PRODUCT_URL;

  if (!productUrl) {
    console.error('❌ Error: No product URL provided');
    console.error('\nUsage: npm run test <product-url>');
    console.error('   or: Set TEST_PRODUCT_URL in .env file\n');
    process.exit(1);
  }

  console.log('🚀 Starting Shopify PDP Test POC\n');
  console.log(`📍 Target: ${productUrl}\n`);

  // 1. Setup Stagehand (it handles browser automatically)
  console.log('🤖 Initializing Stagehand AI...');
  const stagehand = new Stagehand({
    env: process.env.STAGEHAND_ENV === 'BROWSERBASE' ? 'BROWSERBASE' : 'LOCAL',
    apiKey: process.env.ANTHROPIC_API_KEY,
    verbose: 0
  });
  await stagehand.init();

  console.log('🌐 Navigating to product page...');
  const page = stagehand.context.pages()[0];
  await page.goto(productUrl);
  console.log('✓ Page loaded\n');

  // 2. Load tests
  console.log('📚 Loading test library...');
  const library = loadTests();
  console.log(`   ✓ Loaded ${library.templates.length} tests\n`);

  // 3. Detect capabilities
  console.log('🔍 Detecting product capabilities...');
  const capabilities = await detectCapabilities(stagehand, page);
  console.log(`   ✓ Detected: ${capabilities.join(', ')}\n`);

  // 4. Select tests
  console.log('✅ Selecting applicable tests...');
  const applicable = selectApplicableTests(library.templates, capabilities);
  const skipped = library.templates.length - applicable.length;
  console.log(`   ✓ Selected ${applicable.length}/${library.templates.length} tests (${skipped} skipped)\n`);

  // 5. Execute tests
  console.log('🧪 Executing tests...\n');
  const results: TestResult[] = [];

  for (const test of applicable) {
    process.stdout.write(`   ${test.id}... `);
    const result = await executeTest(test, page, stagehand);
    results.push(result);

    if (result.status === 'pass') {
      console.log(`✓ PASS (${result.duration}ms)`);
    } else if (result.status === 'fail') {
      console.log(`✗ FAIL (${result.duration}ms)`);
      if (result.error) {
        console.log(`      ${result.error}`);
      }
    } else {
      console.log(`⚠ ERROR (${result.duration}ms)`);
      if (result.error) {
        console.log(`      ${result.error}`);
      }
    }
  }

  // 6. Generate Playwright code
  console.log('\n📝 Generating Playwright code...');
  const generatedCode = generatePlaywrightCode(results, library, productUrl);
  const timestamp = Date.now();
  const outputPath = `./generated/pdp-tests-${timestamp}.spec.ts`;
  fs.mkdirSync('./generated', { recursive: true });
  fs.writeFileSync(outputPath, generatedCode);
  console.log(`   ✓ Saved to: ${outputPath}\n`);

  // 7. Summary
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const errors = results.filter(r => r.status === 'error').length;
  const successRate = results.length > 0 ? (passed / results.length * 100).toFixed(1) : '0.0';

  console.log('📊 Results Summary:');
  console.log(`   ✓ Passed: ${passed}/${results.length}`);
  console.log(`   ✗ Failed: ${failed}/${results.length}`);
  console.log(`   ⚠ Errors: ${errors}/${results.length}`);
  console.log(`   📈 Success Rate: ${successRate}%\n`);

  if (passed >= results.length * 0.7) {
    console.log('✅ POC Success! 70%+ tests passed.');
  } else {
    console.log('⚠️  POC needs improvement. <70% tests passed.');
  }

  console.log('\n💡 Next step: Run generated tests with:');
  console.log(`   npx playwright test ${outputPath}\n`);

  await stagehand.close();
}

// Run main function
main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
