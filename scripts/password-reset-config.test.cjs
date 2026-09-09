const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const read = file => readFileSync(resolve(__dirname, '..', file), 'utf8');

test('backend examples and production compose expose reset settings without default secrets', () => {
  for (const file of ['.env.example', 'api/.env.example', 'docker-compose.yml', 'api/docker-compose.prod.yml']) {
    const content = read(file);
    for (const key of ['HOSTINGER_MAIL_API_TOKEN', 'HOSTINGER_MAIL_MAILBOX_ID', 'PASSWORD_RESET_WEB_ORIGIN', 'TRUSTED_PROXY_CIDRS', 'PASSWORD_RESET_ACTIVE_KEY_ID', 'PASSWORD_RESET_KEYRING', 'PASSWORD_RESET_DELIVERY_ENABLED']) assert.ok(content.includes(key), `${file}: ${key}`);
    assert.doesNotMatch(content, /HOSTINGER_MAIL_API_TOKEN[:=][ \t]*[a-zA-Z0-9]{8}/);
  }
});

test('public SPA is no-referrer and not cached as HTML', () => {
  assert.match(read('web/src/index.html'), /name="referrer" content="no-referrer"/);
  assert.match(read('web/nginx.conf'), /add_header Referrer-Policy "no-referrer" always/);
  assert.match(read('web/nginx.conf'), /add_header Cache-Control "no-store" always/);
});

test('API locations overwrite untrusted XFF in every nginx configuration', () => {
  for (const file of ['nginx/conf.d/default.conf', 'nginx/conf.d/http-only.conf', 'nginx/conf.d/http-only.conf.template']) {
    const content = read(file);
    const api = content.split('location /api/ {')[1].split('# Frontend application')[0];
    assert.match(api, /proxy_set_header X-Forwarded-For \$remote_addr;/);
    assert.match(api, /rewrite \^\/api\//);
    assert.match(content, /Referrer-Policy "no-referrer"/);
  }
});

test('no mail secret in Angular runtime environment', () => {
  for (const file of ['web/src/environments/environment.ts', 'web/src/environments/environment.prod.ts', 'web/src/environments/environment.example.ts']) {
    assert.doesNotMatch(read(file), /HOSTINGER_MAIL_API_TOKEN|HOSTINGER_MAIL_MAILBOX_ID|PASSWORD_RESET_KEYRING|PASSWORD_RESET_ACTIVE_KEY_ID/);
  }
});

test('worker has shutdown hooks and production grace period', () => {
  assert.match(read('api/src/main.ts'), /app.enableShutdownHooks\(\)/);
  for (const file of ['docker-compose.yml', 'api/docker-compose.prod.yml']) assert.match(read(file), /stop_grace_period: 20s/);
});