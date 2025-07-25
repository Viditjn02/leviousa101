import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state } = req.query;

  if (typeof code !== 'string' || typeof state !== 'string') {
    res.status(400).send('Missing required OAuth parameters (code or state).');
    return;
  }

  const deepLinkParams = new URLSearchParams({
    code,
    state,
  });

  const electronCallbackUrl = `leviousa://oauth/callback?${deepLinkParams.toString()}`;

  console.log(`[API Callback] Redirecting to: ${electronCallbackUrl}`);

  res.redirect(302, electronCallbackUrl);
} 