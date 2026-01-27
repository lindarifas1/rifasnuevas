import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, MessageCircle, Copy, CheckCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { GroupedOrder, Raffle } from '@/types/database';

interface AdminOrderTicketProps {
  order: GroupedOrder;
  raffle: Raffle;
  isOpen: boolean;
  onClose: () => void;
  formatNumber: (num: number) => string;
}

export const AdminOrderTicket = ({
  order,
  raffle,
  isOpen,
  onClose,
  formatNumber,
}: AdminOrderTicketProps) => {
  const ticketRef = useRef<HTMLDivElement>(null);

  const getPaymentStatusText = () => {
    // Check if it's a partial payment (has paid something but still has debt)
    if (order.amount_paid > 0 && order.debt > 0) {
      return 'Abonado 💵';
    }
    switch (order.payment_status) {
      case 'paid':
        return 'Pagado ✅';
      case 'pending':
        return 'Pendiente ⏳';
      case 'reserved':
        return 'Reservado 📌';
      case 'rejected':
        return 'Rechazado ❌';
      default:
        return order.payment_status;
    }
  };

  const generateTicketText = () => {
    const sortedNumbers = order.numbers.sort((a, b) => a - b);
    return `
🎟️ TICKET DE COMPRA - ${raffle.title}

📋 Números: ${sortedNumbers.map(n => formatNumber(n)).join(', ')}
💰 Total: $${order.total_amount.toFixed(2)}
📊 Estado: ${getPaymentStatusText()}

👤 Nombre: ${order.buyer_name}
🪪 Cédula: ${order.buyer_cedula}
📱 Teléfono: ${order.buyer_phone}
${order.reference_number ? `🔢 Referencia: ${order.reference_number}` : ''}

📅 Fecha de compra: ${format(new Date(order.created_at), "dd 'de' MMMM, yyyy - HH:mm", { locale: es })}
🎯 Sorteo: ${format(new Date(raffle.raffle_date), "dd 'de' MMMM, yyyy", { locale: es })}

¡Gracias por tu compra! 🍀
    `.trim();
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
      link.download = `ticket-${raffle.title}-${order.buyer_cedula}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Ticket descargado');
    } catch (error) {
      console.error('Error downloading ticket:', error);
      // Fallback: copy text
      handleCopy();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateTicketText());
      toast.success('Ticket copiado al portapapeles');
    } catch (error) {
      console.error('Error copying ticket:', error);
      toast.error('Error al copiar');
    }
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(generateTicketText());
    const cleanNumber = order.buyer_phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Ticket del Cliente</span>
          </DialogTitle>
        </DialogHeader>

        {/* Ticket Content */}
        <div ref={ticketRef} className="bg-white mx-4">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 text-center rounded-t-lg">
            <CheckCircle className="w-10 h-10 mx-auto mb-2" />
            <h2 className="text-lg font-bold">Ticket de Compra</h2>
            <p className="text-sm opacity-90">{raffle.title}</p>
          </div>

          <CardContent className="p-4 space-y-3 border border-t-0 rounded-b-lg">
            {/* Numbers */}
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Números adquiridos:</p>
              <div className="flex flex-wrap gap-1.5">
                {order.numbers.sort((a, b) => a - b).map(num => (
                  <span
                    key={num}
                    className="px-2 py-0.5 bg-primary text-primary-foreground font-bold rounded-full text-xs"
                  >
                    {formatNumber(num)}
                  </span>
                ))}
              </div>
            </div>

            {/* Payment Info */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-muted/50 p-2 rounded">
                <span className="text-muted-foreground text-xs block">Total:</span>
                <span className="font-bold text-primary">${order.total_amount.toFixed(2)}</span>
              </div>
              <div className="bg-muted/50 p-2 rounded">
                <span className="text-muted-foreground text-xs block">Estado:</span>
                <span className={`font-semibold text-xs ${
                  order.payment_status === 'paid' && order.debt <= 0 ? 'text-success' :
                  order.payment_status === 'rejected' ? 'text-destructive' :
                  order.amount_paid > 0 && order.debt > 0 ? 'text-secondary' :
                  'text-warning'
                }`}>
                  {order.payment_status === 'paid' && order.debt <= 0 ? 'Pagado' : 
                   order.payment_status === 'rejected' ? 'Rechazado' :
                   order.amount_paid > 0 && order.debt > 0 ? 'Abonado' :
                   order.payment_status === 'reserved' ? 'Reservado' : 'Pendiente'}
                </span>
              </div>
            </div>

            {/* Buyer Info */}
            <div className="border rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">Nombre:</span>
                <span className="font-medium text-xs">{order.buyer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">Cédula:</span>
                <span className="font-medium text-xs">{order.buyer_cedula}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">Teléfono:</span>
                <span className="font-medium text-xs">{order.buyer_phone}</span>
              </div>
              {order.reference_number && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">Referencia:</span>
                  <span className="font-medium text-xs">{order.reference_number}</span>
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="text-center text-xs text-muted-foreground space-y-1">
              <p>Compra: {format(new Date(order.created_at), "dd/MM/yyyy - HH:mm")}</p>
              <p>Sorteo: {format(new Date(raffle.raffle_date), "dd 'de' MMMM, yyyy", { locale: es })}</p>
            </div>
          </CardContent>
        </div>

        {/* Action Buttons */}
        <div className="p-4 pt-2 grid grid-cols-3 gap-2">
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <Download className="w-4 h-4 mr-1" />
            Descargar
          </Button>
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <Copy className="w-4 h-4 mr-1" />
            Copiar
          </Button>
          <Button
            onClick={handleWhatsApp}
            variant="gold"
            size="sm"
            className="text-xs"
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
