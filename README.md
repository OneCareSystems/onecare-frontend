# OneCare Frontend

## Overview

This repository contains the frontend application for the OneCare system.

Built using:

- React
- Vite
- Tailwind CSS
- ESLint
- Prettier
- GitHub Actions

## Prerequisites

Install:

- Node.js (LTS)
- npm

## Installation

Clone repository:

```bash
git clone https://github.com/OneCareSystems/onecare-frontend
cd onecare-frontend
```

Install dependencies:

```bash
npm install
```

## Running Development Server

```bash
npm run dev
```

## Production Build

```bash
npm run build
```

## Preview Build

```bash
npm run preview
```

## Linting

Run lint:

```bash
npm run lint
```

Run formatter:

```bash
npm run format
```

Check formatting:

```bash
npm run format:check
```

## Theming & Accessibility (CFG-01)

Colour, font and spacing tokens are declared once in:

```text
src/theme/tokens.js
```

They are consumed by `tailwind.config.js`, the contrast gate and the
colour/type reference page at:

```text
/styleguide
```

Components must use token classes (for example `bg-primary-600`) and never
contain raw hex values.

Check token contrast (WCAG 2.1, minimum 4.5:1):

```bash
npm run check:contrast
```

The same command runs in CI and fails the pipeline when a declared
text/background pair drops below 4.5:1.

## Environment Variables

Create:

```env
.env
```

Example:

```env
VITE_API_URL=http://localhost:5173
```

---

## CI Pipeline

CI workflow location:

```text
.github/workflows/ci.yml
```

Pipeline currently performs:

- Install dependencies
- Colour contrast check (`npm run check:contrast`)
- Lint
- Tests with coverage
- Build validation

