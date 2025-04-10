# Configuração Correta das Chaves do Supabase

O erro `Invalid API key` indica que a chave de service_role que está sendo utilizada não é válida. Siga estas instruções para configurar corretamente as chaves do Supabase.

## Como obter as chaves corretas

1. Acesse o [Dashboard do Supabase](https://app.supabase.com/)
2. Selecione seu projeto
3. No menu lateral esquerdo, clique em **Project Settings**
4. Clique em **API**
5. Na seção **Project API keys**, você encontrará:
   - `anon` / `public`: Chave pública para uso no cliente
   - `service_role`: Chave com acesso administrativo (mantenha segura!)

## Atualizar o arquivo de configuração

Depois de obter as chaves, você precisa atualizar o arquivo `src/integrations/supabase/client.ts`:

```typescript
const SUPABASE_URL = "https://seu-projeto.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sua-chave-anon-public"; // Chave anon/public
const SUPABASE_SERVICE_KEY = "sua-chave-service-role"; // Chave service_role
```

## Verificar se as chaves estão corretas

Para verificar se a chave service_role está correta:

1. Observe a estrutura do JWT decodificado
2. A chave service_role deve conter `"role": "service_role"` em seu payload
3. A chave anon/public deve conter `"role": "anon"` em seu payload

Você pode decodificar o JWT em [jwt.io](https://jwt.io/) para verificar.

## Enquanto isso, o que fazer?

Modifiquei a função de registro para:

1. Registrar usuários normalmente na autenticação do Supabase
2. Armazenar dados apenas localmente (contornando o erro de API key)
3. Permitir login imediato após o registro

Isso permite que você continue testando o aplicativo enquanto resolve o problema da chave de API.

## Próximos passos

1. Obtenha a chave service_role correta do Supabase
2. Atualize o arquivo `src/integrations/supabase/client.ts`
3. Teste novamente o registro de usuários

Depois de corrigir a chave, você poderá implementar o armazenamento no banco de dados novamente. 