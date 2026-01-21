import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PaymentMethod } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, CreditCard, GripVertical } from 'lucide-react';

export const PaymentMethodsManager = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    image_url: '',
    details: '',
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setMethods(data as PaymentMethod[] || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (method?: PaymentMethod) => {
    if (method) {
      setEditingMethod(method);
      setFormData({
        name: method.name,
        image_url: method.image_url || '',
        details: method.details,
        is_active: method.is_active,
        display_order: method.display_order,
      });
    } else {
      setEditingMethod(null);
      setFormData({
        name: '',
        image_url: '',
        details: '',
        is_active: true,
        display_order: methods.length,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.details) {
      toast.error('Nombre y detalles son requeridos');
      return;
    }

    try {
      if (editingMethod) {
        const { error } = await supabase
          .from('payment_methods')
          .update({
            name: formData.name,
            image_url: formData.image_url || null,
            details: formData.details,
            is_active: formData.is_active,
            display_order: formData.display_order,
          })
          .eq('id', editingMethod.id);

        if (error) throw error;
        toast.success('Método actualizado');
      } else {
        const { error } = await supabase
          .from('payment_methods')
          .insert([{
            name: formData.name,
            image_url: formData.image_url || null,
            details: formData.details,
            is_active: formData.is_active,
            display_order: formData.display_order,
          }]);

        if (error) throw error;
        toast.success('Método creado');
      }

      setDialogOpen(false);
      fetchMethods();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este método de pago?')) return;

    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Método eliminado');
      fetchMethods();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar');
    }
  };

  const handleToggleActive = async (method: PaymentMethod) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: !method.is_active })
        .eq('id', method.id);

      if (error) throw error;
      fetchMethods();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Métodos de Pago
        </h3>
        <Button size="sm" onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-1" />
          Agregar
        </Button>
      </div>

      <div className="space-y-2">
        {methods.map((method) => (
          <Card key={method.id} className={!method.is_active ? 'opacity-50' : ''}>
            <CardContent className="p-3 flex items-center gap-3">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              
              {method.image_url ? (
                <img 
                  src={method.image_url} 
                  alt={method.name}
                  className="w-10 h-10 object-contain rounded"
                />
              ) : (
                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{method.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {method.details.split('\n')[0]}
                </p>
              </div>
              
              <Switch
                checked={method.is_active}
                onCheckedChange={() => handleToggleActive(method)}
              />
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleOpenDialog(method)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleDelete(method.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
        
        {methods.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay métodos de pago configurados
          </p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMethod ? 'Editar Método' : 'Nuevo Método de Pago'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Pago Móvil"
              />
            </div>
            
            <div className="space-y-2">
              <Label>URL de Imagen</Label>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://ejemplo.com/logo.png"
              />
              {formData.image_url && (
                <img 
                  src={formData.image_url} 
                  alt="Preview"
                  className="w-16 h-16 object-contain rounded border"
                />
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Detalles de Pago *</Label>
              <Textarea
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                placeholder="Banco: ...\nTeléfono: ...\nCédula: ..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Usa Enter para separar líneas
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Activo</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
            
            <Button onClick={handleSave} className="w-full">
              {editingMethod ? 'Guardar Cambios' : 'Crear Método'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
