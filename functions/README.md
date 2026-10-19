# YouTube recommendations

`/api/recommended-videos` is a Cloudflare Pages Function. It keeps the YouTube
Data API key on the server, resolves the three configured channel handles to
their uploads playlists, and returns up to four recent public uploads per
channel. Shorts are included because they appear in each channel's uploads
playlist.

## Production setup

1. In Google Cloud Console, rotate the existing YouTube Data API key, then
   confirm YouTube Data API v3 is enabled for the replacement key.
2. In Cloudflare, open **Workers & Pages**, select the Pages project, then open
   **Settings → Variables and Secrets**.
3. Add `YOUTUBE_API_KEY` as an encrypted secret in the **Production** environment
   and enter the replacement key. Add the same secret to **Preview** only if
   preview deployments should show live recommendations.
4. Deploy the latest site revision with the repository's `functions/` directory.
   The `functions/api/recommended-videos.js` file provides
   `/api/recommended-videos`.
5. Visit `https://<your-site-domain>/api/recommended-videos`. A successful
   response contains three channel objects with up to four recent uploads each.

Keep the key in Cloudflare's secret settings. Do not put it in browser
JavaScript, commit it, or paste it into chat. `config.env` is ignored by Git;
the Pages Function does not read that local file.

## Local testing

For Cloudflare Pages local development, create an ignored `.dev.vars` file in
the repository root containing:

```text
YOUTUBE_API_KEY=your-replacement-key
```

Then run `npx wrangler pages dev .` from the repository root. Never commit
`.dev.vars`.
