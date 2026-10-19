const CHANNELS = [
  { handle: "secondary_genuine", label: "Secondary Gaming" },
  { handle: "secondary_genuine2", label: "Secondary Gaming 2" },
  { handle: "secondary_genuineirl", label: "Secondary Gaming IRL" },
];

const responseHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=300, s-maxage=900",
};

const jsonResponse = (body, status = 200, headers = responseHeaders) =>
  new Response(JSON.stringify(body), { status, headers });

const youtubeApiRequest = async (resource, params, apiKey) => {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
  Object.entries({ ...params, key: apiKey }).forEach(([name, value]) => {
    url.searchParams.set(name, value);
  });

  const response = await fetch(url);
  const result = await response.json();
  if (!response.ok) {
    const reason = result?.error?.errors?.[0]?.reason ?? "YouTube Data API request failed.";
    const error = new Error(reason);
    error.status = response.status;
    throw error;
  }
  return result;
};

const getChannelUploads = async (channel, apiKey) => {
  const channelResult = await youtubeApiRequest(
    "channels",
    { part: "contentDetails", forHandle: channel.handle },
    apiKey,
  );
  const channelId = channelResult.items?.[0]?.id;
  const uploadsPlaylistId = channelResult.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!channelId || !uploadsPlaylistId) {
    throw new Error(`Could not find the uploads playlist for @${channel.handle}.`);
  }

  const playlistResult = await youtubeApiRequest(
    "playlistItems",
    { part: "contentDetails", playlistId: uploadsPlaylistId, maxResults: "50" },
    apiKey,
  );
  return {
    ...channel,
    videoIds: (playlistResult.items ?? [])
      .map((item) => item.contentDetails?.videoId)
      .filter((videoId) => typeof videoId === "string"),
  };
};

export async function onRequest({ request, env }) {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Only GET requests are supported." }, 405, {
      ...responseHeaders,
      Allow: "GET",
    });
  }

  const cache = globalThis.caches?.default;
  const cacheKey = new Request(new URL("/api/recommended-videos", request.url));
  if (cache) {
    try {
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }
    } catch (error) {
      console.error("Could not read the recommendations cache.", error);
    }
  }

  const apiKey = env.YOUTUBE_API_KEY ?? env.YouTube_API;
  if (typeof apiKey !== "string" || apiKey.trim() === "") {
    return jsonResponse(
      { error: "YouTube recommendations are not configured on this site." },
      503,
    );
  }

  try {
    const channels = await Promise.all(CHANNELS.map((channel) => getChannelUploads(channel, apiKey)));
    const allVideoIds = [...new Set(channels.flatMap((channel) => channel.videoIds))];
    const videoDetails = new Map();

    for (let index = 0; index < allVideoIds.length; index += 50) {
      const ids = allVideoIds.slice(index, index + 50);
      if (ids.length === 0) {
        continue;
      }
      const videoResult = await youtubeApiRequest(
        "videos",
        { part: "snippet", id: ids.join(",") },
        apiKey,
      );
      (videoResult.items ?? []).forEach((video) => {
        if (
          typeof video.id === "string" &&
          typeof video.snippet?.title === "string" &&
          typeof video.snippet?.publishedAt === "string"
        ) {
          videoDetails.set(video.id, {
            id: video.id,
            title: video.snippet.title,
            publishedAt: video.snippet.publishedAt,
          });
        }
      });
    }

    const result = {
      channels: channels.map((channel) => ({
        handle: channel.handle,
        label: channel.label,
        videos: channel.videoIds
          .map((videoId) => videoDetails.get(videoId))
          .filter(Boolean)
          .slice(0, 4),
      })),
    };
    const response = jsonResponse(result);
    if (cache) {
      try {
        await cache.put(cacheKey, response.clone());
      } catch (error) {
        console.error("Could not cache YouTube recommendations.", error);
      }
    }
    return response;
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 502;
    console.error("Could not retrieve YouTube recommendations.", status, error?.message ?? "Unknown error");
    return jsonResponse(
      { error: "YouTube recommendations are temporarily unavailable." },
      502,
    );
  }
}
