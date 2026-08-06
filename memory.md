# 🧠 nxFormsUI — Project Memory

This file serves as a persistent memory of the **nxFormsUI** codebase, its directory structure, technology stack, environment configurations, and a chronological log of changes we introduce during development.

---

## 📌 Project Overview
**nxFormsUI** is an enterprise-grade Label Configuration & Determination Management platform. It enables dynamic management of label templates, ZPL/XDP generation, simulation testing, image retention, and printer routing.

*   **Frontend**: React 18, Vite, TypeScript, TailwindCSS v3, Radix UI (Shadcn UI), and SAP UI5 Web Components for React (`@ui5/webcomponents-react`).
*   **Backend (nxFormsNode)**: Express.js (Express v5) backend in TypeScript that exposes REST endpoints for auth, label rules, printer routing, and PDF/ZPL rendering/simulations.
*   **Database**: PostgreSQL (uses `pg` client, supports SSL and audit tracking schemas).
*   **Special Integrations**:
    *   **Puppeteer** for automated PDF generation and print worker jobs.
    *   **Sharp / pdf-to-png-converter** for image retention processing.
    *   **Google Gemini** for LLM assistance with document analysis.

---

## 📂 Project Directory Structure

```
nxFormsUI/
├── nxFormsNode/                    # Express Node.js Backend Server
│   ├── src/
│   │   ├── db/                     # DB migration & table initialization scripts
│   │   ├── helper/                 # Helper utilities
│   │   ├── legacyRoutes/           # Settings, Analyze, DB, and ZPL/XDP render endpoints
│   │   ├── middleware/             # Auth/Security middleware
│   │   ├── routes/                 # Express API resource routing (auth, events, logs, contexts, etc.)
│   │   ├── services/               # Core business services
│   │   ├── utils/                  # Cryptography, JWT, and LLM utilities
│   │   ├── workers/                # Background job queue runners (e.g. printWorker.ts)
│   │   ├── db.ts                   # PostgreSQL client pool configuration with SSL handling
│   │   └── server.ts               # Server startup, HTTPS fallback, and API router routing
│   ├── static/                     # Directory to house frontend static assets (SPA Index)
│   ├── Dockerfile                  # Container definition for the Node backend
│   ├── package.json                # Node dependencies and build scripts
│   └── tsconfig.json               # Backend TypeScript configuration
├── src/                            # React 18 Frontend
│   ├── components/                 # Reusable UI component library (Shadcn, UI5 Web Components, Print Agent)
│   ├── hooks/                      # Custom hooks (e.g., useCustomFonts)
│   ├── lib/                        # Backend communication services & axios wrappers (e.g. api, legacyApiBase)
│   ├── pages/                      # Application route views (e.g., Dashboard, Settings, Simulations, Templates)
│   ├── client.tsx                  # Hydration launcher
│   └── styles.css                  # Global CSS, fonts, and tailwind configurations
├── public/                         # Public assets served by Vite
├── Dockerfile                      # Root multi-stage container deployment file
├── tailwind.config.ts              # TailwindCSS config
├── package.json                    # Frontend dependencies and dev scripts
└── vite.config.ts                  # Vite compilation config
```

---

## ⚙️ Environment Configuration (`.env`)

The project references environmental variables across the React UI client (Vite environment) and the Node Express server.

### 1. Frontend Environment Variables (`import.meta.env`)

Defined in the root `.env` / `.env.local` files, prefixed with `VITE_`:

| Variable | Type | Expected / Default Value | Description |
| :--- | :--- | :--- | :--- |
| `VITE_NODE_API` | String | e.g. `http://localhost:4000` | Base URL endpoint for the `nxFormsNode` backend Express API. |
| `VITE_FLASK_API` | String | e.g. `http://localhost:5050` / `http://localhost:5000` | Base URL endpoint for companion Python/Flask services (used in template identification, printers, and fonts). |
| `VITE_DEV_EMAIL` | String | Optional email | Autologin developer bypass email. |
| `VITE_DEV_PASSWORD` | String | Optional password | Autologin developer bypass password. |

### 2. Backend Environment Variables (`process.env`)

Defined in the `nxFormsNode/.env` file:

