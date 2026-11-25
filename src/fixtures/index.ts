import { mergeTests } from '@playwright/test';
import { test as apiTest } from '#src/fixtures/api.fixtures.ts';
import { test as mockTest } from '#src/fixtures/mock.fixtures.ts';
import { test as uiTest } from '#src/fixtures/ui.fixtures.ts';

export const test = mergeTests(apiTest, uiTest, mockTest);
export { expect } from '#src/assertions/index.ts';
