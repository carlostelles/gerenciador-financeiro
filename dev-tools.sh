#!/bin/bash

# ========================================
# COMANDOS ÚTEIS - GERENCIADOR FINANCEIRO
# ========================================

echo "🏦 Gerenciador Financeiro - Comandos Úteis"
echo "=========================================="

# Função para mostrar menu
show_menu() {
    echo ""
    echo "Escolha uma opção:"
    echo ""
    echo "📊 GESTÃO DO PROJETO:"
    echo "  1) Status completo do projeto"
    echo "  2) Verificar saúde dos serviços"
    echo "  3) Ver logs em tempo real"
    echo "  4) Limpar recursos Docker"
    echo ""
    echo "🚀 DESENVOLVIMENTO:"
    echo "  5) Iniciar ambiente de desenvolvimento"
    echo "  6) Parar ambiente de desenvolvimento"  
    echo "  7) Reiniciar API local"
    echo "  8) Reiniciar Web local"
    echo ""
    echo "🐳 PRODUÇÃO:"
    echo "  9) Iniciar ambiente de produção"
    echo " 10) Parar ambiente de produção"
    echo " 11) Rebuild e restart produção"
    echo " 12) Backup dos dados"
    echo ""
    echo "🧪 TESTES:"
    echo " 13) Executar todos os testes"
    echo " 14) Testes com coverage"
    echo " 15) Testes E2E"
    echo " 16) Lint e formatação"
    echo ""
    echo "📚 BANCO DE DADOS:"
    echo " 17) Conectar ao MySQL"
    echo " 18) Conectar ao MongoDB"
    echo " 19) Fazer seed do banco"
    echo " 20) Reset completo do banco"
    echo ""
    echo "🛠️  UTILITÁRIOS:"
    echo " 21) Instalar dependências"
    echo " 22) Atualizar dependências"
    echo " 23) Gerar documentação"
    echo " 24) Verificar segurança"
    echo ""
    echo "  0) Sair"
    echo ""
    echo -n "Digite sua opção: "
}

# Função para executar comandos com feedback
run_command() {
    echo ""
    echo "🔄 Executando: $1"
    echo "----------------------------------------"
    eval $1
    echo "----------------------------------------"
    echo "✅ Comando concluído!"
    echo ""
    echo "Pressione ENTER para continuar..."
    read
}

