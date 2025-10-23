# Makefile para Gerenciador Financeiro

.DEFAULT_GOAL := help
.PHONY: help build up down logs clean dev-up dev-down prod-up prod-down

# Variáveis
COMPOSE_FILE_DEV = docker-compose.dev.yml
COMPOSE_FILE_PROD = docker-compose.yml
PROJECT_NAME = gerenciador-financeiro

## Help
help: ## Mostra esta mensagem de ajuda
	@echo "Gerenciador Financeiro - Docker Commands"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

## Desenvolvimento
dev-up: ## Iniciar ambiente de desenvolvimento
	@echo "🚀 Iniciando ambiente de desenvolvimento..."

	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_DEV) up -d; \
	else \
		docker compose -f $(COMPOSE_FILE_DEV) up -d; \
	fi
	
	@echo "✅ Ambiente iniciado!"
	@echo "📊 MySQL: localhost:3306"
	@echo "🍃 MongoDB: localhost:27017"
	@echo "🔗 API: http://localhost:3000"
	@echo "📚 Swagger: http://localhost:3000/api/docs"

dev-down: ## Parar ambiente de desenvolvimento
	@echo "🛑 Parando ambiente de desenvolvimento..."
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_DEV) down; \
	else \
		docker compose -f $(COMPOSE_FILE_DEV) down; \
	fi

dev-logs: ## Ver logs do ambiente de desenvolvimento
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_DEV) logs -f; \
	else \
		docker compose -f $(COMPOSE_FILE_DEV) logs -f; \
	fi

dev-rebuild: ## Rebuild dos containers de desenvolvimento
	@echo "🔄 Fazendo rebuild dos containers..."
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_DEV) up --build -d; \
	else \
		docker compose -f $(COMPOSE_FILE_DEV) up --build -d; \
	fi

## Produção
prod-up: ## Iniciar ambiente de produção
	@echo "🚀 Iniciando ambiente de produção..."
	@if [ ! -f .env ]; then \
		echo "⚠️  Arquivo .env não encontrado. Copiando exemplo..."; \
		cp .env.example .env; \
		echo "📝 Configure as variáveis em .env antes de continuar!"; \
		exit 1; \
	fi
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) up -d; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) up -d; \
	fi
	@echo "✅ Ambiente de produção iniciado!"
	@echo "🌐 Aplicação: http://localhost"
	@echo "🔗 API: http://localhost/api"

prod-down: ## Parar ambiente de produção
	@echo "🛑 Parando ambiente de produção..."
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) down; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) down; \
	fi

prod-logs: ## Ver logs do ambiente de produção
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) logs -f; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) logs -f; \
	fi

prod-rebuild: ## Rebuild dos containers de produção
	@echo "🔄 Fazendo rebuild dos containers de produção..."
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) up --build -d; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) up --build -d; \
	fi

## Utilitários
logs: ## Ver logs de todos os containers
	docker compose logs -f

build: ## Build de todas as imagens
	@echo "🔨 Fazendo build de todas as imagens..."
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) build; \
		docker-compose -f $(COMPOSE_FILE_DEV) build; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) build; \
		docker compose -f $(COMPOSE_FILE_DEV) build; \
	fi

clean: ## Limpar containers, imagens e volumes não utilizados
	@echo "🧹 Limpando recursos não utilizados..."
	docker system prune -f
	docker volume prune -f

clean-all: ## Limpar tudo relacionado ao projeto (CUIDADO!)
	@echo "⚠️  Esta ação irá remover TODOS os dados do projeto!"
	@echo "Pressione Ctrl+C para cancelar ou Enter para continuar..."
	@read
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) down -v --remove-orphans; \
		docker-compose -f $(COMPOSE_FILE_DEV) down -v --remove-orphans; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) down -v --remove-orphans; \
		docker compose -f $(COMPOSE_FILE_DEV) down -v --remove-orphans; \
	fi
	docker rmi -f $$(docker images "*$(PROJECT_NAME)*" -q) 2>/dev/null || true
	docker volume rm $$(docker volume ls -q | grep "gf-") 2>/dev/null || true

status: ## Mostrar status dos containers
	@echo "📊 Status dos containers:"
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) ps 2>/dev/null || echo "Produção: não iniciada"; \
		docker-compose -f $(COMPOSE_FILE_DEV) ps 2>/dev/null || echo "Desenvolvimento: não iniciada"; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) ps 2>/dev/null || echo "Produção: não iniciada"; \
		docker compose -f $(COMPOSE_FILE_DEV) ps 2>/dev/null || echo "Desenvolvimento: não iniciada"; \
	fi

