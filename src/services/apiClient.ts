const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.error?.message) {
        message = payload.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function postJson<TResponse>(
  url: string,
  body: unknown,
  init?: RequestInit,
): Promise<TResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
    ...init,
  });
  return parseJson<TResponse>(response);
}
