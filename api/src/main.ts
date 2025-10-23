import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global interceptor for logging
  app.useGlobalInterceptors(new LoggingInterceptor());

  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = process.env.PORT || 3000;

  // Swagger configuration - apenas em desenvolvimento
  const enableSwagger = process.env.ENABLE_SWAGGER === 'true' || process.env.NODE_ENV === 'development';
  
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Gerenciador Financeiro API')
      .setDescription('API RESTful para Gerenciamento Financeiro')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Insira o token JWT',
        },
        'access-token',
      )
      .addTag('auth', 'Autenticação')
      .addTag('usuarios', 'Gestão de Usuários')
      .addTag('categorias', 'Gestão de Categorias')
      .addTag('orcamentos', 'Gestão de Orçamentos')
      .addTag('movimentacoes', 'Gestão de Movimentações')
      .addTag('reservas', 'Gestão de Reservas')
      .addTag('logs', 'Logs do Sistema')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    
    console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
  }

  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
}

bootstrap();