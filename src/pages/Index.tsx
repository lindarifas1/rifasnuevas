import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { RaffleCard } from '@/components/RaffleCard';
import { supabase } from '@/integrations/supabase/client';
import { Raffle } from '@/types/database';
import { Loader2, Trophy, Sparkles } from 'lucide-react';
import heroBanner from '@/assets/hero-banner.jpg';

const Index = () => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [coverImage, setCoverImage] = useState<string>(heroBanner);
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  useEffect(() => {
    fetchRaffles();
    fetchSiteSettings();
  }, []);

  const fetchRaffles = async () => {
    try {
      const { data, error } = await supabase
        .from('raffles')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRaffles(data as Raffle[] || []);
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
        setCoverImage(data.cover_image);
      }
    } catch (error) {
      console.error('Error fetching site settings:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header isAdmin={isAdmin} />
      
      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[300px] overflow-hidden">
        <img
          src={coverImage}
          alt="Portada"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 gradient-hero opacity-80" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            <span className="text-primary font-semibold uppercase tracking-wider text-sm">
              ¡Participa y Gana!
            </span>
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-card mb-4">
            Rifas <span className="text-gradient-gold">Exclusivas</span>
          </h1>
          <p className="text-card/80 max-w-md text-lg">
            Los mejores premios te esperan. Selecciona tu número de la suerte y participa hoy.
          </p>
        </div>
      </section>

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
              <RaffleCard key={raffle.id} raffle={raffle} />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-6 mt-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2024 RifaMax. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
