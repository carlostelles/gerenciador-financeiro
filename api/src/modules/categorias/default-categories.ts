import { CategoriaTipo } from '../../common/types';

export const DEFAULT_CATEGORIES = [
  { nome: 'Moradia', descricao: 'Habitação, aluguel, condomínio e manutenção', tipo: CategoriaTipo.DESPESA },
  { nome: 'Contas de Consumo', descricao: 'Utilidades como água, luz, gás e internet', tipo: CategoriaTipo.DESPESA },
  { nome: 'Alimentação', descricao: 'Supermercado, restaurantes e lanches', tipo: CategoriaTipo.DESPESA },
  { nome: 'Transporte', descricao: 'Combustível, transporte público e aplicativos', tipo: CategoriaTipo.DESPESA },
  { nome: 'Saúde e Bem-Estar', descricao: 'Plano de saúde, medicamentos e academia', tipo: CategoriaTipo.DESPESA },
  { nome: 'Educação', descricao: 'Cursos, livros e materiais de estudo', tipo: CategoriaTipo.DESPESA },
  { nome: 'Lazer e Entretenimento', descricao: 'Cinema, viagens, hobbies e diversão', tipo: CategoriaTipo.DESPESA },
  { nome: 'Dívidas', descricao: 'Empréstimos, financiamentos e parcelamentos', tipo: CategoriaTipo.DESPESA },
  { nome: 'Cartão de crédito', descricao: 'Fatura do cartão de crédito', tipo: CategoriaTipo.DESPESA },
  { nome: 'Assinaturas', descricao: 'Serviços de streaming, aplicativos e assinaturas recorrentes', tipo: CategoriaTipo.DESPESA },
  { nome: 'Impostos', descricao: 'Impostos e taxas diversas', tipo: CategoriaTipo.DESPESA },
  { nome: 'Salário', descricao: 'Rendimentos do trabalho e salário mensal', tipo: CategoriaTipo.RECEITA },
  { nome: 'Investimentos', descricao: 'Reservas e aplicações financeiras', tipo: CategoriaTipo.RESERVA },
] as const;