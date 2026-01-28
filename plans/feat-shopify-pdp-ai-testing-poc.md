# Shopify PDP AI Testing POC with Stagehand

## Overview

Create a proof-of-concept (POC) system that intelligently tests Shopify Product Detail Pages (PDP) by analyzing page capabilities and conditionally executing relevant tests from the JSON test library using Stagehand AI. The system should detect product states (variants, inventory, subscription options, etc.) and automatically select applicable test cases, then generate reusable Playwright test code.

## Problem Statement / Motivation

Manual e-commerce testing is time-consuming and error-prone, especially when dealing with diverse product configurations across different Shopify stores. Current testing approaches fail to:

1. **Adapt to page capabilities** - Tests break when products lack expected features (variants, subscriptions, etc.)
2. **Scale across stores** - Each store has unique implementations requiring custom test code
3. **Maintain test relevance** - Running all tests regardless of product state wastes time and produces false negatives
4. **Preserve test knowledge** - Successful AI-driven test explorations aren't converted to reproducible code

This POC validates an intelligent testing approach that:
- Detects PDP capabilities before test execution
- Selectively runs only applicable tests based on preconditions
- Leverages AI for initial exploration and adaptation
- Generates stable Playwright code for future execution

## Proposed Solution

Build a TypeScript-based testing framework that:

1. **Parses the JSON test library** (`tests.json`) with 42 PDP test templates organized by category and priority
2. **Analyzes target PDPs** using Stagehand AI to detect capabilities (has variants, subscription options, inventory states)
3. **Filters applicable tests** by matching detected capabilities against test preconditions
4. **Executes tests** using Stagehand's AI-driven automation with Playwright integration
5. **Generates Playwright code** by converting successful AI interactions into reproducible test scripts
6. **Reports results** with detailed logging, screenshots, and videos for failures

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Execution Engine                     │
│                                                              │
│  ┌────────────────┐    ┌──────────────────┐                │
│  │  Test Library  │───▶│  Test Selector   │                │
│  │  Parser (Zod)  │    │  (Preconditions) │                │
│  └────────────────┘    └──────────────────┘                │
│                              │                               │
│                              ▼                               │
│                    ┌──────────────────┐                     │
│                    │ Page Capability  │                     │
│                    │    Detector      │                     │
│                    │  (Stagehand AI)  │                     │
│                    └──────────────────┘                     │
│                              │                               │
│                              ▼                               │
│  ┌──────────────────────────────────────────────────┐      │
│  │          Test Executor (Hybrid)                   │      │
│  │  ┌─────────────────┐  ┌───────────────────────┐ │      │
│  │  │  Stagehand AI   │  │  Playwright Actions   │ │      │
│  │  │  (Discovery)    │  │  (Assertions)         │ │      │
│  │  └─────────────────┘  └───────────────────────┘ │      │
│  └──────────────────────────────────────────────────┘      │
│                              │                               │
│                              ▼                               │
│  ┌────────────────────────────────────────────────┐        │
│  │     Code Generator (Playwright Test File)       │        │
│  └────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Phases

#### Phase 1: Foundation Setup

**Goal**: Establish project structure, dependencies, and configuration

**Tasks**:
- [ ] Initialize Node.js/TypeScript project with ESM modules
- [ ] Install core dependencies: `@browserbasehq/stagehand`, `@playwright/test`, `typescript`, `zod`
- [ ] Configure TypeScript with strict mode and path aliases
- [ ] Set up Playwright configuration with multiple browsers and device emulation
- [ ] Create `.env` template for API keys (Browserbase, OpenAI/Anthropic)
- [ ] Implement `.gitignore` for secrets and generated artifacts
- [ ] Set up directory structure:
  ```
  stagehand-tests/
  ├── src/
  │   ├── types/index.ts              # Core type definitions
  │   ├── schemas/
  │   │   ├── test-library.schema.ts  # Zod schemas for tests.json
  │   │   └── product.schema.ts       # Product data schemas
  │   ├── core/
  │   │   ├── test-library.ts         # Test loader/parser
  │   │   ├── capability-detector.ts  # Page analysis with Stagehand
  │   │   ├── test-selector.ts        # Precondition matching logic
  │   │   └── test-executor.ts        # Test execution engine
  │   ├── generators/
  │   │   └── playwright-codegen.ts   # Playwright code generator
  │   └── utils/
  │       ├── stagehand-client.ts     # Stagehand wrapper
  │       └── logger.ts               # Structured logging
  ├── tests/
  │   └── generated/                  # AI-generated Playwright tests
  ├── tests.json                      # Test library (existing)
  ├── playwright.config.ts
  ├── package.json
  └── tsconfig.json
  ```

