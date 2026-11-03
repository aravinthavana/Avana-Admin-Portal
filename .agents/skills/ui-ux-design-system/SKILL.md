---
name: ui-ux-design-system
description: >-
  Avana Portal UI/UX Design System, Component Guidelines, and Usability Audit standards.
  Use when designing, building, refactoring, or auditing UI components, forms, tables,
  dashboards, micro-interactions, responsive layouts, or accessibility (a11y) in the Avana Admin Portal.
---

# Avana Portal UI/UX Design System & UX Standards

This skill guides the design, construction, and auditing of all user interfaces in the Avana Admin Portal. It guarantees visual cohesion, accessibility, and high usability across all modules (AMC, Helpdesk, Assets, Petty Cash, Booking, etc.).

---

## 1. Brand Identity & Design Tokens

Always use CSS custom properties from `frontend/src/index.css`. Never hardcode raw hex colors or magic pixel values.

### Color Tokens
* **Brand Primary:** `var(--brand-amber)` (`#b27f0d`), Hover: `var(--brand-amber-dark)` (`#8b6209`), Subtle BG: `var(--brand-amber-bg)` (`#fdf5e6`)
* **Brand Contrast/Dark:** `var(--brand-charcoal)` (`#172025`)
* **Backgrounds:** Page: `var(--color-bg)` (`#f5f5f7`), Card/Surface: `var(--color-surface)` (`#ffffff`), Muted Surface: `var(--color-surface-2)` (`#f9f9fb`)
* **Borders:** `var(--color-border)` (`#e4e4e7`), Light: `var(--color-border-light)` (`#f0f0f2`)
* **Status Colors:**
  * Success: `var(--color-success)` (`#16a34a`), BG: `var(--color-success-bg)` (`#f0fdf4`), Border: `var(--color-success-border)` (`#bbf7d0`)
  * Warning: `var(--color-warning)` (`#d97706`), BG: `var(--color-warning-bg)` (`#fffbeb`), Border: `var(--color-warning-border)` (`#fde68a`)
  * Error: `var(--color-error)` (`#dc2626`), BG: `var(--color-error-bg)` (`#fef2f2`), Border: `var(--color-error-border)` (`#fecaca`)
  * Info: `var(--color-info)` (`#2563eb`), BG: `var(--color-info-bg)` (`#eff6ff`), Border: `var(--color-info-border)` (`#bfdbfe`)

### Typography
* **Headings:** `var(--font-heading)` (`'Fira Sans', sans-serif`) with weights `600` or `700`.
* **Body:** `var(--font-body)` (`'Arimo', sans-serif`).
* **Subtitles & Badges:** `var(--font-subtitle)` (`'Zalando Sans', 'Arimo', sans-serif`).
* **Data & Codes:** `var(--font-mono)` (`'JetBrains Mono', monospace`).

### Spacing Scale
Use standard spacing multipliers:
`--space-1: 4px`, `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`, `--space-5: 20px`, `--space-6: 24px`, `--space-8: 32px`, `--space-12: 48px`.

---

## 2. Core UI Component Patterns (`frontend/src/components/ui.jsx`)

When creating or refactoring pages, always reuse existing standard components:

1. **PageHeader:**
   ```jsx
   <PageHeader
     title="📋 Section Title"
     subtitle="Clear, descriptive subtitle"
     action={<button className="btn btn--primary">+ New Action</button>}
   />
   ```

2. **Badges:**
   Always use semantic statuses: `active`, `pending`, `completed`, `expired`, `approved`, `rejected`.
   ```jsx
   <Badge status={item.status === 'Active' ? 'success' : 'danger'} label={item.status} />
   ```

3. **Form Fields:**
   Always wrap inputs with `<FormField>` to ensure accessible labels and hint text.
   ```jsx
   <FormField label="Item Name *" required>
     <input type="text" className="form-input" required value={name} onChange={...} />
   </FormField>
   ```

4. **Empty State & Loading States:**
   Never leave blank screens:
   ```jsx
   {loading ? (
     <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Spinner size="lg" /></div>
   ) : items.length === 0 ? (
     <EmptyState icon="📦" title="No Records Found" description="Click '+ Add' to create your first record." />
   ) : ( ...table... )}
   ```

5. **Modals & Drawers:**
   Always provide `isOpen`, `onClose`, accessible title, and prominent action buttons (Primary action on the right, Cancel on the left).

---

## 3. UX Guidelines & Micro-Interactions

1. **Feedback & Affordances:**
   * Disable submit buttons and show loading spinners during async calls (`btn--loading`).
   * Show immediate toast feedback (`toast.success(...)`, `toast.error(...)`) on completion.
   * Provide confirmation modals for irreversible actions (e.g. deleting a contract or asset).

2. **Responsive Data Tables:**
   * Wrap tables in `<div className="table-wrapper">` with horizontal scrolling for smaller screens.
   * Sticky headers for tables with > 20 rows.
   * Badge alignment: Centered or aligned consistently with column data.

3. **Tabbed Navigation:**
   * When segregating records (e.g. Active vs Expired, Pending vs Resolved), use pill or border-tab navigation with live count badges.
   * Persist or synchronize active tab state gracefully without resetting form data.

4. **Accessibility (WCAG 2.1 AA):**
   * Color contrast: Minimum 4.5:1 ratio for normal text.
   * Form inputs must have matching `id` and `label` or be wrapped in `<label>`.
   * Decorative icons must have `aria-hidden="true"`.

---

## 4. UI/UX Audit Procedure

When asked to improve or review any screen:
1. **Hierarchy & Scannability:** Can the user glance at the screen and immediately understand their primary action within 3 seconds?
2. **Consistency:** Does the component match the Avana brand palette and spacing tokens?
3. **Error Prevention:** Are required fields marked? Are date ranges validated (e.g. `end_date >= start_date`)?
4. **Performance & States:** Are loading, empty, error, and success states all handled gracefully?
