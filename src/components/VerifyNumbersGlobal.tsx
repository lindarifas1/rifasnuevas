import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Ticket, CheckCircle, Clock, XCircle, CreditCard, Wallet, Upload, Loader2, DollarSign, MessageCircle, AlertCircle } from 'lucide-react';
import { Ticket as TicketType, Raffle } from '@/types/database';
import { PaymentMethodsDisplay } from './PaymentMethodsDisplay';

export const VerifyNumbersGlobal = () => {
  const [cedula, setCedula] = useState('');
  const [selectedRaffleId, setSelectedRaffleId] = useState<string>('all');
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<(TicketType & { raffle_name?: string; number_count?: number })[]>([]);
  const [searched, setSearched] = useState(false);
  const [adminWhatsapp, setAdminWhatsapp] = useState('');
  const [showContactAdminModal, setShowContactAdminModal] = useState(false);
  
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
    fetchSiteSettings();
  }, []);

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

  const getStatusInfo = (ticket: TicketType & { raffle_name?: string; number_count?: number }) => {
    const raffle = raffles.find(r => r.id === ticket.raffle_id);
    const expectedPrice = raffle?.price || 0;
    const isPartialPayment = ticket.amount_paid > 0 && ticket.amount_paid < expectedPrice;
    
    if (ticket.payment_status === 'paid' && !isPartialPayment) {
      return {
        icon: <CheckCircle className="w-4 h-4 text-success" />,
        text: 'Pagado',
        color: 'text-success'
      };
    }
    if (isPartialPayment) {
      return {
        icon: <DollarSign className="w-4 h-4 text-secondary" />,
        text: 'Abonado',
        color: 'text-secondary'
      };
    }
    if (ticket.payment_status === 'rejected') {
      return {
        icon: <XCircle className="w-4 h-4 text-destructive" />,
        text: 'Rechazado',
        color: 'text-destructive'
      };
    }
    if (ticket.payment_status === 'reserved') {
      return {
        icon: <Clock className="w-4 h-4 text-warning" />,
        text: 'Reservado',
        color: 'text-warning'
      };
    }
    return {
      icon: <Clock className="w-4 h-4 text-warning" />,
      text: 'Pendiente',
      color: 'text-warning'
    };
  };

  // Get tickets that need payment (pending, reserved, OR have partial payments with remaining debt)
  const ticketsNeedingPayment = tickets.filter(t => {
    if (t.payment_status === 'rejected') return false;
    const raffle = raffles.find(r => r.id === t.raffle_id);
    const expectedPrice = raffle?.price || 0;
    const hasDebt = t.amount_paid < expectedPrice;
    return t.payment_status === 'pending' || t.payment_status === 'reserved' || 
           (t.payment_status === 'paid' && hasDebt);
  });

  // Separate tickets by type: reserved without payment vs with partial payment (abono)
  const reservedWithoutPayment = ticketsNeedingPayment.filter(t => {
    return (t.payment_status === 'reserved' && t.amount_paid === 0);
  });

  const ticketsWithAbono = tickets.filter(t => {
    const raffle = raffles.find(r => r.id === t.raffle_id);
    const expectedPrice = raffle?.price || 0;
    return t.amount_paid > 0 && t.amount_paid < expectedPrice && t.payment_status !== 'rejected';
  });

  // Determine the payment scenario
  const hasOnlyReservedWithoutPayment = reservedWithoutPayment.length > 0 && ticketsWithAbono.length === 0;
  const hasTicketsWithAbono = ticketsWithAbono.length > 0;

  // Calculate total amount pending
  const getTotalPending = () => {
    return ticketsNeedingPayment.reduce((total, ticket) => {
      const raffle = raffles.find(r => r.id === ticket.raffle_id);
      const ticketPrice = raffle?.price || 0;
      const amountPaid = ticket.amount_paid || 0;
      return total + (ticketPrice - amountPaid);
    }, 0);
  };

  const handleOpenPaymentModal = () => {
    // If user has tickets with abono, show contact admin modal instead
    if (hasTicketsWithAbono) {
      setShowContactAdminModal(true);
      return;
    }
    
    setSelectedTicketsForPayment(ticketsNeedingPayment);
    setPaymentData({
      referenceNumber: '',
      paymentType: 'full', // Always full for reserved without payment
      partialAmount: 0,
    });
    setPaymentProof(null);
    setShowPaymentModal(true);
  };

  const openWhatsAppContact = () => {
    if (!adminWhatsapp) {
      toast.error('No hay número de WhatsApp configurado');
      return;
    }
    
    const cleanPhone = adminWhatsapp.replace(/[^0-9]/g, '');
    const ticketNumbers = ticketsWithAbono.map(t => formatNumber(t.number, t.number_count || 100)).join(', ');
    const totalPaid = ticketsWithAbono.reduce((sum, t) => sum + (t.amount_paid || 0), 0);
    const totalOwed = ticketsWithAbono.reduce((sum, t) => {
      const raffle = raffles.find(r => r.id === t.raffle_id);
      const ticketPrice = raffle?.price || 0;
      return sum + (ticketPrice - (t.amount_paid || 0));
    }, 0);
    
    const message = `Hola, soy ${tickets[0]?.buyer_name || 'cliente'}. Cédula: ${cedula}.\n\nTengo números con abono pendiente y deseo completar mi compra:\n📌 Números: ${ticketNumbers}\n💰 Abonado: $${totalPaid.toFixed(2)}\n💳 Pendiente: $${totalOwed.toFixed(2)}\n\n¿Cómo puedo completar el pago?`;
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
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
                
                {/* Show different buttons based on ticket status */}
                {ticketsNeedingPayment.length > 0 && totalPending > 0 && (
                  <>
                    {hasTicketsWithAbono ? (
                      <Button onClick={() => setShowContactAdminModal(true)} variant="secondary" size="sm">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Completar Compra
                      </Button>
                    ) : (
                      <Button onClick={handleOpenPaymentModal} variant="gold" size="sm">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pagar Total (${totalPending.toFixed(2)})
                      </Button>
                    )}
                  </>
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
                            {(() => {
                              const statusInfo = getStatusInfo(ticket);
                              return (
                                <>
                                  {statusInfo.icon}
                                  <span className={`text-sm font-medium ${statusInfo.color}`}>
                                    {statusInfo.text}
                                  </span>
                                </>
                              );
                            })()}
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

      {/* Payment Modal - Only for reserved numbers without abono (full payment only) */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Pagar Números Reservados
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
                Total a pagar: <span className="font-bold text-foreground">${totalPending.toFixed(2)}</span>
              </p>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
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
                    `Pagar $${totalPending.toFixed(2)}`
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Admin Modal - For tickets with partial payments (abonos) */}
      <Dialog open={showContactAdminModal} onOpenChange={setShowContactAdminModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-secondary" />
              Completar Compra
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-secondary/10 rounded-lg border border-secondary/20">
              <p className="text-sm text-center mb-3">
                Tienes números con <strong>abono parcial</strong>. Para completar tu compra, contacta al administrador.
              </p>
            </div>

            {/* Show current status of tickets with abono */}
            <div className="p-3 bg-muted rounded-lg space-y-3">
              <p className="text-sm font-medium">Estado actual de tus números:</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {ticketsWithAbono.map(ticket => {
                  const raffle = raffles.find(r => r.id === ticket.raffle_id);
                  const ticketPrice = raffle?.price || 0;
                  const amountOwed = ticketPrice - (ticket.amount_paid || 0);
                  
                  return (
                    <div key={ticket.id} className="flex items-center justify-between p-2 bg-background rounded">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full font-semibold">
                          {formatNumber(ticket.number, ticket.number_count)}
                        </span>
                        <span className="text-xs text-muted-foreground">{ticket.raffle_name}</span>
                      </div>
                      <div className="text-right text-xs">
                        <div className="text-success">Abonado: ${ticket.amount_paid}</div>
                        <div className="text-warning">Debe: ${amountOwed.toFixed(2)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Totals */}
              <div className="pt-2 border-t space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total abonado:</span>
                  <span className="font-semibold text-success">
                    ${ticketsWithAbono.reduce((sum, t) => sum + (t.amount_paid || 0), 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total pendiente:</span>
                  <span className="font-semibold text-warning">
                    ${ticketsWithAbono.reduce((sum, t) => {
                      const raffle = raffles.find(r => r.id === t.raffle_id);
                      const ticketPrice = raffle?.price || 0;
                      return sum + (ticketPrice - (t.amount_paid || 0));
                    }, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowContactAdminModal(false)} className="flex-1">
                Cerrar
              </Button>
              <Button 
                type="button" 
                onClick={openWhatsAppContact}
                className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Contactar Admin
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};
