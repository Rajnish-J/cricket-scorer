export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = (await response.json()) as T;
  if (!response.ok) {
    const apiError = (result as { error?: unknown }).error;
    if (typeof apiError === "string") {
      throw new Error(apiError);
    }
    if (apiError && typeof apiError === "object") {
      throw new Error(JSON.stringify(apiError));
    }
    throw new Error("Request failed");
  }

  return result;
}

