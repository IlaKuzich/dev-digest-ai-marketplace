---
name: react-testing-library
description: "General-purpose React Testing Library guide with Vitest. Use when writing, reviewing, or setting up React component and hook tests. Covers project setup from scratch, RTL query priority, userEvent, async patterns, mocking strategies, and common anti-patterns. Applicable to any Vite + React project."
---

# React Testing Library

General-purpose guide for testing React components and hooks with React Testing Library
(RTL) and Vitest. Project-agnostic — works with any Vite + React setup.

## Philosophy: Fewer Tests, Real Scenarios

> "Write tests. Not too many. Mostly integration." — Kent C. Dodds

1. **Use-case coverage > code coverage** — aim for 100% use-case coverage, not 100% line
   coverage. Think about what the user can DO, not what the code does internally.
2. **Write fewer, longer tests** — one test that walks through a full user flow beats six
   isolated assertions. Combine related steps (render → interact → verify) into one test.
3. **Test behavior, not implementation** — assert on what the user sees and can do. Never
   assert on internal state, hook calls, or DOM structure.
4. **Mock at boundaries only** — mock API calls and external services. Never mock your own
   components, hooks, or context internals.
5. **Each test must justify its existence** — if removing a test wouldn't reduce your
   confidence that the app works, delete it.

### The Testing Trophy (what to invest in)

```
    E2E        ← Few: critical user journeys only (Playwright/Cypress)
  Integration  ← MOST tests: components with real providers, MSW for APIs
  Unit         ← Some: complex pure logic, utilities, formatters
Static Analysis ← Always: TypeScript, ESLint
```

## Setup from Scratch

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npm install -D msw                     # Network-level API mocking (recommended)
npm install -D @vitest/coverage-v8     # Code coverage (optional)
```

`vitest.config.js` at the client root (or extend `vite.config.js`):
```js
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: true,
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
  },
}));
```

`src/test/setup.js`:
```js
import '@testing-library/jest-dom/vitest';
```
This registers matchers like `toBeInTheDocument()`, `toBeVisible()`, `toHaveTextContent()`.

`package.json` scripts:
```json
{ "scripts": { "test": "vitest run", "test:watch": "vitest", "test:coverage": "vitest run --coverage" } }
```

## Test Scenarios by Component Type

Identify the component type, pick scenarios from this matrix, write **1-3 tests per
component** — each covering a full user flow, not a single assertion.

**Form component**: (1) happy path — fill all fields → submit → success feedback; (2)
validation — submit empty/invalid → error messages appear; (3) API failure — fill valid →
submit → server error shown, form stays filled.

**List/table component**: (1) happy path — data loads → items render → user interacts; (2)
empty state — no data → empty message; (3) error state — API fails → error message.

**Detail/view component**: (1) happy path — data loads → full content renders → actions
work; (2) not found/error — invalid id → appropriate message.

**Auth-gated component**: (1) authenticated — user sees protected content and can interact;
(2) unauthenticated — redirects or shows a login prompt.

**Shared/presentational component**: (1) renders with props and handles interaction; (2)
conditional rendering — only if the component has meaningful branching.

## Complete Spec Template

```jsx
// ItemList.test.jsx
import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import ItemList from './ItemList';

const items = [
  { id: '1', title: 'First Item', category: 'A' },
  { id: '2', title: 'Second Item', category: 'B' },
];

