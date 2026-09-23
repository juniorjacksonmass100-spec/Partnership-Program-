/**
 * Safe JSON fetch utility for Jerusalem Ministry Portal.
 * Prevents any "Unexpected token < in JSON" or unhandled parsing exceptions
 * when responses are HTML error pages, 502/503 proxy responses, or malformed.
 */
export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; data: T; error?: string }> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options?.headers || {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';
    let data: any = null;

    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch (parseErr: any) {
        return {
          ok: false,
          status: res.status,
          data: null as any,
          error: 'Seva imerudisha majibu yasiyoeleweka (JSON parse error).',
        };
      }
    } else {
      const text = await res.text().catch(() => '');
      try {
        data = JSON.parse(text);
      } catch {
        // Response was HTML or plain text error
        const cleanText = text.replace(/<[^>]*>?/gm, '').trim().slice(0, 150);
        return {
          ok: false,
          status: res.status,
          data: null as any,
          error: cleanText || `Hitilafu ya seva (${res.status}). Tafadhali jaribu tena.`,
        };
      }
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data,
        error: data?.error || data?.message || `Hitilafu ya seva (${res.status})`,
      };
    }

    return {
      ok: true,
      status: res.status,
      data,
    };
  } catch (netErr: any) {
    return {
      ok: false,
      status: 0,
      data: null as any,
      error: netErr.message || 'Mawasiliano na seva yamekatika. Tafadhali hakikisha mtandao wako uko sawa.',
    };
  }
}