shell-api: ## Abrir shell no container da API
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) exec api sh; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) exec api sh; \
	fi

shell-web: ## Abrir shell no container web
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) exec web sh; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) exec web sh; \
	fi

shell-nginx: ## Abrir shell no container nginx
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) exec nginx sh; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) exec nginx sh; \
	fi

## Banco de Dados
db-mysql: ## Conectar ao MySQL
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) exec mysql mysql -u$${DB_USER:-gf_user} -p$${DB_PASSWORD:-gf_password} $${DB_NAME:-gerenciador_financeiro}; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) exec mysql mysql -u$${DB_USER:-gf_user} -p$${DB_PASSWORD:-gf_password} $${DB_NAME:-gerenciador_financeiro}; \
	fi

db-mongo: ## Conectar ao MongoDB
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) exec mongodb mongosh "mongodb://$${MONGO_ROOT_USER:-admin}:$${MONGO_ROOT_PASSWORD:-adminpassword}@localhost:27017/$${MONGO_DB:-gerenciador_logs}?authSource=admin"; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) exec mongodb mongosh "mongodb://$${MONGO_ROOT_USER:-admin}:$${MONGO_ROOT_PASSWORD:-adminpassword}@localhost:27017/$${MONGO_DB:-gerenciador_logs}?authSource=admin"; \
	fi

## Backup e Restore
backup: ## Fazer backup dos bancos de dados
	@echo "💾 Fazendo backup dos bancos de dados..."
	@mkdir -p backups
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) exec mysql mysqldump -u$${DB_USER:-gf_user} -p$${DB_PASSWORD:-gf_password} $${DB_NAME:-gerenciador_financeiro} > backups/mysql_backup_$$(date +%Y%m%d_%H%M%S).sql; \
		docker-compose -f $(COMPOSE_FILE_PROD) exec mongodb mongodump --uri="mongodb://$${MONGO_ROOT_USER:-admin}:$${MONGO_ROOT_PASSWORD:-adminpassword}@localhost:27017/$${MONGO_DB:-gerenciador_logs}?authSource=admin" --out=/tmp/backup; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) exec mysql mysqldump -u$${DB_USER:-gf_user} -p$${DB_PASSWORD:-gf_password} $${DB_NAME:-gerenciador_financeiro} > backups/mysql_backup_$$(date +%Y%m%d_%H%M%S).sql; \
		docker compose -f $(COMPOSE_FILE_PROD) exec mongodb mongodump --uri="mongodb://$${MONGO_ROOT_USER:-admin}:$${MONGO_ROOT_PASSWORD:-adminpassword}@localhost:27017/$${MONGO_DB:-gerenciador_logs}?authSource=admin" --out=/tmp/backup; \
	fi
	docker cp $$(docker compose -f $(COMPOSE_FILE_PROD) ps -q mongodb):/tmp/backup ./backups/mongodb_backup_$$(date +%Y%m%d_%H%M%S)
	@echo "✅ Backup concluído em ./backups/"

## Monitoramento
health: ## Verificar saúde dos containers
	@echo "🏥 Verificando saúde dos containers..."
	@if command -v docker-compose >/dev/null 2>&1; then \
		for container in $$(docker-compose -f $(COMPOSE_FILE_PROD) ps -q); do \
			name=$$(docker inspect $$container --format='{{.Name}}' | sed 's/\///'); \
			health=$$(docker inspect $$container --format='{{.State.Health.Status}}' 2>/dev/null || echo "no-health-check"); \
			echo "$$name: $$health"; \
		done; \
	else \
		for container in $$(docker compose -f $(COMPOSE_FILE_PROD) ps -q); do \
			name=$$(docker inspect $$container --format='{{.Name}}' | sed 's/\///'); \
			health=$$(docker inspect $$container --format='{{.State.Health.Status}}' 2>/dev/null || echo "no-health-check"); \
			echo "$$name: $$health"; \
		done; \
	fi; \
	

## Informações
info: ## Mostrar informações do ambiente
	@echo "ℹ️  Informações do Gerenciador Financeiro"
	@echo ""
	@echo "🐳 Docker:"
	@docker --version
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose --version; \
	else \
		docker compose version; \
	fi
	@echo ""
	@echo "📁 Estrutura do projeto:"
	@tree -L 2 -I 'node_modules|dist|coverage*|.git' . || ls -la