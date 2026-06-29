# =============================================================================
# AkademiQ Web — Makefile
# =============================================================================
# Standard target list per
# docs/internal/13_engineering_standards/12_makefile_standards.md (parent repo):
#
#   make dev         # run Next.js dev server (Next fast-refresh, host process)
#   make migrate     # no-op for the web app
#   make test        # run unit tests
#   make build       # produce a Next.js production build
#   make up          # alias for `dev` (web has no compose stack)
#   make down        # no-op (web has no compose stack)
#
# Convenience targets:
#
#   make start       # run the production server (after `make build`)
#   make lint        # run linters
#   make ps          # show web dev server status and listening port
#   make stop        # kill the Next.js dev server process
#   make clean       # delete .next build artefacts
#   make purge       # DESTRUCTIVE: delete .next and node_modules (with confirmation)
#   make build-image # build a production Docker image
#   make help        # list targets
#
# All ports/credentials live in .env (see .env.example). `make dev` runs on
# the host (not in Docker) for the best Next.js HMR experience on macOS.
# =============================================================================

-include .env
export

SHELL := /usr/bin/env bash
PNPM := pnpm

.DEFAULT_GOAL := help
.PHONY: help dev start build build-image migrate test test-unit test-e2e lint typecheck ps stop clean purge up down corepack

help: ## Show this help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

corepack: ## Enable corepack and activate the pinned pnpm version
	@command -v corepack >/dev/null || { echo "corepack not found — install Node >= 16.13"; exit 1; }
	@corepack enable >/dev/null 2>&1 || true

dev: corepack ## Start the Next.js dev server on $$WEB_PORT (default 3000)
	@if [ ! -f .env ]; then \
		echo ">> .env not found — copying from .env.example"; \
		cp .env.example .env; \
	fi
	@$(PNPM) install --silent
	@echo ">> Starting dev server on port $${WEB_PORT:-3000}"
	@WEB_PORT=$${WEB_PORT:-3000} $(PNPM) dev

start: corepack ## Run the production server (requires `make build` first)
	@NODE_ENV=production WEB_PORT=$${WEB_PORT:-3000} $(PNPM) start

build: corepack ## Build the Next.js production bundle
	@$(PNPM) install --silent
	@NODE_ENV=production $(PNPM) build

build-image: ## Build the production Docker image
	docker build -t akademiq-web:local .

migrate: ## No-op for the web app
	@echo ">> migrate: web has no migrations."

test: corepack ## Run unit tests
	@$(PNPM) test:unit

test-unit: corepack ## Run vitest unit tests
	@$(PNPM) test:unit

test-e2e: corepack ## Run Playwright e2e (auto-starts pnpm dev)
	@$(PNPM) exec playwright install --with-deps chromium >/dev/null 2>&1 || true
	@$(PNPM) test:e2e

lint: corepack ## Run lints
	@$(PNPM) lint

typecheck: corepack ## Run TypeScript typecheck
	@$(PNPM) typecheck

ps: ## Show web dev server status and listening port
	@echo "=== web dev server ==="
	@pgrep -fl "[n]ode.*next" 2>/dev/null || echo "  (none)"
	@echo ""
	@echo "=== listening port ==="
	@lsof -nP -i :$${WEB_PORT:-3000} 2>/dev/null | grep LISTEN || echo "  (none)"

stop: ## Kill the Next.js dev server process (SIGTERM)
	@pkill -TERM -f "[n]ode.*next" 2>/dev/null \
		&& echo "  next dev server stopped" \
		|| echo "  next dev server: not running"

clean: ## Delete Next.js build artefacts (.next)
	@rm -rf .next
	@echo ">> .next deleted (node_modules preserved — run 'make purge' to delete them)"

purge: ## DESTRUCTIVE: delete .next and node_modules (requires confirmation)
	@bash scripts/purge.sh

up: dev ## Alias for `dev` (web has no compose stack)

down: ## No-op (web has no compose stack)
	@echo ">> down: web has no compose stack to stop."
