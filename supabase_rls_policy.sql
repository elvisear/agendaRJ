"-- Criar SQL para adicionar pol¡tica RLS ao Supabase"  
"CREATE POLICY \"Usu rios podem ver e editar seus pr¢prios dados\" ON public.users FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);" 
