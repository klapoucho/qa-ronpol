# The app under test

Rolnopol runs from the Docker image `jaktestowac/rolnopol:1.126.0` on port 3000 (`compose.yaml`). Global setup
checks that it is reachable and that it is the expected version before any test runs; if it is not reachable, the
run stops with `Start it with: npm run app:up`. This page describes the `dev` environment; for running against
another one see [Environments](ci-and-reports.md#environments).

The `ui-mocked` project needs the running app too: it mocks only `/api/**`, the pages' HTML and JavaScript still
come from the app, and global setup checks it for every project.

- **Apple Silicon.** The image is published for `linux/amd64` only. `compose.yaml` sets the platform, so Docker
  runs it under emulation: the first start is slower, and API calls are slower than on an amd64 machine.
- **Who may reset the app.** Anyone, including AI agents, may start it with `npm run app:up`. Only the author
  stops or resets it (`npm run app:down`, `npm run app:reset`, `RESET_DB=true`): a reset wipes the data another
  run may depend on. Tests never need a reset; each creates its own users.
- **Rate limit.** The app allows 100 API requests per 30 s per IP, and all workers share one IP. `compose.yaml`
  starts it with `SYNTHETIC_TOKEN`, and every request the tests make sends the same value as `X-Synthetic-Token`,
  which the app exempts from that limit. The value is a local default, not a secret; browsers send it to every
  origin a page loads, CDNs included. Global setup stops the run when the app does not accept the token, for
  example an app started before this setting or with another `.env`. Recreating it (`npm run app:up` after
  changing the value) resets its data, so only the author does that.
- **Money queue.** The app runs every operation that moves money (income, purchase, transfer) one at a time
  behind one global lock: an income takes about 2 s and a purchase about 4 s, and parallel workers queue behind
  each other. Its pages give up on a request after 15 s, while the server still completes it
  ([bug](../.qa/bugs/ghissue-14/post-api-marketplace-buy--ui-gives-up-after-15s-but-charges.md)). A UI test that moves
  money through the page is tagged `@ledger` and runs in the `ui-ledger` project: one test at a time, after the
  `api` and `ui` projects have finished, so no other test queues money in front of it (`ui-mocked` never reaches
  the app's API, so it may still run). If a test in `api` or `ui` fails, Playwright does not run `ui-ledger` (it
  reports its tests as not run). To run it alone: `npm run test:ui-ledger`. API tests wait up to Playwright's 30 s
  per request and stay parallel.
- **Port 3000 is taken.** `npm run app:up` fails with
  `Bind for 0.0.0.0:3000 failed: port is already allocated`. Stop whatever listens on port 3000 (for example a
  local Rolnopol clone started with `npm start`) and run it again. The Compose project is named after the folder,
  so a second checkout of this repo in a folder with another name starts a second container and hits the same
  error; use the app the first one started (`npm test` only needs `BASE_URL`).
- **Without Docker.** Clone [Rolnopol](https://github.com/jaktestowac/rolnopol) and check out commit `fb7fd89`
  (1.126.0; the repo has no version tags, and its `main` is newer), run `npm install`, start it with
  `SYNTHETIC_TOKEN=local-synthetic-token npm start`, and point `BASE_URL` at it (port 3000 by default). The app
  has no default token, and without the one the tests send global setup stops the run (see Rate limit above).
  The tests target 1.126.0; another version logs a warning and may fail. A running clone writes to its tracked
  `data/*.json` files, so its working tree changes as tests run.

