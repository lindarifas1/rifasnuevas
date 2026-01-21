import { Raffle } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface RaffleCardProps {
  raffle: Raffle;
}

export const RaffleCard = ({ raffle }: RaffleCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 animate-fade-in">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={raffle.cover_image || '/placeholder.svg'}
          alt={raffle.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-xl font-bold text-card mb-1 line-clamp-2">
            {raffle.title}
          </h3>
          <p className="text-card/80 text-sm line-clamp-2">
            {raffle.description}
          </p>
        </div>
      </div>
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 text-secondary" />
            <span>{format(new Date(raffle.raffle_date), "d 'de' MMMM, yyyy", { locale: es })}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Hash className="w-4 h-4 text-secondary" />
            <span>{raffle.number_count} números</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <DollarSign className="w-5 h-5 text-primary" />
            <span className="text-2xl font-bold text-primary">{raffle.price}</span>
            <span className="text-sm text-muted-foreground">/ número</span>
          </div>
          <Button 
            variant="gold" 
            onClick={() => navigate(`/rifa/${raffle.id}`)}
          >
            Participar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
