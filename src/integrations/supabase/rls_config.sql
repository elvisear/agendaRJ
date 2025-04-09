-- Remover todas as políticas RLS existentes na tabela users
DROP POLICY IF EXISTS "Users can view their own user" ON users;
DROP POLICY IF EXISTS "Users can insert their own user" ON users;
DROP POLICY IF EXISTS "Users can update their own user" ON users;
DROP POLICY IF EXISTS "Users can delete their own user" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "Public read access" ON users;
DROP POLICY IF EXISTS "Public insert access" ON users;
DROP POLICY IF EXISTS "Public update access" ON users;
DROP POLICY IF EXISTS "Public delete access" ON users;

-- Primeiro, habilitar RLS na tabela users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 1. Política para permitir que usuários autenticados possam inserir seus próprios dados
CREATE POLICY "Users can insert their own record" ON users
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- 2. Política para permitir que usuários autenticados possam ver seus próprios dados
CREATE POLICY "Users can view their own record" ON users
    FOR SELECT
    USING (auth.uid() = id);

-- 3. Política para permitir que usuários autenticados possam atualizar seus próprios dados
CREATE POLICY "Users can update their own record" ON users
    FOR UPDATE
    USING (auth.uid() = id);

-- 4. Política para usuários com role 'admin' possam ver todos os usuários
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- 5. Política para permitir que o serviço de autenticação do Supabase (service_role) tenha acesso total
CREATE POLICY "Service role has full access" ON users
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 6. Política para registro de novos usuários (importante para o fluxo de cadastro)
CREATE POLICY "New users can insert themselves" ON users
    FOR INSERT
    WITH CHECK (true); 