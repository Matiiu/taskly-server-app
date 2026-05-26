# Taskly Server App

Taskly is a NestJS backend exposing **REST** and **GraphQL** APIs for managing tasks and categories.

## Tech Stack

- NestJS
- GraphQL (code-first) with Apollo Server
- Prisma ORM
- PostgreSQL
- class-validator

## Environment

Copy `.env.example` to `.env` and update values as needed.

```bash
cp .env.example .env
```

## Install and Run

```bash
npm install
npx prisma generate
npm run start:dev
```

GraphQL playground: `http://localhost:3000/graphql`

## Scripts

```bash
npm run lint
npm run test
npm run test:e2e
npm run build
```
