import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ydlghpiwczvweurhkfbp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbGdocGl3Y3p2d2V1cmhrZmJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NjgwNjAsImV4cCI6MjA4NDU0NDA2MH0.ZY8FTQTulLSZMQLnmVd1TQi9Vg_nFmEK4SpCkFRMC_0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
