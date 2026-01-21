export interface Raffle {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  price: number;
  raffle_date: string;
  number_count: number; // 100 or 1000
  status: 'active' | 'finished';
  created_at: string;
}

export interface Ticket {
  id: string;
  raffle_id: string;
  number: number;
  buyer_name: string;
  buyer_cedula: string;
  buyer_phone: string;
  reference_number: string;
  payment_proof_url: string | null;
  payment_status: 'pending' | 'paid' | 'rejected' | 'reserved';
  amount_paid: number;
  created_at: string;
}

export interface SiteSettings {
  id: string;
  cover_image: string;
  updated_at: string;
}
