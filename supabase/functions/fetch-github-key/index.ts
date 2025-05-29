// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
// @ts-ignore: Deno global is available in Supabase Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Environment variables for service role key and project URL
// @ts-ignore: Deno global is available in Supabase Edge Functions
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-ignore: Deno global is available in Supabase Edge Functions
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchFirstRsaKey(username: string): Promise<string | null> {
  try {
    const resp = await fetch(`https://github.com/${username}.keys`);
    if (!resp.ok) return null;
    const keys = (await resp.text()).split("\n");
    for (const key of keys) {
      if (key.startsWith("ssh-rsa ")) {
        return key;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

console.log("Hello from Functions!")

// @ts-ignore: Deno global is available in Supabase Edge Functions
Deno.serve(async (_req) => {
  // 1. Get all group members
  const { data: members, error } = await supabase
    .from("group_members")
    .select("id, github_username");
  if (error) {
    console.error("Error fetching group members:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch group members" }), { status: 500 });
  }

  const results: any[] = [];
  for (const member of members) {
    const key = await fetchFirstRsaKey(member.github_username);
    if (key) {
      const { error: updateError } = await supabase
        .from("group_members")
        .update({ public_key: key, last_key_fetch: new Date().toISOString() })
        .eq("id", member.id);
      if (updateError) {
        results.push({ username: member.github_username, status: "db update error" });
      } else {
        results.push({ username: member.github_username, status: "updated" });
      }
    } else {
      results.push({ username: member.github_username, status: "no rsa key found" });
    }
  }

  return new Response(JSON.stringify({ results }), { headers: { "Content-Type": "application/json" } });
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/fetch-github-key' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
