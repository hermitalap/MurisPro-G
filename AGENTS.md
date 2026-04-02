# AGENTS.md - MurisPro (鼠管家)

## Project Overview

MurisPro is a local lab animal management system built with **Vue 3** (frontend) and **Flask** (backend), packaged as a desktop app via **pywebview**. It manages mouse colonies, cages, experiments, weight tracking, and survival analysis.

## Build & Run Commands

### Frontend (run from repo root)
```bash
npm install              # install dependencies
npm run serve            # start dev server (localhost:8080, proxies /api to :5000)
npm run build            # production build → dist/
```

### Backend (run from `backend/`)
```bash
# Windows
.venv\Scripts\python.exe app.py          # start Flask API on :5000
.venv\Scripts\python.exe main.py         # start desktop app (pywebview)

# macOS
.venv/bin/python app.py
```

### Packaging
```bash
npm run build
move dist ..\backend\        # Windows
mv -i dist ../backend/       # macOS
python build.py              # nuitka build (Windows)
python3 build_mac.py --disable-console --app-name "MurisPro_V3.1"  # macOS
```

### Testing & Linting
There are **no test suites or linters configured** in this project. No `jest`, `vitest`, `pytest`, `eslint`, or `ruff` setup exists. If you add tests, prefer `vitest` for frontend and `pytest` for backend. For linting, add `eslint` with the Vue plugin and `ruff` for Python.

## Code Style Guidelines

### Frontend (Vue 3 + JavaScript)

**Imports:**
- Vue APIs: `import { ref, computed, watch, onMounted } from 'vue'`
- Pinia stores: `import { defineStore } from 'pinia'` with Composition API (`setup`) style
- Path alias: use `@/` for `src/` (e.g., `import { useCageStore } from '@/stores'`)
- Naive UI: import components directly (e.g., `import { NButton, NInput } from 'naive-ui'`)
- Icons: `import { GridOutline } from '@vicons/ionicons5'`

**Vue Components:**
- Always use `<script setup>` with Composition API
- Props: `defineProps({ prop: { type: X, default: ... } })`
- Emits: `defineEmits(['event-name'])`
- Scoped styles with `<style scoped>`; use CSS custom properties from Naive UI theme (`var(--n-text-color)`, `var(--n-border-color)`, etc.)
- Global layout styles go in `src/views/styles/main.css`

**Pinia Stores:**
- Use setup store syntax: `defineStore('name', () => { ... return { ... } })`
- Create an axios instance per store with `baseURL: '/api'` and 60s timeout
- Each store exports a `loadInitialData` async function called at startup via `StoreUtils.initializeStores()`
- Store barrel file: `src/stores/index.js` re-exports all stores

**Naming:**
- Components: PascalCase filenames (`MouseDetailView.vue`)
- Stores: camelCase with `use` prefix (`useCageStore`)
- Variables/functions: camelCase (`fetchCages`, `activeSection`)
- API paths: snake_case (`/api/experiment-types`)

**Error Handling:**
- Wrap async API calls in try/catch; log with `console.error('描述:', error)`
- Show user-facing errors via Naive UI's `useMessage()` or `useDialog()`

### Backend (Flask + Python)

**Imports:**
- Standard library first, then third-party (`flask`, `pandas`, `sqlalchemy`), then local (`from models import ...`)
- Use `from flask import Flask, jsonify, request` style

**API Routes:**
- Prefix all routes with `/api/`
- Return `jsonify(data)` with appropriate HTTP status codes (201 for create, 204 for delete, 400/404/500 for errors)
- Use `query.get_or_404(id)` for single-record lookups
- Always wrap write operations in try/except; call `db.session.rollback()` on failure

**Models (SQLAlchemy):**
- All models in `backend/models.py` inherit from `db.Model`
- Use `to_dict()` methods for JSON serialization
- Relationships use `backref` with `cascade='all, delete-orphan'` where appropriate

**Naming:**
- Python functions: snake_case (`get_all_mice`, `add_weight_record`)
- Database columns: snake_case (`birth_date`, `live_status`)
- Model classes: PascalCase (`Mouse`, `WeightRecord`, `ExperimentType`)

**Logging:**
- Use `logger = logging.getLogger("Main")` (configured in `main.py`)
- Log errors with `logger.error(f"操作描述失败: {str(e)}")`

## Architecture Notes

- Frontend dev server (8080) proxies `/api` requests to Flask (5000) via `vue.config.js`
- In production, Flask serves the built `dist/` folder as static files
- `main.py` is the desktop entry point: starts Flask in a thread, then launches a pywebview window
- The app uses `createWebHashHistory` for routing (URLs use `#`)
- The `backend/` directory is mostly gitignored except `app.py`, `main.py`, `models.py`, `build.py`, `build_mac.py`
