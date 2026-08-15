# 🤖 AI Agent Developer Manual & Guardrails (AGENTS.md)

Welcome, AI Agent! This repository is a **YouTube Clone** web application. This document serves as your absolute operational guide. You must adhere strictly to the rules, directories, architectural patterns, and validation standards defined below to maintain codebase health.

---

## 📌 Project Context
*   **Project Nature:** Local Hobby Project (not planned for cloud deployment).
*   **Design Philosophy:** Simple, direct, local-first, highly type-safe. Avoid introducing cloud-native complexity (like AWS S3, serverless features, or Docker configurations) unless specifically requested.
*   **Functional Scope:** Mapped inside `repo/docs/mvp-functional-requirements.md`. Ensure any feature implementation matches the rules defined there.
*   **Restricted Directories:** Do NOT scan, read, write, or modify folders under `/Other Files` outside of the `/repo` directory. `/repo` is the absolute workspace root.

---

## 🚨 Critical Technical Guardrails (Do Not Break)

### 1. The Strict `.js` Extension ESM Rule
*   The project uses Node.js ES Modules (`"type": "module"` in `package.json`).
*   The TypeScript compiler is configured with `"module": "NodeNext"` and `"verbatimModuleSyntax": true`.
*   **Strict Rule:** Every relative import in TypeScript **must explicitly end with the `.js` or `.json` file extension** (even though the source file is `.ts`).
    *   ❌ **Incorrect:** `import app from './app';`
    *   ✅ **Correct:** `import app from './app.js';`
    *   ❌ **Incorrect:** `import { prisma } from '../lib/prisma';`
    *   ✅ **Correct:** `import { prisma } from '../lib/prisma.js';`

### 2. Custom Prisma Client Import Path
*   Prisma client generation path is customized in `schema.prisma` via `output = "../src/generated/client"`.
*   **Strict Rule:** Never attempt to import `PrismaClient` from the standard `@prisma/client` package.
    *   ❌ **Incorrect:** `import { PrismaClient } from '@prisma/client';`
    *   ✅ **Correct:** `import { PrismaClient } from '../generated/client/client.js';`
*   Always favor importing the shared singleton instance of Prisma from `src/lib/prisma.js`.

### 3. Database Schema Updates & Migrations
*   **Strict Rule:** To modify models, fields, or relationships in the database, you **must** use incremental migrations to preserve local development mock testing data:
    ```bash
    npx prisma migrate dev --name <migration_name>
    ```
    *(Note: Running this command will automatically apply the migration to the local DB and generate the updated client types behind the scenes).*
*   For non-database schema modifications (like adding custom client generators or formatting):
    ```bash
    npx prisma generate
    ```

