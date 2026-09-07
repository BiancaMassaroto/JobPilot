# Tailwind CSS Documentation

Tailwind CSS is a utility-first CSS framework that generates styles by scanning HTML, JavaScript, and template files for class names. It provides a comprehensive design system through CSS utility classes, enabling rapid UI development without writing custom CSS. The framework operates at build-time, analyzing source files and generating only the CSS classes actually used in the project, resulting in optimized production bundles with zero runtime overhead.

The framework includes an extensive default color palette (18 colors with 11 shades each), responsive breakpoint system, customizable design tokens via CSS custom properties, and support for dark mode, pseudo-classes, pseudo-elements, and media queries through variant prefixes. Tailwind CSS v4.1 introduces CSS-first configuration using the `@theme` directive, native support for custom utilities via `@utility`, seamless integration with modern build tools through Vite, PostCSS, and framework-specific plugins, and enhanced arbitrary value syntax for maximum flexibility.

## Installation with Vite

Installing Tailwind CSS using the Vite plugin for modern JavaScript frameworks.

```bash
# Create a new Vite project
npm create vite@latest my-project
cd my-project

# Install Tailwind CSS and Vite plugin
npm install tailwindcss @tailwindcss/vite
```

```javascript
// vite.config.ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
})
```

```css
/* src/style.css */
@import "tailwindcss";
```

```html
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <link href="/src/style.css" rel="stylesheet" />
  </head>
  <body>
    <h1 class="text-3xl font-bold underline">
      Hello world!
    </h1>
  </body>
</html>
```

## Utility Classes with Variants

Applying conditional styles using variant prefixes for hover, focus, and responsive breakpoints.

```html
<button class="bg-sky-500 hover:bg-sky-700 focus:outline-2 focus:outline-offset-2 focus:outline-sky-600">
  Save changes
</button>

<p class="text-slate-900 dark:text-white">
  Content adapts to color scheme preference
</p>

<button class="px-4 py-2 text-sm sm:px-6 sm:py-3 sm:text-base">
  Submit
</button>
```

## Custom Theme Configuration

Defining custom design tokens using the `@theme` directive in CSS.

```css
/* app.css */
@import "tailwindcss";

@theme {
  /* Custom fonts */
  --font-display: "Satoshi", "sans-serif";
  --font-body: "Inter", system-ui, sans-serif;

  /* Custom colors */
  --color-brand-50: oklch(0.98 0.02 264);
  --color-brand-100: oklch(0.95 0.05 264);
  --color-brand-500: oklch(0.55 0.22 264);
  --color-brand-900: oklch(0.25 0.12 264);

  /* Custom breakpoints */
  --breakpoint-3xl: 120rem;
  --breakpoint-4xl: 160rem;

  /* Custom spacing */
  --spacing-18: calc(var(--spacing) * 18);

  /* Custom animations */
  --ease-fluid: cubic-bezier(0.3, 0, 0, 1);
  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);
}
```

```html
<div class="bg-brand-100 font-display text-brand-900">
  Custom design system
</div>
```

## Arbitrary Values

Using square bracket notation for one-off custom values without leaving HTML.

**Colors are the one place this section departs from Tailwind's own docs on purpose: never bracket a raw hex value or reach for a bare palette class (`bg-[#1da1f2]`, `bg-sky-500`) in project code. Bracket a CSS variable/token instead (`bg-[var(--color-brand-500)]`, or the shorthand `bg-(--color-brand-500)`), the same tokens defined in `@theme` above — arbitrary-value syntax should extend the token system, never bypass it.**

```html
<div class="top-[117px]">
  Pixel-perfect positioning
</div>

<div class="bg-[var(--color-brand-500)] text-[length:var(--text-2xl)] before:content-['Festivus']">
  Token-backed color and size, plus custom content — never a raw hex or bare color class
</div>

<div class="[mask-type:luminance]">
  Any CSS property
</div>

<div class="[--gutter-width:1rem] lg:[--gutter-width:2rem]">
  Reference custom properties
</div>

<div class="grid grid-cols-[1fr_500px_2fr]">
  Complex grid layouts
</div>

<div class="text-[length:var(--my-var)]">
  Font size from CSS variable
</div>

<div class="text-(--my-color)">
  Color from CSS variable
</div>
```

## Color System

Working with Tailwind's comprehensive color palette and opacity modifiers.

```html
<div class="border border-pink-300 bg-white text-gray-700">
  Color utilities across all properties
</div>

<div class="bg-black/75">
  Alpha channel with percentage
</div>

<div class="bg-black/[71.37%]">
  Arbitrary opacity values
</div>

<div class="bg-black/(--my-alpha-value)">
  Opacity from CSS variable
</div>

<div class="bg-white dark:bg-gray-900">
  Adapts to color scheme
</div>
```

## Dark Mode

