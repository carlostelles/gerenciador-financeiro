FROM nginx:alpine

# Instalar curl e openssl para healthcheck e SSL
RUN apk --no-cache add curl openssl

# Copiar configurações customizadas
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# Criar diretórios necessários para SSL e Let's Encrypt
RUN mkdir -p /var/www/certbot
RUN mkdir -p /etc/letsencrypt/live/controle-financeiro.gaius.digital && \
    openssl req -x509 -nodes -days 1 \
      -subj "/CN=localhost" \
      -newkey rsa:2048 \
      -keyout /etc/letsencrypt/live/controle-financeiro.gaius.digital/privkey.pem \
      -out /etc/letsencrypt/live/controle-financeiro.gaius.digital/fullchain.pem

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S nginx-user -u 1001 -G nginx-user

# Ajustar permissões
RUN chown -R nginx-user:nginx-user /var/cache/nginx && \
    chown -R nginx-user:nginx-user /var/log/nginx && \
    chown -R nginx-user:nginx-user /etc/nginx && \
    chown -R nginx-user:nginx-user /var/www/certbot && \
    touch /var/run/nginx.pid && \
    chown -R nginx-user:nginx-user /var/run/nginx.pid

# Mudar para usuário não-root
USER nginx-user

# Expor portas
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:80/health || exit 1

# Comando de produção
CMD ["nginx", "-g", "daemon off;"]