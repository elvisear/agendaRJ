-- Função para auto-confirmar emails de novos usuários
CREATE OR REPLACE FUNCTION public.confirm_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualiza os campos de confirmação para que o usuário não precise validar o email
  UPDATE auth.users 
  SET email_confirmed_at = COALESCE(confirmation_sent_at, NOW()),
      confirmed_at = COALESCE(confirmation_sent_at, NOW())
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cria um trigger que será disparado após a inserção de um novo usuário
DROP TRIGGER IF EXISTS auto_confirm_user_email ON auth.users;
CREATE TRIGGER auto_confirm_user_email
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.confirm_user_email();

-- Confirmar todos os usuários existentes que ainda não foram confirmados
UPDATE auth.users
SET email_confirmed_at = COALESCE(confirmation_sent_at, NOW()),
    confirmed_at = COALESCE(confirmation_sent_at, NOW())
WHERE email_confirmed_at IS NULL OR confirmed_at IS NULL; 
