# Gerenciador Financeiro - Frontend

![Angular](https://img.shields.io/badge/Angular-20.3.0-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Taiga UI](https://img.shields.io/badge/Taiga_UI-4.58.0-FF6B35?style=for-the-badge&logo=angular&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-30.2.0-C21325?style=for-the-badge&logo=jest&logoColor=white)
![SCSS](https://img.shields.io/badge/SCSS-CC6699?style=for-the-badge&logo=sass&logoColor=white)

Sistema de controle financeiro pessoal desenvolvido em Angular 20 com Taiga UI, oferecendo uma interface moderna e intuitiva para gestão de finanças pessoais.

## 📋 Índice

- [🎯 Visão Geral](#-visão-geral)
- [✨ Funcionalidades](#-funcionalidades)
- [🛠️ Tecnologias](#️-tecnologias)
- [🏗️ Arquitetura](#️-arquitetura)
- [🚀 Instalação](#-instalação)
- [📱 Uso](#-uso)
- [🧪 Testes](#-testes)
- [📁 Estrutura do Projeto](#-estrutura-do-projeto)
- [🎨 Interface](#-interface)
- [🔧 Configuração](#-configuração)
- [📊 Performance](#-performance)
- [🤝 Contribuição](#-contribuição)
- [📄 Licença](#-licença)

## 🎯 Visão Geral

O **Gerenciador Financeiro Frontend** é uma aplicação web moderna construída com Angular 20 e Taiga UI, proporcionando uma experiência rica e responsiva para gerenciamento de finanças pessoais. A aplicação consome a API REST do backend para oferecer funcionalidades completas de controle financeiro.

### Características Principais

- 🎨 **Interface Moderna**: Design clean e responsivo com Taiga UI
- 🔐 **Autenticação JWT**: Sistema seguro de login/logout
- 📊 **Dashboard Interativo**: Visualização clara de dados financeiros
- 🏷️ **Gestão de Categorias**: Organização de receitas e despesas
- 💰 **Controle de Orçamentos**: Planejamento financeiro por período
- 📝 **Movimentações**: Registro detalhado de transações
- 💾 **Reservas**: Gestão de valores poupados
- 🔍 **Filtros Avançados**: Busca e organização de dados
- 📱 **Responsivo**: Adaptável a diferentes dispositivos

## ✨ Funcionalidades

### 🔐 Autenticação e Autorização
- **Login/Logout**: Sistema de autenticação JWT
- **Proteção de Rotas**: Guards para páginas protegidas
- **Renovação Automática**: Refresh token automático
- **Controle de Sessão**: Gerenciamento de estado de login

### 🏠 Dashboard (Home)
- **Visão Geral**: Resumo financeiro geral
- **Navegação Rápida**: Acesso direto às funcionalidades
- **Status da Conta**: Informações do usuário logado

### 🏷️ Gestão de Categorias
- **CRUD Completo**: Criar, listar, editar e excluir categorias
- **Tipos de Categoria**: Receita, despesa e reserva
- **Badges Visuais**: Identificação rápida por cores
- **Validação de Uso**: Proteção contra exclusão de categorias em uso

### 💰 Orçamentos
- **Criação por Período**: Orçamentos mensais/anuais
- **Gestão de Itens**: Itens detalhados do orçamento
- **Clonagem**: Duplicação de orçamentos entre períodos
- **Controle de Valores**: Planejamento de receitas e despesas

### 📝 Movimentações Financeiras
- **Registro de Transações**: Receitas e despesas
- **Organização por Período**: Visualização por mês/ano
- **Categorização**: Associação com categorias criadas
- **Resumo Financeiro**: Totais de receitas, despesas e saldo

### 💾 Reservas
- **Gestão de Poupança**: Controle de valores reservados
- **Categorização**: Organização por tipo de reserva
- **Histórico**: Acompanhamento de crescimento das reservas

## 🛠️ Tecnologias

### Core Framework
- **Angular 20.3.0**: Framework principal
- **TypeScript 5.9.2**: Linguagem de desenvolvimento
- **RxJS 7.8.0**: Programação reativa

### UI Framework
- **Taiga UI 4.58.0**: Biblioteca de componentes
- **Angular CDK 20.0.0**: Kit de desenvolvimento Angular
- **SCSS**: Pré-processador CSS

### Arquitetura e Padrões
- **Standalone Components**: Componentes independentes
- **Signals**: Gerenciamento de estado moderno
- **Lazy Loading**: Carregamento sob demanda
- **Guards e Interceptors**: Proteção e interceptação HTTP

### Ferramentas de Desenvolvimento
- **Jest 30.2.0**: Framework de testes
- **Angular CLI 20.3.3**: Ferramenta de linha de comando
- **Prettier**: Formatação de código
- **ESLint**: Análise estática de código

## 🏗️ Arquitetura

### Estrutura Modular

```
src/app/
├── core/                   # Funcionalidades centrais
│   ├── guards/            # Proteção de rotas
│   ├── interceptors/      # Interceptação HTTP
│   └── services/          # Serviços principais
├── pages/                 # Páginas da aplicação
│   ├── home/             # Dashboard principal
│   ├── login/            # Autenticação
│   ├── categorias/       # Gestão de categorias
│   ├── orcamentos/       # Controle de orçamentos
│   └── movimentos/       # Movimentações financeiras
├── shared/               # Recursos compartilhados
│   ├── components/       # Componentes reutilizáveis
│   ├── interfaces/       # Tipos TypeScript
│   ├── pipes/           # Pipes customizados
│   ├── services/        # Serviços utilitários
│   └── template/        # Layout principal
└── app.config.ts        # Configuração da aplicação
```

### Padrões Arquiteturais

#### 🎯 **Standalone Components**
```typescript
@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, TuiButton, TuiTable],
  templateUrl: './categorias.html',
  styleUrls: ['./categorias.scss']
})
export class CategoriasComponent implements OnInit {
  // Implementação do componente
}
```

#### 📡 **Signals para Estado**
```typescript
export class MovimentosComponent {
  protected readonly isLoading = signal<boolean>(false);
  protected readonly movimentos = signal<Movimento[]>([]);
  protected readonly periodos = signal<string[]>([]);
}
```

#### 🔒 **Guards e Interceptors**
```typescript
// Auth Guard
export const AuthGuard: CanActivateFn = (route, state) => {
  return inject(AuthService).isAuthenticated;
};

// Auth Interceptor
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token;
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  return next(req);
};
```

## 🚀 Instalação

### Pré-requisitos

- **Node.js** 18.x ou superior
- **npm** 9.x ou superior
- **Angular CLI** 20.x

### Passos de Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/gerenciador-financeiro.git
cd gerenciador-financeiro/web
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o ambiente**
```bash
# Copie o arquivo de configuração
cp src/environments/environment.example.ts src/environments/environment.ts

# Edite as variáveis de ambiente
nano src/environments/environment.ts
```

4. **Execute a aplicação**
```bash
# Desenvolvimento
npm start

# Produção
npm run build
```

### Configuração da API

Certifique-se de que a API backend esteja rodando em `http://localhost:3000` ou configure o `baseUrl` no serviço de autenticação:

```typescript
// src/app/core/services/auth.service.ts
private readonly baseUrl = 'http://localhost:3000'; // Ajuste conforme necessário
```

## 📱 Uso

### 1. **Acesso ao Sistema**

1. Acesse `http://localhost:4200`
2. Faça login com suas credenciais
3. Será redirecionado para o dashboard

### 2. **Navegação Principal**

O sistema possui um menu lateral com as seguintes opções:
- **🏠 Início**: Dashboard principal
- **🏷️ Categorias**: Gestão de categorias
- **💰 Orçamentos**: Controle de orçamentos
- **📝 Movimentações**: Transações financeiras

### 3. **Gestão de Categorias**

```typescript
// Criar nova categoria
1. Clique em "Nova Categoria"
2. Preencha nome, tipo e descrição
3. Clique em "Salvar"

// Editar categoria
1. Clique no ícone de editar
2. Modifique os dados
3. Salve as alterações

// Excluir categoria
1. Clique no ícone de lixeira
2. Confirme a exclusão
```

### 4. **Controle de Orçamentos**

```typescript
// Criar orçamento
1. Selecione o período (mês/ano)
2. Adicione itens de receita/despesa
3. Defina valores e categorias

// Clonar orçamento
1. Selecione um orçamento existente
2. Clique em "Clonar"
3. Escolha o período de destino
```

### 5. **Movimentações**

```typescript
// Registrar movimentação
1. Selecione o período
2. Clique em "Nova Movimentação"
3. Preencha valor, categoria e descrição
4. Confirme o registro
```

## 🧪 Testes

### Configuração de Testes

O projeto utiliza **Jest** como framework de testes:

```javascript
// jest.config.js
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ]
};
```

### Executar Testes

```bash
# Testes unitários
npm test

# Testes em modo watch
npm run test:watch

# Relatório de cobertura
npm run test:coverage
```

### Estrutura de Testes

```typescript
describe('CategoriasComponent', () => {
  let component: CategoriasComponent;
  let fixture: ComponentFixture<CategoriasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoriasComponent, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriasComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load categorias on init', () => {
    component.ngOnInit();
    expect(component.categorias).toBeDefined();
  });
});
```

## 📁 Estrutura do Projeto

### Componentes Principais

#### 🎨 **Shared Components**
```typescript
// Componente de Badge para Categorias
@Component({
  selector: 'app-categoria-badge',
  template: `
    <tui-badge [appearance]="badgeAppearance">
      {{ tipo | titlecase }}
    </tui-badge>
  `
})
export class CategoriaBadgeComponent {
  @Input() tipo!: TipoCategoria;
  
  get badgeAppearance(): string {
    return {
      'RECEITA': 'success',
      'DESPESA': 'error',
      'RESERVA': 'info'
    }[this.tipo] || 'neutral';
  }
}
```

#### 🔧 **Services**
```typescript
// Serviço de Categorias
@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private readonly baseUrl = 'http://localhost:3000/categorias';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.baseUrl);
  }

  create(categoria: CreateCategoriaDto): Observable<Categoria> {
    return this.http.post<Categoria>(this.baseUrl, categoria);
  }

  update(id: string, categoria: UpdateCategoriaDto): Observable<Categoria> {
    return this.http.patch<Categoria>(`${this.baseUrl}/${id}`, categoria);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
```

#### 🎭 **Pipes Customizados**
```typescript
// Pipe para formatação de período
@Pipe({
  name: 'formatPeriod',
  standalone: true
})
export class FormatPeriodPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    
    const [year, month] = value.split('-');
    const date = new Date(+year, +month - 1);
    
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long'
    });
  }
}
```

### Interfaces TypeScript

```typescript
// Interface principal de Categoria
export interface Categoria {
  id: string;
  nome: string;
  tipo: TipoCategoria;
  descricao?: string;
  usuarioId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Enum para tipos de categoria
export enum TipoCategoria {
  RECEITA = 'RECEITA',
  DESPESA = 'DESPESA',
  RESERVA = 'RESERVA'
}

// DTOs para operações
export interface CreateCategoriaDto {
  nome: string;
  tipo: TipoCategoria;
  descricao?: string;
}

export interface UpdateCategoriaDto {
  nome?: string;
  tipo?: TipoCategoria;
  descricao?: string;
}
```

## 🎨 Interface

### Design System

O projeto utiliza **Taiga UI** como sistema de design, proporcionando:

- **Componentes Consistentes**: Buttons, inputs, tables, modals
- **Tema Personalizável**: Cores e estilos customizáveis
- **Responsividade**: Adaptação automática a diferentes telas
- **Acessibilidade**: Suporte a leitores de tela e navegação por teclado

### Paleta de Cores

```scss
// Cores principais do tema
$primary-color: #526ED3;
$success-color: #39B54A;
$error-color: #E01F19;
$warning-color: #FFDD2D;
$info-color: #2196F3;

// Categorias
.categoria-receita { color: $success-color; }
.categoria-despesa { color: $error-color; }
.categoria-reserva { color: $info-color; }
```

### Layout Responsivo

```scss
// Breakpoints
$mobile: 768px;
$tablet: 1024px;
$desktop: 1200px;

.container {
  padding: 1rem;
  
  @media (min-width: $tablet) {
    padding: 2rem;
  }
  
  @media (min-width: $desktop) {
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

## 🔧 Configuração

### Configuração do Angular

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor])
    ),
    provideEventPlugins() // Taiga UI
  ]
};
```

### Configuração de Roteamento

```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shared/template/template').then(m => m.TemplateComponent),
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent) },
      { path: 'categorias', loadComponent: () => import('./pages/categorias/categorias').then(m => m.CategoriasComponent) },
      { path: 'orcamentos', loadComponent: () => import('./pages/orcamentos/orcamentos').then(m => m.OrcamentosComponent) },
      { path: 'movimentacoes', loadComponent: () => import('./pages/movimentos/movimentos').then(m => m.MovimentosComponent) }
    ]
  },
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent) },
  { path: 'signup', loadComponent: () => import('./pages/signup/signup').then(m => m.SignupComponent) },
  { path: '**', redirectTo: '' }
];
```

### Configuração de Build

```json
// angular.json (excerpt)
{
  "build": {
    "options": {
      "outputPath": "dist/gerenciador-financeiro",
      "assets": [
        { "glob": "**/*", "input": "public" },
        { "glob": "**/*", "input": "node_modules/@taiga-ui/icons/src", "output": "assets/taiga-ui/icons" }
      ],
      "styles": [
        "node_modules/@taiga-ui/core/styles/taiga-ui-theme.less",
        "node_modules/@taiga-ui/core/styles/taiga-ui-fonts.less",
        "src/styles.scss"
      ]
    }
  }
}
```

## 📊 Performance

### Otimizações Implementadas

#### **Lazy Loading**
```typescript
// Carregamento sob demanda de módulos
const routes: Routes = [
  {
    path: 'categorias',
    loadComponent: () => import('./pages/categorias/categorias').then(m => m.CategoriasComponent)
  }
];
```

#### **OnPush Change Detection**
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
export class CategoriasComponent {
  // Componente otimizado
}
```

#### **Signals para Estado**
```typescript
// Uso de signals para reatividade eficiente
protected readonly isLoading = signal<boolean>(false);
protected readonly categorias = signal<Categoria[]>([]);
```

#### **TrackBy Functions**
```typescript
// Otimização de renderização de listas
trackByFn(index: number, item: Categoria): string {
  return item.id;
}
```

### Métricas de Bundle

```bash
# Análise de bundle
npm run build -- --stats-json
npx webpack-bundle-analyzer dist/stats.json
```

**Tamanhos típicos:**
- **Initial Bundle**: ~500KB
- **Lazy Chunks**: ~50-100KB cada
- **Vendor Bundle**: ~300KB

## 🤝 Contribuição

### Padrões de Desenvolvimento

#### **Convenções de Código**
```typescript
// Naming conventions
- Componentes: PascalCase (CategoriasComponent)
- Serviços: PascalCase + Service (CategoriaService)
- Interfaces: PascalCase (Categoria)
- Variáveis: camelCase (isLoading)
- Constantes: UPPER_SNAKE_CASE (API_BASE_URL)
```

#### **Estrutura de Commits**
```bash
# Formato
type(scope): description

# Exemplos
feat(categorias): adiciona funcionalidade de busca
fix(auth): corrige renovação de token
docs(readme): atualiza documentação de instalação
test(movimentos): adiciona testes unitários
```

#### **Padrões de Componentes**
```typescript
@Component({
  selector: 'app-exemplo',
  standalone: true,
  imports: [CommonModule, /* outros imports */],
  templateUrl: './exemplo.html',
  styleUrls: ['./exemplo.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExemploComponent implements OnInit {
  // Signals primeiro
  private readonly isLoading = signal(false);
  
  // Serviços injetados
  private readonly service = inject(ExemploService);
  
  // Métodos do ciclo de vida
  ngOnInit(): void {
    this.loadData();
  }
  
  // Métodos públicos
  public handleAction(): void {
    // implementação
  }
  
  // Métodos privados
  private loadData(): void {
    // implementação
  }
}
```

### Processo de Contribuição

1. **Fork** o repositório
2. **Crie** uma branch feature (`git checkout -b feature/nova-funcionalidade`)
3. **Faça** commit das mudanças (`git commit -am 'feat: adiciona nova funcionalidade'`)
4. **Push** para a branch (`git push origin feature/nova-funcionalidade`)
5. **Abra** um Pull Request

### Checklist de PR

- [ ] Código segue padrões estabelecidos
- [ ] Testes passando
- [ ] Documentação atualizada
- [ ] Sem warnings de build
- [ ] Bundle size analisado
- [ ] Responsividade testada

## 📄 Licença

Este projeto está licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 🔗 Links Relacionados

- **Backend API**: [Gerenciador Financeiro API](../api/README.md)
- **Angular Documentation**: [https://angular.io/docs](https://angular.io/docs)
- **Taiga UI**: [https://taiga-ui.dev](https://taiga-ui.dev)
- **Jest Testing**: [https://jestjs.io](https://jestjs.io)

---

## 📞 Suporte

Para dúvidas, sugestões ou problemas:

- **Issues**: [GitHub Issues](https://github.com/seu-usuario/gerenciador-financeiro/issues)
- **Discussões**: [GitHub Discussions](https://github.com/seu-usuario/gerenciador-financeiro/discussions)
- **Email**: seu-email@exemplo.com

---

<div align="center">

**Desenvolvido com ❤️ usando Angular e Taiga UI**

![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Taiga UI](https://img.shields.io/badge/Taiga_UI-FF6B35?style=for-the-badge&logo=angular&logoColor=white)

</div>