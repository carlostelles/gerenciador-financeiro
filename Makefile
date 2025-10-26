# Makefile para Gerenciador Financeiro

.DEFAULT_GOAL := help
.PHONY: help build up down logs clean dev-up dev-down prod-up prod-down ssl-init ssl-init-prod ssl-renew ssl-check ssl-deploy

# Variáveis
COMPOSE_FILE_DEV = docker-compose.dev.yml
COMPOSE_FILE_PROD = docker-compose.yml
PROJECT_NAME = gerenciador-financeiro
DOMAIN = controle-financeiro.gaius.digital

## Help
help: ## Mostra esta mensagem de ajuda
	@echo "🔒 Gerenciador Financeiro - Docker Commands com SSL"
	@echo ""
	@echo "🚀 Deploy Rápido:"
	@echo "  make ssl-deploy     # Deploy completo com HTTPS automático"
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

## SSL/HTTPS
ssl-deploy: ## Deploy completo com SSL automático
	@echo "🚀 Iniciando deploy com SSL para $(DOMAIN)..."
	@if [ ! -f .env ]; then \
		echo "⚠️  Arquivo .env não encontrado. Copiando exemplo..."; \
		cp .env.example .env; \
		echo "📝 Configure as variáveis em .env antes de continuar!"; \
		exit 1; \
	fi
	@echo "🛑 Parando containers existentes..."
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) down 2>/dev/null || true; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) down 2>/dev/null || true; \
	fi
	@echo "🔨 Construindo imagens..."
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) build; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) build; \
	fi
	@echo "🚀 Iniciando serviços base..."
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) up -d mysql mongodb api web nginx; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) up -d mysql mongodb api web nginx; \
	fi
	@echo "⏳ Aguardando serviços inicializarem..."
	@echo "🔍 Checando readiness da API e bancos de dados..."
	@MAX_ATTEMPTS=30; \
	ATTEMPT=1; \
	while [ $$ATTEMPT -le $$MAX_ATTEMPTS ]; do \
		API_OK=0; MYSQL_OK=0; MONGO_OK=0; \
		if curl -s --connect-timeout 2 http://localhost:3000/health | grep -q "healthy"; then API_OK=1; fi; \
		if docker exec $$(docker compose -f $(COMPOSE_FILE_PROD) ps -q mysql 2>/dev/null) mysqladmin ping -u$${DB_USER:-gf_user} -p$${DB_PASSWORD:-gf_password} --silent 2>/dev/null | grep -q "mysqld is alive"; then MYSQL_OK=1; fi; \
		if docker exec $$(docker compose -f $(COMPOSE_FILE_PROD) ps -q mongodb 2>/dev/null) mongosh --eval "db.runCommand({ ping: 1 })" --quiet | grep -q '"ok" : 1'; then MONGO_OK=1; fi; \
		if [ $$API_OK -eq 1 ] && [ $$MYSQL_OK -eq 1 ] && [ $$MONGO_OK -eq 1 ]; then \
			echo "✅ Todos os serviços estão prontos!"; \
			break; \
		else \
			echo "⏳ Esperando serviços... (Tentativa $$ATTEMPT/$$MAX_ATTEMPTS)"; \
			sleep 2; \
		fi; \
		ATTEMPT=$$((ATTEMPT+1)); \
	done; \
	if [ $$ATTEMPT -gt $$MAX_ATTEMPTS ]; then \
		echo "❌ Timeout: Serviços não ficaram prontos a tempo."; \
		exit 1; \
	fi
	@echo "🔒 Obtendo certificado SSL..."
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) run --rm certbot /scripts/init-ssl.sh; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) run --rm certbot /scripts/init-ssl.sh; \
	fi
	@if [ $$? -eq 0 ]; then \
		echo "✅ Certificado SSL obtido com sucesso!"; \
		echo "🔄 Reiniciando Nginx com SSL..."; \
		if command -v docker-compose >/dev/null 2>&1; then \
			docker-compose -f $(COMPOSE_FILE_PROD) restart nginx; \
			docker-compose -f $(COMPOSE_FILE_PROD) up -d certbot certbot-cron; \
		else \
			docker compose -f $(COMPOSE_FILE_PROD) restart nginx; \
			docker compose -f $(COMPOSE_FILE_PROD) up -d certbot certbot-cron; \
		fi; \
		echo "🎉 Deploy SSL concluído com sucesso!"; \
		echo "🌐 Site: https://$(DOMAIN)"; \
		echo "🔗 API: https://$(DOMAIN)/api"; \
		echo "💚 Health: https://$(DOMAIN)/health"; \
	else \
		echo "❌ Erro ao obter certificado SSL"; \
		echo "🔧 Site disponível em: http://$(DOMAIN)"; \
	fi

