import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteRaffleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  raffleName: string;
}

export const DeleteRaffleDialog = ({
  isOpen,
  onClose,
  onConfirm,
  raffleName,
}: DeleteRaffleDialogProps) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = confirmText.toLowerCase() === 'borrar';

  const handleConfirm = async () => {
    if (!canDelete) return;
    
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
      setConfirmText('');
      onClose();
    }
  };

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 text-destructive mb-2">
            <div className="p-2 bg-destructive/10 rounded-full">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <AlertDialogTitle className="text-destructive">
              ¿Eliminar esta rifa?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Estás a punto de eliminar la rifa <strong>"{raffleName}"</strong>.
              </p>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
                <p className="font-semibold text-destructive mb-1">⚠️ Esta acción es irreversible</p>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>• Se eliminarán todos los tickets vendidos</li>
                  <li>• Se perderá el historial de pagos</li>
                  <li>• Los clientes perderán sus números</li>
                </ul>
              </div>
              <div className="space-y-2 pt-2">
                <Label htmlFor="confirm-delete" className="text-sm">
                  Escribe <span className="font-bold text-destructive">borrar</span> para confirmar:
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Escribe 'borrar'"
                  className={confirmText && !canDelete ? 'border-destructive' : ''}
                  autoComplete="off"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canDelete || isDeleting}
          >
            {isDeleting ? (
              'Eliminando...'
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar Rifa
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
