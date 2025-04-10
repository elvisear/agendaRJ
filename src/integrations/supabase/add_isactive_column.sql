-- Adicionar coluna isActive à tabela users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Atualizar todos os usuários existentes para estarem ativos por padrão
UPDATE public.users SET is_active = TRUE WHERE is_active IS NULL;

-- Comentário para explicar a coluna
COMMENT ON COLUMN public.users.is_active IS 'Indica se o usuário está ativo (true) ou inativo (false). Usuários inativos não podem fazer login no sistema.'; 