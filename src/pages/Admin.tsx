import { useEffect, useState, useCallback } from 'react';
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
import { AdminOrderTicket } from '@/components/AdminOrderTicket';
import { DeleteRaffleDialog } from '@/components/DeleteRaffleDialog';
import { PaymentMethodsManager } from '@/components/PaymentMethodsManager';
import { useNewTicketNotification } from '@/hooks/useNewTicketNotification';
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
  Search,
  Ticket as TicketIcon,
  Undo2,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { User, Session } from '@supabase/supabase-js';

interface UndoAction {
  order_id: string;
  ticket_ids: string[];
  previous_status: 'paid' | 'pending' | 'rejected' | 'reserved';
  current_status: 'paid' | 'rejected';
  buyer_name: string;
  timestamp: number;
}

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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
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
  const [appName, setAppName] = useState('RifaMax');
  const [termsConditions, setTermsConditions] = useState('');
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | 'paid' | 'pending' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [addClientDialogOpen, setAddClientDialogOpen] = useState(false);
  const [addingClient, setAddingClient] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvedOrder, setApprovedOrder] = useState<GroupedOrder | null>(null);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [ticketDialogOrder, setTicketDialogOrder] = useState<GroupedOrder | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [raffleToDelete, setRaffleToDelete] = useState<Raffle | null>(null);
  const [newClient, setNewClient] = useState({
    name: '',
    cedula: '',
    phone: '',
    numbers: '',
    paymentStatus: 'paid' as 'paid' | 'pending' | 'reserved',
  });
  const [undoActions, setUndoActions] = useState<UndoAction[]>([]);
  const [newRaffle, setNewRaffle] = useState({
    title: '',
    description: '',
    cover_image: '',
    price: 0,
    raffle_date: '',
    number_count: 100,
    status: 'active' as const,
  });

  // Realtime notification hook
  const handleNewTicket = useCallback(() => {
    if (selectedRaffle) {
      fetchTickets(selectedRaffle);
      fetchAllTickets();
    }
  }, [selectedRaffle]);

  useNewTicketNotification({
    raffleId: selectedRaffle,
    onNewTicket: handleNewTicket,
  });

  // Auth check
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkAdminRole(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setAuthLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setAuthLoading(false);
        navigate('/admin/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      if (error || !data) {
        setIsAdmin(false);
        toast.error('No tienes permisos de administrador');
        await supabase.auth.signOut();
        navigate('/admin/login');
      } else {
        setIsAdmin(true);
        fetchRaffles();
        fetchAllTickets();
        fetchSiteSettings();
        loadApprovalHistory();
      }
    } catch (error) {
      setIsAdmin(false);
      navigate('/admin/login');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Sesión cerrada');
    navigate('/');
  };

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
        setAppName(data.app_name || 'RifaMax');
        setTermsConditions(data.terms_conditions || '');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleUpdateAppSettings = async () => {
    try {
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .single();

      const settingsData = { 
        app_name: appName, 
        terms_conditions: termsConditions 
      };

      if (existing) {
        const { error } = await supabase
          .from('site_settings')
          .update(settingsData)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('site_settings')
          .insert([settingsData]);

        if (error) throw error;
      }

      toast.success('Configuración guardada');
      setTermsDialogOpen(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar');
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

  const handleOpenDeleteDialog = (raffle: Raffle) => {
    setRaffleToDelete(raffle);
    setDeleteDialogOpen(true);
  };

  const handleDeleteRaffle = async () => {
    if (!raffleToDelete) return;

    try {
      const { error } = await supabase.from('raffles').delete().eq('id', raffleToDelete.id);

      if (error) throw error;

      toast.success('Rifa eliminada');
      setRaffleToDelete(null);
      fetchRaffles();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar la rifa');
    }
  };

  const handleUpdateOrderStatus = async (
    ticketIds: string[], 
    status: 'paid' | 'rejected' | 'pending', 
    order?: GroupedOrder,
    skipUndo = false
  ) => {
    try {
      // Save undo action before changing status
      if (!skipUndo && order && (status === 'paid' || status === 'rejected')) {
        const undoAction: UndoAction = {
          order_id: order.order_id,
          ticket_ids: ticketIds,
          previous_status: order.payment_status as 'paid' | 'pending' | 'rejected' | 'reserved',
          current_status: status,
          buyer_name: order.buyer_name,
          timestamp: Date.now(),
        };
        setUndoActions(prev => [undoAction, ...prev].slice(0, 10)); // Keep last 10 undo actions
      }

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

  const handleUndoAction = async (undoAction: UndoAction) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ payment_status: undoAction.previous_status })
        .in('id', undoAction.ticket_ids);

      if (error) throw error;

      // Remove from undo actions
      setUndoActions(prev => prev.filter(a => a.order_id !== undoAction.order_id));
      
      toast.success(`Acción deshecha: ${undoAction.buyer_name} volvió a "${undoAction.previous_status}"`);
      if (selectedRaffle) fetchTickets(selectedRaffle);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al deshacer la acción');
    }
  };

  const handleDeleteOrder = async (ticketIds: string[]) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .in('id', ticketIds);

      if (error) throw error;

      toast.success('Pedido eliminado');
      if (selectedRaffle) fetchTickets(selectedRaffle);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar el pedido');
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

    // Parse numbers (comma or space separated)
    const numbersArray = newClient.numbers
      .split(/[\s,]+/)
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
  
  // Get the selected raffle price for debt calculation
  const rafflePrice = selectedRaffleData?.price || 0;

  // Group tickets by order_id
  const groupedOrders: GroupedOrder[] = tickets.reduce((acc, ticket) => {
    // Use order_id if available, otherwise use a unique key based on buyer info and timestamp
    const orderId = ticket.order_id || `${ticket.buyer_cedula}-${ticket.created_at}`;
    
    const existingOrder = acc.find(o => o.order_id === orderId);
    
    if (existingOrder) {
      existingOrder.numbers.push(ticket.number);
      existingOrder.amount_paid += ticket.amount_paid;
      existingOrder.total_amount += rafflePrice;
      existingOrder.debt = existingOrder.total_amount - existingOrder.amount_paid;
      existingOrder.ticket_ids.push(ticket.id);
    } else {
      const expectedTotal = rafflePrice;
      const amountPaid = ticket.amount_paid;
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
        total_amount: expectedTotal,
        amount_paid: amountPaid,
        debt: expectedTotal - amountPaid,
        created_at: ticket.created_at,
        ticket_ids: [ticket.id],
      });
    }
    
    return acc;
  }, [] as GroupedOrder[]);
  
  const paidOrders = groupedOrders.filter(o => o.payment_status === 'paid');
  const pendingOrders = groupedOrders.filter(o => o.payment_status === 'pending' || o.payment_status === 'reserved');
  const rejectedOrders = groupedOrders.filter(o => o.payment_status === 'rejected');

  // Apply filter and search
  const filteredOrders = groupedOrders.filter(order => {
    // Status filter
    const statusMatch = 
      orderFilter === 'all' ? true :
      orderFilter === 'paid' ? order.payment_status === 'paid' :
      orderFilter === 'pending' ? (order.payment_status === 'pending' || order.payment_status === 'reserved') :
      orderFilter === 'rejected' ? order.payment_status === 'rejected' : true;
    
    if (!statusMatch) return false;
    
    // Search filter
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    const nameMatch = order.buyer_name.toLowerCase().includes(query);
    const cedulaMatch = order.buyer_cedula.toLowerCase().includes(query);
    const phoneMatch = order.buyer_phone.toLowerCase().includes(query);
    const numberMatch = order.numbers.some(n => 
      formatNumber(n, selectedRaffleData?.number_count || 100).includes(query) ||
      n.toString().includes(query)
    );
    
    return nameMatch || cedulaMatch || phoneMatch || numberMatch;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header isAdmin onLogout={handleLogout} />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header isAdmin onLogout={handleLogout} />

      <div className="container py-4 px-3 sm:py-6 sm:px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold">Panel de Administración</h1>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <Dialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
                  <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Configuración</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Configuración General</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Nombre de la Aplicación</Label>
                    <Input
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      placeholder="Ej: RifaMax"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Términos y Condiciones</Label>
                    <Textarea
                      value={termsConditions}
                      onChange={(e) => setTermsConditions(e.target.value)}
                      placeholder="Escribe los términos y condiciones..."
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Este texto se mostrará a los usuarios antes de participar en una rifa
                    </p>
                  </div>
                  <Button onClick={handleUpdateAppSettings} className="w-full">
                    Guardar Configuración
                  </Button>
                  
                  <div className="border-t pt-4">
                    <PaymentMethodsManager />
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
                  <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-lg">
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
                <Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
                  <Image className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Portada</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-lg">
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
                <Button variant="gold" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Nueva Rifa</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Crear Nueva Rifa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
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
                  <div className="grid grid-cols-2 gap-3">
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
                      <Label>Cant. Números</Label>
                      <Select
                        value={newRaffle.number_count.toString()}
                        onValueChange={(value) => setNewRaffle({ ...newRaffle, number_count: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="1000">1000</SelectItem>
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
              <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Editar Rifa</DialogTitle>
                </DialogHeader>
                {editingRaffle && (
                  <div className="space-y-4 pt-4">
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
                        rows={3}
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
                          className="w-full h-24 object-cover rounded-lg mt-2"
                        />
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
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
                        <Label>Cant. Números</Label>
                        <Select
                          value={editingRaffle.number_count.toString()}
                          onValueChange={(value) => setEditingRaffle({ ...editingRaffle, number_count: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="100">100</SelectItem>
                            <SelectItem value="1000">1000</SelectItem>
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
                        
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditRaffle(raffle)}
                            className="text-xs sm:text-sm px-2 sm:px-3"
                          >
                            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
                            <span className="hidden sm:inline">Editar</span>
                          </Button>
                          <Button
                            size="sm"
                            variant={raffle.status === 'active' ? 'outline' : 'default'}
                            onClick={() => handleToggleRaffleStatus(raffle)}
                            className="text-xs sm:text-sm px-2 sm:px-3"
                          >
                            {raffle.status === 'active' ? 'Finalizar' : 'Activar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleOpenDeleteDialog(raffle)}
                            className="px-2 sm:px-3"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

            {/* Search and Filters */}
            {selectedRaffle && (
              <div className="space-y-3">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número, nombre, cédula o teléfono..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-sm"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setSearchQuery('')}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Order Filters */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  <Button
                    size="sm"
                    variant={orderFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setOrderFilter('all')}
                    className="text-xs sm:text-sm"
                  >
                    <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Todos ({groupedOrders.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={orderFilter === 'paid' ? 'default' : 'outline'}
                    onClick={() => setOrderFilter('paid')}
                    className={`text-xs sm:text-sm ${orderFilter === 'paid' ? '' : 'text-success border-success hover:bg-success hover:text-success-foreground'}`}
                  >
                    <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Aprobados</span> ({paidOrders.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={orderFilter === 'pending' ? 'default' : 'outline'}
                    onClick={() => setOrderFilter('pending')}
                    className={`text-xs sm:text-sm ${orderFilter === 'pending' ? '' : 'text-warning border-warning hover:bg-warning hover:text-warning-foreground'}`}
                  >
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Pendientes</span> ({pendingOrders.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={orderFilter === 'rejected' ? 'default' : 'outline'}
                    onClick={() => setOrderFilter('rejected')}
                    className={`text-xs sm:text-sm ${orderFilter === 'rejected' ? '' : 'text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground'}`}
                  >
                    <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Rechazados</span> ({rejectedOrders.length})
                  </Button>
                </div>

                {/* Search results count */}
                {searchQuery && (
                  <p className="text-xs text-muted-foreground">
                    {filteredOrders.length} resultado{filteredOrders.length !== 1 ? 's' : ''} para "{searchQuery}"
                  </p>
                )}
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
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <Card>
                  <CardContent className="py-2 sm:py-4 px-2 sm:px-4 text-center">
                    <DollarSign className="w-5 h-5 sm:w-8 sm:h-8 mx-auto text-success mb-1 sm:mb-2" />
                    <p className="text-base sm:text-2xl font-bold text-success">
                      ${paidOrders.reduce((sum, o) => sum + o.total_amount, 0).toFixed(0)}
                    </p>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Recaudado</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-2 sm:py-4 px-2 sm:px-4 text-center">
                    <CheckCircle className="w-5 h-5 sm:w-8 sm:h-8 mx-auto text-success mb-1 sm:mb-2" />
                    <p className="text-base sm:text-2xl font-bold">{paidOrders.length}</p>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Pagados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-2 sm:py-4 px-2 sm:px-4 text-center">
                    <Clock className="w-5 h-5 sm:w-8 sm:h-8 mx-auto text-warning mb-1 sm:mb-2" />
                    <p className="text-base sm:text-2xl font-bold">{pendingOrders.length}</p>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Pendientes</p>
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
              <div className="space-y-2 sm:space-y-3">
                {filteredOrders.map((order) => (
                  <Card key={order.order_id} className="overflow-hidden">
                    <CardContent className="p-3 sm:p-4">
                      {/* Numbers and status badge */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                        {order.numbers
                          .sort((a, b) => a - b)
                          .slice(0, 6)
                          .map((num) => (
                            <span 
                              key={num} 
                              className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-primary text-primary-foreground font-bold rounded-full text-xs sm:text-sm"
                            >
                              {formatNumber(num, selectedRaffleData?.number_count || 100)}
                            </span>
                          ))}
                        {order.numbers.length > 6 && (
                          <span className="text-xs text-muted-foreground">+{order.numbers.length - 6}</span>
                        )}
                        <div className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold flex items-center gap-0.5 sm:gap-1 ml-auto ${
                          order.payment_status === 'paid'
                            ? 'bg-success/10 text-success'
                            : order.payment_status === 'rejected'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-warning/10 text-warning'
                        }`}>
                          {order.payment_status === 'paid' && <CheckCircle className="w-3 h-3" />}
                          {order.payment_status === 'rejected' && <XCircle className="w-3 h-3" />}
                          {(order.payment_status === 'pending' || order.payment_status === 'reserved') && <Clock className="w-3 h-3" />}
                          <span className="hidden sm:inline">
                            {order.payment_status === 'paid' ? 'Pagado' : 
                             order.payment_status === 'rejected' ? 'Rechazado' :
                             order.payment_status === 'reserved' ? 'Reservado' : 'Pendiente'}
                          </span>
                        </div>
                      </div>

                      {/* Client info - compact grid */}
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs sm:text-sm mb-2 sm:mb-3">
                        <div className="truncate">
                          <span className="text-muted-foreground">Nombre: </span>
                          <span className="font-medium">{order.buyer_name}</span>
                        </div>
                        <div className="truncate">
                          <span className="text-muted-foreground">Cédula: </span>
                          <span className="font-medium">{order.buyer_cedula}</span>
                        </div>
                        <div className="truncate">
                          <span className="text-muted-foreground">Tel: </span>
                          <span className="font-medium text-[11px] sm:text-sm">{order.buyer_phone}</span>
                        </div>
                        <div className="truncate">
                          <span className="text-muted-foreground">Ref: </span>
                          <span className="font-medium text-[11px] sm:text-sm">{order.reference_number || 'N/A'}</span>
                        </div>
                        <div className="truncate">
                          <span className="text-muted-foreground">Fecha: </span>
                          <span className="font-medium text-[11px] sm:text-sm">
                            {format(new Date(order.created_at), 'dd/MM HH:mm')}
                          </span>
                        </div>
                      </div>

                      {/* Payment amounts - Total, Paid, Debt */}
                      <div className="grid grid-cols-3 gap-2 mb-2 sm:mb-3 p-2 bg-muted/50 rounded-lg">
                        <div className="text-center">
                          <span className="text-muted-foreground text-[10px] sm:text-xs block">Total</span>
                          <span className="font-bold text-xs sm:text-sm">${order.total_amount.toFixed(2)}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-muted-foreground text-[10px] sm:text-xs block">Pagado</span>
                          <span className="font-bold text-success text-xs sm:text-sm">${order.amount_paid.toFixed(2)}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-muted-foreground text-[10px] sm:text-xs block">Deuda</span>
                          <span className={`font-bold text-xs sm:text-sm ${order.debt > 0 ? 'text-destructive' : 'text-success'}`}>
                            ${order.debt.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons - horizontal scroll on mobile */}
                      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1">
                        {/* Check if this order has an undo action available */}
                        {(() => {
                          const undoAction = undoActions.find(a => a.order_id === order.order_id);
                          if (undoAction) {
                            return (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-amber-600 border-amber-500 hover:bg-amber-500 hover:text-white text-xs px-2 sm:px-3 shrink-0"
                                onClick={() => handleUndoAction(undoAction)}
                              >
                                <Undo2 className="w-3.5 h-3.5 sm:mr-1" />
                                <span className="hidden sm:inline">Deshacer</span>
                              </Button>
                            );
                          }
                          return null;
                        })()}
                        
                        {/* Show delete button for rejected orders */}
                        {order.payment_status === 'rejected' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground text-xs px-2 sm:px-3 shrink-0"
                            onClick={() => handleDeleteOrder(order.ticket_ids)}
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:mr-1" />
                            <span className="hidden sm:inline">Eliminar</span>
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-success border-success hover:bg-success hover:text-success-foreground text-xs px-2 sm:px-3 shrink-0"
                              onClick={() => handleUpdateOrderStatus(order.ticket_ids, 'paid', order)}
                              disabled={order.payment_status === 'paid'}
                            >
                              <CheckCircle className="w-3.5 h-3.5 sm:mr-1" />
                              <span className="hidden sm:inline">Aprobar</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground text-xs px-2 sm:px-3 shrink-0"
                              onClick={() => handleUpdateOrderStatus(order.ticket_ids, 'rejected', order)}
                            >
                              <XCircle className="w-3.5 h-3.5 sm:mr-1" />
                              <span className="hidden sm:inline">Rechazar</span>
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs px-2 sm:px-3 shrink-0"
                          disabled={!order.payment_proof_url}
                          onClick={() => {
                            if (!order.payment_proof_url) return;
                            setSelectedProofUrl(order.payment_proof_url);
                            setProofDialogOpen(true);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5 sm:mr-1" />
                          <span className="hidden sm:inline">Ver</span>
                        </Button>
                        <WhatsAppMessageMenu
                          buyerPhone={order.buyer_phone}
                          buyerName={order.buyer_name}
                          numbers={order.numbers}
                          totalAmount={order.total_amount}
                          raffleName={selectedRaffleData?.title}
                          formatNumber={(num) => formatNumber(num, selectedRaffleData?.number_count || 100)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs px-2 sm:px-3 shrink-0"
                          onClick={() => setTicketDialogOrder(order)}
                        >
                          <TicketIcon className="w-3.5 h-3.5 sm:mr-1" />
                          <span className="hidden sm:inline">Ticket</span>
                        </Button>
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

        {/* Order Ticket Dialog */}
        {ticketDialogOrder && selectedRaffleData && (
          <AdminOrderTicket
            order={ticketDialogOrder}
            raffle={selectedRaffleData}
            isOpen={!!ticketDialogOrder}
            onClose={() => setTicketDialogOrder(null)}
            formatNumber={(num) => formatNumber(num, selectedRaffleData.number_count)}
          />
        )}

        {/* Delete Raffle Confirmation Dialog */}
        <DeleteRaffleDialog
          isOpen={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setRaffleToDelete(null);
          }}
          onConfirm={handleDeleteRaffle}
          raffleName={raffleToDelete?.title || ''}
        />
      </div>
    </div>
  );
};

export default Admin;
