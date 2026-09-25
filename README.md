# Face Recognition Management System — Frontend

Next.js (App Router) + TypeScript + Tailwind CSS frontend for enrolling people,
managing their face embeddings, and (in Phase 2) recognizing faces against the
existing backend API.

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables — copy the example file and fill in your
   backend details:

   ```bash
   cp .env.local.example .env.local
   ```

   | Variable                     | Required | Description                                              |
   | ----------------------------- | -------- | ---------------------------------------------------------- |
   | `NEXT_PUBLIC_API_BASE_URL`    | Yes      | Base URL of the backend API (no trailing slash).           |
   | `NEXT_PUBLIC_API_KEY`         | No       | If set, sent as the `X-API-Key` header on every request.   |

3. Run the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

4. Production build:

   ```bash
   npm run build
   npm run start
   ```

## Project layout

- `src/app` — routes (Dashboard, People, Person Details, Enroll, Recognize, Settings)
- `src/components` — layout shell, UI primitives, and feature components
- `src/lib/api` — typed API client and backend request functions
- `src/types` — TypeScript interfaces mirroring the backend API contract
- `src/hooks` — shared data-fetching hooks

## Backend API

This frontend consumes an existing backend and does not modify it. See the
functions in `src/lib/api/persons.ts` for the exact endpoints used:

- `GET /api/persons`
- `POST /api/persons` (multipart/form-data)
- `GET /api/persons/{person_id}/embeddings`
- `DELETE /api/persons/{person_id}`
- `DELETE /api/embeddings/{embedding_id}`