Implementing dark mode with CSS media queries or manual toggle.

```html
<div class="bg-white dark:bg-gray-800">
  <p class="text-gray-900 dark:text-white">
    Content automatically adapts
  </p>
</div>
```

```css
/* Manual dark mode toggle with class selector */
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));
```

```html
<html class="dark">
  <body>
    <div class="bg-white dark:bg-gray-900">
      <p class="text-gray-900 dark:text-gray-100">
        Controlled by .dark class
      </p>
      <button class="rounded-md bg-gray-200 px-3 py-1 dark:bg-gray-700 dark:text-white">
        Toggle theme
      </button>
    </div>
  </body>
</html>
```

```javascript
// Dark mode toggle logic
// On page load or theme change
document.documentElement.classList.toggle(
  "dark",
  localStorage.theme === "dark" ||
  (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)
);

// User chooses light mode
localStorage.theme = "light";

// User chooses dark mode
localStorage.theme = "dark";

// User chooses system preference
localStorage.removeItem("theme");
```

## State Variants

Styling elements based on pseudo-classes and parent/sibling state.

```html
<ul class="divide-y divide-gray-200">
  <li class="p-4 first:pt-0 last:pb-0">
    Item content
  </li>
</ul>

<div class="group rounded-lg border p-4 hover:bg-gray-50">
  <h3 class="font-semibold text-gray-900 group-hover:text-sky-600">
    Title
  </h3>
  <p class="text-gray-500">
    Description
  </p>
</div>

<div>
  <input type="email" required class="peer border border-gray-300 invalid:border-red-500" />
  <p class="mt-1 hidden text-sm text-red-600 peer-invalid:block">
    Please provide a valid email address.
  </p>
</div>

<select class="rounded border border-gray-300">
  <option disabled class="disabled:text-gray-400">
    Option
  </option>
</select>
```

## Responsive Design

Building mobile-first responsive layouts with breakpoint variants.

```html
<h1 class="text-2xl md:text-4xl lg:text-6xl">
  Responsive heading
</h1>

<p class="text-sm sm:text-base lg:text-lg">
  Text scales with viewport
</p>

<div class="hidden lg:block">
  Desktop only
</div>

<div class="block lg:hidden">
  Mobile only
</div>

<div class="hidden 3xl:block">
  Custom breakpoint
</div>

<div class="max-md:font-bold">
  Below medium
</div>
```

## Custom Utilities

Creating reusable custom utility classes with variant support.

```css
/* Simple custom utility */
@utility content-auto {
  content-visibility: auto;
}

/* Complex utility with nesting */
@utility scrollbar-hidden {
  &::-webkit-scrollbar {
    display: none;
  }
}

/* Functional utility with theme values */
@theme {
  --tab-size-2: 2;
  --tab-size-4: 4;
  --tab-size-github: 8;
}

@utility tab-* {
  tab-size: --value(--tab-size-*);
}

/* Supporting arbitrary, bare, and theme values */
@utility opacity-* {
  opacity: --value([percentage]);
  opacity: calc(--value(integer) * 1%);
  opacity: --value(--opacity-*);
}

/* Utility with modifiers */
@utility text-* {
  font-size: --value(--text-*, [length]);
  line-height: --modifier(--leading-*, [length], [*]);
}

/* Negative value support */
@utility inset-* {
  inset: --spacing(--value(integer));
  inset: --value([percentage], [length]);
}

@utility -inset-* {
  inset: --spacing(--value(integer) * -1);
  inset: calc(--value([percentage], [length]) * -1);
}
```

```html
<div class="content-auto">
  Custom utilities work with variants
</div>

<div class="tab-4 lg:tab-github">
  Variants and arbitrary values supported
</div>

<div class="text-lg/7">
  Utility with modifier (font-size/line-height)
</div>
```

## Custom Variants

Registering custom conditional styles with the `@custom-variant` directive.

```css
/* Simple custom variant */
@custom-variant theme-midnight (&:where([data-theme="midnight"] *));

/* Variant with media query */
@custom-variant any-hover {
  @media (any-hover: hover) {
    &:hover {
      @slot;
    }
  }
}

/* ARIA state variant */
@custom-variant aria-asc (&[aria-sort="ascending"]);
@custom-variant aria-desc (&[aria-sort="descending"]);

/* Data attribute variant */
@custom-variant data-checked (&[data-ui~="checked"]);
```

```html
<button class="bg-white theme-midnight:bg-purple-900">
  Midnight theme button
</button>

<th aria-sort="ascending" class="aria-asc:bg-gray-100">
  Sortable column
</th>

<div data-ui="checked" class="data-checked:bg-sky-100">
  Checked state
</div>

<div class="[&:nth-child(3)]:bg-yellow-100">
  One-off custom selectors
</div>
```

## Applying Variants in CSS

