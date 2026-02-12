import { useState, forwardRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { uploadToTelegram } from '@/lib/telegram';
import { Loader2, Upload, CreditCard, Wallet, MessageCircle, AlertTriangle, DollarSign } from 'lucide-react';
import { Raffle } from '@/types/database';
import { PurchaseTicket } from './PurchaseTicket';
import { PaymentMethodsDisplay } from './PaymentMethodsDisplay';

interface PurchaseFormProps {
  raffle: Raffle;
  selectedNumbers: number[];
  onSuccess: () => void;
  onCancel: () => void;
  adminWhatsapp?: string;
}

type Currency = 'USD' | 'COP' | 'BS';

export const PurchaseForm = forwardRef<HTMLDivElement, PurchaseFormProps>(({
  raffle,
  selectedNumbers,
  onSuccess,
  onCancel,
  adminWhatsapp,
}, ref) => {
  const [loading, setLoading] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [showLimitError, setShowLimitError] = useState(false);
  const [existingCount, setExistingCount] = useState(0);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('USD');
  const [formData, setFormData] = useState({
    name: '',
    cedula: '',
    phone: '',
    referenceNumber: '',
    paymentType: 'full' as 'full' | 'partial' | 'reserve',
    partialAmount: 0,
    partialAmountInCurrency: 0,
  });
  const [paymentProof, setPaymentProof] = useState<File | null>(null);

  const totalPrice = selectedNumbers.length * raffle.price;

  // Calculate available currencies
  const availableCurrencies = useMemo(() => {
    const currencies: { value: Currency; label: string; symbol: string }[] = [
      { value: 'USD', label: 'Dólares (USD)', symbol: '$' }
    ];
    if (raffle.cop_rate > 0) {
      currencies.push({ value: 'COP', label: 'Pesos Colombianos (COP)', symbol: 'COP' });
    }
    if (raffle.bs_rate > 0) {
      currencies.push({ value: 'BS', label: 'Bolívares (Bs)', symbol: 'Bs' });
    }
    return currencies;
  }, [raffle.cop_rate, raffle.bs_rate]);

  // Convert USD to selected currency
  const convertFromUSD = (usdAmount: number): number => {
    switch (selectedCurrency) {
      case 'COP': return usdAmount * raffle.cop_rate;
      case 'BS': return usdAmount * raffle.bs_rate;
      default: return usdAmount;
    }
  };

  // Convert selected currency to USD
  const convertToUSD = (amount: number): number => {
    switch (selectedCurrency) {
      case 'COP': return raffle.cop_rate > 0 ? amount / raffle.cop_rate : 0;
      case 'BS': return raffle.bs_rate > 0 ? amount / raffle.bs_rate : 0;
      default: return amount;
    }
  };

  // Get currency symbol
  const getCurrencySymbol = (): string => {
    return availableCurrencies.find(c => c.value === selectedCurrency)?.symbol || '$';
  };

  // Total in selected currency
  const totalInCurrency = convertFromUSD(totalPrice);

  // Handle partial amount change in selected currency
  const handlePartialAmountChange = (value: string) => {
    const amountInCurrency = parseFloat(value) || 0;
    const amountInUSD = convertToUSD(amountInCurrency);
    setFormData({ 
      ...formData, 
      partialAmountInCurrency: amountInCurrency,
      partialAmount: amountInUSD 
    });
  };

  // Update partial amount when currency changes
  const handleCurrencyChange = (currency: Currency) => {
    setSelectedCurrency(currency);
    // Reset partial amount when currency changes
    setFormData({
      ...formData,
      partialAmountInCurrency: 0,
      partialAmount: 0
    });
  };

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

    // Check max numbers per client limit
    console.log('Checking limit - max_numbers_per_client:', raffle.max_numbers_per_client, 'type:', typeof raffle.max_numbers_per_client);
    
    if (raffle.max_numbers_per_client !== null && raffle.max_numbers_per_client !== undefined && raffle.max_numbers_per_client > 0) {
      const { data: existingTickets, error: countError } = await supabase
        .from('tickets')
        .select('id')
        .eq('raffle_id', raffle.id)
        .eq('buyer_cedula', formData.cedula)
        .neq('payment_status', 'rejected');

      if (countError) {
        console.error('Error checking existing tickets:', countError);
      } else {
        const currentCount = existingTickets?.length || 0;
        const totalAfterPurchase = currentCount + selectedNumbers.length;
        
        console.log('Limit check - currentCount:', currentCount, 'selected:', selectedNumbers.length, 'total:', totalAfterPurchase, 'max:', raffle.max_numbers_per_client);

        if (totalAfterPurchase > raffle.max_numbers_per_client) {
          setExistingCount(currentCount);
          setShowLimitError(true);
          return;
        }
      }
    }

    setLoading(true);

    try {
      let paymentProofUrl = null;

      // Upload payment proof to Telegram (non-blocking: ticket is created even if upload fails)
      if (paymentProof) {
        const caption = `Comprobante - ${formData.name} (${formData.cedula}) - Rifa: ${raffle.title} - Números: ${selectedNumbers.map(n => formatNumber(n)).join(', ')}`;
        paymentProofUrl = await uploadToTelegram(paymentProof, caption);
        if (!paymentProofUrl) {
          console.warn('Telegram upload failed, continuing without proof URL');
          toast.warning('No se pudo subir el comprobante a Telegram, pero tu compra se procesará. Envía el comprobante por WhatsApp.');
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

  const openWhatsApp = () => {
    if (adminWhatsapp) {
      const cleanPhone = adminWhatsapp.replace(/[^0-9]/g, '');
      const message = encodeURIComponent(
        `Hola, necesito ayuda para comprar números en la rifa "${raffle.title}". Ya tengo ${existingCount} números y quiero agregar ${selectedNumbers.length} más, pero el límite es ${raffle.max_numbers_per_client}.`
      );
      window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    }
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

  if (showLimitError) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="bg-destructive/10 text-destructive rounded-t-lg">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Límite Alcanzado
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4 text-center">
          <p className="text-muted-foreground">
            Esta rifa tiene un límite de <strong>{raffle.max_numbers_per_client}</strong> números por cliente.
          </p>
          <p className="text-muted-foreground">
            Ya tienes <strong>{existingCount}</strong> número(s) registrado(s) con esta cédula.
          </p>
          <p className="text-muted-foreground">
            No puedes agregar <strong>{selectedNumbers.length}</strong> número(s) más.
          </p>
          
          <div className="pt-4 space-y-3">
            <p className="font-medium">Para comprar más números, contacta al administrador:</p>
            {adminWhatsapp ? (
              <Button 
                onClick={openWhatsApp}
                className="bg-[#25D366] hover:bg-[#128C7E] text-white gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Contactar por WhatsApp
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Contacta al administrador de la rifa para asistencia.
              </p>
            )}
          </div>
          
          <Button variant="outline" onClick={onCancel} className="mt-4">
            Volver
          </Button>
        </CardContent>
      </Card>
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
        {/* Payment Methods */}
        <PaymentMethodsDisplay compact />

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
                  <div className="flex flex-col">
                    <span>Pago Completo</span>
                    {(raffle.cop_rate > 0 || raffle.bs_rate > 0) && (
                      <span className="text-xs text-muted-foreground">
                        {raffle.cop_rate > 0 && `COP ${(totalPrice * raffle.cop_rate).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`}
                        {raffle.cop_rate > 0 && raffle.bs_rate > 0 && ' | '}
                        {raffle.bs_rate > 0 && `Bs ${(totalPrice * raffle.bs_rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </span>
                    )}
                  </div>
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
            <div className="space-y-3">
              {availableCurrencies.length > 1 && (
                <div className="space-y-2">
                  <Label>Moneda de Pago</Label>
                  <Select value={selectedCurrency} onValueChange={(v: Currency) => handleCurrencyChange(v)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecciona moneda" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {availableCurrencies.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="partialAmount">
                  Monto del Abono ({getCurrencySymbol()})
                </Label>
                <Input
                  id="partialAmount"
                  type="number"
                  min={1}
                  max={totalInCurrency}
                  value={formData.partialAmountInCurrency || ''}
                  onChange={(e) => handlePartialAmountChange(e.target.value)}
                  placeholder={`Ingrese el monto en ${getCurrencySymbol()}`}
                />
                {selectedCurrency !== 'USD' && formData.partialAmount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Equivale a: ${formData.partialAmount.toFixed(2)} USD
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Total a pagar: {getCurrencySymbol()} {totalInCurrency.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {selectedCurrency !== 'USD' && ` (${totalPrice} USD)`}
                </p>
              </div>
            </div>
          )}

          {formData.paymentType === 'full' && availableCurrencies.length > 1 && (
            <div className="space-y-2">
              <Label>Moneda de Pago</Label>
              <Select value={selectedCurrency} onValueChange={(v: Currency) => setSelectedCurrency(v)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecciona moneda" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {availableCurrencies.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                <p className="text-sm font-medium text-success">
                  Total a pagar: {getCurrencySymbol()} {totalInCurrency.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                {selectedCurrency !== 'USD' && (
                  <p className="text-xs text-muted-foreground">
                    Equivale a: ${totalPrice} USD
                  </p>
                )}
              </div>
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
});

PurchaseForm.displayName = 'PurchaseForm';
