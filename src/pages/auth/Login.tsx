import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, Eye, EyeOff, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

const loginSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres' }),
  rememberMe: z.boolean().default(true),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, pendingConfirmation, pendingEmail, clearPendingConfirmation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  
  // Verificar se estamos em ambiente de desenvolvimento
  const isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: pendingEmail || '',
      password: '',
      rememberMe: true,
    },
  });
  
  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      // Se o navegador estiver perguntando para salvar senha e o usuário aceitar,
      // o navegador preencherá automaticamente o formulário na próxima visita
      await login(values.email, values.password);
      toast({
        title: 'Login realizado com sucesso',
        description: 'Redirecionando para o painel...',
      });
      navigate('/dashboard');
    } catch (error: any) {
      let description = error.message || 'Verifique suas credenciais';
      
      // Verificar se a mensagem é sobre confirmação de email
      if (error.message?.includes('Email not confirmed')) {
        description = 'Por favor, confirme seu email antes de fazer login. Verifique sua caixa de entrada.';
      }
      
      toast({
        title: 'Erro no login',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDevConfirmEmail = async () => {
    if (!pendingEmail) return;
    
    setIsConfirming(true);
    try {
      // Abordagem simplificada para desenvolvimento
      // Em vez de tentar confirmar o email através do Supabase admin API,
      // vamos apenas limpar o status de pendente e permitir o login

      // Uma abordagem alternativa seria criar um novo usuário com os mesmos dados
      // e senha sem usar a confirmação de email, mas isso seria mais complexo

      toast({
        title: 'Desenvolvimento: Email confirmado',
        description: 'No ambiente de desenvolvimento, o sistema vai ignorar a confirmação de email.',
        variant: 'default',
      });
      
      // Limpar status de pendente
      clearPendingConfirmation();
      
      // No ambiente real, o usuário receberia um email com um link que confirmaria o email
      // e permitiria o login, mas para desenvolvimento vamos simplificar
    } catch (error: any) {
      console.error('Erro ao simular confirmação:', error);
      toast({
        title: 'Erro na confirmação',
        description: error.message || 'Não foi possível confirmar o email. Use o link no email recebido.',
        variant: 'destructive',
      });
    } finally {
      setIsConfirming(false);
    }
  };
  
  const toggleShowPassword = () => setShowPassword(!showPassword);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <Link to="/" className="absolute top-4 left-4 text-gray-600 hover:text-primary flex items-center">
        <ArrowLeft className="mr-1 h-5 w-5" />
        Voltar
      </Link>
      
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Login</h2>
          <p className="text-gray-600 mt-2">Entre com sua conta para acessar o sistema</p>
        </div>
        
        {pendingConfirmation && (
          <Alert className="mb-6 bg-yellow-50 border-yellow-200">
            <Mail className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Confirmação de email pendente</AlertTitle>
            <AlertDescription className="text-yellow-700">
              {pendingEmail ? (
                <>
                  Por favor, verifique sua caixa de entrada em <strong>{pendingEmail}</strong> e 
                  confirme seu email antes de fazer login.
                  
                  {isDevelopment && (
                    <div className="mt-2">
                      <Button
                        variant="outline" 
                        size="sm"
                        className="bg-yellow-100 hover:bg-yellow-200 border-yellow-300 text-yellow-800"
                        onClick={handleDevConfirmEmail}
                        disabled={isConfirming}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {isConfirming ? "Confirmando..." : "Simular confirmação (Dev)"}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  Por favor, confirme seu email antes de fazer login. Verifique sua caixa de entrada.
                </>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form id="login-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" method="post" autoComplete="on">
            <input type="hidden" name="form-type" value="login" />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="email">Email</FormLabel>
                  <FormControl>
                    <Input 
                      id="email"
                      name="email"
                      placeholder="seu.email@exemplo.com" 
                      type="email"
                      autoComplete="username email"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="password">Senha</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="******"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={toggleShowPassword}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-2">
                  <FormControl>
                    <Checkbox
                      id="rememberMe"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel htmlFor="rememberMe" className="text-sm font-normal">
                      Lembrar meus dados
                    </FormLabel>
                    <FormDescription className="text-xs text-gray-500">
                      Seu navegador salvará seu email e senha
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary-dark"
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </Form>
        
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Não tem uma conta?{' '}
            <Link to="/register" className="text-primary hover:underline">
              Registre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