ssl-init: ## Obter certificado SSL inicial para desenvolvimento (auto-assinado)
	@echo "� Inicializando certificados SSL para desenvolvimento..."
	@echo "🔄 Parando containers..."
	docker-compose down
	@echo "🔑 Gerando certificados auto-assinados..."
	docker-compose run --rm --entrypoint /bin/sh certbot -c "sh /scripts/generate-dev-certs.sh"
	@echo "� Iniciando aplicação com HTTPS..."
	docker-compose up -d
	@echo "✅ Certificados de desenvolvimento criados!"
	@echo "⚠️  AVISO: Certificados auto-assinados para desenvolvimento"
	@echo "⚠️  O navegador mostrará aviso de segurança que deve ser aceito"
	@echo "🌐 Aplicação disponível em:"
	@echo "   - HTTPS: https://localhost"
	@echo "   - HTTP redireciona para HTTPS"

ssl-init-prod: ## Obter certificado SSL para produção (Let's Encrypt)
	@echo "🔒 Obtendo certificado SSL para $(DOMAIN)..."
	@echo "⚠️  IMPORTANTE: Certifique-se de que:"
	@echo "   1. O DNS está apontando para este servidor"
	@echo "   2. As portas 80 e 443 estão abertas"
	@echo "   3. O nginx está configurado corretamente"
	@read -p "Continuar? (y/N) " confirm && [ "$$confirm" = "y" ]
	@echo "🔄 Configurando Nginx para HTTP apenas..."
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) exec nginx /scripts/nginx-config.sh http; \
		docker-compose -f $(COMPOSE_FILE_PROD) restart nginx; \
		sleep 5; \
		echo "🔒 Solicitando certificado SSL..."; \
		docker-compose -f $(COMPOSE_FILE_PROD) run --rm certbot /scripts/init-ssl.sh; \
		if [ $$? -eq 0 ]; then \
			echo "🔄 Configurando Nginx para HTTPS..."; \
			docker-compose -f $(COMPOSE_FILE_PROD) exec nginx /scripts/nginx-config.sh https; \
			docker-compose -f $(COMPOSE_FILE_PROD) restart nginx; \
			echo "✅ SSL configurado com sucesso!"; \
		else \
			echo "❌ Erro ao obter certificado SSL"; \
		fi; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) exec nginx /scripts/nginx-config.sh http; \
		docker compose -f $(COMPOSE_FILE_PROD) restart nginx; \
		sleep 5; \
		echo "🔒 Solicitando certificado SSL..."; \
		docker compose -f $(COMPOSE_FILE_PROD) run --rm certbot /scripts/init-ssl.sh; \
		if [ $$? -eq 0 ]; then \
			echo "🔄 Configurando Nginx para HTTPS..."; \
			docker compose -f $(COMPOSE_FILE_PROD) exec nginx /scripts/nginx-config.sh https; \
			docker compose -f $(COMPOSE_FILE_PROD) restart nginx; \
			echo "✅ SSL configurado com sucesso!"; \
		else \
			echo "❌ Erro ao obter certificado SSL"; \
		fi; \
	fi

