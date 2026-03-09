import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jbccrsbjcdtnwihloqsd.supabase.co";
const supabaseAnonKey = "sb_publishable_OlMNJJA8NSNitsQhDdKM_Q_Z7QZyu2c";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
