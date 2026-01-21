import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseNewTicketNotificationOptions {
  raffleId: string | null;
  onNewTicket: () => void;
}

export const useNewTicketNotification = ({ raffleId, onNewTicket }: UseNewTicketNotificationOptions) => {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const processedOrdersRef = useRef<Set<string>>(new Set());
  const pendingOrderRef = useRef<{ orderId: string; buyerName: string; numbers: number[]; timeout: NodeJS.Timeout } | null>(null);

  // Create a simple beep sound using Web Audio API
  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, []);

  const showOrderNotification = useCallback((buyerName: string, numbers: number[]) => {
    playNotificationSound();
    
    const sortedNumbers = numbers.sort((a, b) => a - b);
    const numbersText = sortedNumbers.length === 1 
      ? `Número: ${sortedNumbers[0]}`
      : `Números: ${sortedNumbers.join(', ')}`;
    
    toast.info(`🎟️ Nuevo pedido de ${buyerName}`, {
      description: numbersText,
      duration: 5000,
    });
    
    onNewTicket();
  }, [playNotificationSound, onNewTicket]);

  useEffect(() => {
    if (!raffleId) return;

    // Subscribe to the tickets table for INSERT events
    const channel = supabase
      .channel(`tickets-realtime-${raffleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tickets',
          filter: `raffle_id=eq.${raffleId}`,
        },
        (payload) => {
          console.log('New ticket received:', payload);
          
          const newTicket = payload.new as any;
          const orderId = newTicket.order_id;
          
          // Skip if we've already fully processed this order
          if (processedOrdersRef.current.has(orderId)) {
            return;
          }
          
          // If there's a pending order with the same ID, add the number to it
          if (pendingOrderRef.current && pendingOrderRef.current.orderId === orderId) {
            pendingOrderRef.current.numbers.push(newTicket.number);
          } else {
            // Clear any existing pending order (different order_id)
            if (pendingOrderRef.current) {
              clearTimeout(pendingOrderRef.current.timeout);
              processedOrdersRef.current.add(pendingOrderRef.current.orderId);
              showOrderNotification(pendingOrderRef.current.buyerName, pendingOrderRef.current.numbers);
            }
            
            // Create new pending order
            const timeout = setTimeout(() => {
              if (pendingOrderRef.current && pendingOrderRef.current.orderId === orderId) {
                processedOrdersRef.current.add(orderId);
                showOrderNotification(pendingOrderRef.current.buyerName, pendingOrderRef.current.numbers);
                pendingOrderRef.current = null;
              }
            }, 500); // Wait 500ms to collect all numbers from the same order
            
            pendingOrderRef.current = {
              orderId,
              buyerName: newTicket.buyer_name,
              numbers: [newTicket.number],
              timeout,
            };
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (pendingOrderRef.current) {
        clearTimeout(pendingOrderRef.current.timeout);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [raffleId, showOrderNotification]);

  return {
    playNotificationSound,
  };
};
