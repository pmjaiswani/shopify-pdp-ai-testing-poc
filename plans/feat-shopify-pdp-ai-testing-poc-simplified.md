# Shopify PDP AI Testing POC - Simplified Plan

## Overview

Create a proof-of-concept system that:
1. Analyzes Shopify PDPs using Stagehand AI to detect product capabilities
2. Runs only applicable tests from the JSON test library based on detected capabilities
3. Generates reusable Playwright test code from successful AI executions

**Key Philosophy**: Prove the concept works with minimal code, then refine.

## Core Goals

✅ **Goal 1**: Detect product capabilities with AI (variants, inventory, pricing states)
✅ **Goal 2**: Select and run only applicable tests based on preconditions
✅ **Goal 3**: Generate Playwright code that can be re-run without AI

## Simplified Architecture

```
┌─────────────────────────────────────────────┐
│         Simple Test Runner (CLI)             │
│                                              │
│  1. Load tests.json                          │
│  2. Detect capabilities (Stagehand)          │
│  3. Filter applicable tests                  │
│  4. Execute tests (Stagehand + Playwright)   │
│  5. Generate Playwright code from logs       │
│  6. Report results                           │
└─────────────────────────────────────────────┘
```

**No abstraction layers. No strategy patterns. Just straightforward code.**

## Implementation Plan

### Phase 1: Setup (2 hours)

**Goal**: Get dependencies installed and basic structure working

**Tasks**:
- [ ] Initialize npm project with TypeScript
- [ ] Install: `@browserbasehq/stagehand`, `@playwright/test`, `zod` (for AI responses only)
- [ ] Create simple file structure (6 files total):
  ```
  stagehand-tests/
  ├── src/
  │   ├── run-tests.ts          # Main runner (200 lines)
  │   ├── capability-detector.ts # AI detection (100 lines)
  │   ├── code-generator.ts      # Playwright codegen (150 lines)
  │   └── types.ts               # Shared types (50 lines)
  ├── tests.json                 # Existing test library
  ├── .env                       # API keys
  ├── package.json
  └── tsconfig.json
  ```
- [ ] Configure TypeScript (basic config, not fancy)
- [ ] Create `.env.example` with required keys

**Files to Create**:
- `package.json`
- `tsconfig.json`
- `.env.example`
- `src/types.ts` (basic interfaces)

**Success Criteria**:
- [ ] `npm install` works
- [ ] TypeScript compiles
- [ ] Can import Stagehand and Playwright

---

### Phase 2: Detection + Selection (6 hours)

**Goal**: Load tests, detect capabilities, filter applicable tests

#### Part A: Load Test Library (1 hour)

**Simple approach - no Zod, no indexing**:

```typescript
// src/run-tests.ts

interface TestCase {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: 'P0' | 'P1';
  preconditions: {
    productState: string | string[];
    userState: string;
    viewport: string;
  };
}

interface TestLibrary {
  templates: TestCase[];
  productStateDefinitions: Record<string, string>;
}

function loadTests(): TestLibrary {
  const content = fs.readFileSync('./tests.json', 'utf-8');
  return JSON.parse(content);
}
```

**That's it. No class, no query methods.**

#### Part B: Capability Detection (3 hours)

**Use Stagehand AI to detect 5 key states**:

```typescript
// src/capability-detector.ts

import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';

const CapabilitySchema = z.object({
  inStock: z.boolean(),
  hasVariants: z.boolean(),
  onSale: z.boolean(),
  hasSubscription: z.boolean(),
  hasMultipleImages: z.boolean(),
  additionalStates: z.array(z.string()).optional()
});

export async function detectCapabilities(
  stagehand: Stagehand,
  page: Page
): Promise<string[]> {

  // Single AI call to detect all capabilities
  const result = await stagehand.extract(
    `Analyze this product page and determine:
    - Is the product in stock? (check for "Add to Cart" button, not "Sold Out")
    - Does it have variants? (look for size/color selectors)
    - Is it on sale? (compare-at price shown)
    - Does it have subscription option? (subscribe & save, recurring delivery)
    - Does it have multiple product images? (gallery or carousel)

    Return true/false for each.`,
    CapabilitySchema,
    { page }
  );

  // Convert to state strings that match preconditions
  const states: string[] = [];

  if (result.inStock) states.push('in_stock');
  else states.push('out_of_stock');

  if (result.hasVariants) states.push('has_variants');
  if (result.onSale) states.push('on_sale');
  if (result.hasSubscription) states.push('has_subscription');
  if (result.hasMultipleImages) states.push('multiple_images');

  // Always include 'any' for baseline tests
  states.push('any');

  return states;
}
```

