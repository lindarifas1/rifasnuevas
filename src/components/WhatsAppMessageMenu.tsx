import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageCircle, CheckCircle, Bell, Unlock, Edit } from 'lucide-react';

interface WhatsAppMessageMenuProps {
  buyerPhone: string;
  buyerName: string;
  numbers: number[];
  totalAmount: number;
  raffleName?: string;
  formatNumber: (num: number) => string;
}

const MESSAGE_TEMPLATES = {
  confirmation: {
    label: 'Confirmación de pago',
    icon: CheckCircle,
    template: (name: string, numbers: string, raffle: string, amount: number) =>
      `¡Hola ${name}! 🎉\n\nTu pago ha sido *CONFIRMADO* para la rifa "${raffle}".\n\n📌 Números: ${numbers}\n💰 Monto: $${amount.toFixed(2)}\n\n¡Buena suerte! 🍀`,
  },
  reminder: {
    label: 'Recordatorio de pago',
    icon: Bell,
    template: (name: string, numbers: string, raffle: string, amount: number) =>
      `¡Hola ${name}! 👋\n\nTe recordamos que tienes un pago *PENDIENTE* para la rifa "${raffle}".\n\n📌 Números reservados: ${numbers}\n💰 Monto: $${amount.toFixed(2)}\n\nPor favor realiza el pago lo antes posible para confirmar tu participación. ⏰`,
  },
  released: {
    label: 'Números liberados',
    icon: Unlock,
    template: (name: string, numbers: string, raffle: string, amount: number) =>
      `Hola ${name},\n\nTe informamos que los números ${numbers} de la rifa "${raffle}" han sido *LIBERADOS* debido a que no se recibió el pago a tiempo.\n\nSi aún deseas participar, puedes seleccionar nuevos números disponibles. 🎯`,
  },
};

export const WhatsAppMessageMenu = ({
  buyerPhone,
  buyerName,
  numbers,
  totalAmount,
  raffleName = 'la rifa',
  formatNumber,
}: WhatsAppMessageMenuProps) => {
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<{
    key: string;
    message: string;
  } | null>(null);

  const formattedNumbers = numbers
    .sort((a, b) => a - b)
    .map(formatNumber)
    .join(', ');

  const openWhatsApp = (message: string) => {
    const cleanPhone = buyerPhone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  };

  const handleTemplateClick = (templateKey: keyof typeof MESSAGE_TEMPLATES) => {
    const template = MESSAGE_TEMPLATES[templateKey];
    const message = template.template(buyerName, formattedNumbers, raffleName, totalAmount);
    setEditingTemplate({ key: templateKey, message });
    setEditDialogOpen(true);
  };

  const handleSendEditedMessage = () => {
    if (editingTemplate) {
      openWhatsApp(editingTemplate.message);
      setEditDialogOpen(false);
      setEditingTemplate(null);
    }
  };

  const handleCustomMessage = () => {
    setCustomMessage(`Hola ${buyerName},\n\n`);
    setCustomDialogOpen(true);
  };

  const handleSendCustomMessage = () => {
    if (customMessage.trim()) {
      openWhatsApp(customMessage);
      setCustomDialogOpen(false);
      setCustomMessage('');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="w-full text-success border-success hover:bg-success hover:text-success-foreground"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            WhatsApp
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {Object.entries(MESSAGE_TEMPLATES).map(([key, { label, icon: Icon }]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => handleTemplateClick(key as keyof typeof MESSAGE_TEMPLATES)}
              className="cursor-pointer"
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCustomMessage} className="cursor-pointer">
            <Edit className="w-4 h-4 mr-2" />
            Mensaje personalizado
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Template Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar mensaje antes de enviar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Mensaje</Label>
              <Textarea
                value={editingTemplate?.message || ''}
                onChange={(e) =>
                  setEditingTemplate((prev) =>
                    prev ? { ...prev, message: e.target.value } : null
                  )
                }
                rows={8}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSendEditedMessage}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Enviar por WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Message Dialog */}
      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mensaje personalizado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Escribe tu mensaje</Label>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={8}
                placeholder="Escribe tu mensaje aquí..."
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSendCustomMessage}
              className="bg-success hover:bg-success/90 text-success-foreground"
              disabled={!customMessage.trim()}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Enviar por WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
