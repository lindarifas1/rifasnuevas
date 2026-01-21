import { useState, useEffect } from 'react';
import { Raffle, Ticket } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, Hash, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { TermsModal } from '@/components/TermsModal';
import { supabase } from '@/integrations/supabase/client';

interface RaffleCardProps {
  raffle: Raffle;
  soldCount?: number;
}

export const RaffleCard = ({ raffle, soldCount = 0 }: RaffleCardProps) => {
  const navigate = useNavigate();
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsContent, setTermsContent] = useState('');
  const availableCount = raffle.number_count - soldCount;
  const progressPercent = (soldCount / raffle.number_count) * 100;

  useEffect(() => {
    fetchTermsConditions();
  }, []);

  const fetchTermsConditions = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('terms_conditions')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data?.terms_conditions) {
        setTermsContent(data.terms_conditions);
      }
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  const handleParticipateClick = () => {
    if (termsContent) {
      setTermsModalOpen(true);
    } else {
      navigate(`/rifa/${raffle.id}`);
    }
  };

  const handleAcceptTerms = () => {
    setTermsModalOpen(false);
    navigate(`/rifa/${raffle.id}`);
  };

  return (
    <>
      <Card className="overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 animate-fade-in">
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={raffle.cover_image || '/placeholder.svg'}
            alt={raffle.title}
            className="w-full h-full object-cover"
          />
        </div>
        <CardContent className="p-4 space-y-3">
          <h3 className="text-xl font-bold text-foreground line-clamp-2">
            {raffle.title}
          </h3>
          {raffle.description && (
            <p className="text-sm text-muted-foreground">
              {raffle.description}
            </p>
          )}
          
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

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-success font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {soldCount} vendidos
              </span>
              <span className="text-muted-foreground">{availableCount} disponibles</span>
            </div>
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-success transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1">
              <DollarSign className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold text-primary">{raffle.price}</span>
              <span className="text-sm text-muted-foreground">/ número</span>
            </div>
            <Button 
              variant="gold" 
              onClick={handleParticipateClick}
            >
              Participar
            </Button>
          </div>
        </CardContent>
      </Card>

      <TermsModal
        open={termsModalOpen}
        onOpenChange={setTermsModalOpen}
        onAccept={handleAcceptTerms}
        termsContent={termsContent}
      />
    </>
  );
};
