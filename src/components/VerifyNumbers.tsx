import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Ticket, CheckCircle, Clock, XCircle, DollarSign } from 'lucide-react';
import { Ticket as TicketType, Raffle } from '@/types/database';

interface VerifyNumbersProps {
  raffleId: string;
  numberCount: number;
  raffles?: Raffle[];
}

export const VerifyNumbers = ({ raffleId, numberCount, raffles }: VerifyNumbersProps) => {
  const [cedula, setCedula] = useState('');
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!cedula.trim()) {
      toast.error('Por favor ingrese su cédula');
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('raffle_id', raffleId)
        .eq('buyer_cedula', cedula.trim());

      if (error) throw error;

      setTickets(data as TicketType[] || []);
      
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

  const formatNumber = (num: number) => {
    if (numberCount <= 100) {
      return num.toString().padStart(2, '0');
    }
    return num.toString().padStart(3, '0');
  };

  const getStatusIcon = (ticket: TicketType) => {
    const raffleData = raffles?.find(r => r.id === ticket.raffle_id);
    const expectedPrice = raffleData?.price || 0;
    const isPartialPayment = ticket.amount_paid > 0 && ticket.amount_paid < expectedPrice;
    
    if (ticket.payment_status === 'paid' && !isPartialPayment) {
      return <CheckCircle className="w-4 h-4 text-success" />;
    }
    if (isPartialPayment) {
      return <DollarSign className="w-4 h-4 text-secondary" />;
    }
    if (ticket.payment_status === 'rejected') {
      return <XCircle className="w-4 h-4 text-destructive" />;
    }
    return <Clock className="w-4 h-4 text-warning" />;
  };

  const getStatusText = (ticket: TicketType) => {
    const raffleData = raffles?.find(r => r.id === ticket.raffle_id);
    const expectedPrice = raffleData?.price || 0;
    const isPartialPayment = ticket.amount_paid > 0 && ticket.amount_paid < expectedPrice;
    
    if (ticket.payment_status === 'paid' && !isPartialPayment) {
      return 'Pagado';
    }
    if (isPartialPayment) {
      return 'Abonado';
    }
    if (ticket.payment_status === 'rejected') {
      return 'Rechazado';
    }
    if (ticket.payment_status === 'reserved') {
      return 'Reservado';
    }
    return 'Pendiente';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Ticket className="w-5 h-5 text-secondary" />
          Verificar Números
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Ingrese su cédula"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading} variant="secondary">
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {searched && tickets.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Números encontrados: <span className="font-semibold text-foreground">{tickets.length}</span>
            </p>
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-primary text-primary-foreground font-bold rounded-full">
                      {formatNumber(ticket.number)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ${ticket.amount_paid} pagado
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(ticket)}
                    <span className="text-sm font-medium">
                      {getStatusText(ticket)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {searched && tickets.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            No se encontraron números para esta cédula
          </p>
        )}
      </CardContent>
    </Card>
  );
};
