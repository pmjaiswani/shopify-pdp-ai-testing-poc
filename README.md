# Shopify PDP AI Testing POC

Proof-of-concept for intelligent Shopify Product Detail Page testing using Stagehand AI and Playwright.

## Features

- 🤖 **AI-Powered Detection**: Automatically detects product capabilities (variants, inventory, pricing)
- ✅ **Smart Test Selection**: Runs only applicable tests based on detected capabilities
- 📝 **Code Generation**: Generates reusable Playwright tests from AI executions
- 📊 **Clear Output**: Simple console output with pass/fail results

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 3. Run Tests

```bash
# Test a specific Shopify PDP
npm run test https://store.myshopify.com/products/example-product

# Or set TEST_PRODUCT_URL in .env and run
npm run test
```

### 4. Run Generated Tests

```bash
# Run the generated Playwright tests
npx playwright test generated/pdp-tests-*.spec.ts
```

## How It Works

1. **Capability Detection**: Stagehand AI analyzes the PDP and detects:
   - Inventory status (in_stock, out_of_stock)
   - Product variants (has_variants)
   - Sale pricing (on_sale)
   - Subscription options (has_subscription)
   - Image gallery (multiple_images)

2. **Test Selection**: Filters the 42-test library to run only applicable tests based on detected capabilities

3. **Test Execution**: Runs selected tests using hybrid Stagehand + Playwright approach

4. **Code Generation**: Converts AI execution logs into runnable Playwright test files

## Project Structure

```
stagehand-tests/
├── src/
│   ├── run-tests.ts          # Main CLI runner
│   ├── capability-detector.ts # AI capability detection
│   ├── code-generator.ts      # Playwright code generation
│   └── types.ts               # TypeScript interfaces
├── tests.json                 # Test library (42 tests)
├── generated/                 # Generated Playwright tests
└── .env                       # API keys (git-ignored)
```

## Requirements

- Node.js 18+
- Anthropic API key (for Claude)
- A Shopify product page URL to test

## Success Criteria

The POC validates three core concepts:

1. ✅ AI can detect product capabilities with 80%+ accuracy
2. ✅ Test selection based on capabilities is 100% accurate
3. ✅ Generated Playwright code is 60%+ reusable without modification

## License

MIT
