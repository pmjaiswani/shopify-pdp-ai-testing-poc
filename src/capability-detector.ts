/**
 * Capability Detector - AI-powered product page analysis
 */

import type { Stagehand, Page } from '@browserbasehq/stagehand';
import { z } from 'zod';
import type { DetectedCapabilities } from './types.js';

// Zod schema for AI response validation
const CapabilitySchema = z.object({
  inStock: z.boolean().describe('Is the product available for purchase? Check for Add to Cart button (not Sold Out)'),
  hasVariants: z.boolean().describe('Does the product have variant options like size, color, or style selectors?'),
  onSale: z.boolean().describe('Is the product on sale? Look for compare-at price or sale badge'),
  hasSubscription: z.boolean().describe('Does the product offer subscription/recurring purchase options?'),
  hasMultipleImages: z.boolean().describe('Does the product have multiple images in a gallery or carousel?'),
  additionalStates: z.array(z.string()).optional().describe('Any other notable states like pre-order, low stock, etc.')
});

/**
 * Detect product capabilities using Stagehand AI
 * Makes a single AI call to analyze the page and return structured data
 */
export async function detectCapabilities(
  stagehand: Stagehand,
  page: Page
): Promise<string[]> {

  console.log('   Analyzing page with AI...');

  try {
    // Single AI extraction call to detect all capabilities
    const result = await page.extract({
      instruction: `Analyze this Shopify product detail page carefully and determine:

1. **In Stock**: Is the product currently available for purchase?
   - Look for "Add to Cart" or "Buy Now" buttons (enabled)
   - Check if there's "Sold Out" or "Out of Stock" messaging
   - Return true if purchasable, false if not available

2. **Has Variants**: Does this product have selectable variants?
   - Look for size selectors, color swatches, style options
   - Check for dropdowns or buttons to select different options
   - Return true if any variant selectors exist

3. **On Sale**: Is the product currently discounted?
   - Look for compare-at price (strikethrough original price)
   - Check for "Sale" badges or price savings messaging
   - Return true if there's a sale price shown

4. **Has Subscription**: Does the product offer subscription purchases?
   - Look for "Subscribe & Save" options
   - Check for recurring delivery frequency selectors
   - Return true if subscription option is available

5. **Multiple Images**: Does the product have more than one image?
   - Look for image gallery, carousel, or thumbnails
   - Check if there are navigation dots or arrows
   - Return true if multiple product images are displayed

Return true/false for each capability.`,
      schema: CapabilitySchema,
      modelName: 'claude-3-7-sonnet-latest'
    });

    console.log('   ✓ AI analysis complete');

    // Convert boolean capabilities to state strings that match preconditions in tests.json
    const states: string[] = [];

    // Inventory status (mutually exclusive)
    if (result.inStock) {
      states.push('in_stock');
    } else {
      states.push('out_of_stock');
    }

    // Optional features
    if (result.hasVariants) {
      states.push('has_variants');
    }

    if (result.onSale) {
      states.push('on_sale');
    }

    if (result.hasSubscription) {
      states.push('has_subscription');
    }

    if (result.hasMultipleImages) {
      states.push('multiple_images');
    }

    // Add any additional states detected
    if (result.additionalStates && result.additionalStates.length > 0) {
      states.push(...result.additionalStates);
    }

    // Always include 'any' for baseline tests
    states.push('any');

    return states;

  } catch (error) {
    console.error('   ✗ Error during capability detection:', error);
    // Fallback: return minimal states to allow some tests to run
    return ['any'];
  }
}
