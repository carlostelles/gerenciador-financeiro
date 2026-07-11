#!/bin/bash

# Script de inicialização do Gerenciador Financeiro
# Uso: ./setup.sh [prod|dev]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Banner
echo -e "${BLUE}"
cat << "EOF"
 ____                        _           _            
|  _ \ ___  __ _ _   _  ___  (_)_ __ ___ | |_ ___  _ _ 
| |_) / _ \/ _` | | | |/ _ \ | | '__/ _ \| __/ _ \| '_|
|  _ <  __/ (_| | |_| |  __/ | | | | (_) | || (_) | | 
|_| \_\___|\__, |\__,_|\___| |_|_|  \___/ \__\___/|_| 
           |___/                                      
   ____                       _                       
  / ___| ___ _ __ ___ _ __   ___(_) __ _  __| | ___  _ __   
 | |  _ / _ \ '__/ _ \ '_ \ / __| |/ _` |/ _` |/ _ \| '__|  
 | |_| |  __/ | |  __/ | | \__ \ | (_| | (_| | (_) | |     
  \____|\___|_|  \___|_| |_|___/_|\__,_|\__,_|\___/|_|     
                                                          
  _____ _                          _                 
 |  ___(_)_ __   __ _ _ __   ___ ___(_)_ __ ___       
 | |_  | | '_ \ / _` | '_ \ / __/ _ \ | '__/ _ \      
 |  _| | | | | | (_| | | | | (_|  __/ | | | (_) |     
 |_|   |_|_| |_|\__,_|_| |_|\___\___|_|_|  \___/      
                                                      
EOF
echo -e "${NC}"

log "Iniciando setup do Gerenciador Financeiro..."

# Verificar se Docker e Docker Compose estão instalados
info "Verificando dependências..."

if ! command -v docker &> /dev/null; then
    error "Docker não está instalado. Por favor, instale o Docker primeiro."
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    error "Docker Compose não está instalado. Por favor, instale o Docker Compose primeiro."
    #exit 1
fi

log "✅ Docker $(docker --version)"
log "✅ Docker Compose $(docker compose version)"

# Determinar ambiente
ENVIRONMENT=${1:-prod}

if [[ "$ENVIRONMENT" != "prod" && "$ENVIRONMENT" != "dev" ]]; then
    error "Ambiente inválido. Use 'prod' ou 'dev'."
    echo "Uso: $0 [prod|dev]"
    exit 1
fi

info "Ambiente selecionado: $ENVIRONMENT"

# Configurar variáveis de ambiente para produção
if [[ "$ENVIRONMENT" == "prod" ]]; then
    if [[ ! -f .env ]]; then
        log "Criando arquivo .env a partir do exemplo..."
        cp .env.example .env
        
        warn "⚠️  IMPORTANTE: Configure as variáveis no arquivo .env antes de continuar!"
        warn "   Especialmente as senhas e secrets para produção."
        
        read -p "Deseja editar o arquivo .env agora? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ${EDITOR:-nano} .env
        fi
        
        read -p "Continuar com o setup? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            info "Setup cancelado. Configure o .env e execute novamente."
            exit 0
        fi
    else
        log "Arquivo .env encontrado."
    fi
fi

# Verificar se as portas estão disponíveis
info "Verificando disponibilidade de portas..."

check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        warn "Porta $port já está em uso ($service)"
        read -p "Deseja continuar mesmo assim? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        log "✅ Porta $port disponível ($service)"
    fi
}

if [[ "$ENVIRONMENT" == "prod" ]]; then
    check_port 80 "Nginx"
    check_port 3306 "MySQL"
    check_port 27017 "MongoDB"
else
    check_port 3000 "API"
    check_port 3306 "MySQL"
    check_port 27017 "MongoDB"
fi

# Fazer pull das imagens base para acelerar o build
info "Fazendo pull das imagens base..."
docker pull node:20-alpine
docker pull mysql:8.0
docker pull mongo:7.0
docker pull nginx:alpine

# Iniciar os serviços
log "Iniciando serviços..."

if [[ "$ENVIRONMENT" == "prod" ]]; then
    log "🚀 Iniciando ambiente de produção..."
    docker compose up --build -d
    
    # Aguardar que os serviços estejam prontos
    log "⏳ Aguardando serviços ficarem prontos..."
    sleep 10
    
    # Verificar health checks
    log "🏥 Verificando saúde dos serviços..."
    
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost/health >/dev/null 2>&1; then
            log "✅ Todos os serviços estão funcionando!"
            break
        fi
        
        attempt=$((attempt + 1))
        log "Tentativa $attempt/$max_attempts - Aguardando serviços..."
        sleep 5
    done
    
    if [ $attempt -eq $max_attempts ]; then
        error "Timeout aguardando serviços. Verifique os logs."
        docker compose logs
        exit 1
    fi
    
    # URLs de sucesso
    echo ""
    echo -e "${GREEN}🎉 Setup concluído com sucesso!${NC}"
    echo ""
    echo -e "${BLUE}📍 URLs de Acesso:${NC}"
    echo -e "   🌐 Aplicação: ${GREEN}http://localhost${NC}"
    echo -e "   🔗 API: ${GREEN}http://localhost/api${NC}"
    echo -e "   📊 Health Check: ${GREEN}http://localhost/health${NC}"
    echo ""
    echo -e "${BLUE}🛠️  Comandos Úteis:${NC}"
    echo -e "   📋 Ver logs: ${YELLOW}make prod-logs${NC}"
    echo -e "   🛑 Parar: ${YELLOW}make prod-down${NC}"
    echo -e "   🔄 Restart: ${YELLOW}make prod-rebuild${NC}"
    
else
    log "🚀 Iniciando ambiente de desenvolvimento..."
    docker compose -f docker-compose.dev.yml up -d
    
    # Aguardar bancos de dados
    log "⏳ Aguardando bancos de dados..."
    sleep 15
    
    echo ""
    echo -e "${GREEN}🎉 Bancos de dados iniciados!${NC}"
    echo ""
    echo -e "${BLUE}📍 Serviços Disponíveis:${NC}"
    echo -e "   📊 MySQL: ${GREEN}localhost:3306${NC}"
    echo -e "   🍃 MongoDB: ${GREEN}localhost:27017${NC}"
    echo ""
    echo -e "${BLUE}🏃‍♂️ Para Desenvolvimento Local:${NC}"
    echo -e "   🔧 API: ${YELLOW}cd api && npm install && npm run start:dev${NC}"
    echo -e "   🌐 Web: ${YELLOW}cd web && npm install && npm start${NC}"
    echo ""
    echo -e "${BLUE}🛠️  Comandos Úteis:${NC}"
    echo -e "   📋 Ver logs: ${YELLOW}make dev-logs${NC}"
    echo -e "   🛑 Parar: ${YELLOW}make dev-down${NC}"
fi

# Informações adicionais
echo ""
echo -e "${BLUE}📚 Documentação:${NC}"
echo -e "   🐳 Docker: ${YELLOW}cat DOCKER_README.md${NC}"
echo -e "   🔧 API: ${YELLOW}cat api/README.md${NC}"
echo -e "   🌐 Web: ${YELLOW}cat web/README.md${NC}"
echo ""
echo -e "${BLUE}🤝 Suporte:${NC}"
echo -e "   📋 Makefile: ${YELLOW}make help${NC}"
echo -e "   🔍 Status: ${YELLOW}make status${NC}"
echo -e "   🏥 Health: ${YELLOW}make health${NC}"

log "Setup finalizado! 🚀"