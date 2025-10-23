import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ptckztatwhvpjjtxlvyc.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0Y2t6dGF0d2h2cGpqdHhsdnljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNDg1NjUsImV4cCI6MjA3NjcyNDU2NX0.bVCPhs6a5EJkidr_OKoFID4tHCQtqR0bgDW6ht9SLbY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);