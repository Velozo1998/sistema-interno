import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mjttwalhvseuxeoyivre.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdHR3YWxodnNldXhlb3lpdnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NjI4ODAsImV4cCI6MjA5MjQzODg4MH0.baDd0AScHBqF_5v36D7w-rQIDxj-37Z69qndGW_at3w'

export const supabase = createClient(supabaseUrl, supabaseKey)
