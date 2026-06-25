# NextFlow Architecture Document

## 1. Project Summary

NextFlow is a protected ILM workflow builder inspired by the Galaxy.ai workflow canvas. The app is intentionally limited to three product surfaces:

1. Clerk sign-in and sign-up.
2. Dashboard for signed-in user workflows.
3. Workflow canvas with sidebar history.

There is no marketing page, pricing page, public landing page, or public workflow viewer. Any unauthenticated user is redirected to Clerk.

The current implementation is a working foundation. It includes the main page structure, protected routes, dashboard CRUD in local state, React Flow canvas, required node types, sample workflow, JSON import/export, Prisma schema, API route skeletons, and Trigger/Gemini task contracts. Real production execution still needs external service keys and final service wiring.

## 2. Required Tech Stack

The project uses:

- Next.js App Router
- TypeScript strict mode
- Tailwind CSS
- Clerk for authentication
- React Flow via `@xyflow/react`
- Zustand for client workflow state
- Zod for request and import validation
- PostgreSQL through Neon
- Prisma ORM
- Trigger.dev for executable node tasks
- Google Gemini through `@google/generative-ai`
- Transloadit for image uploads
- FFmpeg inside the Crop Image task
- Lucide React for interface icons
- Vercel for deployment

## 3. Installed Packages

Core packages already installed:

```txt
@clerk/nextjs
@xyflow/react
zustand
zod
prisma
@prisma/client
lucide-react
@google/generative-ai
@trigger.dev/sdk
@uppy/core
@uppy/dashboard
@uppy/transloadit
clsx
tailwind-merge
date-fns
```

Prisma is pinned to version 6 because Prisma 7 changed its database configuration format. Version 6 keeps the normal Neon `DATABASE_URL` flow simple.

## 4. Folder Structure

```txt
nextflow/
  docs/
    ARCHITECTURE.md
  prisma/
    schema.prisma
  src/
    app/
      api/
        workflows/
      dashboard/
      sign-in/
      sign-up/
      workflow/
      globals.css
      layout.tsx
      page.tsx
      proxy.ts
    components/
      canvas/
      dashboard/
      layout/
      nodes/
      ui/
    lib/
    server/
    store/
    trigger/
    types/
    validators/
```

## 5. Route Map

### `/`

Redirects to `/dashboard`.

### `/sign-in`

Clerk sign-in route.

### `/sign-up`

Clerk sign-up route.

### `/dashboard`

Signed-in workflow dashboard.

Current behavior:

- Shows workflows for the local client store.
- Create workflow.
- Open workflow.
- Rename workflow.
- Delete workflow.
- Empty state is implemented.

Production target:

- Load workflows from PostgreSQL using the signed-in Clerk user ID.
- Persist create, rename, and delete through API routes.

### `/workflow/[workflowId]`

Main builder route.

Current behavior:

- Opens a React Flow canvas.
- Loads workflow data from Zustand.
- Shows required sample workflow.
- Supports node movement.
- Supports edge creation.
- Supports delete selected nodes except locked nodes.
- Supports undo and redo foundation.
- Supports full or selected run simulation.
- Shows run history.
- Supports JSON export and import.

Production target:

- Load workflow by ID from PostgreSQL.
- Persist canvas changes.
- Execute selected nodes through Trigger.dev tasks.
- Store run history in PostgreSQL.

## 6. Authentication Flow

Clerk protects all routes except:

```txt
/sign-in
/sign-up
```

The protection is defined in:

```txt
src/proxy.ts
```

The root layout wraps the app with:

```tsx
<ClerkProvider>
```

Required environment variables:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

## 7. Required Console Attribution

Every initial client render emits:

```txt
[NextFlow) Candidate LinkedIn: <full-linkedin-profile-url>
```

The component is:

```txt
src/components/layout/candidate-logger.tsx
```

The value comes from:

```env
NEXT_PUBLIC_CANDIDATE_LINKEDIN=
```

Replace the placeholder with the real LinkedIn profile URL before submission.

## 8. Data Model

