# AI Library — Project Plan

> Upgrade of my existing animated Book Management website (Next.js, frontend only, currently using dummy data) into a full-stack, AI-powered portfolio project.
> Target role: **MERN Stack + Python AI Engineer**
> Stack for this project: **Next.js (frontend) + Python FastAPI (entire backend) + MongoDB Atlas**

---

## 1. Goal

Turn the existing frontend into a complete product that shows three things a hiring manager looks for:

1. **Frontend skill.** The existing Next.js UI with animations, connected to a real backend.
2. **Python backend + AI engineering.** A single FastAPI service that handles auth, book CRUD and every AI feature.
3. **Production thinking.** Model fallback, caching, rate limiting, evals and a zero-cost setup.

The existing UI and animations stay as they are. The dummy data will be replaced with real API calls to FastAPI. The UI-level implementation plan will be decided after reviewing the current frontend code.

> Portfolio note: the MERN (Express) side of my skill set is covered by a separate project (the support-bot builder). This project focuses on Python.

---

## 2. Feature List

| # | Feature | What it does | Skill it proves |
|---|---------|--------------|-----------------|
| 1 | Book CRUD + Auth | Add, edit, delete and list books; user login (JWT) | REST APIs in FastAPI, auth, MongoDB |
| 2 | Semantic Search | Natural-language search like *"a sad sci-fi book like Dune"* | Embeddings, vector search |
| 3 | AI Recommendations | "Because you liked X, try Y", based on the user's library | Embeddings + LLM reasoning |
| 4 | Ask My Library (chat) | Chat about your own books, with answers grounded in your data (RAG) | RAG, streaming responses |
| 5 | AI Book Summaries & Tags | Auto-generates a short summary, genre and mood tags when a book is added | Structured output (JSON) |
| 6 | MCP Server | Exposes the library as tools (search, add, recommend) so any AI agent can manage the library | MCP, agent tooling |
| 7 | Model Status Panel *(optional)* | Shows which LLM answered each request and fallback events | Observability |

---

## 3. High-Level Architecture

```
Next.js (existing animated UI — frontend only)
        │  HTTP (REST + streaming)
        ▼
Python FastAPI Backend (single service)
        │
        ├── Auth + Book CRUD  ──► MongoDB Atlas (books, users, vectors)
        ├── LiteLLM Router    ──► Groq → Gemini → Cerebras → OpenRouter
        ├── Embeddings        ──► Gemini embeddings (fallback: local Ollama)
        └── MCP Server (FastMCP) ──► exposes library tools to AI agents
```

**Responsibilities**
- **Next.js:** UI, animations and pages. It calls the FastAPI endpoints instead of using dummy data. It contains no backend logic.
- **FastAPI:** everything on the backend, including auth (JWT), book CRUD, LLM calls, embeddings, RAG, recommendations, tagging and the MCP server.
- **MongoDB Atlas:** a single database for app data *and* vectors (Atlas Vector Search, free tier).

---

## 4. LLM Strategy (100% Free Tier)

### 4.1 Gateway: LiteLLM
- Installed as a Python package: `pip install litellm`
- Uses the **LiteLLM Router** with a fallback chain.
- When a provider returns a rate-limit or error, the next one is tried automatically.
- The quota is **not unlimited**. The total available is the sum of all the free quotas, and most of them reset daily.

### 4.2 Models

> Model IDs change often. Verify the current free model IDs on each provider's models page before implementing.

| Priority | Provider | Model (verify ID) | Used for |
|----------|----------|-------------------|----------|
| 1 | Groq | `openai/gpt-oss-120b` | Default chat, recommendations (fast) |
| 1b | Groq | `llama-3.1-8b-instant` | Cheap, simple tasks: tagging, short summaries (high daily limit) |
| 2 | Google Gemini (AI Studio) | Current free **Gemini Flash** model (e.g. `gemini-2.5-flash`) | Long context, harder reasoning, fallback #1 |
| 3 | Cerebras | `gpt-oss-120b` | Fallback #2 (large daily token volume) |
| 4 | OpenRouter | Any model ending in `:free` | Last-resort backup (~50 requests/day) |

