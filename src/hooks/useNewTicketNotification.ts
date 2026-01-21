import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseNewTicketNotificationOptions {
  raffleId: string | null;
  onNewTicket: () => void;
}

export const useNewTicketNotification = ({ raffleId, onNewTicket }: UseNewTicketNotificationOptions) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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
          
          // Play notification sound
          playNotificationSound();
          
          // Show toast notification
          const newTicket = payload.new as any;
          toast.info(`🎟️ Nuevo pedido de ${newTicket.buyer_name}`, {
            description: `Número: ${newTicket.number}`,
            duration: 5000,
          });
          
          // Trigger refresh
          onNewTicket();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [raffleId, onNewTicket, playNotificationSound]);

  return {
    playNotificationSound,
  };
};