Main TypeScript contracts live in:

```txt
src/types/workflow.ts
```

Main data types:

- `WorkflowDocument`
- `WorkflowNode`
- `WorkflowEdge`
- `WorkflowRun`
- `NodeRunDetail`
- `RequestInputsData`
- `CropImageData`
- `GeminiData`
- `ResponseData`

Node kinds:

```txt
requestInputs
cropImage
gemini
response
```

Port types:

```txt
text
image
video
audio
file
number
```

## 9. Database Architecture

Prisma schema lives in:

```txt
prisma/schema.prisma
```

Models:

### `Workflow`

Stores a user's workflow.

Fields:

- `id`
- `clerkId`
- `name`
- `status`
- `canvas`
- `createdAt`
- `updatedAt`

The `canvas` field stores nodes and edges as JSON.

### `WorkflowRun`

Stores each execution run.

Fields:

- `id`
- `workflowId`
- `status`
- `scope`
- `durationMs`
- `startedAt`

### `WorkflowRunNodeResult`

Stores node-level execution details.

Fields:

- `id`
- `runId`
- `nodeId`
- `label`
- `status`
- `inputs`
- `output`
- `error`
- `durationMs`

## 10. API Architecture

API routes currently exist as a clean contract layer.

### `GET /api/workflows`

Returns workflows scoped to the Clerk user.

### `POST /api/workflows`

Creates a workflow for the Clerk user.

### `GET /api/workflows/[workflowId]`

Returns one workflow if it belongs to the Clerk user.

### `PATCH /api/workflows/[workflowId]`

Renames or updates a workflow.

### `DELETE /api/workflows/[workflowId]`

Deletes a workflow if it belongs to the Clerk user.

### `POST /api/workflows/[workflowId]/execute`

Accepts an execution request.

Current behavior:

- Validates request with Zod.
- Returns an accepted response.

Production target:

- Build a DAG execution plan.
- Trigger node tasks.
- Persist workflow run and node run results.

## 11. Validation

Zod schemas live in:

```txt
src/validators/workflow.ts
```

Schemas include:

- Workflow document validation
- Edge validation
- Rename validation
- Execute request validation

All API writes and JSON imports should pass through Zod before being trusted.

## 12. Client State

The current workflow client state lives in:

```txt
src/store/workflow-store.ts
```

The store handles:

- Workflow list
- Active workflow
- Create workflow
- Open workflow
- Rename workflow
- Delete workflow
- Import workflow
- Add node
- React Flow node changes
- React Flow edge changes
- Connection validation
- Cycle prevention
- Selected node tracking
- Delete selected
- Undo
- Redo
- Demo execution
- Demo run history

Local persistence uses Zustand persist. Production persistence should move workflow saves to PostgreSQL through API routes.

## 13. Canvas Architecture

Canvas UI lives in:

```txt
src/components/canvas/workflow-canvas-client.tsx
```

It uses:

- `ReactFlow`
- `ReactFlowProvider`
- `Background`
- `MiniMap`
- `Controls`
- Custom node types
- Custom bottom node picker
- Right history panel

Canvas behavior:

- Pan
- Zoom
- Fit view
- Dot grid
- Animated edges
- MiniMap
- Delete selected nodes
- Undo and redo shortcuts
- Run selected or full workflow
- Export workflow JSON
- Import workflow JSON

## 14. Node Architecture

Node components live in:

```txt
src/components/nodes/
```

Files:

- `request-inputs-node.tsx`
- `crop-image-node.tsx`
- `gemini-node.tsx`
- `response-node.tsx`
- `node-shell.tsx`
- `index.ts`

### Request-Inputs Node

Purpose:

- Provides user input values to the workflow.

Current fields:

- `text_field`
- `image_field`

Required final behavior:

- Add configurable text fields.
- Add configurable image fields.
- Rename fields.
- Each field exposes its own output handle.
- Image field uses Transloadit upload.
- Supported image types: jpg, jpeg, png, webp, gif.
- Preview uploaded image.

### Crop Image Node