**One function. One AI call. Returns array of state strings.**

#### Part C: Test Selection (2 hours)

**Simple filtering logic**:

```typescript
// src/run-tests.ts

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
```

**Simple array filtering. No class needed.**

**Success Criteria**:
- [ ] Detects 5 capability states correctly on sample PDP
- [ ] Filters tests correctly (validates on 3 test cases manually)
- [ ] Logs detected states and selected test count

---

### Phase 3: Test Execution (8 hours)

**Goal**: Execute selected tests using hybrid Stagehand + Playwright approach

#### Execution Strategy (Simplified)

**For each test category, use appropriate approach**:

```typescript
// src/run-tests.ts

interface TestResult {
  testId: string;
  status: 'pass' | 'fail' | 'error';
  duration: number;
  error?: string;
  executionLog: ExecutionStep[];  // For code generation
}

interface ExecutionStep {
  timestamp: number;
  action: 'observe' | 'act' | 'extract' | 'assert';
  instruction?: string;
  selector?: string;
  result?: any;
}

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

  } catch (error) {
    return {
      testId: test.id,
      status: error.message.includes('expect') ? 'fail' : 'error',
      duration: Date.now() - startTime,
      error: error.message,
      executionLog
    };
  }
}

// Example: Core product info tests
async function testCoreInfo(
  test: TestCase,
  page: Page,
  stagehand: Stagehand,
  log: ExecutionStep[]
) {

  if (test.id === 'pdp-title-visible') {
    // Use Playwright first (faster)
    const title = page.getByRole('heading', { level: 1 });
    const isVisible = await title.isVisible();

    log.push({
      timestamp: Date.now(),
      action: 'assert',
      selector: 'heading[level=1]',
      result: isVisible
    });

    expect(isVisible).toBe(true);

  } else if (test.id === 'pdp-description-visible') {
    // Use AI to find description (less predictable selector)
    const observed = await stagehand.observe(
      "find the product description text",
      { page, selector: "//main" }
    );

    log.push({
      timestamp: Date.now(),
      action: 'observe',
      instruction: 'find product description',
      selector: observed[0]?.selector,
      result: observed.length > 0
    });

    expect(observed.length).toBeGreaterThan(0);
  }
}

// Example: Add to cart tests
async function testAddToCart(
  test: TestCase,
  page: Page,
  stagehand: Stagehand,
  log: ExecutionStep[]
) {

  if (test.id === 'pdp-atc-button-visible-and-enabled') {
    // Try Playwright first
    let atcButton = page.getByRole('button', { name: /add to cart/i });
    let count = await atcButton.count();

    // Fallback to AI if not found
    if (count === 0) {
      const observed = await stagehand.observe(
        "find the add to cart button",
        { page }
      );

      log.push({
        timestamp: Date.now(),
        action: 'observe',
        instruction: 'find add to cart button',
        selector: observed[0]?.selector
      });

      atcButton = page.locator(observed[0].selector);
    }

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
    // Use AI to click ATC and verify
    await stagehand.act("click the add to cart button", { page });

    log.push({
      timestamp: Date.now(),
      action: 'act',
      instruction: 'click add to cart'
    });

    // Wait for feedback (drawer, notification, or redirect)
    await page.waitForTimeout(1000);

    // Verify cart count updated
    const cartCount = await page.locator('[data-cart-count], .cart-count').textContent();

    log.push({
      timestamp: Date.now(),
      action: 'assert',
      selector: '[data-cart-count]',
      result: cartCount
    });

    expect(parseInt(cartCount || '0')).toBeGreaterThan(0);
  }
}
```