const server = setupServer(
  http.get('/api/items', () => HttpResponse.json({ success: true, items })),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const renderItemList = () => render(<MemoryRouter><ItemList /></MemoryRouter>);

describe('ItemList', () => {
  it('loads items and lets the user open one', async () => {
    const user = userEvent.setup();
    renderItemList();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(await screen.findByText('First Item')).toBeInTheDocument();
    expect(screen.getByText('Second Item')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /first item/i }));
  });

  it('shows empty state when no items exist', async () => {
    server.use(http.get('/api/items', () => HttpResponse.json({ success: true, items: [] })));
    renderItemList();

    expect(await screen.findByText(/no items/i)).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('shows an error message when the API fails', async () => {
    server.use(http.get('/api/items', () =>
      HttpResponse.json({ success: false, message: 'Server error' }, { status: 500 })));
    renderItemList();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
});
```

## Import Rules

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // ALWAYS userEvent, NEVER fireEvent
import { renderHook, act } from '@testing-library/react';
```
NEVER import from `jest`. Use `vi.fn()`, `vi.spyOn()`, `vi.mock()`.

## Query Priority

**Tier 1 — Accessible (default choice)**: `getByRole` (buttons, links, headings, inputs —
always try first), `getByLabelText` (form fields with a `<label>`), `getByPlaceholderText`
(inputs without a label — prefer adding a label), `getByText` (static text), `getByDisplayValue`.

**Tier 2 — Semantic**: `getByAltText` (images), `getByTitle`.

**Tier 3 — Last resort**: `getByTestId` — only when no accessible query works.

**Variants**: `getBy` (must be present, throws), `queryBy` (returns `null`, use for absence
assertions), `findBy` (async — element appears after work), `*AllBy` (multiple matches).

```
getByRole('button', { name: /submit/i })
getByRole('heading', { level: 2 })
getByRole('textbox', { name: /email/i })
getByRole('checkbox', { name: /agree/i })
getByRole('alert')
getByRole('dialog')
```

## userEvent

Always `userEvent.setup()` before rendering — all methods are async.

| Method | Purpose |
|--------|---------|
| `user.click(el)` | Click |
| `user.type(el, 'text')` | Type (appends to existing value) |
| `user.clear(el)` | Clear input value |
| `user.selectOptions(el, 'value')` | Select dropdown option |
| `user.tab()` | Tab to next focusable element |
| `user.keyboard('{Enter}')` | Press a key |
| `user.hover(el)` | Mouse hover |
| `user.upload(el, file)` | File upload |

## Async Testing

```js
// findBy — element appears after async work
expect(await screen.findByText('Item Title')).toBeInTheDocument();

// waitFor — multiple assertions, complex conditions
await waitFor(() => { expect(screen.getAllByRole('listitem')).toHaveLength(3); });
```

Never use `setTimeout`/fixed delays. Never call `act()` directly unless testing hooks
outside components — RTL wraps it. `findBy` is preferred over `waitFor` + `getBy` for a
single-element wait.

## Component Testing Patterns

1. Arrange — render with props/providers.
2. Act — simulate interaction via `userEvent`.
3. Assert — check what the user would see.

Combine all three into one test when they form one user flow.

```js
const renderComponent = (props = {}) =>
  render(<MemoryRouter><MyComponent defaultProp="value" {...props} /></MemoryRouter>);

expect(screen.queryByText('Error')).not.toBeInTheDocument(); // asserting absence

const card = screen.getByRole('article');
expect(within(card).getByText('Title')).toBeInTheDocument(); // scoping with `within`
```

## Hook Testing

Use `renderHook` only for hooks with complex pure logic. A hook that just fetches data or
manages simple state is better tested through the component that uses it.

```js
const { result } = renderHook(() => useCounter());
act(() => result.current.increment());
expect(result.current.count).toBe(1);

renderHook(() => useAuth(), {
  wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
});
```

## Router Wrapping

Any component using `<Link>`, `useNavigate`, `useParams`, or `useLocation` must be wrapped:

```js
render(<MemoryRouter><MyComponent /></MemoryRouter>);

render(
  <MemoryRouter initialEntries={['/items/123']}>
    <Routes><Route path="/items/:id" element={<ItemDetail />} /></Routes>
  </MemoryRouter>
);
```

## Mocking Strategies

**MSW (preferred for data-fetching components)** — intercepts at the network layer, so tests
don't couple to the HTTP client's internals:

```js
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/items', () => HttpResponse.json({ success: true, items: [...] })),
);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('handles error', async () => {
  server.use(http.get('/api/items', () => HttpResponse.json({ success: false }, { status: 500 })));
});
```

**Module mock (`vi.mock`)** — fallback when MSW is overkill; mock at the API/hook level, not
at fetch/axios level; reset with `vi.clearAllMocks()` in `beforeEach`.

**Context mocking**: wrap the component in a test provider with controlled values — don't
mock context internals; render with the real provider.

**Timers**: `vi.useFakeTimers()` / `vi.advanceTimersByTime(ms)` / restore with
`vi.useRealTimers()` in `afterEach`.

## What to Test / What to Skip

**Test**: user journeys (form fill → submit → feedback); data display (loading → loaded →
interaction); state transitions (empty → filled, logged out → logged in); error boundaries
(API failure → error message); conditional UI (different roles see different things).

**Skip**: internal state (`useState` values); implementation details (hook calls, private
functions); CSS classes/inline styles; third-party library internals; render counts;
snapshot tests (unless explicitly requested); constants/static data.

## jest-dom Matchers Reference

| Matcher | Checks |
|---------|--------|
| `toBeInTheDocument()` | Element is in the DOM |
| `toBeVisible()` | Element is visible to the user |
| `toBeEnabled()` / `toBeDisabled()` | Enabled/disabled state |
| `toHaveTextContent(/text/i)` | Contains text |
| `toHaveValue('val')` | Input/select current value |
| `toHaveAttribute('href', '/path')` | HTML attribute |
| `toBeChecked()` | Checkbox/radio is checked |
| `toHaveFocus()` | Element has focus |
| `toBeRequired()` | Input is required |
| `toBeEmptyDOMElement()` | No visible content |

## Test File Conventions

Place tests next to source (`ItemCard.jsx` → `ItemCard.test.jsx`); one `describe` per
component/hook; test names describe user-visible behavior (`"user fills form and sees
success message"`); `vi.fn()` for all mocks; always use `screen` — never destructure from
`render()`; **1-3 tests per component**, 1-2 per hook, 2-3 per utility.

## Anti-Patterns

| Anti-Pattern | Fix |
|-------------|-----|
| Many tiny tests with one assertion each | Combine into fewer flow tests |
| `fireEvent.click()` | `await user.click()` from `userEvent.setup()` |
| Destructuring from `render()` | Use `screen.getByRole(...)` |
| `getByTestId` as first choice | Try `getByRole`/`getByLabelText`/`getByText` first |
| Testing `useState`/hook internals | Test the rendered output instead |
| `setTimeout`/fixed delays | Use `findBy` or `waitFor` |
| Snapshot tests replacing behavior tests | Write explicit assertions |
| Mocking what you're testing | Mock dependencies, not the subject |
| Mocking Axios/fetch directly | Use MSW for network-level mocking |
| Testing every prop combination | Test the meaningful user-facing differences only |
