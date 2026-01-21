import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { RaffleCard } from '@/components/RaffleCard';
import { PaymentMethodsDisplay } from '@/components/PaymentMethodsDisplay';
import { VerifyNumbersGlobal } from '@/components/VerifyNumbersGlobal';
import { supabase } from '@/integrations/supabase/client';
import { Raffle, Ticket } from '@/types/database';
import { Loader2, Trophy, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [ticketCounts, setTicketCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [coverImage, setCoverImage] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [appName, setAppName] = useState('');
  const [adminWhatsapp, setAdminWhatsapp] = useState('');
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  useEffect(() => {
    fetchRaffles();
    fetchSiteSettings();
  }, []);

  const fetchRaffles = async () => {
    try {
      const { data: rafflesData, error: rafflesError } = await supabase
        .from('raffles')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (rafflesError) throw rafflesError;
      setRaffles(rafflesData as Raffle[] || []);

      // Fetch ticket counts for each raffle
      if (rafflesData && rafflesData.length > 0) {
        const raffleIds = rafflesData.map(r => r.id);
        const { data: ticketsData, error: ticketsError } = await supabase
          .from('tickets')
          .select('raffle_id, payment_status')
          .in('raffle_id', raffleIds);

        if (ticketsError) throw ticketsError;

        // Count sold tickets per raffle (paid, pending, reserved)
        const counts: Record<string, number> = {};
        (ticketsData as Ticket[] || []).forEach(ticket => {
          if (ticket.payment_status === 'paid' || ticket.payment_status === 'pending' || ticket.payment_status === 'reserved') {
            counts[ticket.raffle_id] = (counts[ticket.raffle_id] || 0) + 1;
          }
        });
        setTicketCounts(counts);
      }
    } catch (error) {
      console.error('Error fetching raffles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSiteSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setCoverImage(data.cover_image || '');
        setAppName(data.app_name || '');
        setAdminWhatsapp(data.admin_whatsapp || '');
        setLogoUrl(data.logo_url || '');
      }
    } catch (error) {
      console.error('Error fetching site settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header isAdmin={isAdmin} appName={appName} adminWhatsapp={adminWhatsapp} logoUrl={logoUrl} />
      
      {/* Hero Section - Full image without cropping */}
      {coverImage && (
        <section className="bg-black">
          <img
            src={coverImage}
            alt="Portada"
            className="w-full h-auto max-h-[60vh] object-contain mx-auto"
          />
        </section>
      )}

      {/* Raffles Section */}
      <section className="container py-8">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-7 h-7 text-primary" />
          <h2 className="text-2xl font-bold">Rifas Activas</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : raffles.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground">
              No hay rifas activas
            </h3>
            <p className="text-muted-foreground">
              Vuelve pronto para nuevas oportunidades
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {raffles.map((raffle) => (
              <RaffleCard 
                key={raffle.id} 
                raffle={raffle} 
                soldCount={ticketCounts[raffle.id] || 0}
              />
            ))}
          </div>
        )}
      </section>

      {/* Verify Numbers Section */}
      <VerifyNumbersGlobal />

      {/* WhatsApp Contact Section */}
      {adminWhatsapp && (
        <section className="container py-8">
          <div className="bg-card rounded-xl p-6 text-center border shadow-card">
            <h3 className="text-lg font-bold mb-2">¿Tienes dudas?</h3>
            <p className="text-muted-foreground mb-4">Contáctanos por WhatsApp</p>
            <Button 
              size="lg"
              onClick={() => {
                const cleanPhone = adminWhatsapp.replace(/[^0-9]/g, '');
                window.open(`https://wa.me/${cleanPhone}`, '_blank');
              }}
              className="bg-[#25D366] hover:bg-[#128C7E] text-white gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Escribir por WhatsApp
            </Button>
          </div>
        </section>
      )}

      {/* Payment Methods */}
      <PaymentMethodsDisplay />

      {/* Footer */}
      <footer className="border-t bg-card py-6 mt-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2024 {appName}. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
