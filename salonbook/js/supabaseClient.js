// ---- Supabase project connection ----
// The publishable/anon key is safe to expose in client-side code: it can
// only do what Row Level Security policies in the database allow.
const SUPABASE_URL = 'https://pmfqmbgodpwzddxofgmm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZnFtYmdvZHB3emRkeG9mZ21tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MTM2MzAsImV4cCI6MjEwNjA4OTYzMH0.Wfw_VePe4ETsgGwlBxD4ueJr9cnblA2rsmk9TXnNs_s';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Supabase Auth is email/password based. This app's UX is phone/password
// (no SMS provider configured), so we map each phone number to a stable
// internal pseudo-email. The real phone number is still stored on the
// profile row for display and for admin views.
function phoneToPseudoEmail(phone) {
  const digits = phone.replace(/[^\d]/g, '');
  return `phone_${digits}@salonbook.local`;
}
