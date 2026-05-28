# OneCare Frontend

## Overview

This repository contains the frontend application for the OneCare system.

Built using:

- React
- Vite
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
- Build validation

