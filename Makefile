# Makefile para Gerenciador Financeiro

.DEFAULT_GOAL := help
.PHONY: help build up down logs clean dev-up dev-down prod-up prod-down ssl-init ssl-init-prod ssl-pre-check ssl-renew ssl-check ssl-deploy nginx-rebuild

# Variáveis
COMPOSE_FILE_DEV = docker-compose.dev.yml
COMPOSE_FILE_PROD = docker-compose.yml
PROJECT_NAME = gerenciador-financeiro
DOMAIN = controle-financeiro.gaius.digital

# Detectar comando Docker Compose disponível
DOCKER_COMPOSE_CMD := $(shell if command -v docker-compose >/dev/null 2>&1; then echo "docker-compose"; else echo "docker compose"; fi)

## Help
help: ## Mostra esta mensagem de ajuda
	@echo "🔒 Gerenciador Financeiro - Docker Commands com SSL"
	@echo ""
	@echo "🚀 Deploy Rápido:"
	@echo "  make ssl-deploy     # Deploy completo com HTTPS automático"
	@echo ""
	@echo "🔧 Correções Rápidas:"
	@echo "  make ssl-fix-duplicate-upstream  # Corrige erro de upstream duplicado"
	@echo "  make ssl-fix-acme-permissions    # Corrige permissões diretório ACME"
	@echo "  make ssl-restart-http           # Reinicia nginx apenas HTTP"
	@echo "  make ssl-fix-permissions        # Corrige permissões SSL"
	@echo ""
	@echo "🧪 Debug SSL:"
	@echo "  make ssl-test-acme              # Testa acesso ao endpoint ACME"
	@echo "  make ssl-debug                  # Ver logs detalhados Let's Encrypt"
	@echo "  make ssl-init-staging           # Certificado de teste primeiro"
	@echo "  make ssl-test                   # Testa se HTTPS está funcionando"
	@echo "  make ssl-status                 # Status completo do SSL"
	@echo "  make ssl-finish                 # Finaliza configuração SSL"
	@echo "  make ssl-config-check           # Verifica configuração atual"
	@echo "  make ssl-config-fix             # Corrige configuração SSL"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

## Desenvolvimento
dev-up: ## Iniciar ambiente de desenvolvimento
	@echo "🚀 Iniciando ambiente de desenvolvimento..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_DEV) up -d
	
	@echo "✅ Ambiente iniciado!"
	@echo "📊 MySQL: localhost:3306"
	@echo "🍃 MongoDB: localhost:27017"
	@echo "🔗 API: http://localhost:3000"
	@echo "📚 Swagger: http://localhost:3000/api/docs"

dev-down: ## Parar ambiente de desenvolvimento
	@echo "🛑 Parando ambiente de desenvolvimento..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_DEV) down

dev-logs: ## Ver logs do ambiente de desenvolvimento
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_DEV) logs -f

dev-rebuild: ## Rebuild dos containers de desenvolvimento
	@echo "🔄 Fazendo rebuild dos containers..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_DEV) up --build -d

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
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) down 2>/dev/null || true
	@echo "🔨 Construindo imagens..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) build
	@echo "🚀 Iniciando serviços base..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) up -d mysql mongodb api web nginx
	@echo "⏳ Aguardando serviços inicializarem..."
	@echo "🔍 Checando readiness da API e bancos de dados..."
	@MAX_ATTEMPTS=30; \
	ATTEMPT=1; \
	while [ $$ATTEMPT -le $$MAX_ATTEMPTS ]; do \
		API_OK=0; MYSQL_OK=0; MONGO_OK=0; \
		if curl -s --connect-timeout 2 http://localhost:3000/health | grep -q "healthy"; then API_OK=1; fi; \
		if docker exec $$($(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) ps -q mysql 2>/dev/null) mysqladmin ping -u$${DB_USER:-gf_user} -p$${DB_PASSWORD:-gf_password} --silent 2>/dev/null | grep -q "mysqld is alive"; then MYSQL_OK=1; fi; \
		if docker exec $$($(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) ps -q mongodb 2>/dev/null) mongosh --eval "db.runCommand({ ping: 1 })" --quiet | grep -q '"ok" : 1'; then MONGO_OK=1; fi; \
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
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) run --rm certbot /scripts/init-ssl.sh
	@if [ $$? -eq 0 ]; then \
		echo "✅ Certificado SSL obtido com sucesso!"; \
		echo "🔄 Reiniciando Nginx com SSL..."; \
		$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) restart nginx; \
		$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) up -d certbot certbot-cron; \
		echo "🎉 Deploy SSL concluído com sucesso!"; \
		echo "🌐 Site: https://$(DOMAIN)"; \
		echo "🔗 API: https://$(DOMAIN)/api"; \
		echo "💚 Health: https://$(DOMAIN)/health"; \
	else \
		echo "❌ Erro ao obter certificado SSL"; \
		echo "🔧 Site disponível em: http://$(DOMAIN)"; \
	fi

