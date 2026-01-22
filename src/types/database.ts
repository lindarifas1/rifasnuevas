export interface Raffle {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  price: number;
  raffle_date: string;
  number_count: number; // 100 or 1000
  max_numbers_per_client: number | null; // Limit per cedula, null = unlimited
  status: 'active' | 'finished';
  created_at: string;
  cop_rate: number; // Exchange rate to Colombian Pesos
  bs_rate: number; // Exchange rate to Venezuelan Bolívares
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
  total_amount: number; // Expected total based on raffle price
  amount_paid: number; // Actual amount paid
  debt: number; // Remaining debt
  created_at: string;
  ticket_ids: string[];
}

// Client type for clients section
export interface Client {
  cedula: string;
  name: string;
  phone: string;
  total_tickets: number;
  total_paid: number;
  total_debt: number;
  total_raffles: number;
  last_purchase: string;
  tickets: Ticket[];
}

export interface SiteSettings {
  id: string;
  cover_image: string;
  admin_whatsapp: string;
  app_name: string;
  terms_conditions: string;
  updated_at: string;
}

// Payment field for structured payment data
export interface PaymentField {
  label: string;
  value: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  image_url: string | null;
  details: string;
  payment_fields: PaymentField[] | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}
