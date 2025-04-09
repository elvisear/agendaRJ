
import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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

const locationFormSchema = z.object({
  name: z.string().min(3, {
    message: 'Nome do posto é obrigatório',
  }),
  zipCode: z.string().min(8, {
    message: 'CEP deve ter 8 dígitos',
  }),
  street: z.string().min(3, {
    message: 'Rua é obrigatória',
  }),
  number: z.string().min(1, {
    message: 'Número é obrigatório',
  }),
  neighborhood: z.string().min(2, {
    message: 'Bairro é obrigatório',
  }),
  complement: z.string().optional(),
  city: z.string().min(2, {
    message: 'Cidade é obrigatória',
  }),
  state: z.string().min(2, {
    message: 'Estado é obrigatório',
  }),
});

type LocationFormValues = z.infer<typeof locationFormSchema>;

interface ServiceLocationFormProps {
  onSubmit: (values: LocationFormValues) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<ServiceLocation>;
}

export default function ServiceLocationForm({
  onSubmit,
  onCancel,
  initialData,
}: ServiceLocationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      zipCode: initialData?.zipCode || '',
      street: initialData?.street || '',
      number: initialData?.number || '',
      neighborhood: initialData?.neighborhood || '',
      complement: initialData?.complement || '',
      city: initialData?.city || '',
      state: initialData?.state || '',
    },
  });
  
  const handleZipCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const zipCode = e.target.value.replace(/\D/g, '');
    form.setValue('zipCode', zipCode);
    
    if (zipCode.length === 8) {
      setIsLoading(true);
      try {
        const addressData = await api.lookupAddress(zipCode);
        
        form.setValue('street', addressData.street);
        form.setValue('neighborhood', addressData.neighborhood);
        form.setValue('city', addressData.city);
        form.setValue('state', addressData.state);
      } catch (error) {
        console.error('Error fetching address:', error);
        toast.error('CEP não encontrado');
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Posto</FormLabel>
              <FormControl>
                <Input placeholder="Nome do posto de atendimento" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="zipCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CEP</FormLabel>
              <FormControl>
                <Input 
                  placeholder="00000-000" 
                  {...field} 
                  onChange={handleZipCodeChange}
                  disabled={isLoading}
                  maxLength={9}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="street"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rua</FormLabel>
                <FormControl>
                  <Input placeholder="Rua" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número</FormLabel>
                <FormControl>
                  <Input placeholder="Número" {...field} />
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
                  <Input placeholder="Bairro" {...field} disabled={isLoading} />
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
                  <Input placeholder="Complemento" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cidade</FormLabel>
                <FormControl>
                  <Input placeholder="Cidade" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <FormControl>
                  <Input placeholder="Estado" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <DialogFooter className="pt-4">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Salvar</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
