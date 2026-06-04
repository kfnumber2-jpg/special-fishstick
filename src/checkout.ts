/**
 * Starts a Stripe Checkout flow for a given package and redirects the browser
 * to Stripe's hosted checkout page. The actual session is created server-side
 * (see server/index.js) so the secret key never reaches the client.
 */
export async function startCheckout(
  priceKey: string,
  email?: string,
): Promise<void> {
  try {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceKey, email }),
    });
    const data = (await res.json()) as { url?: string; error?: string };

    if (!res.ok || !data.url) {
      alert(
        data.error ??
          "Sorry — we couldn't start checkout. Please try again in a moment.",
      );
      return;
    }
    window.location.href = data.url;
  } catch {
    alert(
      "Network error while starting checkout. Check your connection and try again.",
    );
  }
}
