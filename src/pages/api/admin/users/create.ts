import type { APIRoute } from 'astro';
import {
  CreateAuthorAccountError,
  createAuthorAccount,
  parseCreateAuthorAccountInput,
} from '../../../../lib/admin/users';
import { requireAdminContext } from '../../../../lib/auth/guards';
import { buildAuthorWelcomeEmail, isInviteEmailConfigured, sendInviteEmail } from '../../../../lib/email/relay';

const createAuthorPath = '/author/admin/users/new';

export const POST: APIRoute = async (context) => {
  const guard = await requireAdminContext(context);

  if (!guard) {
    return context.redirect(`${createAuthorPath}?admin_error=forbidden`, 302);
  }

  const formData = await context.request.formData();
  const parsed = parseCreateAuthorAccountInput({
    email: formData.get('email')?.toString().trim(),
    displayName: formData.get('displayName')?.toString().trim(),
    slug: formData.get('slug')?.toString().trim() ?? '',
    locale: formData.get('locale')?.toString().trim(),
    password: formData.get('password')?.toString() ?? '',
  });

  if (!parsed.success) {
    return context.redirect(`${createAuthorPath}?admin_error=invalid_payload`, 302);
  }

  try {
    const created = await createAuthorAccount(parsed.data);
    const emailMessage = buildAuthorWelcomeEmail({
      email: created.email,
      displayName: created.displayName,
      temporaryPassword: parsed.data.password,
    });

    // Send automatically when Resend is configured; otherwise fall back to the
    // manual draft. A send failure also falls back rather than losing the invite.
    let emailed = false;
    if (isInviteEmailConfigured()) {
      try {
        await sendInviteEmail(emailMessage);
        emailed = true;
      } catch (deliveryError) {
        console.error('Invite email delivery failed; showing manual draft.', deliveryError);
      }
    }

    if (!emailed) {
      context.cookies.set('admin-invite-preview', JSON.stringify({
        toEmail: created.email,
        subject: emailMessage.subject,
        text: emailMessage.text,
      }), {
        httpOnly: true,
        path: createAuthorPath,
        sameSite: 'lax',
        secure: import.meta.env.PROD,
        maxAge: 60 * 10,
      });
    }

    const search = new URLSearchParams({
      admin_status: 'user_created',
      created: created.email,
      slug: created.slug,
    });
    if (emailed) {
      search.set('emailed', '1');
    }

    return context.redirect(`${createAuthorPath}?${search.toString()}`, 302);
  } catch (error) {
    if (error instanceof CreateAuthorAccountError && error.code === 'email_taken') {
      return context.redirect(`${createAuthorPath}?admin_error=email_taken`, 302);
    }

    return context.redirect(`${createAuthorPath}?admin_error=create_failed`, 302);
  }
};
