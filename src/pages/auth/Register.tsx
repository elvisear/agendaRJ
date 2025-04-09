import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parse, isValid } from 'date-fns';
import { Calendar, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { formatCPF, formatPhone, phoneToInternational } from '@/utils/formatters';
import { useAuth } from '@/contexts/AuthContext';

const registerSchema = z.object({
  name: z.string().min(3, { message: 'Nome completo é obrigatório' }),
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres' }),
  confirmPassword: z.string().min(6, { message: 'Confirme sua senha' }),
  cpf: z.string().min(11, { message: 'CPF inválido' }),
  birthDate: z.date({ required_error: 'Data de nascimento é obrigatória' }),
  birthDateInput: z.string().optional(),
  whatsapp: z.string().min(10, { message: 'Número de WhatsApp inválido' }),
  role: z.enum(['user', 'operator', 'master']).default('user'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRole, registerAndLogin } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dateInputOpen, setDateInputOpen] = useState(false);
  
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCPF(e.target.value);
    form.setValue('cpf', formattedValue);
  };
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhone(e.target.value);
    form.setValue('whatsapp', formattedValue);
  };
  
  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permitir apenas números
    const rawValue = e.target.value.replace(/\D/g, '');
    
    // Formatar como DD/MM/AAAA à medida que o usuário digita
    let formattedValue = '';
    if (rawValue.length > 0) formattedValue += rawValue.substring(0, Math.min(2, rawValue.length));
    if (rawValue.length > 2) formattedValue += '/' + rawValue.substring(2, Math.min(4, rawValue.length));
    if (rawValue.length > 4) formattedValue += '/' + rawValue.substring(4, Math.min(8, rawValue.length));
    
    // Atualizar o campo
    form.setValue('birthDateInput', formattedValue);
    
    // Converter para objeto Date se o valor for completo
    if (rawValue.length === 8) {
      const day = parseInt(rawValue.substring(0, 2));
      const month = parseInt(rawValue.substring(2, 4)) - 1; // Meses em JS são 0-indexed
      const year = parseInt(rawValue.substring(4, 8));
      
      const parsedDate = new Date(year, month, day);
      
      // Verificar se a data é válida
      if (
        parsedDate.getDate() === day &&
        parsedDate.getMonth() === month &&
        parsedDate.getFullYear() === year &&
        parsedDate <= new Date() // Garantir que não é data futura
      ) {
        form.setValue('birthDate', parsedDate);
      }
    }
  };
  
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      cpf: '',
      birthDate: undefined,
      birthDateInput: '',
      whatsapp: '',
      role: 'user',
    },
  });
  
  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    
    try {
      const internationalPhone = phoneToInternational(values.whatsapp);
      const cleanCpf = values.cpf.replace(/\D/g, '');
      const { birthDateInput, confirmPassword, ...submitValues } = values;
      
      await registerAndLogin({
        name: submitValues.name,
        email: submitValues.email,
        password: submitValues.password,
        cpf: cleanCpf,
        birthDate: submitValues.birthDate.toISOString().split('T')[0],
        whatsapp: internationalPhone,
        role: submitValues.role,
      });
      
      toast({
        title: 'Registro realizado com sucesso!',
        description: 'Você será redirecionado para o dashboard.',
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Erro no registro',
        description: error.message || 'Não foi possível criar sua conta',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto w-full">
          <div className="mb-6 text-center">
            <Link to="/" className="inline-block mb-4">
              <div className="flex items-center justify-center">
                <Calendar className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold text-primary ml-2">AgendaRJ</h1>
              </div>
            </Link>
            <h2 className="text-2xl font-semibold text-gray-800">Crie sua conta</h2>
            <p className="text-gray-600 mt-1">Preencha seus dados para se registrar</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite seu nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="000.000.000-00" 
                            {...field} 
                            onChange={handleCpfChange}
                            maxLength={14}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="seu@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="whatsapp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="(00) 0 0000-0000" 
                            {...field} 
                            onChange={handlePhoneChange}
                            maxLength={16}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Nascimento</FormLabel>
                      <div className="flex space-x-2">
                        <FormField
                          control={form.control}
                          name="birthDateInput"
                          render={({ field: dateInputField }) => (
                            <FormControl>
                              <Input
                                placeholder="DD/MM/AAAA"
                                value={dateInputField.value}
                                onChange={(e) => {
                                  handleDateInputChange(e);
                                }}
                                className="w-full"
                                maxLength={10}
                                inputMode="numeric"
                              />
                            </FormControl>
                          )}
                        />
                        
                        <Popover open={dateInputOpen} onOpenChange={setDateInputOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              type="button"
                              className="p-2"
                              onClick={() => setDateInputOpen(true)}
                            >
                              <Calendar className="h-5 w-5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                if (date) {
                                  form.setValue('birthDateInput', format(date, 'dd/MM/yyyy'));
                                  setDateInputOpen(false);
                                }
                              }}
                              disabled={(date) => date > new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Digite apenas os números (DDMMAAAA) ou selecione no calendário</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="Crie uma senha"
                              type={showPassword ? "text" : "password"}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-800"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="Confirme sua senha"
                              type={showConfirmPassword ? "text" : "password"}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-800"
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {userRole === 'master' && (
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Usuário</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo de usuário" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="user">Usuário</SelectItem>
                            <SelectItem value="operator">Operador</SelectItem>
                            <SelectItem value="master">Master</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-dark"
                  disabled={isLoading}
                >
                  {isLoading ? "Registrando..." : "Registrar"}
                </Button>
              </form>
            </Form>
            
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Já tem uma conta?{' '}
                <Link to="/login" className="text-primary hover:underline">
                  Faça login
                </Link>
              </p>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <Link to="/" className="inline-flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar para a página inicial
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
