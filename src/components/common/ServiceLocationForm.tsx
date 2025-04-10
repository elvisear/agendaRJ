import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
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
import { DialogFooter } from '@/components/ui/dialog';
import { ServiceLocation } from '@/types';
import { api } from '@/services/api';
import { toast } from '@/components/ui/sonner';

const serviceLocationSchema = z.object({
  name: z.string().min(3, { message: 'Nome deve ter no mínimo 3 caracteres' }),
  zipCode: z.string().min(8, { message: 'CEP inválido' }).max(9),
  street: z.string().min(3, { message: 'Rua é obrigatória' }),
  number: z.string().min(1, { message: 'Número é obrigatório' }),
  neighborhood: z.string().min(2, { message: 'Bairro é obrigatório' }),
  complement: z.string().optional(),
  city: z.string().min(2, { message: 'Cidade é obrigatória' }),
  state: z.string().min(2, { message: 'Estado é obrigatório' }).max(2),
});

type ServiceLocationFormValues = z.infer<typeof serviceLocationSchema>;

interface ServiceLocationFormProps {
  onSubmit: (data: ServiceLocationFormValues) => void;
  onCancel: () => void;
  initialData?: Partial<ServiceLocationFormValues>;
}

export default function ServiceLocationForm({
  onSubmit,
  onCancel,
  initialData
}: ServiceLocationFormProps) {
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  const form = useForm<ServiceLocationFormValues>({
    resolver: zodResolver(serviceLocationSchema),
    defaultValues: initialData || {
      name: '',
      zipCode: '',
      street: '',
      number: '',
      neighborhood: '',
      complement: '',
      city: '',
      state: '',
    },
  });

  // Formatar o CEP enquanto o usuário digita
  const formatZipCode = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numericValue = value.replace(/\D/g, '');
    
    // Aplica a máscara de CEP: XXXXX-XXX
    if (numericValue.length <= 5) {
      return numericValue;
    } else {
      return `${numericValue.slice(0, 5)}-${numericValue.slice(5, 8)}`;
    }
  };

  // Função para buscar o endereço pelo CEP
  const fetchAddressByCep = async (cep: string) => {
    if (!cep || cep.length < 8) return;

    // Remove caracteres não numéricos
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        form.setValue('street', data.logradouro || '');
        form.setValue('neighborhood', data.bairro || '');
        form.setValue('city', data.localidade || '');
        form.setValue('state', data.uf || '');
        
        // Focar no campo de número após preencher o endereço
        setTimeout(() => {
          const numberInput = document.querySelector('input[name="number"]');
          if (numberInput) {
            (numberInput as HTMLInputElement).focus();
          }
        }, 100);
      } else {
        // CEP não encontrado
        form.setError('zipCode', { 
          type: 'manual', 
          message: 'CEP não encontrado' 
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      form.setError('zipCode', { 
        type: 'manual', 
        message: 'Erro ao buscar CEP' 
      });
    } finally {
      setIsFetchingCep(false);
    }
  };

  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatZipCode(e.target.value);
    form.setValue('zipCode', formattedValue);
    
    // Se tiver 8 dígitos, buscar o endereço automaticamente
    if (formattedValue.replace(/\D/g, '').length === 8) {
      fetchAddressByCep(formattedValue);
    }
  };

  const handleSubmit = (values: ServiceLocationFormValues) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Posto de Atendimento</FormLabel>
              <FormControl>
                <Input placeholder="Nome do posto" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="zipCode"
          render={({ field: { onChange, ...rest } }) => (
            <FormItem>
              <FormLabel>CEP</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input 
                    placeholder="00000-000" 
                    {...rest} 
                    onChange={handleZipCodeChange}
                  />
                </FormControl>
                {isFetchingCep && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  </div>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rua</FormLabel>
                  <FormControl>
                    <Input placeholder="Rua, Avenida, etc" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número</FormLabel>
                <FormControl>
                  <Input placeholder="123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="neighborhood"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bairro</FormLabel>
                <FormControl>
                  <Input placeholder="Bairro" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="complement"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Complemento</FormLabel>
                <FormControl>
                  <Input placeholder="Próximo ao shopping, etc" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <Input placeholder="Cidade" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <FormControl>
                  <Input placeholder="UF" maxLength={2} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </Form>
  );
}