| Variable | Type | Expected / Default Value | Description |
| :--- | :--- | :--- | :--- |
| **Server & SSL** | | | |
| `PORT` | Number | `4000` | Port for the Express backend API listener. |
| `SSL_KEY_PATH` | Path | Optional file path | Absolute path to SSL Key file for HTTPS server creation. |
| `SSL_CERT_PATH` | Path | Optional file path | Absolute path to SSL Certificate file for HTTPS server creation. |
| `SSL_CA` | Path | Optional file path | Root certification authority certificate for SSL verification. |
| `REJECT_UNAUTHORIZED`| Boolean | `true` | Set to `false` to disable SSL certificate verification warnings. |
| **Database Connection** | | | |
| `DATABASE_URL` | String | `postgres://...` | Connection URI for the PostgreSQL instance. **(Required)** |
| `DB_SSL_CA` | Path | Optional file path | File path to database server SSL Certificate Authority. |
| `DB_SSL` | Boolean | `false` | Set to `true` to force SSL strict verification without a custom CA file. |
| **Integrations & Settings**| | | |
| `GEMINI_API_KEY` | String | Google AI Studio Key | API token to access Gemini model endpoints for intelligence routing. |
| `PUPPETEER_EXECUTABLE_PATH`| Path | Path to chrome/chromium | Override path to the browser executable utilized by Puppeteer print runs. |
| `DATA_ENC_KEY` | String | Hex string | Key used to encrypt/decrypt data records. |
| `JWT_SECRET` | String | `label-config-secret-key-2024` | Secret phrase utilized to generate and verify client JWT session tokens. |
| `MAX_RETRIES` | Number | `3` | Maximum retry count for print workers when processing queue items. |

---

## 🛠️ Memory Log & Change History

### Initial Analysis (August 3, 2026)
*   Scanned `nxFormsUI` repository structure and identified the main components (Vite/React frontend + `nxFormsNode` backend).
*   Identified database connectivity via PostgreSQL using `DATABASE_URL` and SSL options in `nxFormsNode/src/db.ts`.
*   Mapped all recognized environment variables from the codebase (both `import.meta.env` and `process.env`).
*   Created this `memory.md` file in the workspace root to serve as our project knowledge center.

### Environment Alignment (August 3, 2026)
*   Connected to the production EC2 instance (`ec2-3-236-229-60.compute-1.amazonaws.com`) via SSH and inspected the active backend container (`node-backend`).
*   Extracted the live database credentials and environment secrets.
*   Verified local connectivity to the remote database port (`5432` on public IP `3.236.229.60`) is active and reachable.
*   Created a local backend `.env` configuration (`nxFormsNode/.env`) pointing to the remote DB.
*   Created a local root `.env` configuration (`.env`) for Vite frontend proxy resolution.

### Handlebars Repeating Tables and Loops (August 3, 2026)
*   Installed `handlebars` in the backend workspace (`nxFormsNode`).
*   Updated the image-to-HTML replication LLM prompt in `replicateInvoice.ts` to instruct the model to produce standard flow tables with headers repeating inside `<thead>` and footers inside `<tfoot>`, using Handlebars loops (`{{#each}}`) for dynamic rows.
*   Updated the template preview compiler in `replicateInvoice.ts` to render using Handlebars and structured mock nested data.
*   Refactored `renderHtml` in `printWorker.ts` to compile templates with Handlebars and fallback gracefully to the original RegExp substitution code upon errors to maintain backward-compatibility.

### Local Routing Alignment (August 3, 2026)
*   Identified that template generation endpoints (`/replicate-invoice`, `/analyze-label`, etc.) are resolved on the Node backend rather than a separate Flask backend.
*   Updated the root `.env` configuration to direct `VITE_FLASK_API` to `http://localhost:4000` (alongside `VITE_NODE_API`), resolving the "backend is not reachable" error during local template design creation.

### Prompt Refinement for Pixel-Perfect Repeating Layouts (August 3, 2026)
*   Refined the LLM prompt (`PROMPT_PRECISION` in `replicateInvoice.ts`) to merge absolute positioning for document header/footer elements (logo, client meta, etc.) within fixed-position containers (`position: fixed`) with a dynamic flow table, resolving the loss of pixel-perfect coordinates.

