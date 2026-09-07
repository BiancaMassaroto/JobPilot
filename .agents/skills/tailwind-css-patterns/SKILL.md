---
name: tailwind-css-patterns
description: Provides comprehensive Tailwind CSS utility-first styling patterns including responsive design, layout utilities, flexbox, grid, spacing, typography, colors, and modern CSS best practices. Use when styling React/Vue/Svelte components, building responsive layouts, implementing design systems, or optimizing CSS workflow.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Tailwind CSS Development Patterns

Expert guide for building modern, responsive user interfaces with Tailwind CSS utility-first framework. Covers v4.1+ features including CSS-first configuration, custom utilities, and enhanced developer experience.

## Overview

Provides actionable patterns for responsive, accessible UIs with Tailwind CSS v4.1+. Covers utility composition, dark mode, component patterns, and performance optimization.

## When to Use

- Styling React/Vue/Svelte components
- Building responsive layouts and grids
- Implementing design systems
- Adding dark mode support
- Optimizing CSS workflow

## Quick Reference

### Responsive Breakpoints

| Prefix | Min Width | Description |
|--------|-----------|-------------|
| `sm:` | 640px | Small screens |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Desktops |
| `xl:` | 1280px | Large screens |
| `2xl:` | 1536px | Extra large |

### Common Patterns

```html
<!-- Center content -->
<div class="flex items-center justify-center min-h-screen">
  Content
</div>

<!-- Responsive grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <!-- Items -->
</div>

<!-- Card component: semantic project tokens, not raw palette classes like bg-white/text-gray-600 -->
<div class="bg-surface rounded-lg shadow-lg p-6">
  <h3 class="text-xl font-bold">Title</h3>
  <p class="text-muted-foreground">Description</p>
</div>
```

## Instructions

1. **Start Mobile-First**: Write base styles for mobile, add responsive prefixes (`sm:`, `md:`, `lg:`) for larger screens
2. **Use Design Tokens**: Leverage Tailwind's spacing and typography scales; for color, use the project's own semantic tokens defined via `@theme` (e.g. `bg-surface`, `text-foreground`, `bg-primary`) — never Tailwind's raw default palette classes (`bg-white`, `text-gray-600`, `bg-indigo-600`) or a hardcoded hex value
3. **Compose Utilities**: Combine multiple utilities for complex styles
4. **Extract Components**: Create reusable component classes for repeated patterns
5. **Configure Theme**: Customize design tokens in `tailwind.config.js` or using `@theme`
6. **Verify Changes**: Test at each breakpoint using DevTools responsive mode. Check for visual regressions and accessibility issues before committing.

## Examples

### Responsive Card Component

```tsx
// Semantic project tokens (bg-surface, bg-primary, text-primary-foreground), never raw palette classes like bg-white/bg-indigo-600
function ProductCard({ product }: { product: Product }) {
  return (
    <div className="bg-surface rounded-lg shadow-lg overflow-hidden sm:flex">
      <img className="h-48 w-full object-cover sm:h-auto sm:w-48" src={product.image} />
      <div className="p-6">
        <h3 className="text-lg font-semibold">{product.name}</h3>
        <button className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          Add to Cart
        </button>
      </div>
    </div>
  );
}
```

### Dark Mode Toggle

```html
<!-- Semantic tokens, not the raw white/gray/blue palette: swap these names for your project's real tokens -->
<div class="bg-background text-foreground dark:bg-background-dark dark:text-foreground-dark">
  <h1 class="dark:text-foreground-dark">Title</h1>
</div>
```

### Form Input

```html
<input
  class="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
  placeholder="you@example.com"
/>
```

## Best Practices

1. **Consistent Spacing**: Use Tailwind's spacing scale (4, 8, 12, 16, etc.)
2. **Color Palette**: Use the project's own semantic color tokens, defined once via `@theme` and consumed as generated utilities (`bg-surface`, `text-foreground`, `bg-primary`) — never Tailwind's raw default palette classes (`bg-indigo-600`, `text-gray-600`) or a hardcoded hex value; one swappable source of truth beats scattered literal colors
3. **Component Extraction**: Extract repeated patterns into reusable components
4. **Utility Composition**: Prefer utility classes over `@apply` for maintainability
5. **Semantic HTML**: Use proper HTML elements with Tailwind classes
6. **Performance**: Ensure content paths include all template files for optimal purging
7. **Accessibility**: Include focus styles, ARIA labels, and respect user preferences (reduced-motion)

## Troubleshooting

### Classes Not Applying
- **Check content paths**: Ensure all template files are included in `content: []` in config
- **Verify build**: Run `npm run build` to regenerate purged CSS
- **Dev mode**: Use `npx tailwindcss -o` with `--watch` flag for live updates

### Responsive Styles Not Working
- **Order matters**: Responsive prefixes must come before non-responsive (e.g., `md:flex` not `flex md:flex`)
- **Check breakpoint values**: Verify breakpoints match your design requirements
- **DevTools**: Use browser DevTools responsive mode to test at each breakpoint

### Dark Mode Issues
- **Verify config**: Ensure `darkMode: 'class'` or `'media'` is set correctly
- **Toggle implementation**: Use `document.documentElement.classList.toggle('dark')` for class strategy
- **Initial flash**: Add `dark` class to `<html>` before body renders

## Constraints and Warnings

- **Class Proliferation**: Long class strings reduce readability; extract into components
- **Content Paths**: Misconfigured paths cause classes to be purged in production
- **Arbitrary Values**: Use sparingly; prefer design tokens for consistency
- **Specificity Issues**: Avoid `@apply` with complex selectors
- **Dark Mode**: Requires correct configuration (`class` or `media` strategy)
- **Browser Support**: Check Tailwind docs for compatibility notes

## References

- **[references/layout-patterns.md](references/layout-patterns.md)** — Flexbox, grid, spacing, typography, colors
- **[references/component-patterns.md](references/component-patterns.md)** — Cards, navigation, forms, modals, React patterns
- **[references/responsive-design.md](references/responsive-design.md)** — Responsive patterns, dark mode, container queries
- **[references/animations.md](references/animations.md)** — Transitions, transforms, built-in animations, motion preferences
- **[references/performance.md](references/performance.md)** — Bundle optimization, CSS optimization, production builds
- **[references/accessibility.md](references/accessibility.md)** — Focus management, screen readers, color contrast, ARIA
- **[references/configuration.md](references/configuration.md)** — CSS-first config, JavaScript config, plugins, presets
- **[references/reference.md](references/reference.md)** — Additional reference materials

## External Resources

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Tailwind UI](https://tailwindui.com)
- [Tailwind Play](https://play.tailwindcss.com)
