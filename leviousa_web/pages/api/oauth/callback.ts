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

  // Send HTML that tries multiple ways to invoke the custom protocol and then closes
  res.status(200).setHeader('Content-Type', 'text/html').send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Leviousa OAuth Redirect</title>
    </head>
    <body>
      <p>Authorization complete. Redirecting to Leviousa app...</p>
      <p>If nothing happens, <a id="openLink" href="${electronCallbackUrl}">click here</a>.</p>
      <script>
        (function() {
          const target = "${electronCallbackUrl}";
          // 1) Try via invisible iframe
          const i = document.createElement('iframe');
          i.style.display = 'none';
          i.src = target;
          document.body.appendChild(i);
          // 2) Fallback to window.open
          setTimeout(() => {
            window.open(target);
          }, 100);
          // 3) Fallback to direct location change
          setTimeout(() => {
            window.location.href = target;
          }, 200);
          // Close this window after attempts
          setTimeout(() => window.close(), 1500);
        })();
      </script>
    </body>
    </html>
  `);
} 