**Files to Create**:
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `playwright.config.ts` - Test runner configuration
- `.env.example` - Environment variables template
- `.gitignore` - Exclude secrets, node_modules, artifacts

**Success Criteria**:
- [ ] `npm install` completes successfully
- [ ] TypeScript compiles without errors
- [ ] Playwright test runner executes (even with empty tests)
- [ ] Environment variables load correctly

#### Phase 2: Test Library Parsing & Type Safety

**Goal**: Parse and validate `tests.json` with full type safety

**Tasks**:
- [ ] Define Zod schemas matching `tests.json` structure:
  - `TestCaseSchema` - Individual test template with preconditions
  - `TestLibrarySchema` - Top-level library structure
  - `PreconditionsSchema` - Product/user/viewport states
- [ ] Implement `TestLibrary` class:
  - Load and validate JSON with Zod
  - Index tests by ID, category, priority
  - Query methods: `getByPrecondition()`, `getByCategory()`, `getByPriority()`
- [ ] Create TypeScript types via `z.infer<>` for compile-time checking
- [ ] Add unit tests for test library parsing
- [ ] Document all 42 test templates with examples

**Files to Create**:
- `src/schemas/test-library.schema.ts` - Zod validation schemas
- `src/core/test-library.ts` - Test library loader
- `src/types/index.ts` - Exported TypeScript types
- `tests/unit/test-library.spec.ts` - Unit tests

**Reference**: `/Users/mohitjaiswani/Downloads/stagehand-tests/tests.json`

**Success Criteria**:
- [ ] `tests.json` parses without validation errors
- [ ] Can query tests by category (e.g., "pricing" returns 4 tests)
- [ ] Can query tests by priority (e.g., "P0" returns 35 tests)
- [ ] Can query by precondition (e.g., "has_variants" returns 9 tests)

#### Phase 3: Page Capability Detection

**Goal**: Analyze PDPs with Stagehand AI to detect product capabilities

**Tasks**:
- [ ] Implement `CapabilityDetector` class using Stagehand's `observe()` and `extract()` methods
- [ ] Define detection strategies for all product states in `tests.json`:
  - `in_stock` / `out_of_stock` / `pre_order` - Inventory indicators
  - `has_variants` - Presence of variant selectors (size, color, etc.)
  - `on_sale` - Compare-at price vs current price
  - `has_subscription` - Subscription purchase options
  - `has_custom_options` - Custom fields (engraving, gift wrap)
  - `multiple_images` - Image gallery/carousel
  - `mixed_availability` - Some variants in stock, others out
- [ ] Extract structured capability data using Zod schemas
- [ ] Implement caching to avoid redundant AI calls
- [ ] Add fallback detection with CSS/XPath selectors

**Files to Create**:
- `src/core/capability-detector.ts` - Main detection logic
- `src/schemas/product.schema.ts` - Product capability schemas
- `src/utils/stagehand-client.ts` - Stagehand wrapper with error handling
- `tests/integration/capability-detection.spec.ts` - Integration tests

**Example API**:
```typescript
const detector = new CapabilityDetector(stagehand);
const capabilities = await detector.detect(page);
// Returns:
// {
//   productState: ['in_stock', 'has_variants', 'on_sale'],
//   userState: 'guest',
//   viewport: 'desktop',
//   detectedFeatures: {
//     variants: ['size', 'color'],
//     inventory: { available: true, quantity: 15 },
//     pricing: { current: '$29.99', compareAt: '$49.99' }
//   }
// }
```

**Success Criteria**:
- [ ] Correctly detects 80%+ of product states on sample Shopify PDPs
- [ ] Returns structured, validated capability objects
- [ ] Handles errors gracefully (timeout, network issues)
- [ ] Caches results for 5 minutes to reduce API costs

#### Phase 4: Test Selection Logic

**Goal**: Match detected capabilities against test preconditions to filter applicable tests