ssl-renew: ## Renovar certificado SSL
	@echo "🔄 Renovando certificado SSL para $(DOMAIN)..."
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) exec certbot /scripts/renew-cert.sh; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) exec certbot /scripts/renew-cert.sh; \
	fi

ssl-check: ## Verificar status do certificado SSL
	@echo "🔍 Verificando status SSL para $(DOMAIN)..."
	@./scripts/check-ssl.sh

ssl-force-renew: ## Forçar renovação do certificado SSL
	@echo "🔄 Forçando renovação do certificado SSL..."
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) run --rm certbot certbot renew --force-renewal; \
		docker-compose -f $(COMPOSE_FILE_PROD) restart nginx; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) run --rm certbot certbot renew --force-renewal; \
		docker compose -f $(COMPOSE_FILE_PROD) restart nginx; \
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

status: ## Mostrar status dos containers e SSL
	@echo "📊 Status dos containers:"
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) ps 2>/dev/null || echo "Produção: não iniciada"; \
		echo ""; \
		docker-compose -f $(COMPOSE_FILE_DEV) ps 2>/dev/null || echo "Desenvolvimento: não iniciada"; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) ps 2>/dev/null || echo "Produção: não iniciada"; \
		echo ""; \
		docker compose -f $(COMPOSE_FILE_DEV) ps 2>/dev/null || echo "Desenvolvimento: não iniciada"; \
	fi
	@echo ""
	@echo "🔒 Status SSL:"
	@if docker ps | grep -q "gf-nginx"; then \
		echo "✅ Nginx: Rodando"; \
		if curl -s --connect-timeout 5 -I "https://$(DOMAIN)" | grep -q "200"; then \
			echo "✅ HTTPS: Funcionando"; \
		else \
			echo "❌ HTTPS: Não acessível"; \
		fi; \
		if docker exec gf-nginx test -f "/etc/letsencrypt/live/$(DOMAIN)/fullchain.pem" 2>/dev/null; then \
			if docker exec gf-nginx openssl x509 -checkend $$(( 30*24*60*60 )) -noout -in /etc/letsencrypt/live/$(DOMAIN)/fullchain.pem >/dev/null; then \
				echo "✅ Certificado: Válido por mais de 30 dias"; \
			elif docker exec gf-nginx openssl x509 -checkend $$(( 7*24*60*60 )) -noout -in /etc/letsencrypt/live/$(DOMAIN)/fullchain.pem >/dev/null; then \
				echo "⚠️  Certificado: Expira em menos de 30 dias"; \
			else \
				echo "🚨 Certificado: Expira em menos de 7 dias!"; \
			fi; \
		else \
			echo "❌ Certificado: Não encontrado"; \
		fi; \
	else \
		echo "❌ Nginx: Não está rodando"; \
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
backup: ## Fazer backup completo (bancos de dados + certificados SSL)
	@echo "💾 Fazendo backup completo..."
	@mkdir -p backups
	@BACKUP_DIR="backups/$$(date +%Y%m%d_%H%M%S)"; \
	mkdir -p "$$BACKUP_DIR"; \
	echo "📁 Criando backup em $$BACKUP_DIR"; \
	if command -v docker-compose >/dev/null 2>&1; then \
		echo "💾 Backup MySQL..."; \
		docker-compose -f $(COMPOSE_FILE_PROD) exec mysql mysqldump -u$${DB_USER:-gf_user} -p$${DB_PASSWORD:-gf_password} $${DB_NAME:-gerenciador_financeiro} > "$$BACKUP_DIR/mysql_backup.sql" || echo "⚠️  MySQL backup falhou"; \
		echo "💾 Backup MongoDB..."; \
		docker-compose -f $(COMPOSE_FILE_PROD) exec mongodb mongodump --uri="mongodb://$${MONGO_ROOT_USER:-admin}:$${MONGO_ROOT_PASSWORD:-adminpassword}@localhost:27017/$${MONGO_DB:-gerenciador_logs}?authSource=admin" --out=/tmp/backup; \
		docker cp $$(docker-compose -f $(COMPOSE_FILE_PROD) ps -q mongodb):/tmp/backup "$$BACKUP_DIR/mongodb_backup" || echo "⚠️  MongoDB backup falhou"; \
		echo "🔒 Backup certificados SSL..."; \
		docker run --rm -v gf-certbot-certs:/data -v "$$(pwd)/$$BACKUP_DIR":/backup ubuntu tar czf /backup/ssl-certificates.tar.gz -C /data . || echo "⚠️  SSL backup falhou"; \
		echo "📦 Backup volumes..."; \
		docker run --rm -v gf-mysql-data:/data -v "$$(pwd)/$$BACKUP_DIR":/backup ubuntu tar czf /backup/mysql-volume.tar.gz -C /data . || echo "⚠️  MySQL volume backup falhou"; \
		docker run --rm -v gf-mongodb-data:/data -v "$$(pwd)/$$BACKUP_DIR":/backup ubuntu tar czf /backup/mongodb-volume.tar.gz -C /data . || echo "⚠️  MongoDB volume backup falhou"; \
	else \
		echo "💾 Backup MySQL..."; \
		docker compose -f $(COMPOSE_FILE_PROD) exec mysql mysqldump -u$${DB_USER:-gf_user} -p$${DB_PASSWORD:-gf_password} $${DB_NAME:-gerenciador_financeiro} > "$$BACKUP_DIR/mysql_backup.sql" || echo "⚠️  MySQL backup falhou"; \
		echo "💾 Backup MongoDB..."; \
		docker compose -f $(COMPOSE_FILE_PROD) exec mongodb mongodump --uri="mongodb://$${MONGO_ROOT_USER:-admin}:$${MONGO_ROOT_PASSWORD:-adminpassword}@localhost:27017/$${MONGO_DB:-gerenciador_logs}?authSource=admin" --out=/tmp/backup; \
		docker cp $$(docker compose -f $(COMPOSE_FILE_PROD) ps -q mongodb):/tmp/backup "$$BACKUP_DIR/mongodb_backup" || echo "⚠️  MongoDB backup falhou"; \
		echo "🔒 Backup certificados SSL..."; \
		docker run --rm -v gf-certbot-certs:/data -v "$$(pwd)/$$BACKUP_DIR":/backup ubuntu tar czf /backup/ssl-certificates.tar.gz -C /data . || echo "⚠️  SSL backup falhou"; \
		echo "📦 Backup volumes..."; \
		docker run --rm -v gf-mysql-data:/data -v "$$(pwd)/$$BACKUP_DIR":/backup ubuntu tar czf /backup/mysql-volume.tar.gz -C /data . || echo "⚠️  MySQL volume backup falhou"; \
		docker run --rm -v gf-mongodb-data:/data -v "$$(pwd)/$$BACKUP_DIR":/backup ubuntu tar czf /backup/mongodb-volume.tar.gz -C /data . || echo "⚠️  MongoDB volume backup falhou"; \
	fi; \
	echo "✅ Backup completo criado em $$BACKUP_DIR"; \
	ls -la "$$BACKUP_DIR"

