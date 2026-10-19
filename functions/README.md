# YouTube recommendations

`/api/recommended-videos` is a Cloudflare Pages Function. It keeps the YouTube
Data API key on the server, resolves the three configured channel handles to
their uploads playlists, and returns up to four recent public uploads per
channel. Shorts are included because they appear in each channel's uploads
playlist.

Configure a Cloudflare Pages secret named `YOUTUBE_API_KEY` with the value of
`YouTube_API` from the ignored `config.env` file. Do not put the API key in
browser JavaScript or commit it. Cloudflare Pages must deploy the repository
with its `functions/` directory enabled for the endpoint to be available.
