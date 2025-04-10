# Configuração de Políticas RLS do Supabase

Este documento fornece instruções para configurar corretamente as políticas Row Level Security (RLS) no Supabase para a tabela `users`.

## O que é o problema?

O erro que você está enfrentando é uma violação das políticas de segurança de nível de linha (RLS):

```
Erro: {code: '42501', details: null, hint: null, message: 'new row violates row-level security policy for table "users"'}
```

Este erro ocorre porque, por padrão, o Supabase habilita RLS mas não define políticas permissivas, então o acesso é negado a todas as operações.

## Como resolver

### Opção 1: Usando o Console do Supabase (Recomendada)

1. Faça login no [Console do Supabase](https://app.supabase.com/)
2. Selecione o seu projeto
3. Na barra lateral, vá para **Database** > **Tables**
4. Encontre a tabela `users` na lista
5. Clique na guia **RLS**
6. Clique em **Delete Policy** para cada política existente (se houver)
7. Depois, clique em **New Policy** para criar as novas políticas
8. Para cada política abaixo, crie uma nova:

#### 1. Política para permitir inserção para novos usuários

- **Nome da política**: `New users can insert themselves`
- **Operação**: `INSERT`
- **Expressão USING**: deixe em branco
- **Expressão WITH CHECK**: `true`
- Clique em **Save policy**

#### 2. Política para usuários verem seus próprios dados

- **Nome da política**: `Users can view their own record`
- **Operação**: `SELECT`
- **Expressão USING**: `auth.uid() = id`
- **Expressão WITH CHECK**: deixe em branco
- Clique em **Save policy**

#### 3. Política para usuários atualizarem seus próprios dados

- **Nome da política**: `Users can update their own record`
- **Operação**: `UPDATE`
- **Expressão USING**: `auth.uid() = id`
- **Expressão WITH CHECK**: deixe em branco
- Clique em **Save policy**

#### 4. Política para admins verem todos os usuários

- **Nome da política**: `Admins can view all users`
- **Operação**: `SELECT`
- **Expressão USING**: `EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')`
- **Expressão WITH CHECK**: deixe em branco
- Clique em **Save policy**

#### 5. Política para acesso de service_role

- **Nome da política**: `Service role has full access`
- **Operação**: `ALL`
- **Expressão USING**: `auth.jwt() ->> 'role' = 'service_role'`
- **Expressão WITH CHECK**: `auth.jwt() ->> 'role' = 'service_role'`
- Clique em **Save policy**

### Opção 2: Usando o SQL Editor

1. Faça login no [Console do Supabase](https://app.supabase.com/)
2. Selecione o seu projeto
3. Na barra lateral, vá para **SQL Editor**
4. Clique em **New Query**
5. Cole o conteúdo do arquivo `src/integrations/supabase/rls_config.sql`
6. Clique em **Run**

## Desativando Confirmação de Email (Opcional para Desenvolvimento)

Se você está em ambiente de desenvolvimento e não quer lidar com confirmação de email:

1. No console do Supabase, vá para **Authentication** > **Providers**
2. Em **Email**, desative a opção **Confirm email**
3. Clique em **Save**

Isso permitirá login imediato após o registro, sem necessidade de confirmar o email.

## Testando

Depois de configurar as políticas, tente registrar um novo usuário. O processo deve funcionar sem erros de RLS.

Se você continuar enfrentando problemas, verifique os logs do console para mensagens de erro específicas. 