ssl-init: ## Obter certificado SSL inicial para desenvolvimento (auto-assinado)
	@echo "🔐 Inicializando certificados SSL para desenvolvimento..."
	@echo "🔄 Parando containers..."
	$(DOCKER_COMPOSE_CMD) down
	@echo "🔑 Gerando certificados auto-assinados..."
	$(DOCKER_COMPOSE_CMD) run --rm --entrypoint /bin/sh certbot -c "sh /scripts/generate-dev-certs.sh"
	@echo "🚀 Iniciando aplicação com HTTPS..."
	$(DOCKER_COMPOSE_CMD) up -d
	@echo "✅ Certificados de desenvolvimento criados!"
	@echo "⚠️  AVISO: Certificados auto-assinados para desenvolvimento"
	@echo "⚠️  O navegador mostrará aviso de segurança que deve ser aceito"
	@echo "🌐 Aplicação disponível em:"
	@echo "   - HTTPS: https://localhost"
	@echo "   - HTTP redireciona para HTTPS"

ssl-pre-check: ## Verificar pré-requisitos para certificação SSL
	@echo "🔍 Verificando pré-requisitos SSL..."
	@sh scripts/ssl-pre-check.sh

nginx-rebuild: ## Reconstruir container nginx com health check corrigido
	@echo "🔧 Reconstruindo container nginx..."
	$(DOCKER_COMPOSE_CMD) stop nginx
	$(DOCKER_COMPOSE_CMD) build --no-cache nginx
	$(DOCKER_COMPOSE_CMD) up -d nginx
	@echo "✅ Nginx reconstruído e reiniciado!"
	@echo "⏳ Aguardando health check..."
	@sleep 30
	$(DOCKER_COMPOSE_CMD) ps nginx

ssl-init-staging: ## Obter certificado SSL de teste (staging)
	@echo "🧪 Obtendo certificado SSL de teste (staging)..."
	@echo "⚠️  Este é um certificado de TESTE - não será reconhecido pelos navegadores"
	@echo "🔄 Configurando Nginx para HTTP apenas..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) run --rm --entrypoint /bin/sh nginx -c "sh /scripts/nginx-config.sh http"
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) restart nginx
	@sleep 5
	@echo "🔒 Solicitando certificado SSL de teste..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) run --rm --entrypoint /bin/sh certbot -c "SSL_STAGING=true sh /scripts/init-ssl.sh"
	@if [ $$? -eq 0 ]; then \
		echo "✅ Certificado de teste obtido com sucesso!"; \
		echo "🔧 Para obter certificado de produção: make ssl-init-prod"; \
	else \
		echo "❌ Erro ao obter certificado de teste"; \
	fi

ssl-init-prod: ## Obter certificado SSL para produção (Let's Encrypt)
	@echo "🔒 Obtendo certificado SSL para $(DOMAIN)..."
	@echo "⚠️  IMPORTANTE: Certifique-se de que:"
	@echo "   1. O DNS está apontando para este servidor"
	@echo "   2. As portas 80 e 443 estão abertas"
	@echo "   3. O nginx está configurado corretamente"
	@read -p "Continuar? (y/N) " confirm && [ "$$confirm" = "y" ]
	@echo "🔄 Configurando Nginx para HTTP apenas..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) run --rm --entrypoint /bin/sh nginx -c "sh /scripts/nginx-config.sh http"
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) restart nginx
	@sleep 5
	@echo "🔒 Solicitando certificado SSL..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) run --rm --entrypoint /bin/sh certbot -c "sh /scripts/init-ssl.sh"
	@if [ $$? -eq 0 ]; then \
		echo "🔄 Configurando Nginx para HTTPS..."; \
		$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) run --rm --entrypoint /bin/sh nginx -c "sh /scripts/nginx-config.sh https"; \
		$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) restart nginx; \
		echo "✅ SSL configurado com sucesso!"; \
	else \
		echo "❌ Erro ao obter certificado SSL"; \
		echo "📋 Verificando logs..."; \
		$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) run --rm --entrypoint /bin/sh certbot -c "if [ -f /var/log/letsencrypt/letsencrypt.log ]; then echo '=== ÚLTIMAS 20 LINHAS DO LOG ==='; tail -20 /var/log/letsencrypt/letsencrypt.log; fi"; \
		echo "🔧 Para debug: make ssl-debug ou make ssl-test-acme"; \
	fi

