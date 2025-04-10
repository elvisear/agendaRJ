import { useState, useEffect } from 'react';
import { format, parse, isValid } from 'date-fns';
import { Calendar, User, Phone, AlertTriangle } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { formatCPF, formatPhone, phoneToInternational, calculateAge, formatDate, validateCPF } from '@/utils/formatters';
import { api } from '@/services/api';
import { Appointment, ServiceLocation } from '@/types';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from "@/components/ui/alert";

const appointmentFormSchema = z.object({
  cpf: z.string()
    .min(11, { message: 'CPF deve ter 11 dígitos' })
    .refine((cpf) => validateCPF(cpf), { message: 'CPF inválido' }),
  name: z.string().min(3, {
    message: 'Nome completo é obrigatório',
  }),
  whatsapp: z.string().min(10, {
    message: 'Número de Whatsapp inválido',
  }),
  birthDate: z.date({
    required_error: 'Data de nascimento é obrigatória',
  }),
  birthDateInput: z.string().optional(),
  locationId: z.string({
    required_error: 'Local de atendimento é obrigatório',
  }),
  guardianCpf: z.string()
    .optional()
    .refine((cpf) => !cpf || validateCPF(cpf), { message: 'CPF do responsável inválido' }),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

interface AppointmentFormProps {
  onSubmit: (values: any) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<Appointment>;
}

export default function AppointmentForm({
  onSubmit,
  onCancel,
  initialData,
}: AppointmentFormProps) {
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [requiresGuardian, setRequiresGuardian] = useState(false);
  const [dateInputOpen, setDateInputOpen] = useState(false);
  
  // Format initial date for the text input if available
  const initialBirthDateInput = initialData?.birthDate 
    ? format(new Date(initialData.birthDate), 'dd/MM/yyyy')
    : '';
  
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      cpf: initialData?.cpf || '',
      name: initialData?.name || '',
      whatsapp: initialData?.whatsapp || '',
      birthDate: initialData?.birthDate ? new Date(initialData.birthDate) : undefined,
      birthDateInput: initialBirthDateInput,
      locationId: initialData?.locationId || '',
      guardianCpf: initialData?.guardianCpf || '',
    },
  });
  
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        // Buscar postos usando a API que já tem todas as permissões necessárias
        console.log("AppointmentForm - Iniciando busca de postos via api.getAllServiceLocations()");
        
        try {
          const supabaseLocations = await api.getAllServiceLocations();
          
          console.log(`AppointmentForm - Encontrados ${supabaseLocations.length} postos:`,
             supabaseLocations.map(loc => ({ id: loc.id, name: loc.name })));
          
          // Usar os dados retornados pela API
          setLocations(supabaseLocations);
          
          // Avisar quando não há postos cadastrados
          if (supabaseLocations.length === 0) {
            console.warn("Nenhum posto de atendimento cadastrado no banco de dados");
            toast.error("Não há postos de atendimento disponíveis no momento");
          }
        } catch (apiError) {
          console.error('Erro ao buscar postos via API:', apiError);
          toast.error("Erro ao conectar com o serviço. Contate o administrador.");
          setLocations([]);
        }
      } catch (error) {
        console.error('Erro grave ao buscar postos de atendimento:', error);
        toast.error("Falha na comunicação com o servidor");
        setLocations([]);
      }
    };
    
    fetchLocations();
  }, []);
  
  // Check if guardian is required when birthdate changes
  useEffect(() => {
    const birthDate = form.watch('birthDate');
    if (birthDate) {
      const age = calculateAge(birthDate.toISOString());
      setRequiresGuardian(age < 15);
    }
  }, [form.watch('birthDate')]);
  
  // Format CPF as the user types
  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCPF(e.target.value);
    form.setValue('cpf', formattedValue);
  };
  
  // Format phone as the user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhone(e.target.value);
    form.setValue('whatsapp', formattedValue);
  };
  
  // Format guardian CPF as the user types
  const handleGuardianCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCPF(e.target.value);
    form.setValue('guardianCpf', formattedValue);
  };
  
  // Handle date input change
  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Remove caracteres não numéricos
    const numericValue = inputValue.replace(/\D/g, '');
    
    // Aplica a formatação dd/mm/aaaa automaticamente
    if (numericValue.length <= 2) {
      inputValue = numericValue;
    } else if (numericValue.length <= 4) {
      inputValue = `${numericValue.substring(0, 2)}/${numericValue.substring(2)}`;
    } else if (numericValue.length <= 8) {
      inputValue = `${numericValue.substring(0, 2)}/${numericValue.substring(2, 4)}/${numericValue.substring(4)}`;
    } else {
      inputValue = `${numericValue.substring(0, 2)}/${numericValue.substring(2, 4)}/${numericValue.substring(4, 8)}`;
    }
    
    form.setValue('birthDateInput', inputValue);
    
    // Try to parse the date in dd/MM/yyyy format
    if (inputValue.length === 10) {
      const parsedDate = parse(inputValue, 'dd/MM/yyyy', new Date());
      if (isValid(parsedDate)) {
        form.setValue('birthDate', parsedDate);
      }
    }
  };
  
  const handleFormSubmit = async (values: AppointmentFormValues) => {
    // Convert phone to international format for storage
    const internationalPhone = phoneToInternational(values.whatsapp);
    
    // Remove formatting from CPF
    const cleanCpf = values.cpf.replace(/\D/g, '');
    
    // Remove formatting from guardian CPF if present
    const cleanGuardianCpf = values.guardianCpf ? values.guardianCpf.replace(/\D/g, '') : undefined;
    
    // Remove the birthDateInput field as it's only for UI
    const { birthDateInput, ...submitValues } = values;
    
    await onSubmit({
      ...submitValues,
      cpf: cleanCpf,
      whatsapp: internationalPhone,
      guardianCpf: cleanGuardianCpf,
      birthDate: values.birthDate.toISOString(),
    });
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
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
                  onChange={handleCPFChange}
                  maxLength={14}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
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
          name="whatsapp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>WhatsApp</FormLabel>
              <FormControl>
                <div className="relative">
                  <Phone className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input 
                    placeholder="(00) 0 0000-0000" 
                    className="pl-8" 
                    {...field}
                    onChange={handlePhoneChange}
                    maxLength={16}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="birthDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
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
                        autoComplete="off"
                      />
                    </FormControl>
                  )}
                />
                
                <Popover open={dateInputOpen} onOpenChange={setDateInputOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      type="button"
                      className="px-2"
                      onClick={() => setDateInputOpen(true)}
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        field.onChange(date);
                        if (date) {
                          form.setValue('birthDateInput', format(date, 'dd/MM/yyyy'));
                        }
                        setDateInputOpen(false);
                      }}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {requiresGuardian && (
          <FormField
            control={form.control}
            name="guardianCpf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CPF do Responsável</FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input 
                      placeholder="000.000.000-00" 
                      className="pl-8" 
                      {...field}
                      onChange={handleGuardianCPFChange}
                      maxLength={14}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <FormField
          control={form.control}
          name="locationId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Local do Agendamento</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um posto de atendimento" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {locations.length > 0 ? (
                    locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name} - {location.city}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-locations" disabled>
                      Nenhum posto cadastrado
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {locations.length === 0 && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Não há postos de atendimento cadastrados no banco. Contate o administrador.
                  </AlertDescription>
                </Alert>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        
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
