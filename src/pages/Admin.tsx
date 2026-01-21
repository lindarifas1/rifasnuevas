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
import { Raffle, Ticket } from '@/types/database';
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
} from 'lucide-react';

const Admin = () => {
  const navigate = useNavigate();
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRaffle, setSelectedRaffle] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [siteCover, setSiteCover] = useState('');
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
        setSiteCover(data.cover_image);
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

  const handleUpdateTicketStatus = async (ticketId: string, status: 'paid' | 'rejected' | 'pending') => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ payment_status: status })
        .eq('id', ticketId);

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
  const paidTickets = tickets.filter(t => t.payment_status === 'paid');
  const pendingTickets = tickets.filter(t => t.payment_status === 'pending' || t.payment_status === 'reserved');

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
                      ${paidTickets.reduce((sum, t) => sum + t.amount_paid, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Recaudado</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-center">
                    <CheckCircle className="w-8 h-8 mx-auto text-success mb-2" />
                    <p className="text-2xl font-bold">{paidTickets.length}</p>
                    <p className="text-sm text-muted-foreground">Pagados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-center">
                    <Clock className="w-8 h-8 mx-auto text-warning mb-2" />
                    <p className="text-2xl font-bold">{pendingTickets.length}</p>
                    <p className="text-sm text-muted-foreground">Pendientes</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Orders List */}
            {tickets.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No hay pedidos para esta rifa</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <Card key={ticket.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-primary text-primary-foreground font-bold rounded-full text-lg">
                              {formatNumber(ticket.number, selectedRaffleData?.number_count || 100)}
                            </span>
                            <div className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                              ticket.payment_status === 'paid'
                                ? 'bg-success/10 text-success'
                                : ticket.payment_status === 'rejected'
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-warning/10 text-warning'
                            }`}>
                              {ticket.payment_status === 'paid' && <CheckCircle className="w-3 h-3" />}
                              {ticket.payment_status === 'rejected' && <XCircle className="w-3 h-3" />}
                              {(ticket.payment_status === 'pending' || ticket.payment_status === 'reserved') && <Clock className="w-3 h-3" />}
                              {ticket.payment_status === 'paid' ? 'Pagado' : 
                               ticket.payment_status === 'rejected' ? 'Rechazado' :
                               ticket.payment_status === 'reserved' ? 'Reservado' : 'Pendiente'}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                            <div>
                              <span className="text-muted-foreground">Nombre:</span>
                              <p className="font-medium">{ticket.buyer_name}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Cédula:</span>
                              <p className="font-medium">{ticket.buyer_cedula}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Teléfono:</span>
                              <p className="font-medium">{ticket.buyer_phone}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Referencia:</span>
                              <p className="font-medium">{ticket.reference_number || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Monto:</span>
                              <p className="font-bold text-primary">${ticket.amount_paid}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Fecha:</span>
                              <p className="font-medium">
                                {format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm')}
                              </p>
                            </div>
                          </div>
                          {ticket.payment_proof_url && (
                            <a
                              href={ticket.payment_proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-secondary hover:underline"
                            >
                              <Eye className="w-4 h-4" />
                              Ver Comprobante
                            </a>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-success border-success hover:bg-success hover:text-success-foreground"
                            onClick={() => handleUpdateTicketStatus(ticket.id, 'paid')}
                            disabled={ticket.payment_status === 'paid'}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleUpdateTicketStatus(ticket.id, 'rejected')}
                            disabled={ticket.payment_status === 'rejected'}
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
      </div>
    </div>
  );
};

export default Admin;