ssl-renew: ## Renovar certificado SSL
	@echo "🔄 Renovando certificado SSL para $(DOMAIN)..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) exec certbot /scripts/renew-cert.sh

ssl-check: ## Verificar status do certificado SSL
	@echo "🔍 Verificando status SSL para $(DOMAIN)..."
	@./scripts/check-ssl.sh

ssl-fix-permissions: ## Corrigir permissões dos certificados SSL
	@echo "🔧 Corrigindo permissões SSL..."
	@sudo ./scripts/fix-ssl-permissions.sh

ssl-fix-acme-permissions: ## Corrigir permissões do diretório ACME
	@echo "🔧 Corrigindo permissões ACME..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) stop nginx
	@echo "📁 Criando diretório ACME..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) run --rm --entrypoint /bin/sh certbot -c "mkdir -p /var/www/certbot/.well-known/acme-challenge && chmod 755 /var/www/certbot/.well-known/acme-challenge"
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) up -d nginx
	@echo "✅ Permissões ACME corrigidas!"

ssl-fix-duplicate-upstream: ## Corrigir erro de upstream duplicado
	@echo "🔧 Corrigindo erro de upstream duplicado..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) stop nginx
	@echo "📝 Removendo arquivos de configuração conflitantes..."
	@rm -f ./nginx/conf.d/http-only.conf ./nginx/conf.d/default.conf.disabled
	@echo "📋 Copiando configuração HTTP corrigida..."
	@cp ./nginx/conf.d/http-only.conf.template ./nginx/conf.d/http-only.conf
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) up -d nginx
	@echo "✅ Configuração corrigida! Nginx iniciado com HTTP."

ssl-restart-http: ## Reiniciar nginx apenas com HTTP (para debug SSL)
	@echo "🔄 Reiniciando nginx com configuração HTTP apenas..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) stop nginx
	@./scripts/nginx-switch.sh http
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) up -d nginx
	@echo "✅ Nginx reiniciado com HTTP. Use ssl-init-prod para configurar SSL."

ssl-switch-http: ## Alternar nginx para HTTP sem reiniciar
	@./scripts/nginx-switch.sh http
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) reload nginx 2>/dev/null || $(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) restart nginx

ssl-switch-https: ## Alternar nginx para HTTPS sem reiniciar
	@./scripts/nginx-switch.sh https
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) reload nginx 2>/dev/null || $(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) restart nginx

ssl-config-http: ## Configurar nginx para HTTP via script interno
	@echo "🔧 Configurando nginx para HTTP via script..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) exec nginx /scripts/nginx-config.sh http

ssl-config-https: ## Configurar nginx para HTTPS via script interno  
	@echo "🔧 Configurando nginx para HTTPS via script..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) exec nginx /scripts/nginx-config.sh https

ssl-debug: ## Ver logs detalhados do Let's Encrypt
	@echo "📋 Logs detalhados do Let's Encrypt..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) run --rm --entrypoint /bin/sh certbot -c "if [ -f /var/log/letsencrypt/letsencrypt.log ]; then tail -50 /var/log/letsencrypt/letsencrypt.log; else echo 'Log não encontrado'; fi"

ssl-test-acme: ## Testar acesso ao endpoint ACME challenge
	@echo "🧪 Testando acesso ACME challenge..."
	@echo "📝 Criando arquivo de teste..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) run --rm --entrypoint /bin/sh certbot -c "echo 'test-$(shell date +%s)' > /var/www/certbot/.well-known/acme-challenge/test.txt"
	@echo "🌐 Testando acesso via HTTP..."
	@sleep 2
	@if command -v curl >/dev/null 2>&1; then \
		echo "URL: http://$(DOMAIN)/.well-known/acme-challenge/test.txt"; \
		curl -v "http://$(DOMAIN)/.well-known/acme-challenge/test.txt" || echo "❌ Falha no acesso"; \
	else \
		echo "curl não disponível. Teste manualmente: http://$(DOMAIN)/.well-known/acme-challenge/test.txt"; \
	fi
	@echo "🧹 Limpando arquivo de teste..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) run --rm --entrypoint /bin/sh certbot -c "rm -f /var/www/certbot/.well-known/acme-challenge/test.txt"