**Tasks**:
- [ ] Implement `TestSelector` class with matching logic
- [ ] Handle precondition matching rules:
  - `any` - Always matches (baseline tests)
  - Single value - Exact match required
  - Array of values - All must be present (AND logic)
  - `mixed_availability` - Detect variants with different stock states
- [ ] Support complex preconditions (e.g., `has_variants` + `has_variant_images`)
- [ ] Priority-based sorting (P0 first, then P1, P2, P3)
- [ ] Generate test execution plan with reasoning for skipped tests
- [ ] Add dry-run mode to preview test selection without execution

**Files to Create**:
- `src/core/test-selector.ts` - Test selection engine
- `tests/unit/test-selector.spec.ts` - Unit tests

**Example API**:
```typescript
const selector = new TestSelector(testLibrary);
const plan = selector.selectTests(capabilities);
// Returns:
// {
//   selected: [
//     { id: 'pdp-title-visible', reason: 'Matches: any' },
//     { id: 'pdp-variant-selector-visible', reason: 'Matches: has_variants' },
//     { id: 'pdp-compare-at-price-visible', reason: 'Matches: on_sale' }
//   ],
//   skipped: [
//     { id: 'pdp-out-of-stock-display', reason: 'Precondition not met: out_of_stock' },
//     { id: 'pdp-subscription-pricing-visible', reason: 'Precondition not met: has_subscription' }
//   ],
//   executionOrder: ['P0', 'P1']  // Priority groups
// }
```

**Success Criteria**:
- [ ] Selects 100% of applicable tests for given capabilities
- [ ] Skips 100% of non-applicable tests
- [ ] Handles complex multi-condition preconditions correctly
- [ ] Generates clear reasoning for each selection/skip decision

#### Phase 5: Hybrid Test Execution Engine

**Goal**: Execute selected tests using Stagehand AI + Playwright hybrid approach

**Tasks**:
- [ ] Implement `TestExecutor` class with Stagehand + Playwright integration
- [ ] Create test execution strategies per category:
  - **core-product-info**: Use Playwright's `getByRole('heading')` + AI fallback
  - **pricing**: Extract with Stagehand, validate with Playwright assertions
  - **variant-selection**: AI for discovery, Playwright for interaction + verification
  - **add-to-cart**: AI for button location, Playwright for cart count validation
- [ ] Handle test lifecycle:
  - Setup: Navigate to product URL, wait for load
  - Execute: Run test steps with AI/Playwright
  - Assert: Validate outcomes with web-first assertions
  - Cleanup: Clear cart, reset state
- [ ] Implement error handling and recovery:
  - Retry failed tests once with different AI model
  - Capture screenshots/videos on failure
  - Log detailed error context (page state, network activity)
- [ ] Add parallel execution support for independent tests
- [ ] Implement progress reporting with streaming events

**Files to Create**:
- `src/core/test-executor.ts` - Main execution engine
- `src/core/test-strategies/` - Category-specific strategies:
  - `core-info.strategy.ts`
  - `pricing.strategy.ts`
  - `variant-selection.strategy.ts`
  - `add-to-cart.strategy.ts`
- `tests/integration/test-execution.spec.ts` - Integration tests

**Example Execution Flow**:
```typescript
// Test: pdp-variant-selector-visible
// Strategy: Hybrid (AI discover + Playwright verify)

// 1. Use AI to find variant selector
const observed = await stagehand.observe(
  "find the variant selector for size or color",
  { page, selector: "//main" }  // Scope to main content
);

// 2. Verify with Playwright
if (observed.length > 0) {
  await expect(page.locator(observed[0].selector)).toBeVisible();

  // 3. Extract variant options
  const variants = await stagehand.extract(
    "get all available variant options",
    z.object({
      type: z.enum(['size', 'color', 'style']),
      options: z.array(z.object({
        name: z.string(),
        available: z.boolean()
      }))
    }),
    { page, selector: observed[0].selector }
  );

  // 4. Validate count
  expect(variants.options.length).toBeGreaterThan(0);
}
```

**Success Criteria**:
- [ ] Successfully executes 90%+ of P0 tests on sample PDPs
- [ ] Hybrid approach works: AI for discovery, Playwright for verification
- [ ] Error recovery mechanisms prevent cascading failures
- [ ] Execution time averages <3 seconds per test (with caching)

