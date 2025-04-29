// supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage'

// Replace with your own Supabase project URL and anon key
const SUPABASE_URL = 'https://elsqusmvaeyrcjqbqqfz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsc3F1c212YWV5cmNqcWJxcWZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk1MTczNTEsImV4cCI6MjA0NTA5MzM1MX0.H3HV2HHIarOjmfe5Bmg0h9GQ07DG3EHkr_jh0XsK6EQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})