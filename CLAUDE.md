# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — plataforma para jugar online y competir por puntos (Next.js app, App Router, TypeScript, Tailwind CSS v4). Currently a fresh `create-next-app` scaffold with no game/vault features implemented yet — `app/page.tsx` and `app/layout.tsx` are still default boilerplate.

## Commands

- `npm run dev` — start dev server (Next.js)
- `npm run build` — production build
- `npm run start` — run production build
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, extends `next/core-web-vitals` + `next/typescript`)

No test runner is configured yet.

## Architecture

- App Router under `app/`: `app/layout.tsx` is the root layout, `app/page.tsx` the home route. Global styles in `app/globals.css`.
- Path alias `@/*` maps to repo root (`tsconfig.json`).
- Static assets served from `public/`.
- This is a Next.js version with breaking changes vs. training data — before writing code, read the relevant guide under `node_modules/next/dist/docs/` (topics: `01-app`, `02-pages`, `03-architecture`, `04-community`) as instructed in AGENTS.md.

## Spec-driven workflow

This repo follows spec-driven design using the `/spec` and `/spec-impl` skills from https://github.com/Klerith/fernando-skills (install via `npx skills@latest add Klerith/fernando-skills`). Use these commands for planning and implementing features when available.
