-- 1. Remover todas as políticas existentes para evitar conflitos
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
DROP POLICY IF EXISTS "Users can insert their own record" ON users;
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users; 
DROP POLICY IF EXISTS "Masters can view all users" ON users;
DROP POLICY IF EXISTS "Service role has full access" ON users;
DROP POLICY IF EXISTS "New users can insert themselves" ON users;

-- 2. Desabilitar temporariamente o RLS para limpar tudo
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 3. Reabilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. Políticas simplificadas sem autorreferência

-- Permitir inserção para todos (necessário para registro)
CREATE POLICY "Allow all inserts" ON users
    FOR INSERT 
    WITH CHECK (true);

-- Permitir que usuários vejam seus próprios dados
CREATE POLICY "Allow users to view own data" ON users
    FOR SELECT
    USING (auth.uid() = id);

-- Permitir que usuários atualizem seus próprios dados
CREATE POLICY "Allow users to update own data" ON users
    FOR UPDATE
    USING (auth.uid() = id);

-- Permitir que o service_role tenha acesso completo
CREATE POLICY "Allow service_role full access" ON users
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Política específica para usuários com role 'master' (sem recursão)
CREATE POLICY "Allow masters to view all records" ON users
    FOR SELECT
    USING (
        (SELECT role FROM auth.users WHERE auth.users.id = auth.uid()) = 'master'
    ); 