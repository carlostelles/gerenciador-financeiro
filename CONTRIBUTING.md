# 🤝 Guia de Contribuição

Obrigado pelo interesse em contribuir com o **Gerenciador Financeiro**! Este documento fornece diretrizes para contribuições efetivas.

## 📋 Índice

- [🚀 Quick Start](#-quick-start)
- [🏗️ Estrutura do Projeto](#️-estrutura-do-projeto)
- [💻 Ambiente de Desenvolvimento](#-ambiente-de-desenvolvimento)
- [🎯 Como Contribuir](#-como-contribuir)
- [📝 Padrões de Código](#-padrões-de-código)
- [🧪 Testes](#-testes)
- [📚 Documentação](#-documentação)
- [🔧 Troubleshooting](#-troubleshooting)

## 🚀 Quick Start

```bash
# 1. Fork e clone o repositório
git clone https://github.com/SEU-USUARIO/gerenciador-financeiro.git
cd gerenciador-financeiro

# 2. Setup ambiente de desenvolvimento
./setup.sh dev

# 3. Criar branch para sua feature
git checkout -b feature/minha-nova-feature

# 4. Desenvolver e testar
# ... fazer alterações ...

# 5. Executar testes
npm run test        # Backend
npm run test:e2e    # E2E Backend
cd web && npm run test  # Frontend

# 6. Commit e push
git add .
git commit -m "feat: adiciona nova funcionalidade"
git push origin feature/minha-nova-feature

# 7. Abrir Pull Request
```

## 🏗️ Estrutura do Projeto

```
gerenciador-financeiro/
├── 📁 api/                 # Backend NestJS
│   ├── src/
│   │   ├── modules/        # Módulos da aplicação
│   │   ├── common/         # Código compartilhado
│   │   └── config/         # Configurações
│   ├── test/               # Testes E2E
│   └── scripts/            # Scripts utilitários
│
├── 📁 web/                 # Frontend Angular
│   └── gerenciador-financeiro/
│       ├── src/
│       │   ├── app/        # Aplicação Angular
│       │   │   ├── core/   # Serviços core
│       │   │   ├── pages/  # Páginas/Componentes
│       │   │   └── shared/ # Componentes compartilhados
│       │   └── styles.scss # Estilos globais
│
├── 📁 nginx/               # Configuração Nginx
├── 📁 docker/              # Scripts e configs Docker
├── 🐳 docker-compose.yml   # Orquestração produção
├── 🐳 docker-compose.dev.yml # Orquestração desenvolvimento
├── 📝 Makefile            # Comandos automatizados
└── 🚀 setup.sh            # Setup automático
```

## 💻 Ambiente de Desenvolvimento

### Pré-requisitos

- **Node.js** 20.x ou superior
- **Docker** 20.x ou superior  
- **Docker Compose** 2.x ou superior
- **Git** para controle de versão

### Setup Automático

```bash
# Desenvolvimento com bancos em Docker + API/Web local
./setup.sh dev

# Verificar se tudo está funcionando
make dev-status
make health
```

### Setup Manual

```bash
# 1. Bancos de dados via Docker
docker-compose -f docker-compose.dev.yml up -d

# 2. Backend (Terminal 1)
cd api
npm install
npm run start:dev

# 3. Frontend (Terminal 2)  
cd web/gerenciador-financeiro
npm install
npm start

# 4. Verificar
curl http://localhost:3000/health
curl http://localhost:4200
```

### Portas de Desenvolvimento

| Serviço | Porta | URL | Descrição |
|---------|-------|-----|-----------|
| **API** | 3000 | http://localhost:3000 | Backend NestJS |
| **Swagger** | 3000 | http://localhost:3000/api/docs | Documentação API |
| **Web** | 4200 | http://localhost:4200 | Frontend Angular |
| **MySQL** | 3306 | localhost:3306 | Banco principal |
| **MongoDB** | 27017 | localhost:27017 | Banco de logs |

## 🎯 Como Contribuir

### Tipos de Contribuição

1. **🐛 Correção de Bugs**
   - Identifique o problema
   - Reproduza localmente
   - Crie teste que falhe
   - Implemente correção
   - Verifique se teste passa

2. **✨ Novas Funcionalidades**
   - Discuta a feature via Issue
   - Documente requisitos
   - Implemente backend (se necessário)
   - Implemente frontend (se necessário)
   - Adicione testes

3. **📚 Documentação**
   - Melhore READMEs
   - Adicione comentários no código
   - Crie exemplos de uso
   - Traduções

4. **🧪 Testes**
   - Aumente cobertura de testes
   - Adicione testes E2E
   - Melhore qualidade dos testes

### Fluxo de Trabalho

1. **Criar Issue** (para features/bugs significativos)
2. **Fork** o repositório
3. **Clone** localmente
4. **Criar branch** descritiva
5. **Desenvolver** seguindo os padrões
6. **Testar** completamente
7. **Commit** com mensagens semânticas
8. **Push** para seu fork
9. **Pull Request** com descrição detalhada

### Convenção de Branches

```bash
# Features
feature/nome-da-feature
feature/dashboard-graficos
feature/backup-automatico

# Correções
fix/nome-do-bug
fix/login-redirect
fix/categoria-duplicada

# Documentação
docs/update-readme
docs/api-examples

# Testes
test/increase-coverage
test/e2e-orcamentos
```

## 📝 Padrões de Código

### Commits Semânticos

Seguimos a especificação [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: adiciona nova funcionalidade
fix: corrige bug específico
docs: atualiza documentação
style: formatação de código (não afeta funcionalidade)
refactor: refatora código sem alterar comportamento
test: adiciona ou corrige testes
chore: tarefas de manutenção/build
perf: melhora performance
ci: alterações em CI/CD
```

**Exemplos:**
```bash
feat(auth): adiciona refresh token automático
fix(orcamento): corrige cálculo de saldo
docs(readme): atualiza instruções de instalação
test(categorias): adiciona testes unitários para CRUD
refactor(services): simplifica lógica de validação
```

### Backend (NestJS)

#### Estrutura de Módulos
```typescript
// Cada módulo deve ter:
src/modules/exemplo/
├── exemplo.module.ts      # Configuração do módulo
├── exemplo.controller.ts  # Endpoints REST
├── exemplo.service.ts     # Lógica de negócio
├── exemplo.entity.ts      # Entidade do banco
├── dto/                   # Data Transfer Objects
│   ├── create-exemplo.dto.ts
│   ├── update-exemplo.dto.ts
│   └── response-exemplo.dto.ts
└── tests/                 # Testes específicos
    ├── exemplo.controller.spec.ts
    └── exemplo.service.spec.ts
```

#### Padrões de Código
```typescript
// ✅ Bom
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os usuários' })
  @ApiResponse({ status: 200, type: [UsuarioResponseDto] })
  async findAll(): Promise<UsuarioResponseDto[]> {
    return this.usuariosService.findAll();
  }
}

// ❌ Evitar
@Controller('users') // Use português
export class UsersController {
  @Get() // Falta documentação Swagger
  getUsers() { // Falta tipagem, async
    return this.service.getAll(); // Falta tratamento de erro
  }
}
```

#### DTOs e Validação
```typescript
// ✅ Bom
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'João Silva', description: 'Nome completo' })
  @IsString()
  nome: string;

  @ApiProperty({ example: 'joao@email.com', description: 'Email único' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senha123', description: 'Senha mínima 6 chars' })
  @IsString()
  @MinLength(6)
  password: string;
}
```

### Frontend (Angular)

#### Estrutura de Componentes
```
src/app/pages/exemplo/
├── exemplo.ts             # Componente principal
├── exemplo.html           # Template
├── exemplo.scss           # Estilos específicos
└── components/            # Sub-componentes
    ├── form/
    ├── list/
    └── modal/
```

#### Padrões Angular
```typescript
// ✅ Bom
@Component({
  selector: 'app-categorias',
  templateUrl: './categorias.html',
  styleUrls: ['./categorias.scss'],
  standalone: true,
  imports: [CommonModule, TuiButtonModule]
})
export class CategoriasComponent {
  categorias = signal<Categoria[]>([]);
  loading = signal(false);

  constructor(private categoriaService: CategoriaService) {}

  async loadCategorias(): Promise<void> {
    try {
      this.loading.set(true);
      const categorias = await this.categoriaService.findAll();
      this.categorias.set(categorias);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    } finally {
      this.loading.set(false);
    }
  }
}
```

#### Serviços
```typescript
// ✅ Bom
@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private readonly baseUrl = '/api/categorias';

  constructor(private http: HttpClient) {}

  findAll(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.baseUrl);
  }

  create(categoria: CreateCategoriaDto): Observable<Categoria> {
    return this.http.post<Categoria>(this.baseUrl, categoria);
  }
}
```

### Padrões CSS/SCSS

```scss
// ✅ Bom - Use BEM naming
.categoria-card {
  &__header {
    display: flex;
    justify-content: space-between;
  }
  
  &__title {
    font-weight: 600;
    color: var(--tui-text-01);
  }
  
  &--receita {
    border-left: 4px solid var(--tui-success);
  }
}

// ✅ Bom - Use CSS custom properties
:root {
  --app-primary: #1976d2;
  --app-success: #4caf50;
  --app-danger: #f44336;
}
```

## 🧪 Testes

### Backend - Testes Unitários

```typescript
// exemplo.service.spec.ts
describe('ExemploService', () => {
  let service: ExemploService;
  let repository: Repository<Exemplo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExemploService,
        {
          provide: getRepositoryToken(Exemplo),
          useValue: {
            find: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ExemploService>(ExemploService);
    repository = module.get<Repository<Exemplo>>(getRepositoryToken(Exemplo));
  });

  describe('findAll', () => {
    it('should return an array of exemplos', async () => {
      const exemplos = [{ id: 1, nome: 'Teste' }];
      jest.spyOn(repository, 'find').mockResolvedValue(exemplos as any);

      const result = await service.findAll();
      
      expect(result).toEqual(exemplos);
      expect(repository.find).toHaveBeenCalled();
    });
  });
});
```

### Backend - Testes E2E

```typescript
// exemplo.e2e-spec.ts
describe('Exemplo (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login para obter token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'admin123' })
      .expect(200);

    authToken = loginResponse.body.accessToken;
  });

  describe('/exemplos (GET)', () => {
    it('should get all exemplos', () => {
      return request(app.getHttpServer())
        .get('/exemplos')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});
```

### Frontend - Testes Unitários

```typescript
// exemplo.component.spec.ts
describe('ExemploComponent', () => {
  let component: ExemploComponent;
  let fixture: ComponentFixture<ExemploComponent>;
  let service: jasmine.SpyObj<ExemploService>;

  beforeEach(async () => {
    const serviceSpy = jasmine.createSpyObj('ExemploService', ['findAll']);

    await TestBed.configureTestingModule({
      imports: [ExemploComponent],
      providers: [
        { provide: ExemploService, useValue: serviceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ExemploComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(ExemploService) as jasmine.SpyObj<ExemploService>;
  });

  it('should load data on init', async () => {
    const mockData = [{ id: 1, nome: 'Teste' }];
    service.findAll.and.returnValue(Promise.resolve(mockData));

    await component.ngOnInit();

    expect(component.items()).toEqual(mockData);
    expect(service.findAll).toHaveBeenCalled();
  });
});
```

### Executando Testes

```bash
# Backend
cd api

# Testes unitários
npm run test               # Executa todos
npm run test:watch        # Watch mode
npm run test:cov          # Com coverage

# Testes E2E
npm run test:e2e          # Todos os E2E
npm run test:e2e -- --testNamePattern="auth" # Específico

# Frontend
cd web/gerenciador-financeiro

# Testes unitários  
npm run test              # Executa todos
npm run test:watch       # Watch mode
npm run test:coverage    # Com coverage
```

## 📚 Documentação

### Swagger/OpenAPI (Backend)

```typescript
// ✅ Sempre documente endpoints
@ApiTags('usuarios')
@Controller('usuarios')
export class UsuariosController {
  
  @Post()
  @ApiOperation({ 
    summary: 'Criar novo usuário',
    description: 'Cria um novo usuário no sistema com validação de email único'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Usuário criado com sucesso',
    type: UsuarioResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados inválidos ou email já existe' 
  })
  async create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }
}
```

### Comentários no Código

```typescript
// ✅ Bom - Explica o "porquê"
/**
 * Calcula o saldo disponível considerando orçamentos e reservas
 * 
 * @param usuarioId - ID do usuário
 * @param periodo - Período para cálculo (YYYY-MM)
 * @returns Saldo líquido disponível
 */
async calcularSaldoDisponivel(usuarioId: number, periodo: string): Promise<number> {
  // Busca todas as movimentações do período
  const movimentacoes = await this.findByPeriodo(usuarioId, periodo);
  
  // Calcula receitas menos despesas
  const saldoBase = movimentacoes.reduce((acc, mov) => {
    return mov.tipo === 'RECEITA' ? acc + mov.valor : acc - mov.valor;
  }, 0);
  
  // Desconta reservas obrigatórias
  const reservas = await this.reservasService.findByPeriodo(usuarioId, periodo);
  const totalReservas = reservas.reduce((acc, res) => acc + res.valor, 0);
  
  return saldoBase - totalReservas;
}
```

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Erro de Conexão com Banco

```bash
# Verificar se containers estão rodando
docker-compose ps

# Ver logs dos bancos
docker-compose logs mysql
docker-compose logs mongodb

# Reiniciar bancos
docker-compose restart mysql mongodb
```

#### 2. Erro de Permissão Docker

```bash
# macOS/Linux - Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
newgrp docker

# Ou usar sudo
sudo docker-compose up -d
```

#### 3. Porta já em uso

```bash
# Verificar processos usando a porta
lsof -i :3000
lsof -i :4200

# Matar processo específico
kill -9 <PID>
```

#### 4. Problemas com Node Modules

```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### 5. Erro de CORS

```bash
# Verificar configuração no .env
CORS_ORIGIN=http://localhost:4200

# Verificar se Nginx está rodando em produção
docker-compose logs nginx
```

### Logs e Debug

```bash
# Ver logs em tempo real
docker-compose logs -f

# Logs específicos
docker-compose logs api
docker-compose logs web
docker-compose logs nginx

# Debug da API
cd api
npm run start:debug

# Debug do Angular
cd web/gerenciador-financeiro
ng serve --configuration development
```

### Validação de Setup

```bash
# Verificar se tudo está funcionando
make health

# Status dos serviços
make status

# Teste rápido da API
curl http://localhost:3000/health

# Teste do frontend
curl http://localhost:4200
```

## 📞 Suporte

### Canais de Comunicação

- **🐛 Bugs**: [GitHub Issues](https://github.com/seu-usuario/gerenciador-financeiro/issues)
- **💬 Dúvidas**: [GitHub Discussions](https://github.com/seu-usuario/gerenciador-financeiro/discussions)  
- **📧 Contato**: dev@gerenciadorfinanceiro.com

### Antes de Reportar Bug

1. ✅ Verifique se não é um problema conhecido nas Issues
2. ✅ Teste na última versão
3. ✅ Inclua passos para reproduzir
4. ✅ Inclua logs relevantes
5. ✅ Especifique ambiente (OS, Docker version, etc.)

### Template de Issue

```markdown
## Descrição do Bug
[Descrição clara do problema]

## Passos para Reproduzir
1. Vá para '...'
2. Clique em '...'
3. Veja o erro

## Comportamento Esperado
[O que deveria acontecer]

## Screenshots/Logs
[Se aplicável, adicione screenshots ou logs]

## Ambiente
- OS: [ex: macOS 14]
- Docker: [ex: 24.0.0]
- Browser: [ex: Chrome 120]
- Versão: [ex: v1.0.0]
```

---

## 🎉 Obrigado!

Sua contribuição é valiosa! Juntos podemos fazer do **Gerenciador Financeiro** uma ferramenta ainda melhor. 

**🌟 Não esqueça de dar uma estrela no projeto se ele te ajudou!**