## Monitoramento
health: ## Verificar saúde dos containers e sistema
	@echo "🏥 Verificando saúde dos containers..."
	@if command -v docker-compose >/dev/null 2>&1; then \
		for container in $$(docker-compose -f $(COMPOSE_FILE_PROD) ps -q 2>/dev/null); do \
			name=$$(docker inspect $$container --format='{{.Name}}' | sed 's/\///'); \
			health=$$(docker inspect $$container --format='{{.State.Health.Status}}' 2>/dev/null || echo "no-health-check"); \
			status=$$(docker inspect $$container --format='{{.State.Status}}'); \
			echo "$$name: $$status (health: $$health)"; \
		done; \
	else \
		for container in $$(docker compose -f $(COMPOSE_FILE_PROD) ps -q 2>/dev/null); do \
			name=$$(docker inspect $$container --format='{{.Name}}' | sed 's/\///'); \
			health=$$(docker inspect $$container --format='{{.State.Health.Status}}' 2>/dev/null || echo "no-health-check"); \
			status=$$(docker inspect $$container --format='{{.State.Status}}'); \
			echo "$$name: $$status (health: $$health)"; \
		done; \
	fi
	@echo ""
	@echo "🌐 Testando conectividade:"
	@if curl -s --connect-timeout 5 "https://$(DOMAIN)/health" | grep -q "healthy"; then \
		echo "✅ HTTPS Health Check: OK"; \
	else \
		echo "❌ HTTPS Health Check: FALHOU"; \
	fi
	@if curl -s --connect-timeout 5 "https://$(DOMAIN)/api/health" >/dev/null 2>&1; then \
		echo "✅ API Health Check: OK"; \
	else \
		echo "❌ API Health Check: FALHOU"; \
	fi

