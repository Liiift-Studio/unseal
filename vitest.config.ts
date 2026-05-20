// Vitest configuration for the unseal package test suite.

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['test/**/*.test.ts'],
		testTimeout: 30000,
	},
	resolve: {
		conditions: ['import', 'node'],
	},
});
