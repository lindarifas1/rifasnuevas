import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Raffle, Ticket, Client } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Search,
  Users,
  Phone,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Loader2,
  Eye,
  Filter,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';

interface ClientsSectionProps {
  raffles: Raffle[];
  adminWhatsapp: string;
}

export const ClientsSection = ({ raffles, adminWhatsapp }: ClientsSectionProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRaffleFilter, setSelectedRaffleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'with_debt' | 'paid' | 'pending'>('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchClients();
  }, [selectedRaffleFilter]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedRaffleFilter !== 'all') {
        query = query.eq('raffle_id', selectedRaffleFilter);
      }

      const { data: tickets, error } = await query;

      if (error) throw error;

      // Group tickets by cedula to create client list
      const clientsMap = new Map<string, Client>();

      (tickets || []).forEach((ticket: Ticket) => {
        const existing = clientsMap.get(ticket.buyer_cedula);
        
        // Get raffle info
        const raffle = raffles.find(r => r.id === ticket.raffle_id);
        const ticketPrice = raffle?.price || 0;
        const expectedAmount = ticketPrice;
        const debt = Math.max(0, expectedAmount - ticket.amount_paid);

        if (existing) {
          existing.total_tickets += 1;
          existing.total_paid += ticket.amount_paid;
          existing.total_debt += debt;
          existing.tickets.push(ticket);
          
          // Track unique raffles
          const raffleIds = new Set(existing.tickets.map(t => t.raffle_id));
          existing.total_raffles = raffleIds.size;
          
          // Update last purchase
          if (new Date(ticket.created_at) > new Date(existing.last_purchase)) {
            existing.last_purchase = ticket.created_at;
            existing.name = ticket.buyer_name;
            existing.phone = ticket.buyer_phone;
          }
        } else {
          clientsMap.set(ticket.buyer_cedula, {
            cedula: ticket.buyer_cedula,
            name: ticket.buyer_name,
            phone: ticket.buyer_phone,
            total_tickets: 1,
            total_paid: ticket.amount_paid,
            total_debt: debt,
            total_raffles: 1,
            last_purchase: ticket.created_at,
            tickets: [ticket],
          });
        }
      });

      setClients(Array.from(clientsMap.values()));
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Error al cargar los clientes');
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    // Search filter
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      client.name.toLowerCase().includes(query) ||
      client.cedula.toLowerCase().includes(query) ||
      client.phone.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    // Status filter
    switch (statusFilter) {
      case 'with_debt':
        return client.total_debt > 0;
      case 'paid':
        return client.total_debt === 0 && client.tickets.some(t => t.payment_status === 'paid');
      case 'pending':
        return client.tickets.some(t => t.payment_status === 'pending' || t.payment_status === 'reserved');
      default:
        return true;
    }
  });

  const toggleExpand = (cedula: string) => {
    setExpandedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cedula)) {
        newSet.delete(cedula);
      } else {
        newSet.add(cedula);
      }
      return newSet;
    });
  };

  const openClientDetail = (client: Client) => {
    setSelectedClient(client);
    setDetailDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" /> Pagado</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-warning border-warning"><Clock className="w-3 h-3 mr-1" /> Pendiente</Badge>;
      case 'reserved':
        return <Badge variant="outline" className="text-primary border-primary"><AlertCircle className="w-3 h-3 mr-1" /> Reservado</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rechazado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRaffleName = (raffleId: string) => {
    return raffles.find(r => r.id === raffleId)?.title || 'Rifa desconocida';
  };

  const formatNumber = (num: number, numberCount: number) => {
    const digits = numberCount >= 1000 ? 3 : 2;
    return num.toString().padStart(digits, '0');
  };

  const openWhatsApp = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  };

  const totalStats = {
    totalClients: clients.length,
    totalCollected: clients.reduce((sum, c) => sum + c.total_paid, 0),
    totalDebt: clients.reduce((sum, c) => sum + c.total_debt, 0),
    clientsWithDebt: clients.filter(c => c.total_debt > 0).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total Clientes</p>
                <p className="text-xl font-bold">{totalStats.totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-success" />
              <div>
                <p className="text-xs text-muted-foreground">Total Recaudado</p>
                <p className="text-xl font-bold text-success">${totalStats.totalCollected.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-warning" />
              <div>
                <p className="text-xs text-muted-foreground">Total Deuda</p>
                <p className="text-xl font-bold text-warning">${totalStats.totalDebt.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Con Deuda</p>
                <p className="text-xl font-bold text-destructive">{totalStats.clientsWithDebt}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, cédula o teléfono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedRaffleFilter} onValueChange={setSelectedRaffleFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por rifa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las rifas</SelectItem>
                {raffles.map(raffle => (
                  <SelectItem key={raffle.id} value={raffle.id}>
                    {raffle.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="with_debt">Con deuda</SelectItem>
                <SelectItem value="paid">Pagados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No se encontraron clientes</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredClients.map((client) => (
            <Card key={client.cedula} className="overflow-hidden">
              <Collapsible
                open={expandedClients.has(client.cedula)}
                onOpenChange={() => toggleExpand(client.cedula)}
              >
                <CollapsibleTrigger asChild>
                  <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{client.name}</h3>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span>{client.cedula}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {client.phone}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm">
                            <span className="text-muted-foreground">Tickets:</span>{' '}
                            <span className="font-medium">{client.total_tickets}</span>
                          </p>
                          <p className="text-sm">
                            <span className="text-muted-foreground">Rifas:</span>{' '}
                            <span className="font-medium">{client.total_raffles}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-success font-medium">
                            +${client.total_paid.toFixed(2)}
                          </p>
                          {client.total_debt > 0 && (
                            <p className="text-sm text-destructive font-medium">
                              -${client.total_debt.toFixed(2)}
                            </p>
                          )}
                        </div>
                        {expandedClients.has(client.cedula) ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 border-t">
                    <div className="pt-4 space-y-3">
                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openClientDetail(client);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver detalle
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openWhatsApp(client.phone, `Hola ${client.name}, te escribimos respecto a tu participación en nuestras rifas.`);
                          }}
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          WhatsApp
                        </Button>
                        {client.total_debt > 0 && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={(e) => {
                              e.stopPropagation();
                              openWhatsApp(
                                client.phone,
                                `Hola ${client.name}, te recordamos que tienes un saldo pendiente de $${client.total_debt.toFixed(2)} en tus participaciones de rifa. ¿Necesitas ayuda para completar tu pago?`
                              );
                            }}
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Cobrar deuda
                          </Button>
                        )}
                      </div>

                      {/* Tickets Summary Table */}
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Rifa</TableHead>
                              <TableHead>Números</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead className="text-right">Monto</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* Group tickets by raffle */}
                            {Object.entries(
                              client.tickets.reduce((acc, ticket) => {
                                if (!acc[ticket.raffle_id]) {
                                  acc[ticket.raffle_id] = [];
                                }
                                acc[ticket.raffle_id].push(ticket);
                                return acc;
                              }, {} as Record<string, Ticket[]>)
                            ).map(([raffleId, tickets]) => {
                              const raffle = raffles.find(r => r.id === raffleId);
                              const numberCount = raffle?.number_count || 100;
                              return (
                                <TableRow key={raffleId}>
                                  <TableCell className="font-medium">
                                    {getRaffleName(raffleId)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {tickets.slice(0, 5).map(t => (
                                        <Badge key={t.id} variant="secondary" className="text-xs">
                                          {formatNumber(t.number, numberCount)}
                                        </Badge>
                                      ))}
                                      {tickets.length > 5 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{tickets.length - 5}
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {getStatusBadge(tickets[0].payment_status)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    ${tickets.reduce((sum, t) => sum + t.amount_paid, 0).toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      {/* Client Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Cliente</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-6 pt-4">
              {/* Client Info */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{selectedClient.name}</h2>
                  <p className="text-muted-foreground">{selectedClient.cedula}</p>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {selectedClient.phone}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-success">
                    ${selectedClient.total_paid.toFixed(2)}
                  </p>
                  {selectedClient.total_debt > 0 && (
                    <p className="text-lg text-destructive">
                      Deuda: ${selectedClient.total_debt.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold">{selectedClient.total_tickets}</p>
                    <p className="text-xs text-muted-foreground">Tickets</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold">{selectedClient.total_raffles}</p>
                    <p className="text-xs text-muted-foreground">Rifas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold">
                      {format(new Date(selectedClient.last_purchase), 'dd/MM/yy')}
                    </p>
                    <p className="text-xs text-muted-foreground">Última compra</p>
                  </CardContent>
                </Card>
              </div>

              {/* Complete History */}
              <div>
                <h3 className="font-semibold mb-3">Historial Completo</h3>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Rifa</TableHead>
                        <TableHead>Número</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Pagado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedClient.tickets
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((ticket) => {
                          const raffle = raffles.find(r => r.id === ticket.raffle_id);
                          const numberCount = raffle?.number_count || 100;
                          return (
                            <TableRow key={ticket.id}>
                              <TableCell className="text-sm">
                                {format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                              </TableCell>
                              <TableCell className="font-medium">
                                {getRaffleName(ticket.raffle_id)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {formatNumber(ticket.number, numberCount)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(ticket.payment_status)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ${ticket.amount_paid.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => openWhatsApp(selectedClient.phone, `Hola ${selectedClient.name}!`)}
                  variant="outline"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Contactar por WhatsApp
                </Button>
                {selectedClient.total_debt > 0 && (
                  <Button
                    onClick={() => openWhatsApp(
                      selectedClient.phone,
                      `Hola ${selectedClient.name}, te recordamos que tienes un saldo pendiente de $${selectedClient.total_debt.toFixed(2)}. ¿Cómo podemos ayudarte a completar tu pago?`
                    )}
                    variant="default"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Enviar recordatorio de pago
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
