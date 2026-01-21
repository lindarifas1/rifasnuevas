import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PaymentMethod, PaymentField } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, CreditCard, GripVertical, X } from 'lucide-react';

// Helper to parse payment_fields from database
const parsePaymentFields = (data: unknown): PaymentField[] | null => {
  if (!data) return null;
  if (Array.isArray(data)) {
    return data.filter(
      (item): item is PaymentField => 
        typeof item === 'object' && 
        item !== null && 
        'label' in item && 
        'value' in item
    );
  }
  return null;
};

export const PaymentMethodsManager = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    image_url: '',
    is_active: true,
    display_order: 0,
  });
  const [paymentFields, setPaymentFields] = useState<PaymentField[]>([]);

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
      
      // Parse payment_fields for each method
      const parsedMethods = (data || []).map(method => ({
        ...method,
        payment_fields: parsePaymentFields(method.payment_fields)
      })) as PaymentMethod[];
      
      setMethods(parsedMethods);
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
        is_active: method.is_active,
        display_order: method.display_order,
      });
      setPaymentFields(method.payment_fields || []);
    } else {
      setEditingMethod(null);
      setFormData({
        name: '',
        image_url: '',
        is_active: true,
        display_order: methods.length,
      });
      setPaymentFields([{ label: '', value: '' }]);
    }
    setDialogOpen(true);
  };

  const handleAddField = () => {
    setPaymentFields([...paymentFields, { label: '', value: '' }]);
  };

  const handleRemoveField = (index: number) => {
    setPaymentFields(paymentFields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: 'label' | 'value', value: string) => {
    const newFields = [...paymentFields];
    newFields[index] = { ...newFields[index], [key]: value };
    setPaymentFields(newFields);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('El nombre es requerido');
      return;
    }

    // Filter out empty fields
    const validFields = paymentFields.filter(f => f.label.trim() && f.value.trim());
    
    if (validFields.length === 0) {
      toast.error('Agrega al menos un campo de pago');
      return;
    }

    try {
      const dataToSave = {
        name: formData.name,
        image_url: formData.image_url || null,
        details: validFields.map(f => `${f.label}: ${f.value}`).join('\n'),
        payment_fields: validFields,
        is_active: formData.is_active,
        display_order: formData.display_order,
      };

      if (editingMethod) {
        const { error } = await supabase
          .from('payment_methods')
          .update(dataToSave)
          .eq('id', editingMethod.id);

        if (error) throw error;
        toast.success('Método actualizado');
      } else {
        const { error } = await supabase
          .from('payment_methods')
          .insert([dataToSave]);

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
                <p className="text-xs text-muted-foreground">
                  {method.payment_fields?.length || 0} campo(s)
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
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Campos de Pago *</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleAddField}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Agregar
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Cada campo podrá ser copiado individualmente por el cliente
              </p>
              
              <div className="space-y-3">
                {paymentFields.map((field, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="flex-1 space-y-1">
                      <Input
                        placeholder="Etiqueta (ej: Banco, Teléfono, Cédula)"
                        value={field.label}
                        onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Valor (ej: Banesco, 0412-1234567)"
                        value={field.value}
                        onChange={(e) => handleFieldChange(index, 'value', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    {paymentFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveField(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
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
