# ─────────────────────────────────────────────────────────────
#  NeoConvert — Makefile
# ─────────────────────────────────────────────────────────────

.DEFAULT_GOAL := help
.PHONY: help setup dev build start lint audit clean env deploy deploy-prod prod deploy-preview logs test test-e2e check

# Cores
GREEN  := \033[0;32m
CYAN   := \033[0;36m
YELLOW := \033[0;33m
RESET  := \033[0m

## ── Setup ────────────────────────────────────────────────────

install: setup ## Alias para setup

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
	NODE_ENV=production pnpm build
	@echo "$(GREEN)✓ Build concluído.$(RESET)"

start: ## Inicia servidor de produção (após build)
	@echo "$(CYAN)→ Iniciando em modo produção...$(RESET)"
	pnpm start

## ── Qualidade & Testes ───────────────────────────────────────

lint: ## Verifica erros de lint
	@echo "$(CYAN)→ Verificando lint...$(RESET)"
	pnpm lint

audit: ## Verifica vulnerabilidades de segurança
	@echo "$(CYAN)→ Verificando vulnerabilidades...$(RESET)"
	pnpm audit

typecheck: ## Verifica tipos TypeScript
	@echo "$(CYAN)→ Verificando tipos...$(RESET)"
	pnpm exec tsc --noEmit

test: ## Roda testes unitários e integração (Vitest)
	@echo "$(CYAN)→ Rodando testes (Vitest)...$(RESET)"
	pnpm test

test-e2e: ## Roda testes end-to-end (Playwright)
	@echo "$(CYAN)→ Rodando testes E2E (Playwright)...$(RESET)"
	pnpm exec playwright test

check: audit lint typecheck test ## Roda Auditoria + Lint + Tipos + Testes
	@echo "$(GREEN)✓ Verificação de qualidade completa.$(RESET)"

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

deploy: deploy-preview ## Alias para deploy-preview

prod: ## Deploy direto para PRODUÇÃO (Vercel --prod)
	@echo "$(CYAN)→ Deploy PRODUÇÃO para Vercel...$(RESET)"
	vercel --prod
	@echo "$(GREEN)✓ Deploy produção concluído!$(RESET)"

deploy-prod: check build prod ## Verifica qualidade, faz build e deploy produção

deploy-preview: ## Deploy de preview (Staging)
	@echo "$(CYAN)→ Deploy PREVIEW para Vercel...$(RESET)"
	vercel
	@echo "$(GREEN)✓ Deploy preview concluído!$(RESET)"

## ── Git & Protocolo NΞØ ──────────────────────────────────────────

tag: ## Cria e envia uma TAG (uso: make tag V=v1.0.0 M="Versão 1.0")
	@if [ -z "$(V)" ]; then echo "$(YELLOW)Uso: make tag V=v1.0.0 M=\"Mensagem\"$(RESET)"; exit 1; fi
	git tag -a $(V) -m "$(M)"
	git push origin $(V)
	@echo "$(GREEN)✓ Tag $(V) criada e enviada.$(RESET)"

commit: ## Commit simples (uso: make commit MSG="feat: ...")
	@if [ -z "$(MSG)" ]; then \
		echo "$(YELLOW)Uso: make commit MSG=\"tipo: mensagem\"$(RESET)"; \
		exit 1; \
	fi
	git add .
	git commit -m "$(MSG)"

push: ## Push para a branch atual
	@BRANCH=$$(git rev-parse --abbrev-ref HEAD); \
	git push origin $$BRANCH

neo-push: check build ## [PROTOCOLO NΞØ] Security check → Tests → Build → Commit → Push
	@if [ -z "$(MSG)" ]; then \
		echo "$(YELLOW)Erro: Mensagem de commit obrigatória (Siga Conventional Commits).$(RESET)"; \
		echo "$(YELLOW)Uso: make neo-push MSG=\"feat: descrição\"$(RESET)"; \
		exit 1; \
	fi
	@echo "$(CYAN)→ Preparando commit seguro...$(RESET)"
	git add .
	git commit -m "$(MSG)"
	@BRANCH=$$(git rev-parse --abbrev-ref HEAD); \
	git push origin $$BRANCH
	@echo "$(GREEN)✓ Protocolo NΞØ concluído com sucesso.$(RESET)"

release: neo-push ## Alias para o protocolo completo

## ── Utilitários ──────────────────────────────────────────────

secret: ## Gera um secret aleatório (uso legado)
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
