# InfiniSynapse integration

Zoreva uses InfiniSynapse as a **server-side operations advisor**. Managers upload a workforce CSV or Excel file. The browser talks only to Zoreva. Zoreva holds the API key, opens the InfiniSynapse SSE stream, creates the task, uploads the file, and reads workspace results.

Booking, overlap, capacity, and hours rules stay in `lib/services/schedule.ts` and `lib/shift-utils.ts`. InfiniSynapse does not write the schedule.

Documented InfiniSynapse endpoints used:

| Step | Method | Path |
| --- | --- | --- |
| Auth probe | GET | `/api/ai/ping` |
| Event stream | GET | `/api/ai/events?connId=` |
| Create task | POST | `/api/ai/message` (`type=newTask`) |
| Follow-up / upload reply | POST | `/api/ai/message` (`type=askResponse`) |
| Archive source file | POST | `/api/tools/taskUpload/:taskId` |
| Sandbox upload if asked | POST | `/api/ai/upload?taskId=` |
| Cancel | GET | `/api/ai_task/cancelTask?taskId=` |
| Workspace list | GET | `/api/ai_task/getTaskWorkspace/:id` |
| Preview artifact | POST | `/api/ai_task/previewFile` |

## Configure the secret locally

1. Copy `.env.example` to `.env.local` if you do not already have one.
2. Set `INFINISYNAPSE_API_KEY` to the key from InfiniSynapse API Key Management. Do not prefix it with `NEXT_PUBLIC_`.
3. Optional: set `INFINISYNAPSE_BASE_URL` (default `https://app.infinisynapse.com`; use `https://app.infinisynapse.cn` in mainland China).
4. Restart `npm run dev`.

`.env*` is gitignored except `.env.example`, which only has empty placeholders.

## Configure the secret in production

On Vercel (or similar): Project → Settings → Environment Variables.

- `INFINISYNAPSE_API_KEY` = your server key (Production / Preview as needed)
- `INFINISYNAPSE_BASE_URL` = `https://app.infinisynapse.com` unless you use `.cn` or a private host

Redeploy after saving. The key must never appear in client bundles or repo files.

## Manual test (full analysis)

1. Add `INFINISYNAPSE_API_KEY` to `.env.local` and start `npm run dev`.
2. `npm run test:infinisynapse` should print a successful ping and task-list response.
3. Sign in as a manager and open `/admin/advisor`.
4. Upload `docs/samples/workforce-sample.csv`.
5. The page should show Zoreva checks immediately after InfiniSynapse finishes (or on failure, local checks plus an error — never a made-up InfiniSynapse report).
6. In https://app.infinisynapse.com/tasks the new task should appear in ALL TASKS.

## What this MVP does not do

- Jobs live in memory on the Node process (lost on restart; not a durable `AgentTask` table).
- API routes are not verified with Firebase ID tokens yet; the Advisor UI is manager-only, and InfiniSynapse task IDs are not sent to the browser.
- InfiniSynapse findings are advisory. They never create, edit, or delete shifts.