### 4. BigInt JSON Serialization Trap
*   The PostgreSQL database schema utilizes `BigInt` (mapped to Prisma's `BigInt` type) for all unique IDs, counts, and foreign keys.
*   JavaScript's native `JSON.stringify` cannot automatically serialize `BigInt` values, which will trigger `TypeError: Do not know how to serialize a BigInt` runtime crashes in Express when returning query results.
*   **Strict Rule:** All agents must ensure that any query results returning `BigInt` fields are serialized (typically converting `BigInt` values to strings or mapping them) before passing them to Express response methods (like `res.json()`). This prevents runtime crashes while preserving ID precision on the client side.

### 5. PostgreSQL GIN & tsvector Limitations
*   The `search_vectors` model contains PostgreSQL `tsvector` types mapped via `Unsupported("tsvector")`.
*   Standard Prisma API queries cannot write or query this field natively. You must use raw SQL queries via `prisma.$queryRaw` for any complex text vector search functionality.

---

## 🏗️ Folder & Architecture Structure
You must structure the server code under `repo/server/src/` using a **Feature-Based (Module-Based) Architecture** to co-locate related logic:

```
repo/server/src/
├── config/               # Environment variables, CORS, global constants
├── lib/                  # Shared singletons (prisma.ts)
├── middlewares/          # Centralized middlewares (auth.ts, error.ts)
├── modules/              # Feature modules grouped by MVP requirements
│   ├── auth/             # Sign in/up, logout, password resets
│   ├── channels/         # Channel profiles, subscription, banners
│   ├── videos/           # Uploads, streaming, comments, likes
│   ├── playlists/        # Playlist CRUD, Watch Later, Liked Videos
│   ├── search/           # Search querying, GIN vectors, filters
│   └── studio/           # Studio dashboard, edit metadata, drafts
├── utils/                # Standard utility functions
├── app.ts                # Express application definition & route registration
└── index.ts              # Server startup & DB connection bootstrapping
```

### Module Folder Anatomy
Inside each subdirectory in `src/modules/`, you must maintain this precise file naming convention:
*   `[module].routes.ts` - Defines endpoints, registers middleware, and binds controller methods.
*   `[module].controller.ts` - Receives HTTP requests, performs input validation, calls service layer, and returns responses.
*   `[module].service.ts` - Houses core business logic and queries using the Prisma client.
*   `[module].types.ts` - Declares TypeScript interfaces or Zod schemas.

---

## 🛡️ Input Validation with Zod
*   We use **Zod** as our exclusive input and payload validator.
*   **Strict Rule:** When implementing or editing routes, you **must** define matching Zod schemas in the module's `[module].types.ts` file and perform body validation inside controllers before processing database logic.

---

## 🚨 Centralized Async Error Handling
*   The project utilizes **Express 5.x** (`"express": "^5.2.1"`).
*   In Express 5, async controllers natively support unhandled promise rejections and forward them directly to global error handlers.
*   **Strict Rule:** Centralize error handling using an Express global error-handler middleware and throwing a custom `AppError` class (representing specific HTTP status codes like `401`, `403`, `404`, etc.). Avoid writing manual, boilerplate `try-catch` blocks inside controllers.

---

## 🔑 Authentication & Upload Storage Choices

### Authentication
*   **Pattern:** JWT cookies using HttpOnly, secure options.
*   **Refresh Strategy:** Store refresh tokens in secure cookies and track session state against the `refresh_tokens` database table.

### Local Media Storage
*   **Pattern:** Local file storage handled via **Multer** middleware.

---

## 🛠️ Key CLI Commands

*   **Start Development Watcher:** `npm run dev`
*   **Build/Compile Typescript:** `npm run build`
*   **Generate Prisma Types:** `npx prisma generate`
*   **Apply DB Migrations:** `npx prisma migrate dev`

---

## 🔄 Refining this Manual
*   **Agent Rule:** This manual is a living document. If you discover any instructions in this file that are outdated, incorrect, or conflict with actual working implementations in the codebase, **do not blindly follow them.** Discuss the discrepancy with the user and propose a correction to this `AGENTS.md` file.

---

## 📋 Maintaining this Manual
*   **Agent Rule:** When you introduce a new global utility, add a new feature module, or finalize a specific global implementation pattern (such as the exact BigInt serialization wrapper, authentication middleware, or public upload directories), you **must** update this `AGENTS.md` file as part of your "Definition of Done" to keep it aligned with the codebase.

---

## ✅ Agent Definition of Done
Before requesting completion of any task, you must verify:
1.  **Typecheck:** Run `npx tsc --noEmit` and confirm there are zero compiling errors.
2.  **ESM Compliance:** Ensure all relative import statements have `.js` or `.json` extensions.
3.  **ORM Pathing:** Confirm all Prisma imports come from `../src/generated/client/client.js`.
4.  **Serialization Safeguard:** Ensure no raw BigInt types are returned directly to client JSON without global or manual string mapping.
5.  **No Dynamic Placeholders:** Ensure no temporary, unresolved, or boilerplate placeholders are left in the codebase.
