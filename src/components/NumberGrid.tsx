import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Ticket } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shuffle, X, ZoomIn, ZoomOut, Eye } from 'lucide-react';

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
  const [zoomLevel, setZoomLevel] = useState<number>(50);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState<boolean>(false);

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

    onClearSelection();
    
    const availableNumbers: number[] = [];
    for (let i = 0; i < numberCount; i++) {
      if (!occupiedNumbers.has(i)) {
        availableNumbers.push(i);
      }
    }

    const actualCount = Math.min(count, availableNumbers.length);
    const shuffled = availableNumbers.sort(() => Math.random() - 0.5);
    
    setTimeout(() => {
      shuffled.slice(0, actualCount).forEach(num => onSelectNumber(num));
    }, 0);
  };

  // Calculate grid size based on zoom level (20-100)
  const getGridStyles = () => {
    // Base size ranges from 24px (zoom=0) to 56px (zoom=100)
    const minSize = 24;
    const maxSize = 56;
    const cellSize = minSize + ((maxSize - minSize) * zoomLevel) / 100;
    
    // Font size ranges from 8px to 16px
    const minFont = 8;
    const maxFont = 16;
    const fontSize = minFont + ((maxFont - minFont) * zoomLevel) / 100;

    return {
      gridTemplateColumns: `repeat(auto-fill, minmax(${cellSize}px, 1fr))`,
      '--cell-font-size': `${fontSize}px`,
    } as React.CSSProperties;
  };

  const statusColors = {
    available: 'bg-success/10 text-success hover:bg-success hover:text-success-foreground border-success/30',
    selected: 'bg-primary text-primary-foreground border-primary shadow-gold animate-pulse-gold',
    paid: 'bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-60',
    reserved: 'bg-warning/20 text-warning border-warning/50 cursor-not-allowed',
  };

  // Filter numbers based on showOnlyAvailable
  const numbersToShow = useMemo(() => {
    const allNumbers = Array.from({ length: numberCount }, (_, i) => i);
    if (showOnlyAvailable) {
      return allNumbers.filter(num => {
        const status = getNumberStatus(num);
        return status === 'available' || status === 'selected';
      });
    }
    return allNumbers;
  }, [numberCount, showOnlyAvailable, tickets, selectedNumbers]);

  const availableCount = numberCount - occupiedNumbers.size;

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

      {/* Zoom and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 p-3 bg-card rounded-lg border shadow-sm">
        {/* Zoom Control */}
        <div className="flex items-center gap-3 flex-1">
          <ZoomOut className="w-4 h-4 text-muted-foreground" />
          <Slider
            value={[zoomLevel]}
            onValueChange={(value) => setZoomLevel(value[0])}
            min={0}
            max={100}
            step={5}
            className="flex-1"
          />
          <ZoomIn className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* Show Only Available Filter */}
        <div className="flex items-center gap-2 sm:border-l sm:pl-3">
          <Switch
            id="show-available"
            checked={showOnlyAvailable}
            onCheckedChange={setShowOnlyAvailable}
          />
          <Label htmlFor="show-available" className="text-sm cursor-pointer flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            Solo disponibles
            <span className="text-xs text-muted-foreground">({availableCount})</span>
          </Label>
        </div>
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
        {!showOnlyAvailable && (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-warning/20 border border-warning/50" />
              <span>Reservado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-muted border border-muted opacity-60" />
              <span>Vendido</span>
            </div>
          </>
        )}
      </div>

      {/* Number Grid */}
      <div 
        className="grid gap-1.5 p-2"
        style={getGridStyles()}
      >
        {numbersToShow.map((i) => {
          const status = getNumberStatus(i);
          const isDisabled = status === 'paid' || status === 'reserved';

          return (
            <button
              key={i}
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelectNumber(i)}
              className={cn(
                "aspect-square flex items-center justify-center font-semibold rounded-md border-2 transition-all",
                statusColors[status]
              )}
              style={{ fontSize: 'var(--cell-font-size)' }}
            >
              {formatNumber(i)}
            </button>
          );
        })}
      </div>

      {showOnlyAvailable && numbersToShow.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No hay números disponibles
        </div>
      )}
    </div>
  );
};