Using the `@variant` directive to apply variants within custom CSS.

```css
/* Single variant */
.my-element {
  background: white;

  @variant dark {
    background: black;
  }
}

/* Nested variants */
.my-button {
  background: white;

  @variant dark {
    background: gray;

    @variant hover {
      background: black;
    }
  }
}

/* Compiled output */
.my-element {
  background: white;
}

@media (prefers-color-scheme: dark) {
  .my-element {
    background: black;
  }
}
```

## Layer Organization

Organizing custom styles into Tailwind's cascade layers.

```css
@import "tailwindcss";

/* Base styles for HTML elements */
@layer base {
  h1 {
    font-size: var(--text-2xl);
    font-weight: bold;
  }

  h2 {
    font-size: var(--text-xl);
    font-weight: 600;
  }

  body {
    font-family: var(--font-body);
  }
}

/* Reusable component classes */
@layer components {
  .btn {
    padding: --spacing(2) --spacing(4);
    border-radius: var(--radius);
    font-weight: 600;
    transition: all 150ms;
  }

  .btn-primary {
    background-color: var(--color-blue-500);
    color: white;
  }

  .card {
    background-color: var(--color-white);
    border-radius: var(--radius-lg);
    padding: --spacing(6);
    box-shadow: var(--shadow-xl);
  }

  /* Third-party component overrides */
  .select2-dropdown {
    border-radius: var(--radius);
    box-shadow: var(--shadow-lg);
  }
}
```

```html
<div class="card rounded-none">
  Square corners despite card class
</div>

<button class="btn btn-primary rounded-full">
  Component with utility overrides
</button>
```

## Functions and Directives

Using Tailwind's CSS functions for dynamic values and opacity adjustments.

```css
/* Alpha function for opacity */
.my-element {
  color: --alpha(var(--color-lime-300) / 50%);
  background: --alpha(var(--color-blue-500) / 25%);
}

/* Spacing function */
.my-element {
  margin: --spacing(4);
  padding: calc(--spacing(6) - 1px);
}

/* In arbitrary values */
.my-element {
  top: calc(--spacing(4) * 2);
}

/* Source directive for additional content */
@source "../node_modules/@my-company/ui-lib";

/* Apply directive for inline utilities */
.select2-dropdown {
  @apply rounded-b-lg shadow-md;
}

.select2-search {
  @apply rounded border border-gray-300;
}

.select2-results__group {
  @apply text-lg font-bold text-gray-900;
}
```

## Pseudo-elements

Styling ::before, ::after, ::placeholder, and other pseudo-elements.

```html
<label class="block">
  <span class="text-sm font-medium text-gray-700">Email</span>
  <input type="email" placeholder="you@example.com" class="placeholder:text-gray-400" />
</label>

<ul class="list-none">
  <li class="before:mr-2 before:content-['→']">First item</li>
  <li class="before:mr-2 before:content-['→']">Second item</li>
</ul>

<p class="selection:bg-sky-200 selection:text-sky-900">
  Select this text to see custom colors
</p>

<p class="first-letter:text-3xl first-letter:font-bold first-line:uppercase">
  Typography with pseudo-elements
</p>
```

## Media Queries

Conditional styling based on user preferences and device capabilities.

```html
<div class="motion-safe:transition motion-reduce:transition-none">
  Respects user preference
</div>

<div class="animate-none motion-safe:animate-spin">
  Only animates if motion allowed
</div>

<div class="contrast-more:border-2 contrast-more:border-black">
  Adjusts for contrast needs
</div>

<div class="portrait:hidden">
  Hidden in portrait mode
</div>

<div class="flex flex-col landscape:flex-row">
  Layout adapts to orientation
</div>

<div class="print:hidden">
  Not shown when printing
</div>

<div class="hidden print:block">
  Only visible in print
</div>

<div class="supports-[backdrop-filter]:backdrop-blur-sm">
  Progressive enhancement
</div>
```

## Summary

Tailwind CSS provides a complete utility-first design system that eliminates the need for writing custom CSS in most cases. The framework's primary use cases include rapid prototyping, building production applications with consistent design systems, creating responsive layouts, implementing dark mode, and maintaining design consistency across large teams. By using utility classes directly in markup, developers can iterate quickly, avoid naming conventions, and prevent CSS bloat since only used styles are generated.

The v4.1 release enhances the developer experience with CSS-first configuration, eliminating JavaScript configuration files for most projects. Integration patterns include using the Vite plugin for modern frameworks, PostCSS for custom build pipelines, the Tailwind CLI for simple projects, and CDN scripts for rapid prototyping. The framework excels at component-driven development when combined with React, Vue, Svelte, or other modern frameworks, where utility classes are co-located with component logic. Custom design systems can be fully defined in CSS using `@theme`, with project-specific utilities and variants extending the framework's capabilities without writing JavaScript plugins.