ssl-force-renew: ## Forçar renovação do certificado SSL
	@echo "🔄 Forçando renovação do certificado SSL..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) run --rm certbot certbot renew --force-renewal
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) restart nginx

ssl-test: ## Testar se o SSL está funcionando corretamente
	@echo "🧪 Testando SSL/HTTPS..."
	@echo "📋 Verificando status do nginx..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) exec nginx nginx -t || echo "❌ Configuração nginx inválida"
	@echo ""
	@echo "🔒 Testando acesso HTTPS..."
	@if command -v curl >/dev/null 2>&1; then \
		echo "URL: https://$(DOMAIN)/health"; \
		curl -I "https://$(DOMAIN)/health" 2>/dev/null | head -5 || echo "❌ Falha no acesso HTTPS"; \
		echo ""; \
		echo "📜 Verificando certificado..."; \
		curl -I "https://$(DOMAIN)" 2>&1 | grep -E "(HTTP|Server|SSL|TLS)" || echo "ℹ️  Informações SSL não disponíveis"; \
	else \
		echo "curl não disponível. Teste manualmente: https://$(DOMAIN)"; \
	fi
	@echo ""
	@echo "📊 Status dos containers..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) ps nginx

ssl-status: ## Ver status completo do SSL
	@echo "📊 Status completo do SSL..."
	@echo ""
	@echo "🔍 Verificando configuração nginx..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) run --rm --entrypoint /bin/sh nginx -c "/scripts/nginx-config.sh status"
	@echo ""
	@echo "📜 Informações do certificado..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) run --rm --entrypoint /bin/sh certbot -c "if [ -f /etc/letsencrypt/live/$(DOMAIN)/fullchain.pem ]; then openssl x509 -in /etc/letsencrypt/live/$(DOMAIN)/fullchain.pem -text -noout | grep -E '(Subject:|Not After)'; elif [ -f /etc/letsencrypt/live/$(DOMAIN)-0001/fullchain.pem ]; then openssl x509 -in /etc/letsencrypt/live/$(DOMAIN)-0001/fullchain.pem -text -noout | grep -E '(Subject:|Not After)'; else echo 'Certificado não encontrado'; fi"

ssl-finish: ## Finalizar configuração SSL (ativar HTTPS)
	@echo "🎯 Finalizando configuração SSL..."
	@echo "🔄 Ativando configuração HTTPS..."
	@# Verificar se o certificado existe
	@if $(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) run --rm --entrypoint /bin/sh certbot -c "test -f /etc/letsencrypt/live/$(DOMAIN)/fullchain.pem || test -f /etc/letsencrypt/live/$(DOMAIN)-0001/fullchain.pem"; then \
		echo "✅ Certificado encontrado"; \
	else \
		echo "❌ Certificado não encontrado. Execute: make ssl-init-prod"; \
		exit 1; \
	fi
	@# Desativar HTTP e ativar HTTPS diretamente
	@echo "🔧 Alternando configurações..."
	@if [ -f ./nginx/conf.d/http-only.conf ]; then \
		mv ./nginx/conf.d/http-only.conf ./nginx/conf.d/http-only.conf.disabled || rm ./nginx/conf.d/http-only.conf; \
		echo "✅ Configuração HTTP desativada"; \
	fi
	@if [ -f ./nginx/conf.d/default.conf.disabled ]; then \
		mv ./nginx/conf.d/default.conf.disabled ./nginx/conf.d/default.conf || cp ./nginx/conf.d/default.conf.disabled ./nginx/conf.d/default.conf; \
		echo "✅ Configuração HTTPS ativada"; \
	elif [ ! -f ./nginx/conf.d/default.conf ]; then \
		echo "❌ Arquivo default.conf não encontrado"; \
		exit 1; \
	else \
		echo "✅ Configuração HTTPS já ativa"; \
	fi
	@echo "🔄 Reiniciando Nginx..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) restart nginx
	@echo ""
	@echo "✅ SSL finalizado! Testando..."
	@sleep 3
	@make ssl-test

