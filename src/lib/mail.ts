import "server-only";

/**
 * A small provider interface for outbound mail. Swap providers by adding one
 * implementation; the contact action only knows about `sendMail`.
 *
 * Environment
 *   RESEND_API_KEY      enables the Resend provider (https://resend.com)
 *   CONTACT_TO_EMAIL    where enquiries go (default scytehq@gmail.com)
 *   CONTACT_FROM_EMAIL  a sender on a domain verified with the provider
 *                       (default "Scyte <onboarding@resend.dev>", Resend's test sender)
 * Without RESEND_API_KEY, enquiries are logged on the server instead (development).
 */

export type Mail = {
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  text: string;
};

export type MailProvider = {
  name: string;
  send: (mail: Mail) => Promise<void>;
};

const resend = (apiKey: string): MailProvider => ({
  name: "resend",
  send: async (mail) => {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: mail.from,
        to: [mail.to],
        reply_to: mail.replyTo,
        subject: mail.subject,
        text: mail.text,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Resend responded ${res.status}`);
  },
});

const consoleProvider: MailProvider = {
  name: "console",
  send: async (mail) => {
    console.info("[contact] RESEND_API_KEY not set; enquiry logged instead of sent:\n", mail.subject, "\n", mail.text);
  },
};

export const mailProvider = (): MailProvider => {
  const key = process.env.RESEND_API_KEY;
  if (key) return resend(key);
  if (process.env.NODE_ENV === "production") {
    console.warn("[contact] RESEND_API_KEY is not set in production; enquiries are only logged.");
  }
  return consoleProvider;
};

export const sendMail = (mail: Omit<Mail, "to" | "from"> & Partial<Pick<Mail, "to" | "from">>) =>
  mailProvider().send({
    to: mail.to ?? process.env.CONTACT_TO_EMAIL ?? "scytehq@gmail.com",
    from: mail.from ?? process.env.CONTACT_FROM_EMAIL ?? "Scyte <onboarding@resend.dev>",
    ...mail,
  });