# Loop principal
while true; do
    clear
    show_menu
    read choice
    
    case $choice in
        1)
            run_command "make status && echo '' && docker-compose ps && echo '' && docker system df"
            ;;
        2)
            run_command "make health"
            ;;
        3)
            echo "📋 Logs em tempo real (Ctrl+C para sair):"
            docker-compose logs -f
            ;;
        4)
            run_command "make clean"
            ;;
        5)
            run_command "./setup.sh dev"
            ;;
        6)
            run_command "make dev-down"
            ;;
        7)
            echo "🔄 Reiniciando API local..."
            cd api
            pkill -f "nest start" 2>/dev/null || true
            npm run start:dev &
            echo "✅ API reiniciada em background"
            cd ..
            echo "Pressione ENTER para continuar..."
            read
            ;;
        8)
            echo "🔄 Reiniciando Web local..."
            cd web/gerenciador-financeiro
            pkill -f "ng serve" 2>/dev/null || true
            npm start &
            echo "✅ Web reiniciada em background"
            cd ../..
            echo "Pressione ENTER para continuar..."
            read
            ;;
        9)
            run_command "./setup.sh prod"
            ;;
        10)
            run_command "make prod-down"
            ;;
        11)
            run_command "make prod-rebuild"
            ;;
        12)
            run_command "make backup"
            ;;
        13)
            echo "🧪 Executando todos os testes..."
            echo ""
            echo "📍 Testes do Backend:"
            cd api && npm run test && cd ..
            echo ""
            echo "📍 Testes do Frontend:"  
            cd web/gerenciador-financeiro && npm run test && cd ../..
            echo ""
            echo "✅ Todos os testes concluídos!"
            echo "Pressione ENTER para continuar..."
            read
            ;;
        14)
            echo "📊 Executando testes com coverage..."
            echo ""
            echo "📍 Coverage do Backend:"
            cd api && npm run test:cov && cd ..
            echo ""
            echo "📍 Coverage do Frontend:"
            cd web/gerenciador-financeiro && npm run test:coverage && cd ../..
            echo ""
            echo "📊 Relatórios gerados:"
            echo "  - Backend: api/coverage/index.html"
            echo "  - Frontend: web/gerenciador-financeiro/coverage/index.html"
            echo ""
            echo "Pressione ENTER para continuar..."
            read
            ;;
        15)
            run_command "cd api && npm run test:e2e"
            ;;
        16)
            echo "🔍 Executando lint e formatação..."
            echo ""
            echo "📍 Backend:"
            cd api && npm run lint && npm run format && cd ..
            echo ""
            echo "📍 Frontend:"
            cd web/gerenciador-financeiro && npm run lint && cd ../..
            echo ""
            echo "✅ Código formatado!"
            echo "Pressione ENTER para continuar..."
            read
            ;;
        17)
            echo "🔌 Conectando ao MySQL..."
            echo "Credenciais: usuário=gf_user, senha=gf_password123, database=gerenciador_financeiro"
            docker-compose exec mysql mysql -u gf_user -pgf_password123 gerenciador_financeiro
            ;;
        18)
            echo "🔌 Conectando ao MongoDB..."
            docker-compose exec mongodb mongosh -u admin -p adminpassword123 --authenticationDatabase admin gerenciador_logs
            ;;
        19)
            run_command "cd api && npm run seed"
            ;;
        20)
            echo "⚠️  ATENÇÃO: Isso irá apagar TODOS os dados!"
            echo -n "Tem certeza? (digite 'SIM' para confirmar): "
            read confirm
            if [ "$confirm" = "SIM" ]; then
                run_command "docker-compose down -v && docker-compose up -d && sleep 10 && cd api && npm run seed"
            else
                echo "❌ Operação cancelada."
                echo "Pressione ENTER para continuar..."
                read
            fi
            ;;
        21)
            echo "📦 Instalando dependências..."
            echo ""
            echo "📍 Backend:"
            cd api && npm install && cd ..
            echo ""
            echo "📍 Frontend:"
            cd web/gerenciador-financeiro && npm install && cd ../..
            echo ""
            echo "✅ Dependências instaladas!"
            echo "Pressione ENTER para continuar..."
            read
            ;;
        22)
            echo "🔄 Atualizando dependências..."
            echo ""
            echo "📍 Verificando atualizações Backend:"
            cd api && npm outdated && cd ..
            echo ""
            echo "📍 Verificando atualizações Frontend:"
            cd web/gerenciador-financeiro && npm outdated && cd ../..
            echo ""
            echo "ℹ️  Para atualizar, execute: npm update"
            echo "Pressione ENTER para continuar..."
            read
            ;;
        23)
            echo "📚 Gerando documentação..."
            echo ""
            if [ -f "api/package.json" ]; then
                echo "📍 Documentação da API:"
                echo "  - Swagger: http://localhost:3000/api/docs (em desenvolvimento)"
                echo "  - Compodoc: Executar 'npm run doc' na pasta api"
            fi
            echo ""
            echo "📍 Documentação disponível:"
            find . -name "*.md" -not -path "./node_modules/*" -not -path "./.git/*"
            echo ""
            echo "Pressione ENTER para continuar..."
            read
            ;;
        24)
            echo "🔒 Verificando segurança..."
            echo ""
            echo "📍 Auditoria Backend:"
            cd api && npm audit && cd ..
            echo ""
            echo "📍 Auditoria Frontend:"
            cd web/gerenciador-financeiro && npm audit && cd ../..
            echo ""
            echo "🔍 Para corrigir vulnerabilidades:"
            echo "  - npm audit fix"
            echo "  - npm audit fix --force (cuidado!)"
            echo ""
            echo "Pressione ENTER para continuar..."
            read
            ;;
        0)
            echo ""
            echo "👋 Até logo!"
            exit 0
            ;;
        *)
            echo ""
            echo "❌ Opção inválida. Tente novamente."
            echo "Pressione ENTER para continuar..."
            read
            ;;
    esac
done