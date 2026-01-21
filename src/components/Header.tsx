import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Settings, Trophy, LogOut } from 'lucide-react';

interface HeaderProps {
  isAdmin?: boolean;
  onLogout?: () => void;
  appName?: string;
}

export const Header = ({ isAdmin, onLogout, appName = 'RifaMax' }: HeaderProps) => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/admin/login');
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
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
          <span className="text-xl font-bold">{appName}</span>
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
            <Button 
              variant="ghost" 
              size="icon" 
              className="opacity-50 hover:opacity-100"
              onClick={handleLogin}
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
