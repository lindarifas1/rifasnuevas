import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Ticket } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shuffle, X } from 'lucide-react';

interface NumberGridProps {
  numberCount: number;
  tickets: Ticket[];
  selectedNumbers: number[];
  onSelectNumber: (number: number) => void;
  onClearSelection: () => void;
}

export const NumberGrid = ({
  numberCount,
  tickets,
  selectedNumbers,
  onSelectNumber,
  onClearSelection,
}: NumberGridProps) => {
  const [randomCount, setRandomCount] = useState<string>('1');

  const occupiedNumbers = useMemo(() => {
    return new Set(
      tickets
        .filter(t => t.payment_status === 'paid' || t.payment_status === 'reserved' || t.payment_status === 'pending')
        .map(t => t.number)
    );
  }, [tickets]);

  const getNumberStatus = (num: number) => {
    if (selectedNumbers.includes(num)) return 'selected';
    const ticket = tickets.find(t => t.number === num);
    if (ticket) {
      if (ticket.payment_status === 'paid') return 'paid';
      if (ticket.payment_status === 'reserved' || ticket.payment_status === 'pending') return 'reserved';
    }
    return 'available';
  };

  const formatNumber = (num: number) => {
    if (numberCount <= 100) {
      return num.toString().padStart(2, '0');
    }
    return num.toString().padStart(3, '0');
  };

  const handleRandomSelection = () => {
    const count = parseInt(randomCount) || 0;
    if (count <= 0) return;

    // Clear previous selection first, then select new random numbers
    onClearSelection();
    
    const availableNumbers: number[] = [];
    for (let i = 0; i < numberCount; i++) {
      if (!occupiedNumbers.has(i)) {
        availableNumbers.push(i);
      }
    }

    const actualCount = Math.min(count, availableNumbers.length);
    const shuffled = availableNumbers.sort(() => Math.random() - 0.5);
    
    // Use setTimeout to ensure state is cleared before adding new numbers
    setTimeout(() => {
      shuffled.slice(0, actualCount).forEach(num => onSelectNumber(num));
    }, 0);
  };

  const statusColors = {
    available: 'bg-success/10 text-success hover:bg-success hover:text-success-foreground border-success/30',
    selected: 'bg-primary text-primary-foreground border-primary shadow-gold animate-pulse-gold',
    paid: 'bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-60',
    reserved: 'bg-warning/20 text-warning border-warning/50 cursor-not-allowed',
  };

  return (
    <div className="space-y-4">
      {/* Random Selection */}
      <div className="flex gap-2 items-center p-3 bg-card rounded-lg border shadow-sm">
        <Shuffle className="w-5 h-5 text-secondary" />
        <span className="text-sm font-medium">Selección al azar:</span>
        <Input
          type="number"
          min={1}
          max={numberCount - occupiedNumbers.size}
          value={randomCount}
          onChange={(e) => setRandomCount(e.target.value)}
          className="w-20 h-9"
          placeholder="1"
        />
        <Button size="sm" variant="secondary" onClick={handleRandomSelection}>
          Generar
        </Button>
      </div>

      {/* Selected Numbers Summary */}
      {selectedNumbers.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/30">
          <span className="text-sm font-medium">
            Seleccionados: <span className="text-primary font-bold">{selectedNumbers.length}</span>
          </span>
          <div className="flex-1 flex flex-wrap gap-1">
            {selectedNumbers.slice(0, 10).map(num => (
              <span key={num} className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full font-medium">
                {formatNumber(num)}
              </span>
            ))}
            {selectedNumbers.length > 10 && (
              <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
                +{selectedNumbers.length - 10} más
              </span>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={onClearSelection}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-success/10 border border-success/30" />
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-primary border border-primary" />
          <span>Seleccionado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-warning/20 border border-warning/50" />
          <span>Reservado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-muted border border-muted opacity-60" />
          <span>Vendido</span>
        </div>
      </div>

      {/* Number Grid */}
      <div 
        className={cn(
          "grid gap-1.5 p-2",
          numberCount <= 100 ? "grid-cols-10" : "grid-cols-10 sm:grid-cols-20"
        )}
      >
        {Array.from({ length: numberCount }, (_, i) => {
          const status = getNumberStatus(i);
          const isDisabled = status === 'paid' || status === 'reserved';

          return (
            <button
              key={i}
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelectNumber(i)}
              className={cn(
                "number-grid-item aspect-square flex items-center justify-center text-xs sm:text-sm font-semibold rounded-md border-2 transition-all",
                statusColors[status]
              )}
            >
              {formatNumber(i)}
            </button>
          );
        })}
      </div>
    </div>
  );
};
