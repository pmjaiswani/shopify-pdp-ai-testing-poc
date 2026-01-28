/**
 * Type definitions for Shopify PDP Testing POC
 */

import type { Page } from '@playwright/test';
import type { Stagehand } from '@browserbasehq/stagehand';

// Test Library Types
export interface TestCase {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: 'P0' | 'P1';
  preconditions: {
    productState: string | string[];
    userState: string;
    viewport: string;
    urlState?: string;
    simulatedState?: string;
  };
}

export interface TestLibrary {
  version: string;
  name: string;
  description: string;
  pageTypes: string[];
  templates: TestCase[];
  productStateDefinitions: Record<string, string>;
  userStateDefinitions: Record<string, string>;
  viewportDefinitions: Record<string, string>;
  categoryDefinitions: Record<string, string>;
}

// Capability Detection Types
export interface DetectedCapabilities {
  inStock: boolean;
  hasVariants: boolean;
  onSale: boolean;
  hasSubscription: boolean;
  hasMultipleImages: boolean;
  additionalStates?: string[];
}

// Test Execution Types
export interface ExecutionStep {
  timestamp: number;
  action: 'observe' | 'act' | 'extract' | 'assert';
  instruction?: string;
  selector?: string;
  result?: any;
}

export interface TestResult {
  testId: string;
  status: 'pass' | 'fail' | 'error';
  duration: number;
  error?: string;
  executionLog: ExecutionStep[];
}

// Test Execution Context
export interface TestContext {
  test: TestCase;
  page: Page;
  stagehand: Stagehand;
  log: ExecutionStep[];
}
