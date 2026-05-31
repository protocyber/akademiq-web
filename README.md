# akademiq-web

AcademiQ web frontend (Next.js). This repository hosts the user-facing web
application for the AcademiQ multi-tenant SaaS platform for school
management.

This is a submodule of the parent
[`protocyber/akademiq`](https://github.com/protocyber/akademiq) repository,
mounted at `apps/web`. The container architecture and the role of this
frontend (the `WEB` container) are documented in the parent repo at
[`docs/internal/06_container_architecture/AcademiQ_Container_Diagram.md`](https://github.com/protocyber/akademiq/blob/main/docs/internal/06_container_architecture/AcademiQ_Container_Diagram.md).

## Status

The Next.js application, design system, and auth wiring are not yet
scaffolded. What this repo currently provides:

- `Makefile` with the standard target list (`dev`, `build`, `start`, `test`,
  `lint`, `up`, `down`, ...)
- `package.json` minimal stub with **pnpm** pinned via the
  `packageManager` field (activate via `corepack enable`)
- `.nvmrc` pinning Node 20 LTS
- `Dockerfile` — production multi-stage build (used for deploys; **not**
  for dev)
- `.env.example` — every contributor-tunable value lives in `.env`
  (gitignored). Copy `.env.example` to `.env` and edit if defaults clash
  with anything on your machine.

Once `create-next-app` runs in a follow-up change, the placeholder scripts
in `package.json` become real Next.js commands and `make dev` will boot
the actual dev server on `localhost:${WEB_PORT}` with fast refresh.

## Local development

Prerequisites:

- Node 20 LTS — `nvm use` will pick up the version from `.nvmrc`
- `corepack enable` (one-time, activates the pinned pnpm version)

```bash
cp .env.example .env             # one-time
make dev                         # runs `pnpm dev` on the host
```

`make dev` runs on the host (not in Docker) for the best Next.js HMR
experience on macOS. The production `Dockerfile` exists for deploys —
build it with `make build-image`.

When run as part of the parent monorepo, the parent's root `Makefile`
delegates `make dev` here.

## Working with submodules

This repo is normally consumed via the parent:

```bash
git clone --recurse-submodules git@github.com:protocyber/akademiq.git
```

To work directly on this repo, clone it on its own:

```bash
git clone git@github.com:protocyber/akademiq-web.git
```
