# ─────────────────────────────────────────────────────────────
#  NeoConvert — Makefile
# ─────────────────────────────────────────────────────────────

.DEFAULT_GOAL := help
.PHONY: help setup dev build start lint audit clean env deploy logs

# Cores
GREEN  := \033[0;32m
CYAN   := \033[0;36m
YELLOW := \033[0;33m
RESET  := \033[0m

## ── Setup ────────────────────────────────────────────────────

setup: ## Instala dependências e cria .env.local a partir do exemplo
	@echo "$(CYAN)→ Instalando dependências...$(RESET)"
	pnpm install
	@if [ ! -f .env.local ]; then \
		cp .env.example .env.local; \
		echo "$(YELLOW)→ .env.local criado. Preencha as variáveis antes de rodar.$(RESET)"; \
	else \
		echo "$(GREEN)→ .env.local já existe. Pulando cópia.$(RESET)"; \
	fi
	@echo "$(GREEN)✓ Setup concluído. Rode: make dev$(RESET)"

env: ## Cria .env.local a partir do .env.example (sem sobrescrever)
	@if [ ! -f .env.local ]; then \
		cp .env.example .env.local; \
		echo "$(GREEN)✓ .env.local criado. Preencha as variáveis.$(RESET)"; \
	else \
		echo "$(YELLOW)→ .env.local já existe.$(RESET)"; \
	fi

## ── Desenvolvimento ──────────────────────────────────────────

dev: ## Inicia servidor de desenvolvimento (localhost:3000)
	@echo "$(CYAN)→ Iniciando NeoConvert em modo dev...$(RESET)"
	pnpm dev

## ── Build & Produção ─────────────────────────────────────────

build: ## Build de produção
	@echo "$(CYAN)→ Building NeoConvert...$(RESET)"
	pnpm build
	@echo "$(GREEN)✓ Build concluído.$(RESET)"

start: ## Inicia servidor de produção (após build)
	@echo "$(CYAN)→ Iniciando em modo produção...$(RESET)"
	pnpm start

## ── Qualidade ────────────────────────────────────────────────

lint: ## Verifica erros de lint
	@echo "$(CYAN)→ Verificando lint...$(RESET)"
	pnpm lint

audit: ## Verifica vulnerabilidades de segurança
	@echo "$(CYAN)→ Verificando vulnerabilidades...$(RESET)"
	pnpm audit

typecheck: ## Verifica tipos TypeScript
	@echo "$(CYAN)→ Verificando tipos...$(RESET)"
	pnpm tsc --noEmit

check: lint typecheck audit ## Roda lint + typecheck + audit

## ── Limpeza ──────────────────────────────────────────────────

clean: ## Remove .next e node_modules
	@echo "$(YELLOW)→ Limpando cache e dependências...$(RESET)"
	rm -rf .next node_modules
	@echo "$(GREEN)✓ Limpo.$(RESET)"

clean-cache: ## Remove apenas o cache .next
	@echo "$(YELLOW)→ Limpando cache Next.js...$(RESET)"
	rm -rf .next
	@echo "$(GREEN)✓ Cache removido.$(RESET)"

## ── Deploy (Vercel) ──────────────────────────────────────────

deploy: check build ## Verifica qualidade e faz build antes do deploy
	@echo "$(CYAN)→ Deploy para Vercel...$(RESET)"
	vercel --prod
	@echo "$(GREEN)✓ Deploy concluído!$(RESET)"

deploy-preview: ## Deploy de preview (branch staging)
	@echo "$(CYAN)→ Deploy preview...$(RESET)"
	vercel

## ── Git ──────────────────────────────────────────────────────

commit: ## Commit com verificação de lint (uso: make commit MSG="feat: ...")
	@if [ -z "$(MSG)" ]; then \
		echo "$(YELLOW)Uso: make commit MSG=\"feat: sua mensagem\"$(RESET)"; \
		exit 1; \
	fi
	git add .
	git commit -m "$(MSG)"

push: ## Push para origin main
	git push origin main

release: check build commit push ## Full release: check → build → commit → push

## ── Utilitários ──────────────────────────────────────────────

secret: ## Gera um secret aleatório para WOOVI_WEBHOOK_SECRET
	@openssl rand -hex 32

info: ## Mostra versões das ferramentas
	@echo "$(CYAN)Node:$(RESET)  $$(node --version)"
	@echo "$(CYAN)pnpm:$(RESET)  $$(pnpm --version)"
	@echo "$(CYAN)Next:$(RESET)  $$(cat package.json | grep '\"next\"' | head -1 | tr -d ' \",')"

## ── Help ─────────────────────────────────────────────────────

help: ## Lista todos os comandos disponíveis
	@echo ""
	@echo "$(GREEN)NeoConvert — Comandos disponíveis$(RESET)"
	@echo "─────────────────────────────────────────"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-16s$(RESET) %s\n", $$1, $$2}'
	@echo ""