#### Phase 6: Playwright Code Generation

**Goal**: Convert successful AI-driven test executions into reproducible Playwright code

**Tasks**:
- [ ] Implement `PlaywrightCodeGenerator` class
- [ ] Capture Stagehand execution logs:
  - Actions performed (click, fill, type)
  - Element selectors (XPath from AI)
  - Extracted data and schemas
- [ ] Transform AI logs into Playwright code:
  - Convert XPath to robust CSS/data-testid selectors where possible
  - Replace `stagehand.act()` with `page.click()`, `page.fill()`, etc.
  - Replace `stagehand.extract()` with `page.locator().textContent()`
  - Add explicit waits with `waitFor()` where needed
- [ ] Generate test file structure:
  - Imports (`@playwright/test`, page objects)
  - Test describe blocks by category
  - Test cases with steps
  - Assertions with web-first patterns
- [ ] Add comments explaining converted logic
- [ ] Format code with Prettier

**Files to Create**:
- `src/generators/playwright-codegen.ts` - Code generator
- `tests/generated/pdp-tests.spec.ts` - Example generated file
- `tests/unit/codegen.spec.ts` - Generator unit tests

**Example Output** (generated Playwright test):
```typescript
// tests/generated/pdp-core-info.spec.ts
// Generated from Stagehand execution on 2026-01-28

import { test, expect } from '@playwright/test';

test.describe('PDP Core Product Info', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.TEST_PRODUCT_URL!);
    await page.waitForLoadState('networkidle');
  });

  test('pdp-title-visible - Product Title Visible', async ({ page }) => {
    // Verify product title is visible
    const title = page.getByRole('heading', { level: 1 });
    await expect(title).toBeVisible();

    // Verify title contains text
    await expect(title).not.toBeEmpty();
  });

  test('pdp-price-visible - Price Visible', async ({ page }) => {
    // Converted from Stagehand extraction
    // Original XPath: //div[@data-testid='product-price']
    const price = page.getByTestId('product-price');
    await expect(price).toBeVisible();

    // Verify valid price format
    const priceText = await price.textContent();
    expect(priceText).toMatch(/\$\d+\.\d{2}/);
  });

  test('pdp-variant-selector-visible - Variant Selector Visible', async ({ page }) => {
    // Check if product has variants
    const variantSelector = page.locator('[data-variant-selector]');

    // Skip test if no variants
    const count = await variantSelector.count();
    test.skip(count === 0, 'Product has no variants');

    // Verify selector is visible
    await expect(variantSelector).toBeVisible();

    // Verify options are present
    const options = variantSelector.locator('option, button');
    await expect(options).toHaveCount.greaterThan(0);
  });
});
```

**Success Criteria**:
- [ ] Generated code runs without modification
- [ ] 85%+ of selectors are stable (CSS/data-testid, not XPath)
- [ ] Code follows Playwright best practices (web-first assertions, proper waits)
- [ ] Generated tests pass when re-executed

#### Phase 7: CLI & Reporting

**Goal**: Create user-friendly CLI for running tests with comprehensive reporting

**Tasks**:
- [ ] Implement CLI with command-line arguments:
  - `--url <shopify-pdp-url>` - Target product URL (required)
  - `--category <category>` - Filter by category (optional)
  - `--priority <P0|P1|P2>` - Filter by priority (optional)
  - `--dry-run` - Preview test selection without execution
  - `--generate-playwright` - Generate Playwright code after execution
  - `--headless` - Run in headless mode (default: false for POC)
  - `--model <openai/anthropic>` - Select AI model
- [ ] Implement structured logging:
  - Console output with color-coded status (✓ pass, ✗ fail, ⊘ skip)
  - Progress bar for test execution
  - Summary table with pass/fail/skip counts by category
- [ ] Generate HTML report using Playwright's reporter
- [ ] Create JSON output file with execution details
- [ ] Add screenshot gallery for failures
- [ ] Implement comparison report (before/after generated code)

**Files to Create**:
- `src/cli/index.ts` - CLI entry point
- `src/cli/commands/run-tests.ts` - Main test runner command
- `src/utils/logger.ts` - Structured logging utilities
- `src/reporters/html-reporter.ts` - Custom HTML reporter

