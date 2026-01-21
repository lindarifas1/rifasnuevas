import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Ticket, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Ticket as TicketType, Raffle } from '@/types/database';

export const VerifyNumbersGlobal = () => {
  const [cedula, setCedula] = useState('');
  const [selectedRaffleId, setSelectedRaffleId] = useState<string>('all');
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<(TicketType & { raffle_name?: string; number_count?: number })[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    fetchRaffles();
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
    }
  };

  const handleSearch = async () => {
    if (!cedula.trim()) {
      toast.error('Por favor ingrese su cédula');
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      let query = supabase
        .from('tickets')
        .select('*')
        .eq('buyer_cedula', cedula.trim());

      if (selectedRaffleId !== 'all') {
        query = query.eq('raffle_id', selectedRaffleId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get raffle info for each ticket
      const ticketsWithRaffle = await Promise.all(
        (data || []).map(async (ticket) => {
          const raffle = raffles.find(r => r.id === ticket.raffle_id);
          return {
            ...ticket,
            raffle_name: raffle?.title || 'Rifa desconocida',
            number_count: raffle?.number_count || 100
          };
        })
      );

      setTickets(ticketsWithRaffle as (TicketType & { raffle_name?: string; number_count?: number })[]);
      
      if (data?.length === 0) {
        toast.info('No se encontraron números asociados a esta cédula');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al buscar números');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number, numberCount: number = 100) => {
    if (numberCount <= 100) {
      return num.toString().padStart(2, '0');
    }
    return num.toString().padStart(3, '0');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pagado';
      case 'pending':
        return 'Pendiente';
      case 'rejected':
        return 'Rechazado';
      case 'reserved':
        return 'Reservado';
      default:
        return status;
    }
  };

  // Group tickets by raffle
  const groupedTickets = tickets.reduce((acc, ticket) => {
    const raffleName = ticket.raffle_name || 'Sin rifa';
    if (!acc[raffleName]) {
      acc[raffleName] = [];
    }
    acc[raffleName].push(ticket);
    return acc;
  }, {} as Record<string, typeof tickets>);

  return (
    <section className="container py-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl flex items-center gap-2">
            <Ticket className="w-6 h-6 text-secondary" />
            Verificar Mis Números
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Ingrese su cédula"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Select value={selectedRaffleId} onValueChange={setSelectedRaffleId}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Todas las rifas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las rifas</SelectItem>
                {raffles.map((raffle) => (
                  <SelectItem key={raffle.id} value={raffle.id}>
                    {raffle.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} disabled={loading} variant="secondary">
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </Button>
          </div>

          {searched && tickets.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Total de números encontrados: <span className="font-semibold text-foreground">{tickets.length}</span>
              </p>
              
              {Object.entries(groupedTickets).map(([raffleName, raffleTickets]) => (
                <div key={raffleName} className="space-y-2">
                  <h4 className="font-medium text-sm text-primary">{raffleName}</h4>
                  <div className="grid gap-2">
                    {raffleTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-primary text-primary-foreground font-bold rounded-full text-sm">
                            {formatNumber(ticket.number, ticket.number_count)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ${ticket.amount_paid} pagado
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(ticket.payment_status)}
                          <span className="text-sm font-medium">
                            {getStatusText(ticket.payment_status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {searched && tickets.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No se encontraron números para esta cédula
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
};