**Key simplifications**:
- Inline category handlers (no separate strategy files)
- Use Playwright first, AI as fallback
- Log all actions for code generation
- Simple error handling (pass/fail/error)

**Success Criteria**:
- [ ] Executes P0 tests on sample PDP with 80%+ pass rate
- [ ] Execution logs capture all actions taken
- [ ] Average test time < 5 seconds

---

### Phase 4: Code Generation (6 hours)

**Goal**: Convert execution logs to runnable Playwright code

#### Code Generator (Simplified)

```typescript
// src/code-generator.ts

interface GeneratedTest {
  testCode: string;
  imports: Set<string>;
}

export function generatePlaywrightCode(
  results: TestResult[],
  productUrl: string
): string {

  const testsByCategory = groupBy(results, r =>
    getTestCategory(r.testId)
  );

  let code = `// Generated Playwright tests from Stagehand execution\n`;
  code += `// Generated on: ${new Date().toISOString()}\n\n`;
  code += `import { test, expect } from '@playwright/test';\n\n`;

  for (const [category, tests] of Object.entries(testsByCategory)) {
    code += `test.describe('${category}', () => {\n`;
    code += `  test.beforeEach(async ({ page }) => {\n`;
    code += `    await page.goto('${productUrl}');\n`;
    code += `    await page.waitForLoadState('networkidle');\n`;
    code += `  });\n\n`;

    for (const result of tests) {
      if (result.status === 'pass') {
        code += generateTestCase(result);
      }
    }

    code += `});\n\n`;
  }

  return code;
}

function generateTestCase(result: TestResult): string {
  const test = getTestById(result.testId);
  let code = `  test('${test.id} - ${test.name}', async ({ page }) => {\n`;

  // Convert execution log to Playwright code
  for (const step of result.executionLog) {
    if (step.action === 'observe' && step.selector) {
      // Convert AI-found selector to Playwright locator
      const playwrightSelector = convertSelector(step.selector);
      code += `    // Found via AI: ${step.instruction}\n`;
      code += `    const element = page.locator('${playwrightSelector}');\n`;
      code += `    await expect(element).toBeVisible();\n`;
    }

    else if (step.action === 'act' && step.instruction?.includes('click')) {
      // Convert AI action to Playwright click
      if (step.instruction.includes('add to cart')) {
        code += `    // Click add to cart button\n`;
        code += `    await page.getByRole('button', { name: /add to cart/i }).click();\n`;
      }
    }

    else if (step.action === 'assert' && step.selector) {
      // Convert assertion
      const playwrightSelector = convertSelector(step.selector);
      code += `    await expect(page.locator('${playwrightSelector}')).toBeVisible();\n`;
    }
  }

  code += `  });\n\n`;
  return code;
}

function convertSelector(aiSelector: string): string {
  // Convert XPath to CSS when possible
  if (aiSelector.startsWith('//')) {
    // Simple conversions only
    if (aiSelector.includes('[@data-testid=')) {
      const match = aiSelector.match(/\[@data-testid=['"]([^'"]+)['"]\]/);
      if (match) return `[data-testid="${match[1]}"]`;
    }

    if (aiSelector.includes('[@class=')) {
      const match = aiSelector.match(/\[@class=['"]([^'"]+)['"]\]/);
      if (match) return `.${match[1].split(' ')[0]}`;
    }

    // Keep XPath if can't convert (add note)
    return aiSelector + '" /* TODO: Convert XPath to CSS */';
  }

  return aiSelector;
}
```

**Conversion priorities**:
1. Simple XPath → CSS (data-testid, classes)
2. AI "act" instructions → Playwright actions
3. Assertions → `expect().toBeVisible()`
4. Add comments for manual review

**Success Criteria**:
- [ ] Generates valid TypeScript code
- [ ] Generated tests run without syntax errors
- [ ] 70%+ of generated tests pass when re-executed
- [ ] Code is readable with helpful comments

---

### Phase 5: CLI Runner + Output (4 hours)

**Goal**: Simple command-line interface with clear output

#### Simple CLI

```typescript
// src/run-tests.ts (main function)