ssl-config-check: ## Verificar e mostrar configuração atual do nginx
	@echo "📋 Verificando configuração atual do nginx..."
	@echo ""
	@echo "📁 Arquivos em nginx/conf.d/:"
	@ls -la ./nginx/conf.d/ || echo "❌ Diretório não encontrado"
	@echo ""
	@echo "🔍 Configurações ativas:"
	@if [ -f ./nginx/conf.d/http-only.conf ]; then \
		echo "🌐 HTTP: ✅ Ativo (http-only.conf)"; \
	else \
		echo "🌐 HTTP: ❌ Inativo"; \
	fi
	@if [ -f ./nginx/conf.d/default.conf ]; then \
		echo "🔒 HTTPS: ✅ Ativo (default.conf)"; \
	else \
		echo "🔒 HTTPS: ❌ Inativo"; \
	fi
	@echo ""
	@echo "📜 Certificados:"
	@$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) run --rm --entrypoint /bin/sh certbot -c "ls -la /etc/letsencrypt/live/ 2>/dev/null || echo 'Nenhum certificado encontrado'"

ssl-config-fix: ## Corrigir configuração SSL manualmente
	@echo "🔧 Corrigindo configuração SSL..."
	@echo "📋 Estado atual dos arquivos:"
	@ls -la ./nginx/conf.d/
	@echo ""
	@echo "🔄 Organizando configurações..."
	@# Garantir que apenas uma configuração esteja ativa
	@if [ -f ./nginx/conf.d/http-only.conf ] && [ -f ./nginx/conf.d/default.conf ]; then \
		echo "⚠️  Ambas configurações ativas - desativando HTTP"; \
		mv ./nginx/conf.d/http-only.conf ./nginx/conf.d/http-only.conf.disabled 2>/dev/null || rm ./nginx/conf.d/http-only.conf; \
	fi
	@# Verificar se temos certificado para ativar HTTPS
	@if $(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) run --rm --entrypoint /bin/sh certbot -c "test -f /etc/letsencrypt/live/$(DOMAIN)/fullchain.pem || test -f /etc/letsencrypt/live/$(DOMAIN)-0001/fullchain.pem" 2>/dev/null; then \
		echo "✅ Certificado encontrado - ativando HTTPS"; \
		if [ -f ./nginx/conf.d/default.conf.disabled ]; then \
			mv ./nginx/conf.d/default.conf.disabled ./nginx/conf.d/default.conf; \
		fi; \
		if [ -f ./nginx/conf.d/http-only.conf ]; then \
			mv ./nginx/conf.d/http-only.conf ./nginx/conf.d/http-only.conf.disabled; \
		fi; \
	else \
		echo "❌ Certificado não encontrado - mantendo HTTP"; \
		if [ ! -f ./nginx/conf.d/http-only.conf ]; then \
			cp ./nginx/conf.d/http-only.conf.template ./nginx/conf.d/http-only.conf 2>/dev/null || echo "Template não encontrado"; \
		fi; \
	fi
	@echo "✅ Configuração corrigida!"
	@echo ""
	@echo "📋 Estado final:"
	@ls -la ./nginx/conf.d/
	@echo ""
	@echo "🔄 Reiniciando nginx..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) restart nginx

## Produção
prod-up: ## Iniciar ambiente de produção
	@echo "🚀 Iniciando ambiente de produção..."
	@if [ ! -f .env ]; then \
		echo "⚠️  Arquivo .env não encontrado. Copiando exemplo..."; \
		cp .env.example .env; \
		echo "📝 Configure as variáveis em .env antes de continuar!"; \
		exit 1; \
	fi
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) up -d
	@echo "✅ Ambiente de produção iniciado!"
	@echo "🌐 Aplicação: http://localhost"
	@echo "🔗 API: http://localhost/api"

prod-down: ## Parar ambiente de produção
	@echo "🛑 Parando ambiente de produção..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) down

prod-logs: ## Ver logs do ambiente de produção
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) logs -f

prod-rebuild: ## Rebuild dos containers de produção
	@echo "🔄 Fazendo rebuild dos containers de produção..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) up --build -d

## Utilitários
logs: ## Ver logs de todos os containers
	$(DOCKER_COMPOSE_CMD) logs -f

build: ## Build de todas as imagens
	@echo "🔨 Fazendo build de todas as imagens..."
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) build
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_DEV) build

clean: ## Limpar containers, imagens e volumes não utilizados
	@echo "🧹 Limpando recursos não utilizados..."
	docker system prune -f
	docker volume prune -f

clean-all: ## Limpar tudo relacionado ao projeto (CUIDADO!)
	@echo "⚠️  Esta ação irá remover TODOS os dados do projeto!"
	@echo "Pressione Ctrl+C para cancelar ou Enter para continuar..."
	@read
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) down -v --remove-orphans
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_DEV) down -v --remove-orphans
	docker rmi -f $$(docker images "*$(PROJECT_NAME)*" -q) 2>/dev/null || true
	docker volume rm $$(docker volume ls -q | grep "gf-") 2>/dev/null || true

