# Test Suite

This directory contains the test suite for the Nav Generator application.

## Overview

The test suite uses Vitest 0.34.6 with Happy DOM for fast, Node 16+ compatible testing. Tests focus on the utility functions extracted from the main application.

## Test Files

- **utils.test.js** - Unit tests for core utility functions (37 tests)
  - Schema parsing (links, headers, titles, tabs)
  - Search regex building
  - Fuzzy search filtering
  - Schema sorting
  - Data URL generation

- **search.test.js** - Search functionality tests (22 tests)
  - Fuzzy search with `/` prefix
  - Normal substring search
  - Google search with `?` prefix
  - Autocomplete filtering
  - Keyboard navigation logic

- **sw-nav.test.js** - Service worker tests (12 tests)
  - Cache configuration
  - URL caching logic
  - Cache expiration logic

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage (80% minimum required)
npm run test:coverage

# Open Vitest UI
npm run test:ui
```

## Coverage

Current coverage: **99.26%** for utils.js

Minimum thresholds (all must pass):

- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

## Test Setup

The `setup.js` file configures:

- Cleanup after each test
- Mock window.matchMedia
- Mock localStorage
- Mock navigator.clipboard
- Mock IndexedDB
- Crypto polyfill for Happy DOM

## CI/CD Integration

Tests run automatically in the CI pipeline via `build.sh`:

1. Install dependencies
2. Run tests with coverage (must pass 80% threshold)
3. Build application

If tests or coverage fail, the build will not proceed.
