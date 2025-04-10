import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Plus, ChevronLeft, Edit, Trash, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/sonner';
import { ServiceLocation } from '@/types';
import { api } from '@/services/api';
import ServiceLocationForm from '@/components/common/ServiceLocationForm';

export default function ServiceLocations() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<ServiceLocation[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [isNewLocationOpen, setIsNewLocationOpen] = useState(false);
  const [isEditLocationOpen, setIsEditLocationOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<ServiceLocation | null>(null);
  
  useEffect(() => {
    fetchLocations();
  }, []);
  
  const fetchLocations = async () => {
    setIsLoading(true);
    try {
      const locationsData = await api.getAllServiceLocations();
      setLocations(locationsData);
      
      // Extract unique cities for filter
      const uniqueCities = Array.from(new Set(locationsData.map(loc => loc.city)))
        .filter(city => city && city.trim() !== '')
        .sort();
      setCities(uniqueCities);
      
      applyFilters(locationsData, selectedCity, searchTerm);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Erro ao carregar postos de atendimento');
    } finally {
      setIsLoading(false);
    }
  };
  
  const applyFilters = (
    locationsList: ServiceLocation[],
    city: string = selectedCity,
    search: string = searchTerm
  ) => {
    let filtered = [...locationsList];
    
    // Apply city filter
    if (city && city !== 'all') {
      filtered = filtered.filter(loc => loc.city === city);
    }
    
    // Apply search filter
    if (search.trim() !== '') {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(loc => 
        loc.name.toLowerCase().includes(searchLower) ||
        loc.street.toLowerCase().includes(searchLower) ||
        loc.neighborhood.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort by city and then by name
    filtered.sort((a, b) => {
      if (a.city !== b.city) {
        return a.city.localeCompare(b.city);
      }
      return a.name.localeCompare(b.name);
    });
    
    setFilteredLocations(filtered);
  };
  
  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    applyFilters(locations, city, searchTerm);
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    applyFilters(locations, selectedCity, value);
  };
  
  const handleNewLocation = async (data: Omit<ServiceLocation, 'id'>) => {
    try {
      await api.createServiceLocation(data);
      toast.success('Posto de atendimento criado com sucesso');
      setIsNewLocationOpen(false);
      fetchLocations();
    } catch (error) {
      console.error('Error creating location:', error);
      toast.error('Erro ao criar posto de atendimento');
    }
  };
  
  const handleEditLocation = async (data: ServiceLocation) => {
    if (!currentLocation) return;
    
    try {
      await api.updateServiceLocation(currentLocation.id, data);
      toast.success('Posto de atendimento atualizado com sucesso');
      setIsEditLocationOpen(false);
      setCurrentLocation(null);
      fetchLocations();
    } catch (error) {
      console.error('Error updating location:', error);
      toast.error('Erro ao atualizar posto de atendimento');
    }
  };
  
  const handleDeleteLocation = async () => {
    if (!currentLocation) return;
    
    try {
      await api.deleteServiceLocation(currentLocation.id);
      toast.success('Posto de atendimento excluído com sucesso');
      setIsDeleteDialogOpen(false);
      setCurrentLocation(null);
      fetchLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error('Erro ao excluir posto de atendimento');
    }
  };
  
  const openEditDialog = (location: ServiceLocation) => {
    setCurrentLocation(location);
    setIsEditLocationOpen(true);
  };
  
  const openDeleteDialog = (location: ServiceLocation) => {
    setCurrentLocation(location);
    setIsDeleteDialogOpen(true);
  };
  
  // Função para criar um posto de teste rapidamente
  const handleCreateTestLocation = async () => {
    setIsLoading(true);
    try {
      await api.insertTestServiceLocation();
      toast.success('Posto de teste criado com sucesso');
      await fetchLocations();
    } catch (error) {
      console.error('Erro ao criar posto de teste:', error);
      toast.error('Erro ao criar posto de teste');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back to dashboard */}
      <header className="bg-primary shadow-md py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <button 
            className="flex items-center text-white hover:text-gray-200"
            onClick={() => navigate('/dashboard')}
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span>Voltar</span>
          </button>
          <div className="flex items-center">
            <MapPin className="text-white h-6 w-6 mr-2" />
            <h1 className="text-white text-2xl font-bold">Postos de Atendimento</h1>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={() => setIsNewLocationOpen(true)}
              className="bg-white text-primary hover:bg-gray-100"
            >
              <Plus className="h-4 w-4 mr-1" />
              Novo Posto
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar postos
              </label>
              <div className="relative">
                <Input
                  placeholder="Buscar por nome, rua ou bairro"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
                <Search className="h-4 w-4 text-gray-500 absolute left-3 top-3" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filtrar por cidade
              </label>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select 
                  value={selectedCity} 
                  onValueChange={handleCityChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Todas as cidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as cidades</SelectItem>
                    {cities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        
        {/* Locations grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredLocations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLocations.map((location) => (
              <Card 
                key={location.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openEditDialog(location)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{location.name}</CardTitle>
                      <CardDescription>{location.city} - {location.state}</CardDescription>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(location);
                        }}
                        className="text-gray-500 hover:text-primary p-1 rounded-full hover:bg-gray-100"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteDialog(location);
                        }}
                        className="text-gray-500 hover:text-red-500 p-1 rounded-full hover:bg-gray-100"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm text-gray-500">
                    <p>{location.street}, {location.number}</p>
                    <p>{location.neighborhood}, {location.zipCode}</p>
                    {location.complement && <p>{location.complement}</p>}
                    <p className="text-xs text-gray-400 mt-2">ID: {location.id}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-800 mb-2">Nenhum posto encontrado</h3>
            {searchTerm || selectedCity !== 'all' ? (
              <p className="text-gray-500 mb-6">
                Nenhum posto de atendimento corresponde aos filtros aplicados.
              </p>
            ) : (
              <>
                <p className="text-gray-500 mb-2">
                  Você ainda não tem postos de atendimento cadastrados no banco de dados.
                </p>
              </>
            )}
            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 justify-center">
              <Button onClick={() => setIsNewLocationOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Posto
              </Button>
            </div>
          </div>
        )}
      </main>
      
      {/* New Location Dialog */}
      <Dialog
        open={isNewLocationOpen}
        onOpenChange={setIsNewLocationOpen}
      >
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Novo Posto de Atendimento</DialogTitle>
            <DialogDescription>
              Preencha os dados do posto de atendimento. O CEP preencherá automaticamente alguns campos.
            </DialogDescription>
          </DialogHeader>
          <ServiceLocationForm
            onSubmit={handleNewLocation}
            onCancel={() => setIsNewLocationOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Location Dialog */}
      <Dialog
        open={isEditLocationOpen}
        onOpenChange={setIsEditLocationOpen}
      >
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Editar Posto de Atendimento</DialogTitle>
            <DialogDescription>
              Atualize os dados do posto de atendimento.
            </DialogDescription>
          </DialogHeader>
          {currentLocation && (
            <ServiceLocationForm
              initialData={currentLocation}
              onSubmit={handleEditLocation}
              onCancel={() => setIsEditLocationOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Location Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Posto de Atendimento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este posto de atendimento? 
              Esta ação não pode ser desfeita e pode afetar agendamentos existentes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLocation} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 