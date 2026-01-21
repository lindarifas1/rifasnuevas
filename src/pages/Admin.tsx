import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Raffle, Ticket, GroupedOrder } from '@/types/database';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus,
  Trash2,
  Edit,
  Image,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Trophy,
  Users,
  DollarSign,
  Settings,
  MessageCircle,
} from 'lucide-react';

const Admin = () => {
  const navigate = useNavigate();
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRaffle, setSelectedRaffle] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [siteCover, setSiteCover] = useState('');
  const [adminWhatsapp, setAdminWhatsapp] = useState('');
  const [newRaffle, setNewRaffle] = useState({
    title: '',
    description: '',
    cover_image: '',
    price: 0,
    raffle_date: '',
    number_count: 100,
    status: 'active' as const,
  });

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchRaffles();
    fetchSiteSettings();
  }, [navigate]);

  useEffect(() => {
    if (selectedRaffle) {
      fetchTickets(selectedRaffle);
    }
  }, [selectedRaffle]);

  const fetchRaffles = async () => {
    try {
      const { data, error } = await supabase
        .from('raffles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRaffles(data as Raffle[] || []);
      if (data && data.length > 0 && !selectedRaffle) {
        setSelectedRaffle(data[0].id);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar las rifas');
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async (raffleId: string) => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('raffle_id', raffleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data as Ticket[] || []);
    } catch (error) {
      console.error('Error:', error);
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
        setSiteCover(data.cover_image || '');
        setAdminWhatsapp(data.admin_whatsapp || '');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCreateRaffle = async () => {
    if (!newRaffle.title || !newRaffle.price || !newRaffle.raffle_date) {
      toast.error('Complete los campos requeridos');
      return;
    }

    try {
      const { error } = await supabase.from('raffles').insert([newRaffle]);

      if (error) throw error;

      toast.success('Rifa creada exitosamente');
      setCreateDialogOpen(false);
      setNewRaffle({
        title: '',
        description: '',
        cover_image: '',
        price: 0,
        raffle_date: '',
        number_count: 100,
        status: 'active',
      });
      fetchRaffles();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al crear la rifa');
    }
  };

  const handleDeleteRaffle = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta rifa?')) return;

    try {
      const { error } = await supabase.from('raffles').delete().eq('id', id);

      if (error) throw error;

      toast.success('Rifa eliminada');
      fetchRaffles();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar la rifa');
    }
  };

  const handleUpdateOrderStatus = async (ticketIds: string[], status: 'paid' | 'rejected' | 'pending') => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ payment_status: status })
        .in('id', ticketIds);

      if (error) throw error;

      toast.success('Estado actualizado');
      if (selectedRaffle) fetchTickets(selectedRaffle);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar');
    }
  };

  const handleUpdateSiteCover = async () => {
    try {
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('site_settings')
          .update({ cover_image: siteCover })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('site_settings')
          .insert([{ cover_image: siteCover }]);

        if (error) throw error;
      }

      toast.success('Portada actualizada');
      setCoverDialogOpen(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar');
    }
  };

  const handleUpdateAdminWhatsapp = async () => {
    try {
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('site_settings')
          .update({ admin_whatsapp: adminWhatsapp })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('site_settings')
          .insert([{ admin_whatsapp: adminWhatsapp }]);

        if (error) throw error;
      }

      toast.success('WhatsApp actualizado');
      setSettingsDialogOpen(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar');
    }
  };

  const handleToggleRaffleStatus = async (raffle: Raffle) => {
    const newStatus = raffle.status === 'active' ? 'finished' : 'active';
    
    try {
      const { error } = await supabase
        .from('raffles')
        .update({ status: newStatus })
        .eq('id', raffle.id);

      if (error) throw error;

      toast.success(`Rifa ${newStatus === 'active' ? 'activada' : 'finalizada'}`);
      fetchRaffles();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const formatNumber = (num: number, count: number) => {
    if (count <= 100) {
      return num.toString().padStart(2, '0');
    }
    return num.toString().padStart(3, '0');
  };

  const selectedRaffleData = raffles.find(r => r.id === selectedRaffle);
  
  // Group tickets by order_id
  const groupedOrders: GroupedOrder[] = tickets.reduce((acc, ticket) => {
    // Use order_id if available, otherwise use a unique key based on buyer info and timestamp
    const orderId = ticket.order_id || `${ticket.buyer_cedula}-${ticket.created_at}`;
    
    const existingOrder = acc.find(o => o.order_id === orderId);
    
    if (existingOrder) {
      existingOrder.numbers.push(ticket.number);
      existingOrder.total_amount += ticket.amount_paid;
      existingOrder.ticket_ids.push(ticket.id);
    } else {
      acc.push({
        order_id: orderId,
        raffle_id: ticket.raffle_id,
        numbers: [ticket.number],
        buyer_name: ticket.buyer_name,
        buyer_cedula: ticket.buyer_cedula,
        buyer_phone: ticket.buyer_phone,
        reference_number: ticket.reference_number,
        payment_proof_url: ticket.payment_proof_url,
        payment_status: ticket.payment_status,
        total_amount: ticket.amount_paid,
        created_at: ticket.created_at,
        ticket_ids: [ticket.id],
      });
    }
    
    return acc;
  }, [] as GroupedOrder[]);
  
  const paidOrders = groupedOrders.filter(o => o.payment_status === 'paid');
  const pendingOrders = groupedOrders.filter(o => o.payment_status === 'pending' || o.payment_status === 'reserved');

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header isAdmin />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header isAdmin />

      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Panel de Administración</h1>
          <div className="flex gap-2">
            <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configurar WhatsApp del Admin</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Número de WhatsApp</Label>
                    <Input
                      value={adminWhatsapp}
                      onChange={(e) => setAdminWhatsapp(e.target.value)}
                      placeholder="Ej: +58412XXXXXXX"
                    />
                    <p className="text-xs text-muted-foreground">
                      Incluye el código de país sin espacios ni guiones
                    </p>
                  </div>
                  <Button onClick={handleUpdateAdminWhatsapp} className="w-full">
                    Guardar WhatsApp
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={coverDialogOpen} onOpenChange={setCoverDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Image className="w-4 h-4 mr-2" />
                  Portada
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Imagen de Portada del Sitio</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>URL de la Imagen</Label>
                    <Input
                      value={siteCover}
                      onChange={(e) => setSiteCover(e.target.value)}
                      placeholder="https://ejemplo.com/imagen.jpg"
                    />
                  </div>
                  {siteCover && (
                    <img
                      src={siteCover}
                      alt="Preview"
                      className="w-full h-40 object-cover rounded-lg"
                    />
                  )}
                  <Button onClick={handleUpdateSiteCover} className="w-full">
                    Guardar Portada
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="gold">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Rifa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Crear Nueva Rifa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-2">
                    <Label>Título *</Label>
                    <Input
                      value={newRaffle.title}
                      onChange={(e) => setNewRaffle({ ...newRaffle, title: e.target.value })}
                      placeholder="Ej: iPhone 15 Pro Max"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Textarea
                      value={newRaffle.description}
                      onChange={(e) => setNewRaffle({ ...newRaffle, description: e.target.value })}
                      placeholder="Descripción del premio..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL de Imagen</Label>
                    <Input
                      value={newRaffle.cover_image}
                      onChange={(e) => setNewRaffle({ ...newRaffle, cover_image: e.target.value })}
                      placeholder="https://ejemplo.com/imagen.jpg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Precio *</Label>
                      <Input
                        type="number"
                        value={newRaffle.price}
                        onChange={(e) => setNewRaffle({ ...newRaffle, price: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cantidad de Números</Label>
                      <Select
                        value={newRaffle.number_count.toString()}
                        onValueChange={(value) => setNewRaffle({ ...newRaffle, number_count: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="100">100 (00-99)</SelectItem>
                          <SelectItem value="1000">1000 (000-999)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha del Sorteo *</Label>
                    <Input
                      type="date"
                      value={newRaffle.raffle_date}
                      onChange={(e) => setNewRaffle({ ...newRaffle, raffle_date: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleCreateRaffle} className="w-full" variant="gold">
                    Crear Rifa
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="raffles" className="space-y-4">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="raffles">
              <Trophy className="w-4 h-4 mr-2" />
              Rifas
            </TabsTrigger>
            <TabsTrigger value="orders">
              <Users className="w-4 h-4 mr-2" />
              Pedidos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="raffles" className="space-y-4">
            {raffles.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No hay rifas creadas</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {raffles.map((raffle) => (
                  <Card key={raffle.id} className="overflow-hidden">
                    <div className="relative h-32">
                      <img
                        src={raffle.cover_image || '/placeholder.svg'}
                        alt={raffle.title}
                        className="w-full h-full object-cover"
                      />
                      <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold ${
                        raffle.status === 'active' 
                          ? 'bg-success text-success-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {raffle.status === 'active' ? 'Activa' : 'Finalizada'}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold mb-2">{raffle.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <span>${raffle.price}/número</span>
                        <span>{raffle.number_count} números</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={raffle.status === 'active' ? 'outline' : 'default'}
                          onClick={() => handleToggleRaffleStatus(raffle)}
                        >
                          {raffle.status === 'active' ? 'Finalizar' : 'Activar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteRaffle(raffle.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            {/* Raffle Selector */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <Label>Seleccionar Rifa:</Label>
                  <Select
                    value={selectedRaffle || ''}
                    onValueChange={setSelectedRaffle}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Seleccione una rifa" />
                    </SelectTrigger>
                    <SelectContent>
                      {raffles.map((raffle) => (
                        <SelectItem key={raffle.id} value={raffle.id}>
                          {raffle.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            {selectedRaffleData && (
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="py-4 text-center">
                    <DollarSign className="w-8 h-8 mx-auto text-success mb-2" />
                    <p className="text-2xl font-bold text-success">
                      ${paidOrders.reduce((sum, o) => sum + o.total_amount, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Recaudado</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-center">
                    <CheckCircle className="w-8 h-8 mx-auto text-success mb-2" />
                    <p className="text-2xl font-bold">{paidOrders.length}</p>
                    <p className="text-sm text-muted-foreground">Pedidos Pagados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-center">
                    <Clock className="w-8 h-8 mx-auto text-warning mb-2" />
                    <p className="text-2xl font-bold">{pendingOrders.length}</p>
                    <p className="text-sm text-muted-foreground">Pendientes</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Orders List */}
            {groupedOrders.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No hay pedidos para esta rifa</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {groupedOrders.map((order) => (
                  <Card key={order.order_id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            {order.numbers
                              .sort((a, b) => a - b)
                              .map((num) => (
                                <span 
                                  key={num} 
                                  className="px-2 py-1 bg-primary text-primary-foreground font-bold rounded-full text-sm"
                                >
                                  {formatNumber(num, selectedRaffleData?.number_count || 100)}
                                </span>
                              ))}
                            <div className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                              order.payment_status === 'paid'
                                ? 'bg-success/10 text-success'
                                : order.payment_status === 'rejected'
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-warning/10 text-warning'
                            }`}>
                              {order.payment_status === 'paid' && <CheckCircle className="w-3 h-3" />}
                              {order.payment_status === 'rejected' && <XCircle className="w-3 h-3" />}
                              {(order.payment_status === 'pending' || order.payment_status === 'reserved') && <Clock className="w-3 h-3" />}
                              {order.payment_status === 'paid' ? 'Pagado' : 
                               order.payment_status === 'rejected' ? 'Rechazado' :
                               order.payment_status === 'reserved' ? 'Reservado' : 'Pendiente'}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                            <div>
                              <span className="text-muted-foreground">Nombre:</span>
                              <p className="font-medium">{order.buyer_name}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Cédula:</span>
                              <p className="font-medium">{order.buyer_cedula}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Teléfono:</span>
                              <p className="font-medium">{order.buyer_phone}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Referencia:</span>
                              <p className="font-medium">{order.reference_number || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Monto Total:</span>
                              <p className="font-bold text-primary">${order.total_amount.toFixed(2)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Fecha:</span>
                              <p className="font-medium">
                                {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                              </p>
                            </div>
                          </div>
                          {order.payment_proof_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="inline-flex items-center gap-2"
                              onClick={() => {
                                setSelectedProofUrl(order.payment_proof_url);
                                setProofDialogOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                              Ver Comprobante
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-success border-success hover:bg-success hover:text-success-foreground"
                            onClick={() => handleUpdateOrderStatus(order.ticket_ids, 'paid')}
                            disabled={order.payment_status === 'paid'}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleUpdateOrderStatus(order.ticket_ids, 'rejected')}
                            disabled={order.payment_status === 'rejected'}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Payment Proof Dialog */}
        <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Comprobante de Pago</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {selectedProofUrl ? (
                <img
                  src={selectedProofUrl}
                  alt="Comprobante de pago"
                  className="w-full max-h-[70vh] object-contain rounded-lg"
                />
              ) : (
                <p className="text-center text-muted-foreground">No hay comprobante disponible</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Admin;
