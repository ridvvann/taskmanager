import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configured = !!(url && key && !url.includes('your-project-ref') && !key.includes('your-anon-key'))
export const sb = configured ? createClient(url, key) : null
