# AgendaRJ

Um sistema de agendamento de serviços desenvolvido para a cidade do Rio de Janeiro.

## Funcionalidades

- Autenticação e gerenciamento de usuários
- Agendamento de serviços
- Gestão de filas de atendimento
- Interface administrativa para operadores
- Diferentes níveis de acesso (usuário, operador, master)

## Tecnologias

- React
- TypeScript
- Supabase para autenticação e banco de dados
- React Router para navegação
- Shadcn UI para componentes de interface

## Instalação

1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/agendrj.git
cd agendrj
```

2. Instale as dependências
```bash
npm install
```

3. Configure as variáveis de ambiente
Crie um arquivo `.env.local` na raiz do projeto com as variáveis do Supabase:
```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
VITE_SUPABASE_SERVICE_ROLE_KEY=sua_chave_de_servico
```

4. Inicie o servidor de desenvolvimento
```bash
npm run dev
```

## Estrutura do Banco de Dados

### Tabela users
- id: string (PK)
- name: string
- email: string
- password: string
- cpf: string
- whatsapp: string
- role: string ('user', 'operator', 'master')
- is_active: boolean
- birthdate: string (formato ISO)

## Licença

MIT
