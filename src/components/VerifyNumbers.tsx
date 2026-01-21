import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Ticket, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Ticket as TicketType } from '@/types/database';

interface VerifyNumbersProps {
  raffleId: string;
  numberCount: number;
}

export const VerifyNumbers = ({ raffleId, numberCount }: VerifyNumbersProps) => {
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
                    {getStatusIcon(ticket.payment_status)}
                    <span className="text-sm font-medium">
                      {getStatusText(ticket.payment_status)}
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