### LLM JSON Output Auto-Repair (August 3, 2026)
*   Implemented a custom string-aware `repairJson` utility in `llmUtils.ts`.
*   Integrated the auto-repair utility inside the JSON parsing try-catch blocks within `callLLM`, automatically resolving trailing commas, reconstructing incomplete/truncated JSON structures, and filtering out unmatched/extra closing brackets (e.g. extra curly braces) returned by LLM agents.

### Properties Inspector Control Relocation (August 3, 2026)
*   Removed the absolute-positioned floating editor toolbar from the template adaptation step canvas (`TemplateAdapt.tsx`).
*   Merged the editor actions (Undo, Redo, Delete selected, Reset canvas, and inline text editing) directly into a dedicated "Editor Controls" card in the right sidebar's Properties Inspector.
*   Verified frontend application compiled successfully and actions performed correctly.

### Preservation of Replica Layout Styles (August 3, 2026)
*   Identified that the LLM response generated under `PROMPT_PRECISION` included document layout and pagination rules in a `<style>` stylesheet block inside the HTML `<head>`.
*   Found that `stripHtmlWrappers` in `replicateInvoice.ts` was discarding the `<style>` block when extracting the wrapper `<div>`, stripping the layout coordinate styling from the replica.
*   Modified `stripHtmlWrappers` to extract, preserve, and prepend all `<style>` tags to the matched HTML body wrapper to keep full layout styling, coordinates, and pixel-perfection.
*   Identified that the frontend utility `annotateHtmlPlaceholders` inside `TemplateAdapt.tsx` parsed the HTML template through the browser's `DOMParser`, which placed style blocks in the parsed document's `<head>`. Since the function only returned `doc.body.innerHTML`, the styles were stripped out on load.
*   Modified `annotateHtmlPlaceholders` to capture all `<style>` elements in the parsed document and prepend them to the body content string to keep full editor stylesheet rules intact.

### Truncation Prevention in LLM Layout Analysis (August 3, 2026)
*   Configured the Gemini generation config in `llmUtils.ts` to set `maxOutputTokens: 8192` (raising it from default API limits), giving the model enough headroom to output complete, large JSON structures.
*   Optimized `PROMPT_ANALYSIS` in `analyze.ts` to explicitly instruct the model to only transcribe the first 2 rows of any detected table. Since the frontend only reads the first row for schema mapping, this reduces token output requirements by up to 90% for large documents, preventing truncation errors.

### Constraints on Fixed Layout Elements (August 3, 2026)
*   Identified that elements with `position: fixed` (like template headers and footers) were defaulting to the browser viewport as their containing block, causing them to float out of the design canvas container and overlay the web application layout.
*   Added CSS rules targeting `@media screen` to apply `transform: translate(0, 0) !important` to page wrappers (`.pdf-page-wrapper` and `[data-editor-container]`). This establishes them as local containing blocks on screen media, constraining headers/footers to their respective page bounds while preserving standard page-fixed printing behaviors.

### Production EC2 Instance Deployment (August 3, 2026)
*   Synchronized all local changes (frontend canvas editor controls, backend Handlebars loop integration, layout style extraction, and JSON repair) with the EC2 production instance using SSH/SCP.
*   Aligned environment variables by writing a `.env` file on the EC2 host containing database connection strings and JWT credentials.
*   Modified backend `Dockerfile` to inject `ENV PUPPETEER_SKIP_DOWNLOAD=true` in Stage 1, skipping Chromium package download on `npm ci` to conserve disk space and speed up builds.
*   Reclaimed 1.74GB of host storage by pruning unused build caches and dangling container layers on the EC2 host.
*   Successfully compiled and ran the updated docker images (`mfa-node-backend` and `mfa-react-ui`) as active production containers on the instance.
*   Identified that the host Nginx proxy is configured to route `/node/` requests to `http://localhost:4000/`.
*   Aligned frontend environment variables `VITE_NODE_API` and `VITE_FLASK_API` to `/node` and registered a local dev proxy rule in `vite.config.ts` for relative compatibility.
*   Recompiled and redeployed the frontend assets, verifying that the dashboard and API requests load successfully with `200 OK` JSON payloads.

