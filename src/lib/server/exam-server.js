// =====================================================================
// Server-only helpers.  NEVER import this into a client component — it holds
// the service-role client, which bypasses RLS.
// =====================================================================
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Service-role client: bypasses RLS. Only ever used inside server routes.
// Initialized lazily so the module can be imported (e.g. during `next build`)
// before env vars are populated; env is only required at first request.
let _admin = null;
function getAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
  }
  return _admin;
}

export const admin = new Proxy({}, {
  get(_target, prop) {
    const value = Reflect.get(getAdmin(), prop);
    return typeof value === 'function' ? value.bind(getAdmin()) : value;
  },
});

// Resolve the authenticated user from the Supabase auth cookies.
// Returns a user id string or null.
export async function getUserId() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // Route handlers only need to READ the session; token refresh /
        // cookie writes belong in middleware, so this is a no-op here.
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// THE MOAT lives in its own pure module (unit-testable without Next.js).
export { sanitizeQuestion } from './sanitize';

// Passage-group-aware selection lives in its own pure module (unit-testable
// without Next.js); re-exported here so routes import everything from one place.
export { selectWithPassageGroups } from './select-questions';

export function unauthorized() {
  return Response.json({ error: 'unauthenticated' }, { status: 401 });
}
