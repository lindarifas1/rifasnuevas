import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Settings, Trophy, LogOut } from 'lucide-react';

interface HeaderProps {
  isAdmin?: boolean;
  onLogout?: () => void;
}

export const Header = ({ isAdmin, onLogout }: HeaderProps) => {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    if (username === 'leonardy' && password === 'Mkgothicp') {
      localStorage.setItem('isAdmin', 'true');
      setOpen(false);
      toast.success('¡Bienvenido Administrador!');
      navigate('/admin');
    } else {
      toast.error('Credenciales incorrectas');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    if (onLogout) onLogout();
    toast.success('Sesión cerrada');
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-card/80 backdrop-blur-lg border-b">
      <div className="container flex h-16 items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shadow-gold">
            <Trophy className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">RifaMax</span>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => navigate('/admin')}
              >
                <Settings className="w-4 h-4 mr-1" />
                Panel Admin
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="opacity-50 hover:opacity-100">
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Acceso Administrativo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Usuario</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Usuario"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Contraseña"
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                  </div>
                  <Button onClick={handleLogin} className="w-full" variant="gold">
                    Iniciar Sesión
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </header>
  );
};