status: ## Mostrar status dos containers e SSL
	@echo "📊 Status dos containers:"
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) ps 2>/dev/null || echo "Produção: não iniciada"
	@echo ""
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_DEV) ps 2>/dev/null || echo "Desenvolvimento: não iniciada"
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
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) exec api sh

shell-web: ## Abrir shell no container web
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) exec web sh

shell-nginx: ## Abrir shell no container nginx
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) exec nginx sh

## Banco de Dados
db-mysql: ## Conectar ao MySQL
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) exec mysql mysql -u$${DB_USER:-gf_user} -p$${DB_PASSWORD:-gf_password} $${DB_NAME:-gerenciador_financeiro}

db-mongo: ## Conectar ao MongoDB
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) exec mongodb mongosh "mongodb://$${MONGO_ROOT_USER:-admin}:$${MONGO_ROOT_PASSWORD:-adminpassword}@localhost:27017/$${MONGO_DB:-gerenciador_logs}?authSource=admin"

## Backup e Restore
backup: ## Fazer backup completo (bancos de dados + certificados SSL)
	@echo "💾 Fazendo backup completo..."
	@mkdir -p backups
	@BACKUP_DIR="backups/$$(date +%Y%m%d_%H%M%S)"; \
	mkdir -p "$$BACKUP_DIR"; \
	echo "📁 Criando backup em $$BACKUP_DIR"; \
	echo "💾 Backup MySQL..."; \
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) exec mysql mysqldump -u$${DB_USER:-gf_user} -p$${DB_PASSWORD:-gf_password} $${DB_NAME:-gerenciador_financeiro} > "$$BACKUP_DIR/mysql_backup.sql" || echo "⚠️  MySQL backup falhou"; \
	echo "💾 Backup MongoDB..."; \
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) exec mongodb mongodump --uri="mongodb://$${MONGO_ROOT_USER:-admin}:$${MONGO_ROOT_PASSWORD:-adminpassword}@localhost:27017/$${MONGO_DB:-gerenciador_logs}?authSource=admin" --out=/tmp/backup; \
	docker cp $$($(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) ps -q mongodb):/tmp/backup "$$BACKUP_DIR/mongodb_backup" || echo "⚠️  MongoDB backup falhou"; \
	echo "🔒 Backup certificados SSL..."; \
	docker run --rm -v gf-certbot-certs:/data -v "$$(pwd)/$$BACKUP_DIR":/backup ubuntu tar czf /backup/ssl-certificates.tar.gz -C /data . || echo "⚠️  SSL backup falhou"; \
	echo "📦 Backup volumes..."; \
	docker run --rm -v gf-mysql-data:/data -v "$$(pwd)/$$BACKUP_DIR":/backup ubuntu tar czf /backup/mysql-volume.tar.gz -C /data . || echo "⚠️  MySQL volume backup falhou"; \
	docker run --rm -v gf-mongodb-data:/data -v "$$(pwd)/$$BACKUP_DIR":/backup ubuntu tar czf /backup/mongodb-volume.tar.gz -C /data . || echo "⚠️  MongoDB volume backup falhou"; \
	echo "✅ Backup completo criado em $$BACKUP_DIR"; \
	ls -la "$$BACKUP_DIR"

## Monitoramento
health: ## Verificar saúde dos containers e sistema
	@echo "🏥 Verificando saúde dos containers..."
	@for container in $$($(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) ps -q 2>/dev/null); do \
		name=$$(docker inspect $$container --format='{{.Name}}' | sed 's/\///'); \
		health=$$(docker inspect $$container --format='{{.State.Health.Status}}' 2>/dev/null || echo "no-health-check"); \
		status=$$(docker inspect $$container --format='{{.State.Status}}'); \
		echo "$$name: $$status (health: $$health)"; \
	done
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
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) logs --tail=20 nginx 2>/dev/null || echo "Container nginx não encontrado"
	@echo ""
	@echo "--- Certbot ---"
	$(DOCKER_COMPOSE_CMD) -f $(COMPOSE_FILE_PROD) logs --tail=20 certbot 2>/dev/null || echo "Container certbot não encontrado"
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
	@$(DOCKER_COMPOSE_CMD) --version 2>/dev/null || $(DOCKER_COMPOSE_CMD) version 2>/dev/null
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