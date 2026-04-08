import { mergeTests } from '@playwright/test';
import { test as base, expect } from '@/utils/fixtures/baseTest';
import { lighthouseTest } from '@/utils/fixtures/lighthouseFixture';

export const test = mergeTests(base, lighthouseTest);
export { expect };
