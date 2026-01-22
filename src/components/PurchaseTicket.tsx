import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Raffle } from '@/types/database';
import { Download, MessageCircle, CheckCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PurchaseTicketProps {
  raffle: Raffle;
  selectedNumbers: number[];
  buyerName: string;
  buyerCedula: string;
  buyerPhone: string;
  referenceNumber: string;
  paymentType: 'full' | 'partial' | 'reserve';
  amountPaid: number;
  onClose: () => void;
}

export const PurchaseTicket = ({
  raffle,
  selectedNumbers,
  buyerName,
  buyerCedula,
  buyerPhone,
  referenceNumber,
  paymentType,
  amountPaid,
  onClose,
}: PurchaseTicketProps) => {
  const [adminWhatsapp, setAdminWhatsapp] = useState('');
  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAdminWhatsapp();
  }, []);

  const fetchAdminWhatsapp = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('admin_whatsapp')
        .single();

      if (!error && data?.admin_whatsapp) {
        setAdminWhatsapp(data.admin_whatsapp);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp:', error);
    }
  };

  const formatNumber = (num: number) => {
    if (raffle.number_count <= 100) {
      return num.toString().padStart(2, '0');
    }
    return num.toString().padStart(3, '0');
  };

  const totalPrice = selectedNumbers.length * raffle.price;

  const getPaymentStatusText = () => {
    switch (paymentType) {
      case 'full':
        return 'Pago Completo';
      case 'partial':
        return `Abono: $${amountPaid}`;
      case 'reserve':
        return 'Reservado (Sin pago)';
      default:
        return '';
    }
  };

  const handleDownload = async () => {
    if (!ticketRef.current) return;

    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      
      const link = document.createElement('a');
      link.download = `ticket-${raffle.title}-${buyerCedula}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error downloading ticket:', error);
      // Fallback: copy text
      const ticketText = generateTicketText();
      navigator.clipboard.writeText(ticketText);
      alert('Ticket copiado al portapapeles');
    }
  };

  const getActionText = () => {
    switch (paymentType) {
      case 'full':
        return 'acabo de *COMPRAR*';
      case 'partial':
        return 'acabo de *ABONAR*';
      case 'reserve':
        return 'acabo de *APARTAR*';
      default:
        return 'realicé una compra de';
    }
  };

  const generateTicketText = () => {
    const formattedNumbers = selectedNumbers.map(n => formatNumber(n)).join(', ');
    return `¡Hola! 👋

${getActionText()} los números *${formattedNumbers}* en la rifa "${raffle.title}".

📋 *Detalles de la compra:*
• Números: ${formattedNumbers}
• Total: $${totalPrice}
• ${paymentType === 'partial' ? `Abonado: $${amountPaid}` : paymentType === 'reserve' ? 'Sin pago (Reservado)' : `Pagado: $${totalPrice}`}
${referenceNumber ? `• Referencia: ${referenceNumber}` : ''}

👤 *Mis datos:*
• Nombre: ${buyerName}
• Cédula: ${buyerCedula}
• Teléfono: ${buyerPhone}

📅 Fecha: ${format(new Date(), "dd 'de' MMMM, yyyy - HH:mm", { locale: es })}

¡Quedo atento a la confirmación! 🍀`.trim();
  };

  const handleWhatsApp = () => {
    if (!adminWhatsapp) {
      alert('El número de WhatsApp del administrador no está configurado');
      return;
    }

    const message = encodeURIComponent(generateTicketText());
    const cleanNumber = adminWhatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-md relative overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Ticket Content */}
        <div ref={ticketRef} className="bg-white">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-2" />
            <h2 className="text-xl font-bold">¡Compra Exitosa!</h2>
            <p className="text-sm opacity-90">Tu ticket de compra</p>
          </div>

          <CardContent className="p-4 space-y-4">
            {/* Raffle Info */}
            <div className="text-center border-b pb-4">
              <h3 className="font-bold text-lg text-foreground">{raffle.title}</h3>
              <p className="text-sm text-muted-foreground">
                Sorteo: {format(new Date(raffle.raffle_date), "dd 'de' MMMM, yyyy", { locale: es })}
              </p>
            </div>

            {/* Numbers */}
            <div className="p-3">
              <p className="text-sm text-muted-foreground mb-2">Números adquiridos:</p>
              <div className="flex flex-wrap gap-2">
                {selectedNumbers.map(num => (
                  <span
                    key={num}
                    className="px-3 py-1 font-bold text-foreground text-sm"
                  >
                    {formatNumber(num)}
                  </span>
                ))}
              </div>
            </div>

            {/* Payment Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/50 p-2 rounded">
                <span className="text-muted-foreground block">Total:</span>
                <span className="font-bold text-primary">${totalPrice}</span>
              </div>
              <div className="bg-muted/50 p-2 rounded">
                <span className="text-muted-foreground block">Estado:</span>
                <span className="font-semibold">{getPaymentStatusText()}</span>
              </div>
            </div>

            {/* Buyer Info */}
            <div className="border rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nombre:</span>
                <span className="font-medium">{buyerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cédula:</span>
                <span className="font-medium">{buyerCedula}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Teléfono:</span>
                <span className="font-medium">{buyerPhone}</span>
              </div>
              {referenceNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Referencia:</span>
                  <span className="font-medium">{referenceNumber}</span>
                </div>
              )}
            </div>

            {/* Timestamp */}
            <p className="text-center text-xs text-muted-foreground">
              {format(new Date(), "dd/MM/yyyy - HH:mm:ss")}
            </p>

            {/* WhatsApp instruction */}
            <p className="text-center font-bold text-foreground text-sm mt-2">
              Descarga el ticket y presiona WhatsApp
            </p>
          </CardContent>
        </div>

        {/* Action Buttons */}
        <div className="p-4 pt-0 flex gap-3">
          <Button
            onClick={handleDownload}
            variant="outline"
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar
          </Button>
          <Button
            onClick={handleWhatsApp}
            variant="gold"
            className="flex-1"
            disabled={!adminWhatsapp}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            WhatsApp
          </Button>
        </div>
      </Card>
    </div>
  );
};
