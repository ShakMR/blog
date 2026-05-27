import type { APIRoute } from 'astro';
import {
  CreateAuthorAccountError,
  createAuthorAccount,
  parseCreateAuthorAccountInput,
} from '../../../../lib/admin/users';
import { requireAdminContext } from '../../../../lib/auth/guards';
import { buildAuthorWelcomeEmail } from '../../../../lib/email/relay';

export const POST: APIRoute = async (context) => {
  const guard = await requireAdminContext(context);

  if (!guard) {
    return context.redirect('/author?admin_error=forbidden', 302);
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
    return context.redirect('/author?admin_error=invalid_payload', 302);
  }

  try {
    const created = await createAuthorAccount(parsed.data);
    const emailPreview = buildAuthorWelcomeEmail({
      email: created.email,
      displayName: created.displayName,
      temporaryPassword: parsed.data.password,
    });

    context.cookies.set('admin-invite-preview', JSON.stringify({
      toEmail: created.email,
      subject: emailPreview.subject,
      text: emailPreview.text,
    }), {
      httpOnly: true,
      path: '/author',
      sameSite: 'lax',
      secure: import.meta.env.PROD,
      maxAge: 60 * 10,
    });

    const search = new URLSearchParams({
      admin_status: 'user_created',
      created: created.email,
      slug: created.slug,
    });

    return context.redirect(`/author?${search.toString()}`, 302);
  } catch (error) {
    if (error instanceof CreateAuthorAccountError && error.code === 'email_taken') {
      return context.redirect('/author?admin_error=email_taken', 302);
    }

    return context.redirect('/author?admin_error=create_failed', 302);
  }
};