### 4.3 Task-Based Routing

| Task | Primary | Fallbacks |
|------|---------|-----------|
| Tagging / summaries | Groq small model | Gemini → OpenRouter |
| Chat / RAG answers | Groq gpt-oss-120b | Gemini → Cerebras → OpenRouter |
| Complex reasoning / long books | Gemini Flash | Groq → Cerebras |

### 4.4 Embeddings & Vector Search
- **Embeddings:** Gemini embedding model (free tier). Local fallback: `nomic-embed-text` via Ollama, used during development only.
- **Vector DB:** MongoDB Atlas Vector Search (free M0 cluster, 512 MB).
- Use **one embedding model consistently**. Vectors from different models cannot be mixed in the same index.

### 4.5 Accounts & Keys
- One free account per provider: Groq, Google AI Studio, Cerebras and OpenRouter.
- Keys are stored in the FastAPI project's `.env` and **never committed**. `.env` goes in `.gitignore`, and a `.env.example` file lists the required variable names.
- API keys stay on the backend only. They must never be placed in the Next.js frontend.

### 4.6 Free-Tier Safety Rules
- No credit card or billing account on any provider.
- Gemini keys are created in **Google AI Studio** only, with no billing linked.
- OpenRouter is used only with `:free` models; no credits are purchased.
- Groq stays on the Free Plan.
- Hitting a limit should produce a rate-limit error, which triggers fallback. It should never produce a bill.

### 4.7 Protecting the Live Demo
- **Response caching** for repeated questions and for summaries that have already been generated.
- **Per-visitor rate limiting** on the FastAPI endpoints.
- **Graceful message** ("Demo is busy, try again shortly") when all providers are exhausted.
- **Logging** of which model served each request (for the Model Status Panel).

---

## 5. Quality & Evals

- A small `evals/` folder containing a test set of 20–30 search and chat questions with their expected results.
- **Metrics:**
  - Search relevance: is the right book in the top 3?
  - Answer grounding: does the answer only use the user's books?
  - Fallback success rate.
  - Average latency.
- The results table is published in the README. This is a strong portfolio signal.

---

## 6. Deliverables

1. Working full-stack app (deployed with a live demo URL).
2. FastAPI backend with auth, CRUD, AI features and LiteLLM fallback.
3. MCP server that can be connected to an AI agent client.
4. README with an architecture diagram, setup steps, eval results and screenshots/GIFs.
5. 60-second demo video.
6. **`CODE_OVERVIEW.md`** (see Section 8).

---

## 7. Out of Scope (for now)

- Detailed UI implementation plan. This will be decided after reviewing the existing Next.js frontend code.
- A Node.js/Express backend. MERN is covered by a separate portfolio project.
- Paid models or paid infrastructure.
- Fine-tuning models.

---

## 8. Required After Implementation: `CODE_OVERVIEW.md`

> **Instruction for whoever implements this project:** once the project is fully implemented, create a file named `CODE_OVERVIEW.md` in the repo root. It must explain the whole codebase clearly enough that I can answer any interviewer question about it.

### Required structure

#### 8.1 Project Summary
- What the project does, in 3–5 sentences.
- The problem it solves and who it is for.
- Final architecture diagram.

#### 8.2 Frontend (Next.js)
- **Folder & file map.** Every important file (pages/app routes, components, hooks, lib/services), with a one-line explanation of its use case.
- **Packages used.** Each package with *why* it was chosen (e.g. animation library, state management, HTTP client, UI library).
- **Components.** The purpose of each major component, its props, and its state.
- **Key methods / hooks.** Name, what it does, inputs and outputs.
- **API service layer.** Which FastAPI endpoints each service function calls, and how the dummy data was replaced.
- **State & data flow.** How data moves from the API to the UI, including loading/error states and streaming chat.
- **Auth handling.** How the JWT is stored and sent with requests.
- **Next.js concepts used in this project.** For each concept from Section 9 that the code actually uses, give the file where it's used and a one-line explanation of why.
- **Next.js concepts used in this project.** For every concept from Section 9 that the code actually uses, show the exact file where it's used and explain why.