Purpose:

- Crops an image using FFmpeg through Trigger.dev.

Inputs:

- Input Image
- X Position
- Y Position
- Width
- Height

Output:

- Output Image

Important requirement:

- Must wait at least 30 seconds before returning.

Current implementation:

- UI exists.
- Task placeholder exists.
- 30 second delay exists in `src/trigger/tasks.ts`.

Production work:

- Add real FFmpeg crop implementation inside Trigger.dev.
- Return uploaded cropped image URL.

### Gemini 3.1 Pro Node

Purpose:

- Runs an LLM task through Google Gemini.

Inputs:

- Prompt
- System Prompt
- Image Vision
- Video
- Audio
- File

Output:

- Response text.

Current implementation:

- UI exists.
- Model selector visual exists.
- Inline response section exists.
- Task placeholder calls Gemini when `GOOGLE_GENERATIVE_AI_API_KEY` exists.

Production work:

- Confirm exact Gemini model ID available in Google AI Studio.
- Wire multimodal image payloads.
- Execute only through Trigger.dev.

### Response Node

Purpose:

- Captures final workflow output.

Inputs:

- Single result input.

Outputs:

- None.

Special rule:

- Cannot be deleted.

## 15. Node Picker

Node picker lives in:

```txt
src/components/canvas/node-picker.tsx
```

Galaxy.ai behavior requires:

- No left sidebar node menu.
- Bottom-center floating toolbar.
- Plus button opens searchable picker.
- Categories:
  - Recent
  - Image
  - Video
  - Audio
  - Others

Current functional picker items:

- Crop Image
- Gemini 3.1 Pro

## 16. Sample Workflow

The required sample workflow is defined in:

```txt
src/lib/sample-workflow.ts
```

Workflow nodes:

1. Request-Inputs
2. Crop Image #1
3. Crop Image #2
4. Gemini 3.1 Pro #1
5. Gemini 3.1 Pro #2
6. Gemini 3.1 Pro #3 Final
7. Response

Required execution behavior:

At T=0:

- Crop Image #1 starts.
- Crop Image #2 starts.
- Gemini #1 starts.

When Gemini #1 finishes:

- Gemini #2 starts immediately.
- It must not wait for Crop Image #1 or Crop Image #2.

Final Gemini starts only after:

- Crop Image #1 completes.
- Crop Image #2 completes.
- Gemini #2 completes.

Response captures final output after Final Gemini.

## 17. Execution Architecture

Production execution should work like this:

1. User clicks run full workflow, run selected nodes, or run single node.
2. Client sends execution request to API.
3. API validates request with Zod.
4. API loads workflow from PostgreSQL.
5. API builds a DAG from nodes and edges.
6. API checks selected execution scope.
7. API creates a `WorkflowRun`.
8. API schedules executable nodes through Trigger.dev.
9. Request-Inputs resolves locally.
10. Response captures final result locally.
11. Crop Image and Gemini run only as Trigger.dev tasks.
12. Independent ready nodes start concurrently.
13. Finished nodes immediately release their direct dependents.
14. Unrelated sibling branches never block each other.
15. Every node result is stored in `WorkflowRunNodeResult`.
16. Workflow run status is updated to success, failed, or partial.
17. Client receives run updates and shows pulsating running nodes.

## 18. Trigger.dev Tasks

Task contracts live in:

```txt
src/trigger/tasks.ts
```

Current functions:

- `cropImageTask`
- `geminiTask`

Required production rule:

- Every executable node must run through Trigger.dev.
- No direct Gemini calls from the browser.
- No direct FFmpeg execution from the browser.

Crop Image task must include:

```ts
await wait(30_000);
```

This requirement is already present.

## 19. Type Safety Rules

Current connection validation:

- Detects source and target handle types.
- Rejects mismatched port types.
- Prevents cycles.

Required final behavior:

- Invalid drags should be visually rejected.
- Manual input fields should be disabled when an input is connected.
- Image outputs cannot connect to text inputs.
- Text outputs cannot connect to image inputs.
- DAG-only workflows.