logs-ssl: ## Ver logs relacionados ao SSL
	@echo "📋 Logs SSL e certificados:"
	@echo "--- Nginx ---"
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) logs --tail=20 nginx 2>/dev/null || echo "Container nginx não encontrado"; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) logs --tail=20 nginx 2>/dev/null || echo "Container nginx não encontrado"; \
	fi
	@echo ""
	@echo "--- Certbot ---"
	@if command -v docker-compose >/dev/null 2>&1; then \
		docker-compose -f $(COMPOSE_FILE_PROD) logs --tail=20 certbot 2>/dev/null || echo "Container certbot não encontrado"; \
	else \
		docker compose -f $(COMPOSE_FILE_PROD) logs --tail=20 certbot 2>/dev/null || echo "Container certbot não encontrado"; \
	fi
	@echo ""
	@echo "--- Cron Renovação ---"
	@if docker exec gf-certbot-cron test -f /var/log/certbot-renewal.log 2>/dev/null; then \
		echo "Últimas linhas do log de renovação:"; \
		docker exec gf-certbot-cron tail -10 /var/log/certbot-renewal.log; \
	else \
		echo "Log de renovação não encontrado"; \
	fi

monitor: ## Monitoramento contínuo do sistema
	@echo "📊 Monitoramento contínuo (Ctrl+C para parar)..."
	@while true; do \
		clear; \
		echo "🕐 $$(date)"; \
		echo ""; \
		$(MAKE) --no-print-directory status; \
		echo ""; \
		echo "🔄 Atualizando em 30 segundos..."; \
		sleep 30; \
	done
	

## Informações
info: ## Mostrar informações do ambiente e SSL
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
	@echo "🔒 Configuração SSL:"
	@echo "Domínio: $(DOMAIN)"
	@if docker exec gf-nginx test -f "/etc/letsencrypt/live/$(DOMAIN)/fullchain.pem" 2>/dev/null; then \
		echo "Certificado: ✅ Instalado"; \
		EXPIRY=$$(docker exec gf-nginx openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$(DOMAIN)/fullchain.pem" | cut -d= -f2); \
		echo "Validade: $$EXPIRY"; \
	else \
		echo "Certificado: ❌ Não encontrado"; \
	fi
	@echo ""
	@echo "🌐 URLs do sistema:"
	@echo "Site: https://$(DOMAIN)"
	@echo "API: https://$(DOMAIN)/api"
	@echo "Health: https://$(DOMAIN)/health"
	@echo ""
	@echo "📁 Estrutura do projeto:"
	@tree -L 2 -I 'node_modules|dist|coverage*|.git' . 2>/dev/null || ls -la