import { useState, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { api } from '@/services/api';
import { toast } from '@/components/ui/sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, AlertCircle, Loader2, UserCheck, UserX } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToToggleStatus, setUserToToggleStatus] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const { currentUser } = useAuth();
  
  // Verificar se o usuário é master
  const isMaster = currentUser?.role === 'master';

  // Função para carregar os usuários
  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('Carregando lista de usuários...');
      const usersData = await api.getAllUsers();
      setUsers(usersData);
      console.log(`${usersData.length} usuários carregados`);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      setError('Não foi possível carregar a lista de usuários. Tente novamente mais tarde.');
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  // Função para depurar e corrigir status de usuários
  const handleDebugUserStatus = async () => {
    try {
      console.log('Iniciando depuração de status de usuários...');
      await api.debugAndFixUserStatus();
      // Recarregar a lista de usuários após a correção
      await fetchUsers();
      toast.success('Status de usuários verificado e corrigido');
    } catch (err) {
      console.error('Erro durante a depuração:', err);
      toast.error('Erro na depuração de status');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Função para atualizar o papel do usuário
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      setIsUpdating(userId);
      console.log(`Atualizando perfil do usuário ${userId} para ${newRole}`);
      
      // Encontrar o usuário na lista
      const userToUpdate = users.find(user => user.id === userId);
      if (!userToUpdate) {
        toast.error('Usuário não encontrado');
        return;
      }
      
      // Atualizar o papel do usuário
      const updatedUser = { ...userToUpdate, role: newRole };
      await api.updateUser(updatedUser);
      
      // Atualizar a lista de usuários
      setUsers(users.map(user => user.id === userId ? { ...user, role: newRole } : user));
      
      toast.success(`Perfil do usuário atualizado para ${newRole}`);
    } catch (err) {
      console.error('Erro ao atualizar perfil do usuário:', err);
      toast.error('Erro ao atualizar perfil do usuário');
    } finally {
      setIsUpdating(null);
    }
  };

  // Função para excluir um usuário
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      console.log(`Excluindo usuário ${userToDelete.id}`);
      await api.deleteUser(userToDelete.id);
      
      // Atualizar a lista de usuários
      setUsers(users.filter(user => user.id !== userToDelete.id));
      
      toast.success('Usuário excluído com sucesso');
      setIsDialogOpen(false);
      setUserToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir usuário:', err);
      toast.error('Erro ao excluir usuário');
    }
  };
  
  // Função para ativar/inativar um usuário
  const handleToggleUserStatus = async () => {
    if (!userToToggleStatus) return;
    
    try {
      setIsUpdating(userToToggleStatus.id);
      
      if (userToToggleStatus.isActive) {
        // Inativar o usuário
        await api.inactivateUser(userToToggleStatus.id);
        toast.success(`Usuário ${userToToggleStatus.name} inativado com sucesso`);
      } else {
        // Ativar o usuário
        await api.activateUser(userToToggleStatus.id);
        toast.success(`Usuário ${userToToggleStatus.name} ativado com sucesso`);
      }
      
      // Atualizar a lista de usuários
      setUsers(users.map(user => 
        user.id === userToToggleStatus.id 
          ? { ...user, isActive: !user.isActive } 
          : user
      ));
      
      setIsStatusDialogOpen(false);
      setUserToToggleStatus(null);
    } catch (err) {
      console.error('Erro ao alterar status do usuário:', err);
      toast.error('Erro ao alterar status do usuário');
    } finally {
      setIsUpdating(null);
    }
  };

  // Função para abrir o diálogo de confirmação de exclusão
  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setIsDialogOpen(true);
  };
  
  // Função para abrir o diálogo de alteração de status
  const openStatusDialog = (user: User) => {
    setUserToToggleStatus(user);
    setIsStatusDialogOpen(true);
  };

  // Verificar se o usuário é o usuário atual
  const isCurrentUser = (userId: string) => currentUser?.id === userId;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
        
        {isMaster && (
          <div className="flex gap-2">
            <Button onClick={handleDebugUserStatus} variant="outline" className="ml-auto">
              <Loader2 className="h-4 w-4 mr-2" />
              Corrigir Status
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-6 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-gray-600">Carregando usuários...</span>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Tipo de Usuário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.whatsapp}</TableCell>
                    <TableCell>
                      {isUpdating === user.id ? (
                        <div className="flex items-center">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span>Atualizando...</span>
                        </div>
                      ) : (
                        <Select
                          defaultValue={user.role}
                          onValueChange={(value: UserRole) => handleRoleChange(user.id, value)}
                          disabled={isCurrentUser(user.id) || !isMaster} // Não permitir alterar o próprio papel ou se não for master
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Usuário</SelectItem>
                            <SelectItem value="operator">Operador</SelectItem>
                            <SelectItem value="master">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {isMaster && !isCurrentUser(user.id) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openStatusDialog(user)}
                            disabled={isUpdating === user.id}
                          >
                            {user.isActive ? (
                              <UserX className="h-4 w-4 mr-1" />
                            ) : (
                              <UserCheck className="h-4 w-4 mr-1" />
                            )}
                            {user.isActive ? 'Inativar' : 'Ativar'}
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(user)}
                          disabled={isCurrentUser(user.id) || !isMaster} // Apenas master pode excluir, mas não o próprio usuário
                          title={isCurrentUser(user.id) ? "Não é possível excluir seu próprio usuário" : "Excluir usuário"}
                        >
                          <Trash2 className="h-5 w-5 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Diálogo de confirmação de exclusão */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir usuário</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{userToDelete?.name}</strong>?
              <br />
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de confirmação de alteração de status */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {userToToggleStatus?.isActive ? "Inativar usuário" : "Ativar usuário"}
            </DialogTitle>
            <DialogDescription>
              {userToToggleStatus?.isActive ? (
                <>
                  Tem certeza que deseja inativar o usuário <strong>{userToToggleStatus?.name}</strong>?
                  <br />
                  O usuário não poderá mais fazer login no sistema.
                </>
              ) : (
                <>
                  Tem certeza que deseja ativar o usuário <strong>{userToToggleStatus?.name}</strong>?
                  <br />
                  O usuário poderá fazer login no sistema novamente.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant={userToToggleStatus?.isActive ? "destructive" : "default"}
              onClick={handleToggleUserStatus}
            >
              {userToToggleStatus?.isActive ? "Inativar" : "Ativar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 