**Example CLI Usage**:
```bash
# Basic execution
npm run test -- --url https://store.com/products/test-product

# Filter by priority and generate code
npm run test -- --url https://store.com/products/test-product \
  --priority P0 \
  --generate-playwright

# Dry run to preview test selection
npm run test -- --url https://store.com/products/test-product \
  --dry-run

# Run with specific AI model
npm run test -- --url https://store.com/products/test-product \
  --model anthropic/claude-sonnet-4-5
```

**Example Console Output**:
```
🔍 Analyzing product page capabilities...
✓ Detected: in_stock, has_variants, on_sale, multiple_images

📋 Test Selection (15 applicable, 27 skipped)
  ✓ P0: 12 tests
  ✓ P1: 3 tests
  ⊘ Skipped: out_of_stock, pre_order, has_subscription (preconditions not met)

🧪 Executing Tests (Category: core-product-info)
  ✓ pdp-title-visible (1.2s)
  ✓ pdp-description-visible (0.8s)
  ✓ pdp-price-visible (1.0s)

🧪 Executing Tests (Category: variant-selection)
  ✓ pdp-variant-selector-visible (2.1s)
  ✓ pdp-variant-selection-works (3.5s)
  ✗ pdp-variant-updates-price (timeout: 5s)
    ↳ Screenshot: test-results/pdp-variant-updates-price-failure.png

📊 Results Summary
  ✓ Passed: 14/15 (93.3%)
  ✗ Failed: 1/15 (6.7%)
  ⊘ Skipped: 27

🎯 Generated Playwright Tests
  → tests/generated/pdp-tests-2026-01-28.spec.ts
  → Run with: npm run playwright test tests/generated/
```

**Success Criteria**:
- [ ] CLI runs with all argument combinations
- [ ] Console output is clear and actionable
- [ ] HTML report opens in browser automatically
- [ ] Generated code path is displayed prominently

## Acceptance Criteria

### Functional Requirements

- [ ] **Test Library Parsing**: Successfully parse and validate `tests.json` with all 42 test templates
- [ ] **Capability Detection**: Detect 80%+ of product states on diverse Shopify PDPs
- [ ] **Test Selection**: Select 100% applicable tests and skip 100% non-applicable tests
- [ ] **Test Execution**: Execute 90%+ of P0 tests successfully on sample PDPs
- [ ] **Code Generation**: Generate runnable Playwright code with 85%+ stable selectors
- [ ] **CLI Interface**: Provide intuitive CLI with all specified options
- [ ] **Error Handling**: Gracefully handle failures with retry logic and detailed logs

### Non-Functional Requirements

- [ ] **Performance**: Average <3 seconds per test execution (with AI caching)
- [ ] **Type Safety**: 100% TypeScript with strict mode, zero `any` types in public APIs
- [ ] **Documentation**: Comprehensive README with quickstart, API reference, and examples
- [ ] **Maintainability**: Modular architecture with clear separation of concerns
- [ ] **Cost Efficiency**: Minimize AI API calls via caching and scoped operations

### Quality Gates

- [ ] **Type Checking**: `npm run type-check` passes with zero errors
- [ ] **Linting**: ESLint passes with zero warnings
- [ ] **Build**: `npm run build` completes successfully
- [ ] **Tests**: Unit tests for core modules (test-library, test-selector, codegen)
- [ ] **Integration Tests**: End-to-end test on 3 sample Shopify PDPs with different configurations

## Success Metrics

1. **Test Accuracy**: 90%+ of executed tests produce correct pass/fail results
2. **Code Quality**: Generated Playwright code requires <5% manual adjustment
3. **Time Savings**: POC completes full PDP test suite in <2 minutes (vs 30+ minutes manual)
4. **Coverage**: Successfully handles 80%+ of test categories (9/11 categories)
5. **Adaptability**: Works on 3+ different Shopify store implementations without code changes

## Dependencies & Prerequisites

### External Services

- **Browserbase Account**: API key and project ID for cloud browser execution
- **AI Provider**: OpenAI API key (GPT-4o) OR Anthropic API key (Claude Sonnet 4.5)
- **Test Target**: Access to 3+ Shopify PDPs with different configurations:
  - Simple product (no variants)
  - Product with variants and mixed availability
  - Product with subscription options and custom fields

