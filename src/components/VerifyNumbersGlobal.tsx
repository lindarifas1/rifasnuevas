import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Ticket, CheckCircle, Clock, XCircle, CreditCard, Wallet, Upload, Loader2 } from 'lucide-react';
import { Ticket as TicketType, Raffle } from '@/types/database';
import { PaymentMethodsDisplay } from './PaymentMethodsDisplay';

export const VerifyNumbersGlobal = () => {
  const [cedula, setCedula] = useState('');
  const [selectedRaffleId, setSelectedRaffleId] = useState<string>('all');
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<(TicketType & { raffle_name?: string; number_count?: number })[]>([]);
  const [searched, setSearched] = useState(false);
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTicketsForPayment, setSelectedTicketsForPayment] = useState<typeof tickets>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentData, setPaymentData] = useState({
    referenceNumber: '',
    paymentType: 'full' as 'full' | 'partial',
    partialAmount: 0,
  });
  const [paymentProof, setPaymentProof] = useState<File | null>(null);

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

  // Get pending/reserved tickets that need payment
  const pendingTickets = tickets.filter(t => t.payment_status === 'pending' || t.payment_status === 'reserved');

  // Calculate total amount pending
  const getTotalPending = () => {
    return pendingTickets.reduce((total, ticket) => {
      const raffle = raffles.find(r => r.id === ticket.raffle_id);
      const ticketPrice = raffle?.price || 0;
      const amountPaid = ticket.amount_paid || 0;
      return total + (ticketPrice - amountPaid);
    }, 0);
  };

  const handleOpenPaymentModal = () => {
    setSelectedTicketsForPayment(pendingTickets);
    setPaymentData({
      referenceNumber: '',
      paymentType: 'full',
      partialAmount: 0,
    });
    setPaymentProof(null);
    setShowPaymentModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentProof(e.target.files[0]);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentData.referenceNumber) {
      toast.error('Por favor ingrese el número de referencia del pago');
      return;
    }

    setPaymentLoading(true);

    try {
      let paymentProofUrl = null;

      // Upload payment proof if provided
      if (paymentProof) {
        const fileExt = paymentProof.name.split('.').pop();
        const fileName = `${Date.now()}-${cedula}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, paymentProof);

        if (uploadError) {
          console.error('Upload error:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('payment-proofs')
            .getPublicUrl(uploadData.path);
          paymentProofUrl = urlData.publicUrl;
        }
      }

      const totalPending = getTotalPending();
      const paymentAmount = paymentData.paymentType === 'full' 
        ? totalPending 
        : paymentData.partialAmount;

      // Collect all ticket IDs that should be updated
      const ticketIds = selectedTicketsForPayment.map(t => t.id);

      if (paymentData.paymentType === 'full') {
        // For full payment, update ALL tickets at once to their full price
        for (const ticket of selectedTicketsForPayment) {
          const raffle = raffles.find(r => r.id === ticket.raffle_id);
          const ticketPrice = raffle?.price || 0;

          const updateData: Record<string, unknown> = {
            amount_paid: ticketPrice,
            payment_status: 'pending',
            reference_number: paymentData.referenceNumber,
          };

          if (paymentProofUrl) {
            updateData.payment_proof_url = paymentProofUrl;
          }

          await supabase
            .from('tickets')
            .update(updateData)
            .eq('id', ticket.id);
        }
      } else {
        // For partial payment, distribute proportionally
        let remainingPayment = paymentAmount;
        
        for (const ticket of selectedTicketsForPayment) {
          if (remainingPayment <= 0) break;
          
          const raffle = raffles.find(r => r.id === ticket.raffle_id);
          const ticketPrice = raffle?.price || 0;
          const currentPaid = ticket.amount_paid || 0;
          const ticketOwed = ticketPrice - currentPaid;
          
          const paymentForThisTicket = Math.min(remainingPayment, ticketOwed);
          remainingPayment -= paymentForThisTicket;
          
          const newAmountPaid = currentPaid + paymentForThisTicket;
          const newStatus = newAmountPaid >= ticketPrice ? 'pending' : ticket.payment_status;

          const updateData: Record<string, unknown> = {
            amount_paid: newAmountPaid,
            payment_status: newStatus,
            reference_number: paymentData.referenceNumber,
          };

          if (paymentProofUrl) {
            updateData.payment_proof_url = paymentProofUrl;
          }

          await supabase
            .from('tickets')
            .update(updateData)
            .eq('id', ticket.id);
        }
      }

      toast.success('¡Pago registrado exitosamente! El administrador verificará tu pago.');
      setShowPaymentModal(false);
      
      // Refresh tickets
      handleSearch();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al procesar el pago');
    } finally {
      setPaymentLoading(false);
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

  const totalPending = getTotalPending();

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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Total de números encontrados: <span className="font-semibold text-foreground">{tickets.length}</span>
                </p>
                
                {pendingTickets.length > 0 && totalPending > 0 && (
                  <Button onClick={handleOpenPaymentModal} variant="gold" size="sm">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pagar/Abonar (${totalPending.toFixed(2)} pendiente)
                  </Button>
                )}
              </div>
              
              {Object.entries(groupedTickets).map(([raffleName, raffleTickets]) => (
                <div key={raffleName} className="space-y-2">
                  <h4 className="font-medium text-sm text-primary">{raffleName}</h4>
                  <div className="grid gap-2">
                    {raffleTickets.map((ticket) => {
                      const raffle = raffles.find(r => r.id === ticket.raffle_id);
                      const ticketPrice = raffle?.price || 0;
                      const amountOwed = ticketPrice - (ticket.amount_paid || 0);
                      
                      return (
                        <div
                          key={ticket.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-primary text-primary-foreground font-bold rounded-full text-sm">
                              {formatNumber(ticket.number, ticket.number_count)}
                            </span>
                            <div className="text-sm">
                              <span className="text-muted-foreground">
                                Pagado: ${ticket.amount_paid}
                              </span>
                              {amountOwed > 0 && (
                                <span className="text-warning ml-2">
                                  (Debe: ${amountOwed.toFixed(2)})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(ticket.payment_status)}
                            <span className="text-sm font-medium">
                              {getStatusText(ticket.payment_status)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
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

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Pagar Números Pendientes
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Payment Methods */}
            <PaymentMethodsDisplay compact />

            {/* Summary */}
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Números a pagar:</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedTicketsForPayment.map(ticket => (
                  <span key={ticket.id} className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full font-semibold">
                    {formatNumber(ticket.number, ticket.number_count)}
                  </span>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Total pendiente: <span className="font-bold text-foreground">${totalPending.toFixed(2)}</span>
              </p>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              {/* Payment Type */}
              <div className="space-y-2">
                <Label>Tipo de Pago</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={paymentData.paymentType === 'full' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => setPaymentData({ ...paymentData, paymentType: 'full' })}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pago Total
                  </Button>
                  <Button
                    type="button"
                    variant={paymentData.paymentType === 'partial' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => setPaymentData({ ...paymentData, paymentType: 'partial' })}
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Abono
                  </Button>
                </div>
              </div>

              {paymentData.paymentType === 'partial' && (
                <div className="space-y-2">
                  <Label htmlFor="partialAmount">Monto del Abono</Label>
                  <Input
                    id="partialAmount"
                    type="number"
                    min={1}
                    max={totalPending}
                    value={paymentData.partialAmount}
                    onChange={(e) => setPaymentData({ ...paymentData, partialAmount: parseFloat(e.target.value) || 0 })}
                    placeholder="Monto"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="referenceNumber">Número de Referencia *</Label>
                <Input
                  id="referenceNumber"
                  value={paymentData.referenceNumber}
                  onChange={(e) => setPaymentData({ ...paymentData, referenceNumber: e.target.value })}
                  placeholder="Ej: 123456789"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentProof">Comprobante de Pago</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="paymentProof"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                  {paymentProof && (
                    <span className="text-xs text-success flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      Listo
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowPaymentModal(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" variant="gold" className="flex-1" disabled={paymentLoading}>
                  {paymentLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    `Pagar $${paymentData.paymentType === 'full' ? totalPending.toFixed(2) : paymentData.partialAmount.toFixed(2)}`
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};