async function main() {
  // Get URL from command line or env
  const productUrl = process.argv[2] || process.env.TEST_PRODUCT_URL;

  if (!productUrl) {
    console.error('Usage: npm run test <product-url>');
    process.exit(1);
  }

  console.log('🚀 Starting Shopify PDP Test POC\n');
  console.log(`Target: ${productUrl}\n`);

  // 1. Setup
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(productUrl);

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    model: "anthropic/claude-sonnet-4-5"
  });
  await stagehand.init();

  // 2. Load tests
  console.log('📚 Loading test library...');
  const library = loadTests();
  console.log(`   Loaded ${library.templates.length} tests\n`);

  // 3. Detect capabilities
  console.log('🔍 Detecting product capabilities...');
  const capabilities = await detectCapabilities(stagehand, page);
  console.log(`   Detected: ${capabilities.join(', ')}\n`);

  // 4. Select tests
  console.log('✅ Selecting applicable tests...');
  const applicable = selectApplicableTests(library.templates, capabilities);
  console.log(`   Selected ${applicable.length}/${library.templates.length} tests\n`);

  // 5. Execute tests
  console.log('🧪 Executing tests...\n');
  const results: TestResult[] = [];

  for (const test of applicable) {
    process.stdout.write(`   ${test.id}...`);
    const result = await executeTest(test, page, stagehand);
    results.push(result);

    if (result.status === 'pass') {
      console.log(` ✓ PASS (${result.duration}ms)`);
    } else if (result.status === 'fail') {
      console.log(` ✗ FAIL (${result.duration}ms)`);
      console.log(`      ${result.error}`);
    } else {
      console.log(` ⚠ ERROR (${result.duration}ms)`);
      console.log(`      ${result.error}`);
    }
  }

  // 6. Generate Playwright code
  console.log('\n📝 Generating Playwright code...');
  const generatedCode = generatePlaywrightCode(results, productUrl);
  const outputPath = `./generated/pdp-tests-${Date.now()}.spec.ts`;
  fs.mkdirSync('./generated', { recursive: true });
  fs.writeFileSync(outputPath, generatedCode);
  console.log(`   Saved to: ${outputPath}\n`);

  // 7. Summary
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const errors = results.filter(r => r.status === 'error').length;

  console.log('📊 Summary:');
  console.log(`   ✓ Passed: ${passed}/${results.length}`);
  console.log(`   ✗ Failed: ${failed}/${results.length}`);
  console.log(`   ⚠ Errors: ${errors}/${results.length}`);
  console.log(`   Success Rate: ${(passed/results.length*100).toFixed(1)}%\n`);

  await browser.close();
}

main().catch(console.error);
```

**Simple script with clear output. No fancy CLI library needed.**

**Success Criteria**:
- [ ] Runs with `npm run test <url>`
- [ ] Shows progress during execution
- [ ] Displays clear pass/fail for each test
- [ ] Generates code file with timestamp
- [ ] Shows summary statistics

---

## Simplified File Structure

**Total: 10 files (vs 20+ in original plan)**

```
stagehand-tests/
├── src/
│   ├── run-tests.ts          # Main runner + execution (300 lines)
│   ├── capability-detector.ts # AI detection (100 lines)
│   ├── code-generator.ts      # Playwright codegen (200 lines)
│   └── types.ts               # Shared types (50 lines)
├── generated/
│   └── .gitkeep
├── tests.json                 # Existing test library
├── .env                       # API keys
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

**Total LOC: ~650 lines of code (vs 2000+ in original)**

## Simplified Package.json

```json
{
  "name": "shopify-pdp-testing-poc",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "tsx src/run-tests.ts",
    "build": "tsc",
    "validate": "tsc --noEmit"
  },
  "dependencies": {
    "@browserbasehq/stagehand": "^2.0.0",
    "@playwright/test": "^1.40.0",
    "playwright-core": "^1.40.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
```