### Technical Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Terminal with ANSI color support (for CLI output)
- Chromium-based browser for local testing (Chrome, Edge, Brave)

## Risk Analysis & Mitigation

### Risk 1: AI Costs Exceed Budget
**Likelihood**: Medium | **Impact**: High

**Mitigation**:
- Enable Stagehand's caching (`cacheDir: './act-cache'`)
- Scope AI operations with CSS selectors to reduce token usage by 10x
- Use cheaper models (Gemini Flash) for non-critical operations
- Implement cost tracking and budget alerts

### Risk 2: AI Selectors Are Unstable
**Likelihood**: High | **Impact**: Medium

**Mitigation**:
- Implement fallback to Playwright codegen for selector generation
- Convert AI-generated XPath to CSS/data-testid in code generator
- Use hybrid approach: AI for discovery, Playwright for interaction
- Cache successful selectors per product template

### Risk 3: Test Execution Times Too Long
**Likelihood**: Medium | **Impact**: Medium

**Mitigation**:
- Run tests in parallel using Playwright workers
- Skip tests with unmet preconditions before page load
- Use headless mode in CI/CD
- Implement early test termination on critical failures

### Risk 4: Shopify Implementations Vary Widely
**Likelihood**: High | **Impact**: High

**Mitigation**:
- Start with baseline tests that work on all Shopify PDPs (P0 core-product-info)
- Build detection logic iteratively with real-world samples
- Allow custom detection strategies per store via configuration
- Provide fallback detection with common CSS patterns

### Risk 5: Generated Code Requires Heavy Manual Editing
**Likelihood**: Medium | **Impact**: Medium

**Mitigation**:
- Test code generator against known-good test cases
- Implement selector quality scoring (prefer role > data-testid > CSS > XPath)
- Add inline comments explaining AI decisions
- Provide code review checklist in generated files

## Resource Requirements

### Development Time (POC Scope)

- **Phase 1 (Foundation)**: 4-6 hours
- **Phase 2 (Parsing)**: 4-6 hours
- **Phase 3 (Detection)**: 8-10 hours
- **Phase 4 (Selection)**: 4-6 hours
- **Phase 5 (Execution)**: 12-16 hours
- **Phase 6 (Codegen)**: 8-10 hours
- **Phase 7 (CLI/Reporting)**: 6-8 hours

**Total Estimated Time**: 46-62 hours (6-8 business days for experienced developer)

### API Costs (POC Testing)

**Assumptions**: 50 test executions across 3 Shopify PDPs

- **Stagehand with GPT-4o**: ~$5-10 (with caching)
- **Stagehand with Claude Sonnet 4.5**: ~$10-15 (with caching)
- **Browserbase Cloud Browsers**: ~$5-10 (session-based pricing)

**Total Estimated API Costs**: $10-25 for POC

### Infrastructure

- **Local Development**: Existing machine (no special requirements)
- **Cloud Browsers**: Browserbase free tier (100 sessions/month)
- **Version Control**: GitHub repository (free tier)

## Future Considerations

### POC → Production Roadmap

1. **Multi-Page Support**: Extend beyond PDPs to Collections, Cart, Checkout
2. **Visual Regression Testing**: Integrate Percy or Chromatic for UI comparison
3. **CI/CD Integration**: GitHub Actions workflow for automated testing
4. **Test Maintenance**: Self-healing capabilities when selectors break
5. **Store Profiling**: Build reusable store configurations for known Shopify themes
6. **Custom Test Templates**: Allow users to define custom test cases via JSON
7. **Performance Metrics**: Track Core Web Vitals during test execution
8. **Accessibility Testing**: Integrate axe-core for WCAG compliance checks

### Extensibility Points

- **Custom Detectors**: Plugin system for store-specific capability detection
- **Test Strategies**: Strategy pattern for category-specific execution logic
- **Reporters**: Custom reporters for Slack, Jira, Linear integration
- **LLM Providers**: Support additional models (Gemini, Llama, local models)

## Documentation Plan

### README.md

- [ ] Project overview and motivation
- [ ] Quickstart guide (5-minute setup)
- [ ] Installation instructions
- [ ] CLI usage examples
- [ ] Configuration reference
- [ ] Troubleshooting guide
- [ ] Contributing guidelines

### API Documentation

