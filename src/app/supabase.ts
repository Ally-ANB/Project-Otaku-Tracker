import { createClient as createBrowserSupabase } from "@/utils/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function getBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error(
      "O cliente `supabase` do app só roda no browser. Em Server Components use createClient de @/utils/supabase/server."
    );
  }
  if (!browserClient) {
    browserClient = createBrowserSupabase();
  }
  return browserClient;
}

/**
 * Cliente Supabase alinhado aos cookies da sessão (@supabase/ssr).
 * Acesso lazy para não executar createBrowserClient durante SSR/prerender.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getBrowserClient();
    const value = Reflect.get(client, prop, receiver) as unknown;
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
