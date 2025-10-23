import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsuariosService } from '../src/modules/usuarios/usuarios.service';
import { UserRole } from '../src/common/types';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usuariosService = app.get(UsuariosService);

  try {
    console.log('🌱 Iniciando seed do banco de dados...\n');

    // Criar usuário admin padrão
    const adminUser = {
      nome: 'Administrador',
      email: 'admin@gerenciador.com',
      senha: 'admin123456',
      telefone: '5511999999999',
      role: UserRole.ADMIN,
    };

    const existingAdmin = await usuariosService.findByEmail(adminUser.email);
    
    if (!existingAdmin) {
      await usuariosService.create(adminUser);
      console.log('✅ Usuário administrador criado com sucesso!');
      console.log('📧 Email: admin@gerenciador.com');
      console.log('🔑 Senha: admin123456');
    } else {
      console.log('ℹ️  Usuário administrador já existe');
    }

    // Criar usuário comum para testes
    const testUser = {
      nome: 'João Silva',
      email: 'joao@gerenciador.com',
      senha: 'joao123456',
      telefone: '5511777777777',
      role: UserRole.USER,
    };

    const existingUser = await usuariosService.findByEmail(testUser.email);
    
    if (!existingUser) {
      await usuariosService.create(testUser);
      console.log('✅ Usuário comum criado com sucesso!');
      console.log('📧 Email: joao@gerenciador.com');
      console.log('🔑 Senha: joao123456');
    } else {
      console.log('ℹ️  Usuário comum já existe');
    }

    console.log('\n🎉 Seed concluído com sucesso!');
    console.log('\n📋 Dados de acesso:');
    console.log('👤 Admin: admin@gerenciador.com / admin123456');
    console.log('👤 User: joao@gerenciador.com / joao123456');
    console.log('\n🌐 API rodando em: http://localhost:3000');
    console.log('📚 Documentação: http://localhost:3000/api/docs');
    console.log('\n💡 Para criar categorias, faça login via API e use os endpoints de categorias');

  } catch (error) {
    console.error('❌ Erro durante o seed:', error.message);
  } finally {
    await app.close();
  }
}

seed();