- [ ] `TestLibrary` API reference
- [ ] `CapabilityDetector` API reference
- [ ] `TestSelector` API reference
- [ ] `TestExecutor` API reference
- [ ] `PlaywrightCodeGenerator` API reference

### Guides

- [ ] **How to Add Custom Test Templates**: Extend `tests.json` with new tests
- [ ] **How to Add Detection Strategies**: Implement custom product state detectors
- [ ] **How to Customize Code Generation**: Modify Playwright output templates
- [ ] **How to Debug Failing Tests**: Use trace viewer and error logs

### Examples

- [ ] `examples/basic-usage.ts` - Simple PDP test run
- [ ] `examples/custom-detection.ts` - Implement custom detector
- [ ] `examples/parallel-execution.ts` - Run tests across multiple PDPs
- [ ] `examples/generated-code-usage.ts` - Run generated Playwright tests

## References & Research

### Internal References

- Test Library Schema: `/Users/mohitjaiswani/Downloads/stagehand-tests/tests.json`
- Architecture Context: `/Users/mohitjaiswani/Downloads/agentic-store-testing-skill.md`
- Testing Blueprint: `/Users/mohitjaiswani/Downloads/functional-testing-agent-blueprint-v3.md`

### External References - Stagehand

- [GitHub - browserbase/stagehand](https://github.com/browserbase/stagehand)
- [Stagehand Documentation](https://docs.stagehand.dev)
- [Stagehand v3: Fastest AI Automation](https://www.browserbase.com/blog/stagehand-v3)
- [Stagehand + Playwright Integration](https://docs.stagehand.dev/v3/integrations/playwright)

### External References - Playwright

- [Playwright Official Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright TypeScript Guide](https://playwright.dev/docs/test-typescript)
- [Page Object Model with Playwright](https://codilime.com/blog/page-object-model-with-playwright-and-typescript/)

### External References - Testing Strategies

- [Ecommerce Testing Guide 2026 - Shopify](https://www.shopify.com/blog/ecommerce-testing)
- [Shopify A/B Testing Best Practices](https://splitbase.com/blog/shopify-ab-testing)
- [Shopping Cart Testing Guide](https://www.botgauge.com/blog/shopping-cart-testing-ultimate-guide-for-seamless-online-shopping)

### External References - TypeScript/Zod

- [Zod Documentation](https://zod.dev/)
- [TypeScript ESM Project Setup](https://2ality.com/2025/02/typescript-esm-packages.html)
- [Modern Node.js + TypeScript Setup 2025](https://dev.to/woovi/a-modern-nodejs-typescript-setup-for-2025-nlk)

## Appendix: Test Library Overview

The existing test library (`tests.json`) contains **42 comprehensive test templates** across **11 categories**:

### Test Categories & Counts

1. **core-product-info** (3 tests): Title, description, basic product info display
2. **pricing** (4 tests): Price display, sale prices, subscription pricing, dynamic updates
3. **product-media** (3 tests): Images, gallery navigation, variant image updates
4. **variant-selection** (5 tests): Selector visibility, variant interaction, price/availability updates
5. **quantity-selection** (2 tests): Quantity input, min/max limits
6. **add-to-cart** (6 tests): ATC button, click success, variant requirements, custom options, subscription, pre-order
7. **express-checkout** (2 tests): Buy Now button, dynamic checkout buttons
8. **inventory-availability** (4 tests): In stock display, out of stock handling, notify-when-available, pre-order messaging
9. **cart-integration** (4 tests): Cart drawer/redirect, cart count updates, correct item verification, subscription details
10. **mobile-specific** (1 test): Sticky ATC on mobile
11. **error-states** (2 tests): Invalid variant URL, ATC error handling

### Priority Distribution

- **P0 (Critical)**: 35 tests - Core functionality essential for e-commerce
- **P1 (Important)**: 7 tests - Important features enhancing user experience

### Product State Coverage

The test library defines **15 product states** that drive conditional test execution:

- `in_stock`, `out_of_stock`, `pre_order`
- `on_sale`, `has_subscription`, `has_custom_options`
- `has_variants`, `has_variant_images`, `no_default_variant`, `mixed_availability`
- `multiple_images`, `no_variants`
- `any` (always applicable)

This comprehensive coverage ensures the POC can adapt to diverse Shopify PDP implementations.
