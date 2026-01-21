import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PaymentMethod } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditCard } from 'lucide-react';

interface PaymentMethodsDisplayProps {
  compact?: boolean;
}

export const PaymentMethodsDisplay = ({ compact = false }: PaymentMethodsDisplayProps) => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setMethods(data as PaymentMethod[] || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || methods.length === 0) return null;

  if (compact) {
    return (
      <>
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <CreditCard className="w-4 h-4" />
            Métodos de Pago
          </p>
          <div className="flex flex-wrap gap-2">
            {methods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method)}
                className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors border border-transparent hover:border-primary/30"
              >
                {method.image_url ? (
                  <img 
                    src={method.image_url} 
                    alt={method.name} 
                    className="w-6 h-6 object-contain"
                  />
                ) : (
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">{method.name}</span>
              </button>
            ))}
          </div>
        </div>

        <Dialog open={!!selectedMethod} onOpenChange={() => setSelectedMethod(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedMethod?.image_url && (
                  <img 
                    src={selectedMethod.image_url} 
                    alt={selectedMethod.name} 
                    className="w-8 h-8 object-contain"
                  />
                )}
                {selectedMethod?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="bg-muted p-4 rounded-lg">
              <p className="whitespace-pre-wrap text-sm">{selectedMethod?.details}</p>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <section className="container py-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">Métodos de Pago</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {methods.map((method) => (
            <Card 
              key={method.id}
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
              onClick={() => setSelectedMethod(method)}
            >
              <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                {method.image_url ? (
                  <img 
                    src={method.image_url} 
                    alt={method.name} 
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <span className="text-sm font-medium">{method.name}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Dialog open={!!selectedMethod} onOpenChange={() => setSelectedMethod(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedMethod?.image_url && (
                <img 
                  src={selectedMethod.image_url} 
                  alt={selectedMethod.name} 
                  className="w-8 h-8 object-contain"
                />
              )}
              {selectedMethod?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-lg">
            <p className="whitespace-pre-wrap text-sm">{selectedMethod?.details}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