#### 8.3 Backend (Python FastAPI)
- **Folder & file map.** Routers, models/schemas, services, core/config, MCP server, evals — each with its use case.
- **Packages used.** For example fastapi, uvicorn, pydantic, pymongo/motor, litellm, fastmcp, python-jose/pyjwt, passlib/bcrypt, python-dotenv, rate-limiting library — each with its purpose.
- **API endpoints table.** Method, route, purpose, auth required (yes/no), request body and response.
- **Pydantic schemas.** Request/response models and their fields.
- **Database models.** MongoDB collections, document fields and indexes, including the vector index.
- **Auth & middleware.** JWT creation/verification, password hashing, CORS, error handling, rate limiting.
- **LiteLLM Router config.** Models, fallback order, and the reason for that order.
- **AI pipelines, explained step by step:**
  - Semantic search flow
  - RAG chat flow
  - Recommendation flow
  - Auto-tagging flow
- **MCP server.** The tools exposed, their inputs and outputs, and how to connect a client.
- **Key methods.** Name, purpose, inputs, outputs.

#### 8.4 Services & Infrastructure
- External services used (MongoDB Atlas, Groq, Gemini, Cerebras, OpenRouter, hosting for frontend and backend), with the role of each.
- Environment variables for frontend and backend (names only, never values).
- How to run locally and how it's deployed.

#### 8.5 End-to-End Request Flow
- One full walkthrough: *user types a search query → Next.js → FastAPI → embeddings → Atlas Vector Search → LLM → response back to UI*.

#### 8.6 Design Decisions & Trade-offs
- Why Next.js is used as frontend only, with FastAPI as the single backend.
- Why MongoDB Atlas is used for vectors instead of a separate vector DB.
- Why LiteLLM, and why this fallback order.
- Limitations of free tiers and how they were handled.

#### 8.7 Interview Q&A Prep
- 15–20 likely interviewer questions about this project, each with a clear, short answer. Examples:
  - "Why did you choose FastAPI instead of Node.js for the backend?"
  - "How does your fallback work when a model hits its rate limit?"
  - "What are embeddings and why did you need them?"
  - "How do you stop the LLM from making up books?"
  - "What is MCP and what tools does your server expose?"
  - "How does authentication work between Next.js and FastAPI?"
  - "How would you scale this if it had 10,000 users?"
  - "How did you measure answer quality?"

---

## 9. Next.js Concepts: What's Different from React

> I know React.js well, but I'm new to Next.js. This section lists what Next.js adds or changes compared with plain React, for both learning and interview prep.
> Everything I already know (components, props, state, hooks, JSX, context) works the same way in Next.js.

### 9.0 First Step: Check Which Router the Project Uses
- **App Router:** an `app/` folder with `page.js` / `layout.js` files. This is the modern default.
- **Pages Router:** a `pages/` folder. This is the older style.
- The concepts below assume the **App Router**. If the project uses the Pages Router, the equivalents are noted.

### 9.1 Routing (File-Based)
| Plain React | Next.js |
|-------------|---------|
| React Router: `<Routes>`, `<Route path="/books">` | Folders define routes: `app/books/page.js` → `/books` |
| `path="/books/:id"` | Dynamic folder: `app/books/[id]/page.js` → `/books/123` |
| `useParams()` from react-router | The `params` prop in the page, or `useParams()` from `next/navigation` |
| `useNavigate()` | `useRouter()` from `next/navigation` (`router.push('/books')`) |
| `<Link to="/books">` | `<Link href="/books">` from `next/link` |
| `useLocation()` | `usePathname()` and `useSearchParams()` |

