# syntax=docker/dockerfile:1.7
# =============================================================================
# AcademiQ Web — Production Dockerfile
# =============================================================================
# This image is for *production* deploys only. Local development uses
# `make dev` on the host (Next.js fast-refresh) and does NOT build this image.
#
# Once the Next.js scaffold lands, this Dockerfile expects:
#   - `pnpm-lock.yaml` to be committed (built with `pnpm install`)
#   - `next.config.js` to set `output: 'standalone'`
# Adjust the COPY paths in the runtime stage if `output: 'standalone'` is
# unset (you'll need to ship `node_modules` and `.next` directly).
# =============================================================================

ARG NODE_VERSION=20
ARG PNPM_VERSION=11.5.0

# -----------------------------------------------------------------------------
# Stage 1: deps — install production dependencies with pnpm via corepack
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS deps
ENV CI=1
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile=false

# -----------------------------------------------------------------------------
# Stage 2: builder — copy source, build the Next.js app
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS builder
ENV CI=1 \
    NODE_ENV=production
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# -----------------------------------------------------------------------------
# Stage 3: runtime — minimal Node slim with the build output
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app

RUN groupadd --system --gid 10001 akademiq \
 && useradd --system --uid 10001 --gid 10001 --home-dir /app --shell /usr/sbin/nologin akademiq

# Copy the production-ready output. Adjust these paths if `output: 'standalone'`
# is not enabled in next.config.js.
COPY --from=builder --chown=akademiq:akademiq /app/public ./public
COPY --from=builder --chown=akademiq:akademiq /app/.next/standalone ./
COPY --from=builder --chown=akademiq:akademiq /app/.next/static ./.next/static

USER akademiq

ARG WEB_PORT=3000
EXPOSE ${WEB_PORT}

CMD ["node", "server.js"]