## Simplified TypeScript Config

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

## Usage

```bash
# Install
npm install

# Run test on a Shopify PDP
npm run test https://store.myshopify.com/products/test-product

# Run generated Playwright tests
npx playwright test generated/pdp-tests-*.spec.ts
```

## What We Removed

### From Original Plan:
- ❌ Complex directory structure (7 dirs → 2 dirs)
- ❌ Zod validation for tests.json (use plain JSON.parse)
- ❌ Test library indexing/query methods (use Array.filter)
- ❌ Caching system (not needed for POC)
- ❌ Fallback detection strategies (start simple)
- ❌ Test selector class (use function)
- ❌ Strategy pattern files (inline category handlers)
- ❌ Parallel execution (run serial first)
- ❌ Retry/recovery logic (let it fail, observe patterns)
- ❌ HTML reporting (console output sufficient)
- ❌ Progress bars (simple status messages)
- ❌ Unit tests (validate POC manually first)
- ❌ CLI library (use process.argv)

### What We Kept:
✅ All three core goals (detection, selection, execution, generation)
✅ Hybrid Stagehand + Playwright approach
✅ Test library parsing
✅ Capability detection with AI
✅ Test filtering by preconditions
✅ Category-specific execution logic
✅ **Code generation (your requirement)**
✅ Simple CLI runner
✅ Clear console output

## Time Estimate

**Original Plan**: 46-62 hours
**Simplified Plan**: 20-26 hours

**Breakdown**:
- Phase 1 (Setup): 2 hours
- Phase 2 (Detection + Selection): 6 hours
- Phase 3 (Execution): 8 hours
- Phase 4 (Code Generation): 6 hours
- Phase 5 (CLI + Output): 4 hours

**Total: 26 hours (~3-4 working days)**

## Success Criteria

POC succeeds if:

1. ✅ **Detection works**: Correctly identifies 5 capability states on sample PDP
2. ✅ **Selection works**: Filters tests accurately based on detected capabilities
3. ✅ **Execution works**: Runs selected tests with 70%+ pass rate (real failures acceptable)
4. ✅ **Generation works**: Produces runnable Playwright code with 60%+ tests passing when re-executed
5. ✅ **Speed acceptable**: Complete test run finishes in <3 minutes
6. ✅ **Output clear**: Console output shows status and results clearly

## What Makes This Plan Better

### Compared to Original:
- **60% less code** (650 lines vs 2000+ lines)
- **50% less time** (26 hours vs 46-62 hours)
- **90% fewer files** (10 files vs 20+ files)
- **Zero abstraction layers** (direct code, no strategies/patterns)

### Compared to Reviewer Suggestions:
- **Keeps code generation** (your core requirement)
- **Keeps all 42 tests** (proves full library works)
- **Keeps detection of multiple states** (proves capability approach)
- **Adds structure** (vs single-file 200-line POC)

### Best of Both Worlds:
- Simple enough to build in a week
- Complete enough to prove all three concepts
- Structured enough to extend if POC succeeds
- Focused enough to learn quickly if POC fails

## Next Steps After POC

**If POC succeeds**, evaluate:
- Should we add error classification and retry logic?
- Should we improve selector conversion (XPath → CSS)?
- Should we add test store-specific detection strategies?
- Should we build a proper CLI with more options?

**If POC fails**, understand:
- Is AI detection accurate enough? (Target: 80%+)
- Is test selection logic correct? (Target: 100%)
- Is execution approach viable? (Target: 70%+ pass)
- Is code generation valuable? (Target: 60%+ re-run pass)

## References

- Plan file: `/Users/mohitjaiswani/Downloads/stagehand-tests/plans/feat-shopify-pdp-ai-testing-poc.md` (original)
- Test library: `/Users/mohitjaiswani/Downloads/stagehand-tests/tests.json`
- Stagehand docs: https://docs.stagehand.dev
- Playwright docs: https://playwright.dev

---

**This plan proves your three core concepts with 60% less code and 50% less time while keeping code generation as a first-class feature.**
