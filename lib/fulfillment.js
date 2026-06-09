// ============================================================
// Order fulfillment — runs after a successful Stripe Checkout.
//
// Shared by the local dev server and the Netlify webhook function so there's
// one place to grant course access. It emails the buyer a welcome message with
// their access link via Resend (https://resend.com). Set these env vars to
// turn it on:
//   RESEND_API_KEY    - your Resend API key (re_...)
//   FROM_EMAIL        - verified sender, e.g. "APEX <coach@yourdomain.com>"
//   COURSE_ACCESS_URL - where buyers go to start the course
// If RESEND_API_KEY is missing the order is logged and email is skipped, so
// nothing breaks before you've configured it.
// ============================================================

const PACKAGE_NAMES = {
  rookie: "Rookie",
  varsity: "Varsity",
  elite: "Elite",
  full_course: "The Full Course",
};

/**
 * @param {object} session - a Stripe `checkout.session.completed` object.
 */
export async function fulfillOrder(session) {
  const email = session.customer_details?.email || session.customer_email;
  const pkgKey = session.metadata?.package || "unknown";
  const pkgName = PACKAGE_NAMES[pkgKey] || "your training package";
  const mode = session.mode; // "subscription" (tiers) or "payment" (one-time)
  const amount = (session.amount_total ?? 0) / 100;
  const currency = (session.currency || "usd").toUpperCase();

  console.log(
    `✅ Order complete — package=${pkgKey} mode=${mode} amount=${amount} ${currency} email=${email}`,
  );

  if (!email) {
    console.warn("No email on session; skipping welcome email.");
    return { delivered: false, reason: "no-email" };
  }

  await sendWelcomeEmail({ to: email, pkgName });

  // TODO (optional): also create/activate the buyer's account in your course
  // platform or invite them to your private community here. Keep it idempotent
  // — Stripe may deliver the same event more than once (guard on session.id).

  return { email, package: pkgKey, mode };
}

/** Send the welcome / access email via Resend. No-op if not configured. */
async function sendWelcomeEmail({ to, pkgName }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL || "APEX Performance <onboarding@resend.dev>";
  const accessUrl = process.env.COURSE_ACCESS_URL || "https://your-site.netlify.app";

  if (!apiKey) {
    console.log("RESEND_API_KEY not set — skipping welcome email (logged only).");
    return { sent: false, reason: "not-configured" };
  }

  const subject = "You're in — your APEX training course is unlocked 🏆";
  const html = welcomeHtml({ pkgName, accessUrl });
  const text =
    `Welcome to APEX Performance!\n\n` +
    `Your ${pkgName} package is active and the full training course is unlocked.\n\n` +
    `Start training: ${accessUrl}\n\n` +
    `Questions? Just reply to this email.`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend error ${res.status}: ${detail}`);
  }
  console.log(`📧 Welcome email sent to ${to}`);
  return { sent: true };
}

function welcomeHtml({ pkgName, accessUrl }) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#0a0a0b;font-family:Inter,Arial,sans-serif;color:#b6b4ad;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#111114;border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;">
          <tr><td style="padding:36px 36px 8px;">
            <div style="font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#f4f3ef;">APEX Performance</div>
            <h1 style="color:#f4f3ef;font-size:26px;line-height:1.2;margin:18px 0 0;">You're in. Let's get to work.</h1>
            <p style="font-size:16px;line-height:1.6;margin:16px 0 0;">
              Your <strong style="color:#caff4d;">${pkgName}</strong> package is active and the
              <strong style="color:#f4f3ef;">full training course</strong> is unlocked — every session,
              the 12-month program, nutrition, and recovery.
            </p>
            <p style="margin:28px 0;">
              <a href="${accessUrl}" style="display:inline-block;background:#caff4d;color:#0a0a0b;font-weight:700;text-decoration:none;padding:14px 26px;border-radius:999px;">
                Start training →
              </a>
            </p>
            <p style="font-size:14px;line-height:1.6;color:#6f6d67;margin:0 0 36px;">
              Train hard, recover smart, and track your progress. Questions? Just reply to this email.
            </p>
          </td></tr>
        </table>
        <p style="font-size:12px;color:#6f6d67;margin:18px 0 0;">© APEX Performance Training</p>
      </td></tr>
    </table>
  </body>
</html>`;
}
