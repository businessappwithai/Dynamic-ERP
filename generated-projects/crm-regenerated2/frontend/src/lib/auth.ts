/**
 * Auth client helpers for use in login/signup forms.
 * Wraps the BetterAuth session API with a { data, error } interface.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function signIn(
  email: string,
  password: string
): Promise<{ data: { user: any } | null; error: string | null }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { data: null, error: err.message || 'Invalid email or password' };
    }

    const data = await res.json();
    return { data: { user: data.user ?? data }, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'Network error' };
  }
}

export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<{ data: { user: any } | null; error: string | null }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { data: null, error: err.message || 'Registration failed' };
    }

    const data = await res.json();
    return { data: { user: data.user ?? data }, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'Network error' };
  }
}

export async function signOut(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/sign-out`, {
    method: 'POST',
    credentials: 'include',
  });
}
