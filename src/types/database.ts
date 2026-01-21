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
  order_id: string;
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

// Grouped order type for admin panel
export interface GroupedOrder {
  order_id: string;
  raffle_id: string;
  numbers: number[];
  buyer_name: string;
  buyer_cedula: string;
  buyer_phone: string;
  reference_number: string;
  payment_proof_url: string | null;
  payment_status: 'pending' | 'paid' | 'rejected' | 'reserved';
  total_amount: number;
  created_at: string;
  ticket_ids: string[];
}

export interface SiteSettings {
  id: string;
  cover_image: string;
  admin_whatsapp: string;
  app_name: string;
  terms_conditions: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  image_url: string | null;
  details: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}
