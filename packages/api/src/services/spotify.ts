/**
 * Spotify Integration Service
 *
 * Artist lookup and streaming data via Spotify Web API.
 */

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: number;
  imageUrl?: string;
  spotifyUrl: string;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: string[];
  album: string;
  popularity: number;
  durationMs: number;
  previewUrl?: string;
  isrc?: string;
}

export class SpotifyService {
  private clientId: string;
  private clientSecret: string;
  private accessToken?: string;
  private tokenExpiry = 0;

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || "";
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "";
  }

  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error("Spotify API credentials not configured");
    }

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
    });

    if (!response.ok) {
      throw new Error(`Spotify auth failed: ${response.status}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken;
  }

  private async spotifyFetch(endpoint: string): Promise<unknown> {
    const token = await this.getToken();
    const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`);
    }

    return response.json();
  }

  async searchArtist(query: string): Promise<SpotifyArtist[]> {
    const data = await this.spotifyFetch(
      `/search?q=${encodeURIComponent(query)}&type=artist&limit=5`
    ) as { artists: { items: Array<{
      id: string; name: string; genres: string[]; popularity: number;
      followers: { total: number }; images: Array<{ url: string }>;
      external_urls: { spotify: string };
    }> } };

    return data.artists.items.map((a) => ({
      id: a.id,
      name: a.name,
      genres: a.genres,
      popularity: a.popularity,
      followers: a.followers.total,
      imageUrl: a.images[0]?.url,
      spotifyUrl: a.external_urls.spotify,
    }));
  }

  async getArtist(spotifyId: string): Promise<SpotifyArtist> {
    const a = await this.spotifyFetch(`/artists/${spotifyId}`) as {
      id: string; name: string; genres: string[]; popularity: number;
      followers: { total: number }; images: Array<{ url: string }>;
      external_urls: { spotify: string };
    };

    return {
      id: a.id,
      name: a.name,
      genres: a.genres,
      popularity: a.popularity,
      followers: a.followers.total,
      imageUrl: a.images[0]?.url,
      spotifyUrl: a.external_urls.spotify,
    };
  }

  async getArtistTopTracks(spotifyId: string, market = "US"): Promise<SpotifyTrack[]> {
    const data = await this.spotifyFetch(
      `/artists/${spotifyId}/top-tracks?market=${market}`
    ) as { tracks: Array<{
      id: string; name: string; popularity: number; duration_ms: number;
      preview_url: string | null; external_ids?: { isrc?: string };
      artists: Array<{ name: string }>; album: { name: string };
    }> };

    return data.tracks.map((t) => ({
      id: t.id,
      name: t.name,
      artists: t.artists.map((a) => a.name),
      album: t.album.name,
      popularity: t.popularity,
      durationMs: t.duration_ms,
      previewUrl: t.preview_url || undefined,
      isrc: t.external_ids?.isrc,
    }));
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }
}

export const spotifyService = new SpotifyService();
