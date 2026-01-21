import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield } from 'lucide-react';

interface TermsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  termsContent: string;
}

export const TermsModal = ({ open, onOpenChange, onAccept, termsContent }: TermsModalProps) => {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    if (accepted) {
      onAccept();
      setAccepted(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setAccepted(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Términos y Condiciones
          </DialogTitle>
          <DialogDescription>
            Por favor lee y acepta los términos para continuar
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[300px] pr-4">
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Manejo de Datos y Privacidad</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {termsContent}
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center space-x-2 pt-4 border-t">
          <Checkbox 
            id="terms" 
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked === true)}
          />
          <label
            htmlFor="terms"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            He leído y acepto los términos y condiciones
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAccept} disabled={!accepted}>
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
