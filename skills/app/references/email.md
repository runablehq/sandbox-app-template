# Email

Send transactional emails from the server. Use any email provider — examples below use Resend, but the pattern applies to any HTTP-based email API.

<preflight>
Before wiring, state your assumptions about what emails need to be sent (welcome, notifications, password resets), who the recipients are, and whether HTML templates are needed. The user will correct what's wrong.
</preflight>

## 1. Install

```bash
cd packages/web && bun add resend
```

## 2. Add Environment Variable

Add to `.env.template` and `.env`:

```
RESEND_API_KEY=
```

## 3. Email Service

Create `packages/web/src/services/email.ts`:

```ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, text, html, replyTo }: SendEmailOptions) {
  const { data, error } = await resend.emails.send({
    from: "App <noreply@yourdomain.com>",
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
    html,
    replyTo,
  });

  if (error) throw new Error(`Email failed: ${error.message}`);
  return data;
}
```

## 4. Use in API Routes

```ts
import { sendEmail } from "./services/email";

const app = new Hono()
  .post("/contact", async (c) => {
    const { name, email, message } = await c.req.json();

    await sendEmail({
      to: "hello@yourdomain.com",
      subject: `Contact form: ${name}`,
      text: message,
      replyTo: email,
    });

    return c.json({ success: true }, 200);
  });
```

## 5. HTML Emails

For styled emails, return HTML strings:

```ts
await sendEmail({
  to: user.email,
  subject: "Welcome!",
  html: `
    <h1>Welcome, ${user.name}!</h1>
    <p>Thanks for signing up. Get started by creating your first project.</p>
    <a href="https://yourapp.com/dashboard">Go to Dashboard</a>
  `,
});
```

For complex templates, consider a utility that builds the HTML from components or template strings.

## Notes

- Keep email sending server-side only — never expose API keys to clients.
- Either `text` or `html` is required.
- Swap Resend for any provider (SendGrid, Postmark, AWS SES) — the pattern is the same: an HTTP call from an API route.
