import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, CreditCard, Wallet } from 'lucide-react';
import { Raffle } from '@/types/database';
import { PurchaseTicket } from './PurchaseTicket';

interface PurchaseFormProps {
  raffle: Raffle;
  selectedNumbers: number[];
  onSuccess: () => void;
  onCancel: () => void;
}

export const PurchaseForm = ({
  raffle,
  selectedNumbers,
  onSuccess,
  onCancel,
}: PurchaseFormProps) => {
  const [loading, setLoading] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    cedula: '',
    phone: '',
    referenceNumber: '',
    paymentType: 'full' as 'full' | 'partial' | 'reserve',
    partialAmount: 0,
  });
  const [paymentProof, setPaymentProof] = useState<File | null>(null);

  const totalPrice = selectedNumbers.length * raffle.price;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentProof(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.cedula || !formData.phone) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }

    if (formData.paymentType !== 'reserve' && !formData.referenceNumber) {
      toast.error('Por favor ingrese el número de referencia del pago');
      return;
    }

    setLoading(true);

    try {
      let paymentProofUrl = null;

      // Upload payment proof if provided
      if (paymentProof) {
        const fileExt = paymentProof.name.split('.').pop();
        const fileName = `${Date.now()}-${formData.cedula}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, paymentProof);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error('No se pudo subir el comprobante. Revisa la configuración de Storage e intenta de nuevo.');
          throw uploadError;
        } else {
          const { data: urlData } = supabase.storage
            .from('payment-proofs')
            .getPublicUrl(uploadData.path);
          paymentProofUrl = urlData.publicUrl;
        }
      }

      // Determine payment status and amount
      let paymentStatus: 'pending' | 'reserved' = 'pending';
      let amountPaid = 0;

      if (formData.paymentType === 'reserve') {
        paymentStatus = 'reserved';
        amountPaid = 0;
      } else if (formData.paymentType === 'partial') {
        paymentStatus = 'pending';
        amountPaid = formData.partialAmount;
      } else {
        paymentStatus = 'pending';
        amountPaid = totalPrice;
      }

      // Generate a unique order_id to group all numbers from this purchase
      const orderId = `${Date.now()}-${formData.cedula}-${Math.random().toString(36).substring(2, 9)}`;

      // Create tickets for each selected number with the same order_id
      const tickets = selectedNumbers.map(number => ({
        raffle_id: raffle.id,
        order_id: orderId,
        number,
        buyer_name: formData.name,
        buyer_cedula: formData.cedula,
        buyer_phone: formData.phone,
        reference_number: formData.referenceNumber,
        payment_proof_url: paymentProofUrl,
        payment_status: paymentStatus,
        amount_paid: amountPaid / selectedNumbers.length,
      }));

      const { error } = await supabase.from('tickets').insert(tickets);

      if (error) {
        throw error;
      }

      toast.success('¡Números reservados exitosamente!');
      setShowTicket(true);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al procesar la compra. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseTicket = () => {
    setShowTicket(false);
    onSuccess();
  };

  const getAmountPaid = () => {
    if (formData.paymentType === 'reserve') return 0;
    if (formData.paymentType === 'partial') return formData.partialAmount;
    return totalPrice;
  };

  const formatNumber = (num: number) => {
    if (raffle.number_count <= 100) {
      return num.toString().padStart(2, '0');
    }
    return num.toString().padStart(3, '0');
  };

  if (showTicket) {
    return (
      <PurchaseTicket
        raffle={raffle}
        selectedNumbers={selectedNumbers}
        buyerName={formData.name}
        buyerCedula={formData.cedula}
        buyerPhone={formData.phone}
        referenceNumber={formData.referenceNumber}
        paymentType={formData.paymentType}
        amountPaid={getAmountPaid()}
        onClose={handleCloseTicket}
      />
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground rounded-t-lg">
        <CardTitle className="text-lg">Completar Compra</CardTitle>
        <p className="text-sm opacity-90">
          {selectedNumbers.length} número(s) seleccionado(s)
        </p>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Selected Numbers */}
        <div className="flex flex-wrap gap-1.5 p-3 bg-muted rounded-lg">
          {selectedNumbers.map(num => (
            <span key={num} className="px-2 py-1 bg-primary text-primary-foreground text-sm rounded-full font-semibold">
              {formatNumber(num)}
            </span>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre Completo *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Tu nombre"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cedula">Cédula *</Label>
            <Input
              id="cedula"
              value={formData.cedula}
              onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
              placeholder="V-12345678"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="0412-1234567"
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Tipo de Pago</Label>
            <RadioGroup
              value={formData.paymentType}
              onValueChange={(value: 'full' | 'partial' | 'reserve') => 
                setFormData({ ...formData, paymentType: value })
              }
              className="space-y-2"
            >
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="flex-1 cursor-pointer flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-success" />
                  <span>Pago Completo</span>
                  <span className="ml-auto font-bold text-success">${totalPrice}</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="partial" id="partial" />
                <Label htmlFor="partial" className="flex-1 cursor-pointer flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-warning" />
                  <span>Abono Parcial</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="reserve" id="reserve" />
                <Label htmlFor="reserve" className="flex-1 cursor-pointer">
                  Apartar sin pago (reservar)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {formData.paymentType === 'partial' && (
            <div className="space-y-2">
              <Label htmlFor="partialAmount">Monto del Abono</Label>
              <Input
                id="partialAmount"
                type="number"
                min={1}
                max={totalPrice}
                value={formData.partialAmount}
                onChange={(e) => setFormData({ ...formData, partialAmount: parseFloat(e.target.value) || 0 })}
                placeholder="Monto"
              />
            </div>
          )}

          {formData.paymentType !== 'reserve' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="referenceNumber">Número de Referencia *</Label>
                <Input
                  id="referenceNumber"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
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
            </>
          )}

          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" variant="gold" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
