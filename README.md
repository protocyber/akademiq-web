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

No code has been scaffolded yet. The Next.js application, design system, and
auth wiring will be added in a follow-up change.

## Working with submodules

This repo is normally consumed via the parent:

```bash
git clone --recurse-submodules git@github.com:protocyber/akademiq.git
```

To work directly on this repo, clone it on its own:

```bash
git clone git@github.com:protocyber/akademiq-web.git
```