## 20. History Panel

History UI lives in:

```txt
src/components/canvas/history-panel.tsx
```

Current behavior:

- Shows run list.
- Shows status.
- Shows duration.
- Expands node-level details.

Required final behavior:

- Load persisted history from PostgreSQL.
- Show statuses:
  - success
  - failed
  - partial
- Show scopes:
  - full
  - partial
  - single
- Show per-node inputs, output, duration, and error.

## 21. Import and Export

Current behavior:

- Export downloads the active workflow as JSON.
- Import reads JSON and adds it to local workflow state.

Required final behavior:

- Validate import with `workflowDocumentSchema`.
- Save imported workflow to PostgreSQL.
- Keep imported workflows scoped to the signed-in Clerk user.

## 22. Environment Variables

Required local file:

```txt
.env.local
```

Current example file:

```txt
.env.example
```

Required keys:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

DATABASE_URL=
GOOGLE_GENERATIVE_AI_API_KEY=
TRIGGER_SECRET_KEY=
TRANSLOADIT_AUTH_KEY=
TRANSLOADIT_AUTH_SECRET=
NEXT_PUBLIC_CANDIDATE_LINKEDIN=
```

## 23. External Service Setup Checklist

### Clerk

Needed for:

- Sign-in
- Sign-up
- User identity
- Protected routes

You already made this work.

### Neon

Needed for:

- PostgreSQL database
- Workflow persistence
- Run history persistence

Steps:

1. Create Neon account.
2. Create project.
3. Copy pooled connection string.
4. Add it to `.env.local` as `DATABASE_URL`.
5. Run Prisma migration.

### Google AI Studio

Needed for:

- Gemini LLM execution.

Steps:

1. Create Google AI Studio key.
2. Add it as `GOOGLE_GENERATIVE_AI_API_KEY`.
3. Confirm the final model ID available for Gemini 3.1 Pro or the closest available Gemini Pro model.

### Trigger.dev

Needed for:

- Running Crop Image tasks.
- Running Gemini tasks.
- Workflow execution reliability.

Steps:

1. Create Trigger.dev account.
2. Create project.
3. Add Trigger secret key to `.env.local`.
4. Configure deployed Trigger tasks.

### Transloadit

Needed for:

- Image upload in Request-Inputs image fields.
- Image previews.
- Cropped image output storage.

Steps:

1. Create Transloadit account.
2. Create template or upload flow.
3. Add auth key and secret to `.env.local`.
4. Wire Uppy Transloadit uploader in Request-Inputs node.

### Vercel

Needed for:

- Live demo URL.

Steps:

1. Push project to GitHub private repo.
2. Import repo in Vercel.
3. Add all environment variables.
4. Deploy.

## 24. Use Cases

### Use Case 1: User signs in

1. User visits app.
2. User is unauthenticated.
3. Clerk redirects user to `/sign-in`.
4. User signs in.
5. User lands on `/dashboard`.

### Use Case 2: User creates workflow

1. User clicks Create New Workflow.
2. App creates workflow with Request-Inputs and Response nodes.
3. User is sent to workflow canvas.

### Use Case 3: User opens workflow

1. User sees workflow list.
2. User clicks Open.
3. App opens `/workflow/[workflowId]`.
4. Canvas loads nodes and edges.

### Use Case 4: User renames workflow

1. User clicks rename action.
2. User edits name.
3. Workflow timestamp updates.
4. Production version persists to PostgreSQL.

### Use Case 5: User deletes workflow

1. User clicks delete.
2. Workflow is removed from list.
3. Production version deletes only if workflow belongs to signed-in user.

### Use Case 6: User adds node

1. User clicks bottom plus button.
2. Node picker opens.
3. User searches or selects category.
4. User chooses Crop Image or Gemini 3.1 Pro.
5. Node appears on canvas.

### Use Case 7: User connects nodes

1. User drags from an output handle.
2. User drops on compatible input handle.
3. App validates type.
4. App validates no cycle is created.
5. Edge is added if valid.

### Use Case 8: User runs full workflow

1. User clicks Run without selecting nodes.
2. App executes full DAG.
3. Ready independent nodes start together.
4. Running nodes glow.
5. Node results are saved.
6. History panel updates.

### Use Case 9: User runs selected nodes

1. User selects one or more nodes.
2. User clicks Run.
3. Only selected executable nodes run.
4. History entry scope is partial or single.

### Use Case 10: User exports workflow

1. User clicks export.
2. Browser downloads JSON file.
3. JSON contains workflow nodes, edges, and metadata.

### Use Case 11: User imports workflow

1. User clicks import.
2. User selects JSON file.
3. App validates JSON.
4. Workflow is added to dashboard.

## 25. Current Completion Status

Completed:

- Project scaffold.
- Dependencies installed.
- Clerk route setup.
- Protected route setup.
- Dashboard UI.
- Workflow canvas UI.
- Four required node UIs.
- Bottom node picker.
- Required sample workflow.
- History panel UI.
- JSON import/export.
- Prisma schema.
- API route skeletons.
- Zod validators.
- Trigger/Gemini task placeholders.
- Crop task 30 second delay.
- Production build passes.

Still needed:

- Real PostgreSQL save/load integration in the UI.
- Prisma migration against Neon.
- Real Transloadit upload inside Request-Inputs image fields.
- Real Trigger.dev task registration and execution.
- Real FFmpeg crop task.
- Real Gemini multimodal payload handling.
- Realtime run progress updates.
- Full DAG scheduler on backend.
- Pixel-perfect visual pass against Galaxy.ai reference.
- Demo video recording.
- Vercel deployment.
- GitHub private repo and collaborator access.

## 26. Pixel Perfect Status

The current design is not pixel-perfect yet.

It is a strong first implementation that matches the requested structure and general interaction model:

- Protected app.
- Dashboard.
- Canvas.
- Node cards.
- Bottom picker.
- MiniMap.
- Dot grid.
- History panel.
- Purple animated edges.

Pixel-perfect means we still need to compare directly against the Galaxy.ai reference and adjust:

- Exact spacing.
- Exact node dimensions.
- Exact colors.
- Exact typography.
- Exact shadows.
- Exact hover states.
- Exact picker behavior.
- Exact panel width.
- Exact canvas zoom and node placement.
- Exact edge routing feel.
- Exact animations.

This should be a dedicated polish phase after the functional wiring is complete.

## 27. Recommended Next Build Order

1. Connect Neon and run Prisma migration.
2. Replace local workflow store persistence with API persistence.
3. Implement real Transloadit image upload.
4. Implement backend DAG execution planner.
5. Register real Trigger.dev tasks.
6. Wire Crop Image task to FFmpeg and Transloadit output.
7. Wire Gemini task with text and image inputs.
8. Persist workflow run history.
9. Add realtime progress updates.
10. Polish UI against Galaxy.ai reference.
11. Deploy to Vercel.
12. Record demo video.

## 28. Local Commands

Run dev server:

```powershell
npm run dev
```

Generate Prisma client:

```powershell
npx prisma generate
```

Create migration after adding `DATABASE_URL`:

```powershell
npx prisma migrate dev --name init
```

Build:

```powershell
npm run build
```

Open Prisma Studio:

```powershell
npx prisma studio
```

## 29. Submission Checklist

Before submitting:

- App deploys on Vercel.
- Clerk auth works.
- Dashboard create, open, rename, delete works.
- Canvas opens sample workflow.
- Request-Inputs supports text and image fields.
- Transloadit upload works.
- Crop task waits 30 seconds minimum.
- Crop task returns image URL.
- Gemini task returns text response.
- Full workflow execution matches required parallel behavior.
- Single-node run works.
- Multi-select run works.
- History panel persists and expands node-level details.
- JSON export/import works.
- UI is visually checked against Galaxy.ai.
- GitHub repo is private.
- Access granted to required collaborators.
- Demo video is recorded.
- Live Vercel URL is ready.