**Interview Q:** *"How does routing work in Next.js?"*
**A:** Routing is file-based. Each folder inside `app/` becomes a URL segment, and a `page.js` file makes it a visible page. Square-bracket folders like `[id]` create dynamic routes. There's no router configuration to write.

### 9.2 Layouts
- `app/layout.js` is the **root layout**. It wraps every page and holds things like the navbar, footer, fonts and global providers.
- Nested `layout.js` files wrap only their section. For example, `app/dashboard/layout.js` adds a sidebar to dashboard pages only.
- Layouts **don't re-render** when you navigate between their child pages, so shared state like the navbar is preserved.
- *Pages Router equivalent:* `_app.js` and `_document.js`.

**Interview Q:** *"What's the difference between layout.js and page.js?"*
**A:** `page.js` is the unique content of a route. `layout.js` is the shared wrapper around pages in that folder, and it stays mounted during navigation.

### 9.3 Server Components vs Client Components (the Biggest Difference)
- In the App Router, **every component is a Server Component by default**. It runs on the server, sends HTML to the browser, and ships no JavaScript for itself.
- Add `"use client"` at the **top of a file** to make it a **Client Component** (normal React that runs in the browser).
- **You need `"use client"` when the component uses:**
  - `useState`, `useEffect`, `useRef`, or any hook
  - Event handlers (`onClick`, `onChange`)
  - Browser APIs (`window`, `document`, `localStorage`)
  - **Animation libraries** like Framer Motion or GSAP. This matters for my animated UI.
- **Server Components can:** fetch data directly, use secrets safely, and reduce bundle size.
- Good practice is to keep `"use client"` as low in the component tree as possible. Make only the interactive parts client components.

**Interview Q:** *"What are Server Components, and when do you use 'use client'?"*
**A:** Server Components render on the server and send no JavaScript to the browser, which makes pages faster. I add `"use client"` only to components that need interactivity, such as state, effects, event handlers, browser APIs or animations.

### 9.4 Rendering Strategies
| Strategy | What it means | When to use |
|----------|---------------|-------------|
| **CSR** (Client-Side Rendering) | Browser builds the page with JS (how plain React works) | Highly interactive parts, user-specific dashboards |
| **SSR** (Server-Side Rendering) | HTML generated on the server for **every request** | Data that changes often and needs SEO |
| **SSG** (Static Site Generation) | HTML generated **once at build time** | Content that rarely changes (landing page, about page) |
| **ISR** (Incremental Static Regeneration) | Static page that **re-generates every N seconds** | Mostly static content that updates sometimes |

- Plain React (Vite or Create React App) only does **CSR** by default. Next.js lets you choose **per page**.

**Interview Q:** *"What's the difference between SSR and SSG?"*
**A:** SSR builds the HTML on every request, so the data is always fresh but the server does more work. SSG builds the HTML once at build time, which makes it very fast, but the data can be stale until the next build. ISR is the middle ground: static pages that refresh on a timer.

### 9.5 Data Fetching
- **Plain React:** fetch inside `useEffect`, store the result in `useState`, and handle loading yourself.
- **Next.js Server Components:** you can `await fetch()` directly in an `async` component, with no `useEffect` needed.
- **Next.js Client Components:** same as React (`useEffect`, or libraries like SWR / React Query).
- **In this project:** user-specific data (my books, chat, recommendations) comes from FastAPI with the user's JWT, so it is mostly fetched in **client components**.
- *Pages Router equivalent:* `getServerSideProps` (SSR) and `getStaticProps` (SSG).

### 9.6 Special Files in the App Router
| File | Purpose |
|------|---------|
| `page.js` | The UI for a route |
| `layout.js` | Shared wrapper for a route and its children |
| `loading.js` | Automatic loading UI while the page loads (uses React Suspense) |
| `error.js` | Error boundary for that route (must be a client component) |
| `not-found.js` | Custom 404 page |
| `route.js` | API endpoint (Route Handler). **Not used in this project**, because FastAPI is the backend |

