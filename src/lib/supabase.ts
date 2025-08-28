import { createClient, SupabaseClient } from "@supabase/supabase-js";
import logger from "../utils/logger";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    logger.error("Variables d'environnement Supabase manquantes");
    throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis");
}

export const supabase: SupabaseClient = createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

logger.info("Client Supabase initialisé avec succès");
