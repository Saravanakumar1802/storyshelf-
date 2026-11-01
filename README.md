# StoryShelf: publisher + AI library

A premium, animated website for StoryShelf, a publishing house for authors, with a free **AI library** of real public-domain classics. The site (Next.js 16, static export) talks to a FastAPI backend in [`backend/`](backend/README.md): accounts, books and an in-app reader, AI search, mood picks, Ask My Library, an MCP server, publishing requests, support and an admin console. LLMs run on free tiers with automatic fallback; everything that doesn't need a model (reading, search, similar books, recommendations' ordering, the passages behind every answer) works with no keys at all.

- How it fits together: [CODE_OVERVIEW.md](CODE_OVERVIEW.md)
- Going live: [DEPLOY.md](DEPLOY.md)

## Run it

```bash
# 1. the API (see backend/README.md for .env)
cd backend && python -m uv sync && python -m uv run uvicorn app.main:app --port 8000

# 2. the site, in another terminal
npm install
echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local
npm run dev          # http://localhost:3000
```

Accounts: the demo author `demo@storyshelf.in` / `publish123`; the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `backend/.env`; readers sign up. Every section is on (`src/config/features.ts` holds the flags).

## What's inside

| Area | Routes |
|---|---|
| Marketing | `/` (3D bookshelf hero + scroll story), `/services`, `/services/[slug]`, `/plans`, `/about`, `/awards`, `/contact` |
| AI Library | `/library` (browse, search by meaning, mood picker), `/library/[slug]` (static book pages with AI insights and "similar in spirit"), `/library/view?book=` (books added after the build), `/library/read` (reader with chapter summaries), `/library/shelf` (My Library + "because you read"), `/library/ask` (Ask My Library, streamed with citations), `/library/connect` (MCP tokens for your own AI assistant) |
| AI status | `/ai`: every model, its health, fallbacks and the live call log |
| Publish | `/publish/how-it-works`, `/publish/self-publishing-guide`, `/publish/book-design`, `/publish` (6-step wizard: server-priced quote, live consultation diary), `/publish/success` |
| Author dashboard | `/login`, `/signup`, `/dashboard` (the request's real stage), `/dashboard/books`, `/dashboard/royalties`, `/dashboard/marketing`, `/dashboard/support` |
| Support | `/support`, `/support/faq`, `/support/guides/[slug]`, `/support/ticket` (signed in; threaded replies), `/support/consultation`, and the AI help bubble |
| Admin | `/admin`: library stats, Gutenberg imports (licence-checked background jobs), hide/publish books, publishing stages, tickets and messages, roles |

## Change the theme (one line)

Everything visual comes from **`src/theme/`**:

- **`src/theme/index.ts`**: `ACTIVE_THEME = "midnightLibrary"`. Switch it to `"lightEditorial"`, or add your own theme object, to re-theme the whole site, including the 3D lights, shelf, wordmark and book cloth colours.
- **`src/theme/themes.ts`**: the theme objects (colours, plan colours, radii, shadows, motion, and the 3D `scene`).
- **`src/theme/fonts.ts`**: typography.

Components never hard-code colours. CSS uses the generated `--c-*` variables, mapped to Tailwind utilities such as `bg-surface` and `text-accent`. 3D code reads `useTheme()`.

## The 3D bookshelf

- **`src/lib/three/bookGeometry.ts`** builds procedural, to-scale geometry for a cased book: a rounded spine, hinge grooves, bevelled boards, a concave fore-edge text block and headbands. The front board is separate, so it can open.
- **`src/lib/cover/paint.ts`** is a canvas painter. It prints each book's full case (back | spine | front) with foil roughness/metal maps, wear, an EAN-13 barcode, and so on. The same painter produces the 2D covers used in the store, so 2D and 3D always match.
- **`src/components/three/`** contains the scene: lights, reflective walnut ledge, wordmark, depth of field, ambient occlusion and bloom. It also holds the hover/pull/feature choreography, drag-to-turn, quality tiers, context-loss recovery and a CSS fallback shelf when WebGL is unavailable.

Book data (titles, trim sizes, page counts, finish, swatch) lives in `src/data/books.ts`. Covers are currently generated. Supporting real cover artwork later means adding an image field there and drawing it in the painter's front/back/spine regions.

## Opening intro and page scenes

- **Opening intro** (`src/components/intro/`, `src/components/three/scenes/IntroBook.tsx`): a full-screen WebGL hardcover, built from the same procedural book model as the shelf.
  - **Sequence:** it rises into place, opens its cover on the spine hinge with a weighted settle, and riffles 16 instanced pages. The pages bend in the vertex shader (`src/lib/three/leaves.ts`) and cast real shadows. It holds on the title page; the camera then dives in, and the page parts at the gutter to reveal the site.
  - **Choreography:** a deterministic GSAP timeline.
  - **Loading:** a server-rendered poster shows instantly while the 3D loads.
  - **Fallbacks:** without WebGL, on weak devices, or if the scene isn't ready within 6.5s, a CSS-3D book plays instead. The overlay always hands over within 13s.
  - **When it plays:** once per browser session (`<html data-intro>` is set before paint, see `src/lib/intro.ts`). It is skipped for reduced motion and can be skipped with Esc or the button.
  - **Background work:** while it runs, other 3D scenes stop rendering and cover painting pauses during the motion (`whenIntroIdle`). On the home page the reveal waits for the shelf.
- **3D page heroes** (`src/components/three/scenes/`):
  - `BookCarousel`: the library ring. Drag it, use the arrows, click a book to bring it forward, then click again to open it.
  - `PlanVolumes`: the three plans as cased books. Click one to jump to its card.
  - `BookAssembly`: the services pages. An exploded book assembles as you scroll.
- **Performance:** each 3D hero is hosted by `SceneShell`. It mounts only near the viewport, pauses rendering when off-screen or in a background tab, caps DPR, and uses no post-processing. It keeps a static fallback when WebGL is missing, the device is weak or data saver is on, and recovers from GPU context loss. three.js is downloaded only on pages that use it.
- **Scroll animations** use `useScrollScene()` (GSAP + ScrollTrigger). It does nothing under reduced motion and starts after the intro.

## The API seam

- Every UI call goes through **`src/lib/api/`** (`http.ts` is the one transport: bearer token, one refresh-and-retry on 401, the backend's error envelope as `ApiError`). Each area has its own file: `auth`, `books`, `library`, `ask`, `ai`, `support`, `publishing`, `assistant`, `tokens`, `admin`.
- Validation schemas live in **`src/lib/schemas/`** (zod); the backend enforces the same rules with the same messages (`backend/app/core/validators.py`).
- Static data shared with the backend: `src/data/faqs.json` (the help assistant's knowledge) and `src/data/plans.ts` (prices; a backend test keeps the server's copy in step).

## Notes

- Guide content lives in `src/data/publish/` (typed blocks rendered by `src/components/publish-guides/`). Royalty and print-cost figures (`src/lib/royalty.ts`) and spine widths are **indicative**: replace them with the printer's rate card and channel terms.
- Every page has a back-to-top button (it appears after scrolling; its ring shows reading progress).
- Plan contents and prices come from the StoryShelf plans PDF. Add-on prices are **indicative placeholders**, because the PDF only says "Add-On".
- The showcase titles ("published with StoryShelf", `src/data/showcaseBooks.ts`) and testimonials are **placeholder content**. The library's books are real public-domain classics from Project Gutenberg.
- Figures (prices, stats) use the **Inter Tight** numeric font (`fontNum` in `src/theme/fonts.ts`, the `.num` class). It has a real ₹ glyph and lining figures.
- CSS Modules work as normal. `next.config.ts` limits the Tailwind Turbopack loader to non-module CSS. Don't widen it, or `*.module.css` files silently become global.
- **Windows dev server:** if `npm run dev` starts returning 500s with `EPERM: operation not permitted, rename …\.next\dev\…`, another process is locking `.next`. Antivirus real-time scanning or an editor extension are the usual causes. Exclude the project's `.next` folder from scanning, or use `npm run build && npm start`. `.vscode/settings.json` already stops VS Code from watching `.next`.

## SEO

- Per-page metadata; canonical URLs on the services pages.
- `sitemap.xml` and `robots.txt` share one site URL (`src/lib/seo.tsx`).
- schema.org JSON-LD: Organization and WebSite on every page, an ItemList of Services on `/services`, and a Service on each service page.

## Deploy to Netlify by drag and drop

```bash
npm run build:static   # static export → ./out
```

Drag the `out` folder onto https://app.netlify.com/drop. Set `NEXT_PUBLIC_API_URL` to the deployed API before building; see [DEPLOY.md](DEPLOY.md).

- **Redirects and 404s:** the build writes `out/_redirects`. It keeps old URLs (`/process`, `/bookstore/*`) redirecting, and gives switched-off screens real 404s; it is generated from the feature flags.
- **Prefetch files:** a post-build step adds the prefetch files Next.js 16 names differently from where it writes them (`scripts/flatten-segment-payloads.mjs`).
- **Preview locally:** `npx serve out`.
- **Normal server build:** `npm run build` / `npm start` still works for hosting with a Node server.
