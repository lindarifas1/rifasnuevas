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
import { WhatsAppMessageMenu } from '@/components/WhatsAppMessageMenu';
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
  UserPlus,
  Filter,
  History,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ApprovalHistoryItem {
  order_id: string;
  buyer_name: string;
  buyer_phone: string;
  numbers: number[];
  total_amount: number;
  raffle_title: string;
  raffle_number_count: number;
  approved_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRaffle, setSelectedRaffle] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRaffle, setEditingRaffle] = useState<Raffle | null>(null);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [siteCover, setSiteCover] = useState('');
  const [adminWhatsapp, setAdminWhatsapp] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'paid' | 'pending' | 'rejected'>('all');
  const [addClientDialogOpen, setAddClientDialogOpen] = useState(false);
  const [addingClient, setAddingClient] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvedOrder, setApprovedOrder] = useState<GroupedOrder | null>(null);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    cedula: '',
    phone: '',
    numbers: '',
    paymentStatus: 'paid' as 'paid' | 'pending' | 'reserved',
  });
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
    fetchAllTickets();
    fetchSiteSettings();
    loadApprovalHistory();
  }, [navigate]);

  const loadApprovalHistory = () => {
    try {
      const saved = localStorage.getItem('approvalHistory');
      if (saved) {
        setApprovalHistory(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading approval history:', error);
    }
  };

  const saveToApprovalHistory = (order: GroupedOrder, raffleTitle: string, raffleNumberCount: number) => {
    const newItem: ApprovalHistoryItem = {
      order_id: order.order_id,
      buyer_name: order.buyer_name,
      buyer_phone: order.buyer_phone,
      numbers: order.numbers,
      total_amount: order.total_amount,
      raffle_title: raffleTitle,
      raffle_number_count: raffleNumberCount,
      approved_at: new Date().toISOString(),
    };
    
    const updated = [newItem, ...approvalHistory].slice(0, 10); // Keep only last 10
    setApprovalHistory(updated);
    localStorage.setItem('approvalHistory', JSON.stringify(updated));
  };

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

  const fetchAllTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('raffle_id, payment_status');

      if (error) throw error;
      setAllTickets(data as Ticket[] || []);
    } catch (error) {
      console.error('Error fetching all tickets:', error);
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

  const handleUpdateOrderStatus = async (ticketIds: string[], status: 'paid' | 'rejected' | 'pending', order?: GroupedOrder) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ payment_status: status })
        .in('id', ticketIds);

      if (error) throw error;

      toast.success('Estado actualizado');
      if (selectedRaffle) fetchTickets(selectedRaffle);
      
      // If approving, show the approval dialog with WhatsApp option and save to history
      if (status === 'paid' && order) {
        const raffleData = raffles.find(r => r.id === selectedRaffle);
        if (raffleData) {
          saveToApprovalHistory(order, raffleData.title, raffleData.number_count);
        }
        setApprovedOrder(order);
        setApprovalDialogOpen(true);
      }
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

  const handleEditRaffle = (raffle: Raffle) => {
    setEditingRaffle({ ...raffle });
    setEditDialogOpen(true);
  };

  const handleUpdateRaffle = async () => {
    if (!editingRaffle) return;
    
    try {
      const { error } = await supabase
        .from('raffles')
        .update({
          title: editingRaffle.title,
          description: editingRaffle.description,
          cover_image: editingRaffle.cover_image,
          price: editingRaffle.price,
          raffle_date: editingRaffle.raffle_date,
          number_count: editingRaffle.number_count,
          status: editingRaffle.status,
        })
        .eq('id', editingRaffle.id);

      if (error) throw error;

      toast.success('Rifa actualizada');
      setEditDialogOpen(false);
      setEditingRaffle(null);
      fetchRaffles();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar la rifa');
    }
  };

  const handleAddClient = async () => {
    if (!selectedRaffle || !newClient.name || !newClient.cedula || !newClient.phone || !newClient.numbers) {
      toast.error('Complete todos los campos requeridos');
      return;
    }

    // Parse numbers (comma-separated)
    const numbersArray = newClient.numbers
      .split(',')
      .map(n => parseInt(n.trim()))
      .filter(n => !isNaN(n));

    if (numbersArray.length === 0) {
      toast.error('Ingrese al menos un número válido');
      return;
    }

    // Check if numbers are available
    const existingNumbers = tickets.map(t => t.number);
    const unavailable = numbersArray.filter(n => existingNumbers.includes(n));
    
    if (unavailable.length > 0) {
      toast.error(`Los números ${unavailable.join(', ')} ya están vendidos`);
      return;
    }

    const selectedRaffleInfo = raffles.find(r => r.id === selectedRaffle);
    if (!selectedRaffleInfo) return;

    // Validate numbers are within range
    const maxNumber = selectedRaffleInfo.number_count - 1;
    const outOfRange = numbersArray.filter(n => n < 0 || n > maxNumber);
    if (outOfRange.length > 0) {
      toast.error(`Los números ${outOfRange.join(', ')} están fuera de rango (0-${maxNumber})`);
      return;
    }

    setAddingClient(true);
    try {
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const totalAmount = numbersArray.length * selectedRaffleInfo.price;
      
      const ticketsToInsert = numbersArray.map(num => ({
        raffle_id: selectedRaffle,
        order_id: orderId,
        number: num,
        buyer_name: newClient.name.trim(),
        buyer_cedula: newClient.cedula.trim(),
        buyer_phone: newClient.phone.trim(),
        reference_number: 'Manual - Admin',
        payment_proof_url: null,
        payment_status: newClient.paymentStatus,
        amount_paid: selectedRaffleInfo.price,
      }));

      const { error } = await supabase.from('tickets').insert(ticketsToInsert);
      if (error) throw error;

      toast.success(`Cliente agregado con ${numbersArray.length} número(s)`);
      setAddClientDialogOpen(false);
      setNewClient({ name: '', cedula: '', phone: '', numbers: '', paymentStatus: 'paid' });
      fetchTickets(selectedRaffle);
      fetchAllTickets();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al agregar cliente');
    } finally {
      setAddingClient(false);
    }
  };

  // Calculate sold numbers for each raffle using allTickets
  const getRaffleSoldCount = (raffleId: string) => {
    return allTickets.filter(t => t.raffle_id === raffleId && (t.payment_status === 'paid' || t.payment_status === 'reserved' || t.payment_status === 'pending')).length;
  };

  const formatNumber = (num: number, count: number) => {
    if (count <= 100) {
      return num.toString().padStart(2, '0');
    }
    return num.toString().padStart(3, '0');
  };

  const getWhatsAppConfirmationMessage = (order: GroupedOrder) => {
    const formattedNumbers = order.numbers
      .sort((a, b) => a - b)
      .map(n => formatNumber(n, selectedRaffleData?.number_count || 100))
      .join(', ');
    
    return `¡Hola ${order.buyer_name}! 🎉\n\nTu pago ha sido *CONFIRMADO* para la rifa "${selectedRaffleData?.title || 'la rifa'}".\n\n📌 Números: ${formattedNumbers}\n💰 Monto: $${order.total_amount.toFixed(2)}\n\n¡Buena suerte! 🍀`;
  };

  const openWhatsAppWithMessage = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  };

  const getHistoryConfirmationMessage = (item: ApprovalHistoryItem) => {
    const formattedNumbers = item.numbers
      .sort((a, b) => a - b)
      .map(n => formatNumber(n, item.raffle_number_count))
      .join(', ');
    
    return `¡Hola ${item.buyer_name}! 🎉\n\nTu pago ha sido *CONFIRMADO* para la rifa "${item.raffle_title}".\n\n📌 Números: ${formattedNumbers}\n💰 Monto: $${item.total_amount.toFixed(2)}\n\n¡Buena suerte! 🍀`;
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
  const rejectedOrders = groupedOrders.filter(o => o.payment_status === 'rejected');

  // Apply filter
  const filteredOrders = groupedOrders.filter(order => {
    if (orderFilter === 'all') return true;
    if (orderFilter === 'paid') return order.payment_status === 'paid';
    if (orderFilter === 'pending') return order.payment_status === 'pending' || order.payment_status === 'reserved';
    if (orderFilter === 'rejected') return order.payment_status === 'rejected';
    return true;
  });

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

            {/* Edit Raffle Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Editar Rifa</DialogTitle>
                </DialogHeader>
                {editingRaffle && (
                  <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-2">
                      <Label>Título *</Label>
                      <Input
                        value={editingRaffle.title}
                        onChange={(e) => setEditingRaffle({ ...editingRaffle, title: e.target.value })}
                        placeholder="Ej: iPhone 15 Pro Max"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Textarea
                        value={editingRaffle.description}
                        onChange={(e) => setEditingRaffle({ ...editingRaffle, description: e.target.value })}
                        placeholder="Descripción del premio..."
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>URL de Imagen</Label>
                      <Input
                        value={editingRaffle.cover_image}
                        onChange={(e) => setEditingRaffle({ ...editingRaffle, cover_image: e.target.value })}
                        placeholder="https://ejemplo.com/imagen.jpg"
                      />
                      {editingRaffle.cover_image && (
                        <img
                          src={editingRaffle.cover_image}
                          alt="Preview"
                          className="w-full h-32 object-cover rounded-lg mt-2"
                        />
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Precio *</Label>
                        <Input
                          type="number"
                          value={editingRaffle.price}
                          onChange={(e) => setEditingRaffle({ ...editingRaffle, price: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cantidad de Números</Label>
                        <Select
                          value={editingRaffle.number_count.toString()}
                          onValueChange={(value) => setEditingRaffle({ ...editingRaffle, number_count: parseInt(value) })}
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
                        value={editingRaffle.raffle_date}
                        onChange={(e) => setEditingRaffle({ ...editingRaffle, raffle_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Select
                        value={editingRaffle.status}
                        onValueChange={(value: 'active' | 'finished') => setEditingRaffle({ ...editingRaffle, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Activa</SelectItem>
                          <SelectItem value="finished">Finalizada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleUpdateRaffle} className="w-full" variant="gold">
                      Guardar Cambios
                    </Button>
                  </div>
                )}
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
                {raffles.map((raffle) => {
                  const soldCount = getRaffleSoldCount(raffle.id);
                  const progressPercent = (soldCount / raffle.number_count) * 100;
                  const availableCount = raffle.number_count - soldCount;
                  
                  return (
                    <Card key={raffle.id} className="overflow-hidden">
                      <div className="relative h-40">
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
                      <CardContent className="p-4 space-y-3">
                        <h3 className="font-bold text-lg">{raffle.title}</h3>
                        {raffle.description && (
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {raffle.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>${raffle.price}/número</span>
                          <span>{raffle.number_count} números</span>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span className="text-success font-medium">{soldCount} vendidos</span>
                            <span>{availableCount} disponibles</span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-success transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <p className="text-xs text-center text-muted-foreground">
                            {progressPercent.toFixed(1)}% vendido
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditRaffle(raffle)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
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
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            {/* Raffle Selector and Add Client Button */}
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1">
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
                  <Button 
                    variant="gold" 
                    onClick={() => setAddClientDialogOpen(true)}
                    disabled={!selectedRaffle}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Agregar Cliente
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Order Filters */}
            {selectedRaffle && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={orderFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setOrderFilter('all')}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Todos ({groupedOrders.length})
                </Button>
                <Button
                  size="sm"
                  variant={orderFilter === 'paid' ? 'default' : 'outline'}
                  onClick={() => setOrderFilter('paid')}
                  className={orderFilter === 'paid' ? '' : 'text-success border-success hover:bg-success hover:text-success-foreground'}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprobados ({paidOrders.length})
                </Button>
                <Button
                  size="sm"
                  variant={orderFilter === 'pending' ? 'default' : 'outline'}
                  onClick={() => setOrderFilter('pending')}
                  className={orderFilter === 'pending' ? '' : 'text-warning border-warning hover:bg-warning hover:text-warning-foreground'}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Pendientes ({pendingOrders.length})
                </Button>
                <Button
                  size="sm"
                  variant={orderFilter === 'rejected' ? 'default' : 'outline'}
                  onClick={() => setOrderFilter('rejected')}
                  className={orderFilter === 'rejected' ? '' : 'text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground'}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rechazados ({rejectedOrders.length})
                </Button>
              </div>
            )}

            {/* Approval History - Collapsible */}
            {approvalHistory.length > 0 && (
              <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                <Card className="border-dashed">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <History className="w-4 h-4 text-muted-foreground" />
                          <CardTitle className="text-sm font-medium">
                            Historial de Aprobados ({approvalHistory.length})
                          </CardTitle>
                        </div>
                        {historyOpen ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-3">
                      <div className="space-y-2">
                        {approvalHistory.map((item, index) => (
                          <div 
                            key={`${item.order_id}-${index}`}
                            className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium truncate">{item.buyer_name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {item.raffle_title}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                {item.numbers.slice(0, 5).map(n => (
                                  <span 
                                    key={n}
                                    className="px-1.5 py-0.5 bg-primary/20 text-primary rounded text-xs font-medium"
                                  >
                                    {formatNumber(n, item.raffle_number_count)}
                                  </span>
                                ))}
                                {item.numbers.length > 5 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{item.numbers.length - 5} más
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground ml-2">
                                  {format(new Date(item.approved_at), 'dd/MM HH:mm')}
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-success hover:bg-success/10 shrink-0 ml-2"
                              onClick={() => openWhatsAppWithMessage(
                                item.buyer_phone,
                                getHistoryConfirmationMessage(item)
                              )}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

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
            {filteredOrders.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    {orderFilter === 'all' 
                      ? 'No hay pedidos para esta rifa' 
                      : `No hay pedidos ${orderFilter === 'paid' ? 'aprobados' : orderFilter === 'pending' ? 'pendientes' : 'rechazados'}`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => (
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
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-success border-success hover:bg-success hover:text-success-foreground"
                            onClick={() => handleUpdateOrderStatus(order.ticket_ids, 'paid', order)}
                            disabled={order.payment_status === 'paid'}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleUpdateOrderStatus(order.ticket_ids, 'rejected')}
                            disabled={order.payment_status === 'rejected'}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Rechazar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            disabled={!order.payment_proof_url}
                            onClick={() => {
                              if (!order.payment_proof_url) return;
                              setSelectedProofUrl(order.payment_proof_url);
                              setProofDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver comprobante
                          </Button>
                          <WhatsAppMessageMenu
                            buyerPhone={order.buyer_phone}
                            buyerName={order.buyer_name}
                            numbers={order.numbers}
                            totalAmount={order.total_amount}
                            raffleName={selectedRaffleData?.title}
                            formatNumber={(num) => formatNumber(num, selectedRaffleData?.number_count || 100)}
                          />
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

        {/* Approval Confirmation Dialog */}
        <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-success">
                <CheckCircle className="w-6 h-6" />
                ¡Pago Aprobado!
              </DialogTitle>
            </DialogHeader>
            {approvedOrder && (
              <div className="space-y-4 pt-2">
                <div className="bg-success/10 rounded-lg p-4 text-center">
                  <p className="text-lg font-semibold text-success mb-1">
                    Pedido aprobado exitosamente
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Cliente: {approvedOrder.buyer_name}
                  </p>
                  <div className="flex flex-wrap justify-center gap-1 mt-2">
                    {approvedOrder.numbers.sort((a, b) => a - b).map(num => (
                      <span 
                        key={num}
                        className="px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs font-bold"
                      >
                        {formatNumber(num, selectedRaffleData?.number_count || 100)}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground text-center">
                    ¿Deseas notificar al cliente por WhatsApp?
                  </p>
                  <Button
                    className="w-full bg-success hover:bg-success/90 text-success-foreground"
                    onClick={() => {
                      openWhatsAppWithMessage(
                        approvedOrder.buyer_phone,
                        getWhatsAppConfirmationMessage(approvedOrder)
                      );
                      setApprovalDialogOpen(false);
                      setApprovedOrder(null);
                    }}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Enviar confirmación por WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setApprovalDialogOpen(false);
                      setApprovedOrder(null);
                    }}
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Client Dialog */}
        <Dialog open={addClientDialogOpen} onOpenChange={setAddClientDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Agregar Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  placeholder="Nombre completo del cliente"
                />
              </div>
              <div className="space-y-2">
                <Label>Cédula *</Label>
                <Input
                  value={newClient.cedula}
                  onChange={(e) => setNewClient({ ...newClient, cedula: e.target.value })}
                  placeholder="V-12345678"
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono *</Label>
                <Input
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  placeholder="+58412XXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label>Números (separados por coma) *</Label>
                <Input
                  value={newClient.numbers}
                  onChange={(e) => setNewClient({ ...newClient, numbers: e.target.value })}
                  placeholder="Ej: 5, 12, 45"
                />
                <p className="text-xs text-muted-foreground">
                  Ingrese los números separados por coma. Rango: 0-{selectedRaffleData ? selectedRaffleData.number_count - 1 : 99}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Estado del Pago</Label>
                <Select
                  value={newClient.paymentStatus}
                  onValueChange={(value: 'paid' | 'pending' | 'reserved') => setNewClient({ ...newClient, paymentStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Pagado</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="reserved">Reservado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleAddClient} 
                className="w-full" 
                variant="gold"
                disabled={addingClient}
              >
                {addingClient ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Agregando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Agregar Cliente
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Admin;
