import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { NumberGrid } from '@/components/NumberGrid';
import { PurchaseForm } from '@/components/PurchaseForm';
import { VerifyNumbers } from '@/components/VerifyNumbers';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Raffle, Ticket } from '@/types/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Loader2, 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Hash,
  ShoppingCart 
} from 'lucide-react';
import { toast } from 'sonner';

const RaffleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [adminWhatsapp, setAdminWhatsapp] = useState('');
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  useEffect(() => {
    if (id) {
      fetchRaffle();
      fetchTickets();
      fetchSiteSettings();
    }
  }, [id]);

  const fetchSiteSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('admin_whatsapp')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setAdminWhatsapp(data.admin_whatsapp || '');
      }
    } catch (error) {
      console.error('Error fetching site settings:', error);
    }
  };

  const fetchRaffle = async () => {
    try {
      const { data, error } = await supabase
        .from('raffles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setRaffle(data as Raffle);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar la rifa');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('raffle_id', id);

      if (error) throw error;
      setTickets(data as Ticket[] || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSelectNumber = (number: number) => {
    setSelectedNumbers(prev => {
      if (prev.includes(number)) {
        return prev.filter(n => n !== number);
      }
      return [...prev, number];
    });
  };

  const handleClearSelection = () => {
    setSelectedNumbers([]);
  };

  const handlePurchaseSuccess = () => {
    setShowPurchaseForm(false);
    setSelectedNumbers([]);
    fetchTickets();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header isAdmin={isAdmin} />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!raffle) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header isAdmin={isAdmin} />

      {/* Back Button */}
      <div className="container py-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>
      </div>

      {/* Raffle Header */}
      <section className="relative h-[40vh] min-h-[250px] overflow-hidden">
        <img
          src={raffle.cover_image || '/placeholder.svg'}
          alt={raffle.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 container">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
            {raffle.title}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            {raffle.description}
          </p>
        </div>
      </section>

      {/* Raffle Info */}
      <section className="container py-6">
        <div className="flex flex-wrap gap-4 p-4 bg-card rounded-xl shadow-card mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <Calendar className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fecha del Sorteo</p>
              <p className="font-semibold">
                {format(new Date(raffle.raffle_date), "d 'de' MMMM, yyyy", { locale: es })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Precio por Número</p>
              <p className="font-bold text-primary text-xl">${raffle.price}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-success/10 rounded-lg">
              <Hash className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Números Disponibles</p>
              <p className="font-semibold">
                {raffle.number_count - tickets.filter(t => t.payment_status === 'paid').length} de {raffle.number_count}
              </p>
            </div>
          </div>
        </div>

        {/* Verify Numbers */}
        <div className="mb-6">
          <VerifyNumbers raffleId={raffle.id} numberCount={raffle.number_count} />
        </div>

        {/* Number Grid or Purchase Form */}
        {showPurchaseForm ? (
          <PurchaseForm
            raffle={raffle}
            selectedNumbers={selectedNumbers}
            onSuccess={handlePurchaseSuccess}
            onCancel={() => setShowPurchaseForm(false)}
            adminWhatsapp={adminWhatsapp}
          />
        ) : (
          <>
            <NumberGrid
              numberCount={raffle.number_count}
              tickets={tickets}
              selectedNumbers={selectedNumbers}
              onSelectNumber={handleSelectNumber}
              onClearSelection={handleClearSelection}
            />

            {/* Purchase Button */}
            {selectedNumbers.length > 0 && (
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur-lg border-t shadow-lg">
                <div className="container flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {selectedNumbers.length} número(s) seleccionado(s)
                    </p>
                    <p className="text-xl font-bold text-primary">
                      Total: ${selectedNumbers.length * raffle.price}
                    </p>
                  </div>
                  <Button 
                    variant="gold" 
                    size="lg" 
                    onClick={() => setShowPurchaseForm(true)}
                    className="gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Comprar
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Spacer for fixed bottom bar */}
      {selectedNumbers.length > 0 && !showPurchaseForm && (
        <div className="h-24" />
      )}
    </div>
  );
};

export default RaffleDetail;
