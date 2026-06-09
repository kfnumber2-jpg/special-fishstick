// ============================================================
// Order fulfillment — runs after a successful Stripe Checkout.
//
// Shared by the local dev server and the Netlify webhook function so there's
// one place to grant course access. Right now it logs the order and pulls out
// the fields you need; fill in the TODO with your real delivery (email the
// login, add the buyer to your course platform / community, etc.).
// ============================================================

/**
 * @param {object} session - a Stripe `checkout.session.completed` object.
 */
export async function fulfillOrder(session) {
  const email = session.customer_details?.email || session.customer_email;
  const pkg = session.metadata?.package || "unknown";
  const mode = session.mode; // "subscription" (tiers) or "payment" (one-time)
  const amount = (session.amount_total ?? 0) / 100;
  const currency = (session.currency || "usd").toUpperCase();

  console.log(
    `✅ Order complete — package=${pkg} mode=${mode} amount=${amount} ${currency} email=${email}`,
  );

  // TODO: deliver access. Common options:
  //   1. Email the buyer their login / course link (Resend, SendGrid, Postmark…).
  //   2. Create/activate their account in your course platform (Kajabi,
  //      Teachable, a membership DB, etc.).
  //   3. Invite them to your private athlete community (Discord, Circle…).
  //
  // Example (pseudo-code):
  //   await sendWelcomeEmail({ to: email, package: pkg });
  //   await grantCourseAccess({ email, package: pkg });
  //
  // Keep this function idempotent — Stripe may deliver the same event more
  // than once, so guard against double-granting (e.g. check session.id).

  return { email, package: pkg, mode };
}
