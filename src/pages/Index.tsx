
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Index() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header/Navigation */}
      <header className="bg-primary shadow-md py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            <Calendar className="text-white h-6 w-6 mr-2" />
            <h1 className="text-white text-2xl font-bold">AgendaRJ</h1>
          </div>
          <div className="space-x-2">
            <Button 
              variant="ghost" 
              className="text-white hover:text-white hover:bg-primary-dark"
              onClick={() => navigate('/login')}
            >
              Entrar
            </Button>
            <Button 
              variant="outline" 
              className="text-orange-500 border-white hover:border-orange-500 hover:bg-white hover:text-primary"
              onClick={() => navigate('/register')}
            >
              Cadastrar
            </Button>
          </div>
        </div>
      </header>
      
      {/* Hero section */}
      <section className="bg-gradient-to-b from-primary to-primary-dark text-white py-16">
        <div className="container mx-auto px-4 flex flex-col items-center">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-6">
            Gerencie seus agendamentos com facilidade
          </h2>
          <p className="text-xl text-center max-w-2xl mb-8">
            AgendaRJ é um sistema completo para gerenciamento de agendamentos para cidadãos do Rio de Janeiro.
          </p>
          <Button 
            size="lg" 
            className="bg-secondary hover:bg-secondary/90 text-white"
            onClick={() => navigate('/appointments')}
          >
            Criar Agendamento
          </Button>
        </div>
      </section>
      
      {/* Features section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12 text-text-primary">Como funciona</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-6 rounded-lg shadow-md">
              <div className="bg-primary-light rounded-full p-4 mb-4">
                <User className="h-8 w-8 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-2 text-text-primary">Cadastro Simples</h4>
              <p className="text-text-secondary">
                Registro rápido e intuitivo para começar a usar o sistema em poucos minutos.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center p-6 rounded-lg shadow-md">
              <div className="bg-primary-light rounded-full p-4 mb-4">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-2 text-text-primary">Agendamentos Fáceis</h4>
              <p className="text-text-secondary">
                Agende seus atendimentos em qualquer posto da rede com facilidade e rapidez.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center p-6 rounded-lg shadow-md">
              <div className="bg-primary-light rounded-full p-4 mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-2 text-text-primary">Acompanhamento em Tempo Real</h4>
              <p className="text-text-secondary">
                Acompanhe o status do seu agendamento e receba atualizações direto no seu WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* How it works section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12 text-text-primary">Nossos Benefícios</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-start p-4">
              <CheckCircle className="h-6 w-6 text-primary mr-4 flex-shrink-0 mt-1" />
              <div>
                <h4 className="text-lg font-semibold mb-2 text-text-primary">Redução de filas</h4>
                <p className="text-text-secondary">
                  Esqueça as longas filas de espera. Com o AgendaRJ você economiza tempo e evita aglomerações.
                </p>
              </div>
            </div>
            
            <div className="flex items-start p-4">
              <CheckCircle className="h-6 w-6 text-primary mr-4 flex-shrink-0 mt-1" />
              <div>
                <h4 className="text-lg font-semibold mb-2 text-text-primary">Facilidade de uso</h4>
                <p className="text-text-secondary">
                  Interface intuitiva pensada para todos os públicos, sem complicações.
                </p>
              </div>
            </div>
            
            <div className="flex items-start p-4">
              <CheckCircle className="h-6 w-6 text-primary mr-4 flex-shrink-0 mt-1" />
              <div>
                <h4 className="text-lg font-semibold mb-2 text-text-primary">Notificações automáticas</h4>
                <p className="text-text-secondary">
                  Receba lembretes e atualizações sobre seus agendamentos diretamente no seu WhatsApp.
                </p>
              </div>
            </div>
            
            <div className="flex items-start p-4">
              <CheckCircle className="h-6 w-6 text-primary mr-4 flex-shrink-0 mt-1" />
              <div>
                <h4 className="text-lg font-semibold mb-2 text-text-primary">Múltiplos locais</h4>
                <p className="text-text-secondary">
                  Escolha entre diversos postos de atendimento em toda a cidade do Rio de Janeiro e região.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA section */}
      <section className="bg-primary py-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold text-white mb-6">
            Comece a usar hoje mesmo
          </h3>
          <p className="text-lg text-white/90 max-w-2xl mx-auto mb-8">
            Crie seu agendamento agora mesmo e economize tempo evitando filas e burocracias.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-gray-100"
              onClick={() => navigate('/register')}
            >
              Criar conta
            </Button>
            <Button 
              size="lg" 
              className="bg-secondary hover:bg-secondary/90 text-white"
              onClick={() => navigate('/appointments')}
            >
              Ver agendamentos
            </Button>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-xl font-semibold mb-4">AgendaRJ</h4>
              <p className="text-gray-400">
                Sistema de gerenciamento de agendamentos para serviços públicos e privados.
              </p>
            </div>
            
            <div>
              <h4 className="text-xl font-semibold mb-4">Links Úteis</h4>
              <ul className="space-y-2">
                <li><button className="text-gray-400 hover:text-white">Sobre nós</button></li>
                <li><button className="text-gray-400 hover:text-white">Termos de uso</button></li>
                <li><button className="text-gray-400 hover:text-white">Política de privacidade</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-xl font-semibold mb-4">Contato</h4>
              <p className="text-gray-400">
                contato@agendrj.com.br<br />
                (21) 9999-9999
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-gray-500">
            <p>&copy; {new Date().getFullYear()} AgendaRJ. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
