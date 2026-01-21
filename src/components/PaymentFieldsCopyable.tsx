import { useState } from 'react';
import { PaymentField } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentFieldsCopyableProps {
  fields: PaymentField[];
  compact?: boolean;
}

export const PaymentFieldsCopyable = ({ fields, compact = false }: PaymentFieldsCopyableProps) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (value: string, index: number) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedIndex(index);
      toast.success('Copiado al portapapeles');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      toast.error('Error al copiar');
    }
  };

  if (compact) {
    return (
      <div className="space-y-1.5">
        {fields.map((field, index) => (
          <div 
            key={index} 
            className="flex items-center justify-between gap-2 bg-muted/50 rounded px-2 py-1"
          >
            <div className="min-w-0 flex-1">
              <span className="text-xs text-muted-foreground">{field.label}: </span>
              <span className="text-sm font-medium">{field.value}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(field.value, index);
              }}
            >
            {copiedIndex === index ? (
                <Check className="h-3 w-3 text-success" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {fields.map((field, index) => (
        <div 
          key={index} 
          className="flex items-center justify-between gap-3 bg-muted rounded-lg px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{field.label}</p>
            <p className="text-sm font-semibold truncate">{field.value}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => handleCopy(field.value, index)}
          >
            {copiedIndex === index ? (
              <>
                <Check className="h-3.5 w-3.5 text-success" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copiar
              </>
            )}
          </Button>
        </div>
      ))}
    </div>
  );
};
