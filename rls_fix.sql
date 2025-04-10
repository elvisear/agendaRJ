-- 1. Primeiro, verificar quais são os valores válidos do enum user_role
SELECT enum_range(NULL::user_role);

-- 2. Remover a política que está causando o erro
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- 3. Criar a política corrigida com o valor correto do enum
-- Substitua 'ADMIN' pelo valor correto encontrado na consulta acima
-- Exemplos possíveis: 'ADMIN', 'admin', 'Admin'
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND users.role = 'ADMIN'
        )
    ); 