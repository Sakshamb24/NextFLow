NextFlow
NextFlow is a focused ILM workflow builder inspired by the Galaxy.ai workflow canvas. It is built as a protected Next.js application with Clerk authentication, a dashboard for managing workflows, and a React Flow canvas for building and running image and LLM workflows.
Submission Links
Live demo: https://next-f-low-theta.vercel.app
Demo video: https://drive.google.com/file/d/1l09BYipC8hr2N9EDGDpqMk_UBG8sv2l2/view?usp=drive_link
GitHub repository: https://github.com/Sakshamb24/NextFLow
Project Scope
The application contains only the required authenticated product surfaces:
Clerk sign-in and sign-up entry point
Dashboard for the signed-in user's workflows
Workflow canvas with sidebar, canvas area, bottom node picker, and right-side history panel
There is no marketing page, pricing page, or public landing page. Unauthenticated users are redirected to Clerk.
Core Features
Clerk-protected routes and user-scoped workflow data
Dashboard workflow create, open, rename, and delete actions
React Flow canvas with pan, zoom, fit view, MiniMap, animated edges, and dot grid
Pre-placed locked Request-Inputs and Response nodes
Bottom-center node picker for adding Crop Image and Gemini 3.1 Pro nodes
Request-Inputs node with configurable text and image fields
Transloadit image upload with preview inside image fields
Crop Image node with image input and percent-based crop parameters
Mandatory 30+ second delay before Crop Image returns
Gemini node with prompt, system prompt, vision image input, and inline response output
Type-aware connections between node handles
DAG validation to prevent cycles
Manual input fields disabled when the matching input is connected
Full workflow, selected-node, and single-node execution
Parallel execution for independent nodes
Running node glow while execution is active
Workflow run history with status, duration, scope, node-level inputs, outputs, and errors
PostgreSQL persistence through Prisma
JSON workflow export and import
Tech Stack
Next.js App Router
TypeScript strict mode
React
React Flow
Tailwind CSS
Zustand
Zod
Clerk
Prisma
PostgreSQL / Neon
Google Gemini API
Trigger.dev SDK
Transloadit
Sharp for server-side image cropping
Lucide React
Vercel
Workflow Nodes
Request-Inputs
This node is always present when a workflow is created. It collects the starting values for the workflow.
Supported fields:
text_field: multiline text input
image_field: image upload field with preview
Each field exposes its own output handle so it can be connected to downstream nodes.
Crop Image
This node receives an image and crops it using percentage-based values.
Inputs:
Input Image
X Position %
Y Position %
Width %
Height %
Output:
Cropped image URL
The crop task waits at least 30 seconds before returning, as required by the assignment.
Gemini 3.1 Pro
This node runs an LLM prompt using Google Gemini.
Inputs:
Prompt
System Prompt
Image (Vision)
Video
Audio
File
Output:
Text response rendered inline inside the node
The app attempts Gemini 3.1 Pro first and can fall back to an available Gemini model if quota blocks the selected model.
Response
This node is always present and captures the final workflow result. It has one input handle and no output handle.
Execution Flow
When a workflow runs, Request-Inputs resolves local values first. Executable nodes then run based on their dependencies.
Independent nodes start together. A node starts as soon as all of its direct upstream dependencies are complete. It does not wait for unrelated sibling nodes at the same DAG level.
Every run creates a history entry with:
Run number
Timestamp
Status
Duration
Scope
Per-node status
Inputs used
Output
Error message, if failed
Local Setup
Install dependencies:
npm install
Create a .env file using .env.example as the template.
Required environment variables:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
DATABASE_URL=
GOOGLE_GENERATIVE_AI_API_KEY=
TRIGGER_SECRET_KEY=
TRIGGER_PROJECT_ID=
TRANSLOADIT_AUTH_KEY=
TRANSLOADIT_AUTH_SECRET=
NEXT_PUBLIC_CANDIDATE_LINKEDIN=
Run Prisma migration:
npx prisma migrate dev
Start the development server:
npm run dev
Open the app:
http://localhost:3000
Useful Commands
npm run dev
npm run build
npm run start
npm run lint
npx prisma studio
Deployment
The project is deployed on Vercel.
Vercel settings:
Root directory: nextflow
Framework preset: Next.js
Build command: npm run build
Install command: npm install
Output directory: default
All production environment variables must be added in the Vercel project settings before deployment.
Notes for Reviewers
The app intentionally redirects unauthenticated traffic to Clerk.
The dashboard and workflow data are scoped to the signed-in Clerk user.
Crop Image requires a real uploaded image URL. Browser-only blob: preview URLs cannot be cropped on the server.
Gemini output depends on the API key quota and available Gemini model access for the configured Google AI project.
The Crop Image node intentionally takes more than 30 seconds to complete.