### 9.7 Built-in Components & Optimizations
- **`next/link`**: client-side navigation with automatic **prefetching** of linked pages.
- **`next/image`**: automatic image optimization (resizing, lazy loading, modern formats). It needs `width`/`height`, or `fill`.
- **`next/font`**: loads fonts with no layout shift and no external request at runtime.
- **Metadata API**: `export const metadata = { title, description }` in a page or layout handles SEO tags. It replaces manually managing `<head>` (or using `react-helmet` in React).

**Interview Q:** *"Why use next/image instead of a normal img tag?"*
**A:** It automatically resizes and compresses images, lazy-loads them, serves modern formats like WebP, and prevents layout shift. That improves performance and Core Web Vitals.

### 9.8 Environment Variables
- Variables are read from `.env.local`.
- **Only variables starting with `NEXT_PUBLIC_` reach the browser.** For example, `NEXT_PUBLIC_API_URL=http://localhost:8000` holds the FastAPI URL.
- Anything without the prefix stays on the server only.
- **Never put LLM API keys in the frontend.** They live only in FastAPI's `.env`.
- *React (Vite) equivalent:* the `VITE_` prefix.

### 9.9 Hydration (Common Bug and Interview Topic)
- **Hydration** is when React in the browser "attaches" event handlers and interactivity to the HTML that the server already rendered.
- A **hydration error** happens when the server HTML and the first client render don't match. Common causes:
  - Using `window`, `localStorage`, `Date.now()` or `Math.random()` during render.
  - Rendering different content on the server and the client.
- **Fixes:**
  - Read browser-only values inside `useEffect`.
  - Use dynamic import with `ssr: false` for browser-only components.

**Interview Q:** *"What is a hydration error and how do you fix it?"*
**A:** It's a mismatch between the HTML rendered on the server and what React renders first in the browser. I fix it by moving browser-only code into `useEffect`, or by loading that component only on the client.

### 9.10 Middleware
- A `middleware.js` file at the project root runs **before a request reaches a page**.
- It's commonly used for **protecting routes**, such as redirecting users who aren't logged in away from `/dashboard`.
- **In this project:** it may be used to protect logged-in pages. Real auth checks still happen in FastAPI.

### 9.11 Build & Deployment
- `npm run dev` starts development mode; `npm run build` then `npm start` runs production.
- `next build` shows each route as **Static** or **Dynamic**, which is useful to mention in interviews.
- Deployment is easiest on **Vercel** (made by the Next.js team). The FastAPI backend is hosted separately.

### 9.12 Quick Summary: React vs Next.js
| Topic | React (Vite) | Next.js |
|-------|-------------|---------|
| What it is | UI library | Full framework built on React |
| Routing | React Router (manual) | File-based (automatic) |
| Rendering | CSR only | CSR, SSR, SSG and ISR per page |
| Components | All run in the browser | Server by default; `"use client"` for browser |
| SEO | Weaker (empty HTML at first) | Strong (HTML sent from server) |
| Images / fonts | Manual | `next/image`, `next/font` |
| Backend | None | Optional Route Handlers (not used here) |
| Env prefix | `VITE_` | `NEXT_PUBLIC_` |

### 9.13 Extra Interview Questions to Prepare
- "Why did you use Next.js instead of plain React for this project?"
- "Your app uses animations. How did you handle them with Server Components?"
- "Why does your frontend call FastAPI instead of using Next.js API routes?"
- "How do you protect pages that need login?"
- "Which of your pages are static and which are dynamic, and why?"
- "How did you avoid exposing API keys in the frontend?"

> **Instruction for whoever implements this project:** in `CODE_OVERVIEW.md` (Section 8.2), map each of these concepts to the actual files where it is used, and answer the questions in 9.13 based on the real implementation.
