/**
 * RAG System — Retrieval Augmented Generation
 *
 * Knowledge base with vector similarity search for
 * contextual AI responses about music royalties.
 */

interface Document {
  id: string;
  content: string;
  metadata: Record<string, string>;
  embedding?: number[];
  addedAt: Date;
}

interface RetrievalResult {
  document: Document;
  score: number;
}

// Pre-loaded industry knowledge
const INDUSTRY_KNOWLEDGE: { content: string; metadata: Record<string, string> }[] = [
  {
    content: `Royalty Distribution Structure: Mechanical royalties are paid to songwriters and publishers
for the reproduction of copyrighted musical compositions. The MLC (Mechanical Licensing Collective)
administers blanket mechanical licenses for digital music providers. Current statutory rate:
$0.12 per song (physical/download) or $0.0024 per stream.`,
    metadata: { topic: "mechanical-royalties", source: "MLC" },
  },
  {
    content: `Performance Royalties: PROs (ASCAP, BMI, SESAC, GMR) collect and distribute performance
royalties when songs are played publicly. ASCAP and BMI operate under consent decrees limiting
their negotiating power. SESAC and GMR are not under consent decrees. Digital performance royalties
for sound recordings are handled by SoundExchange.`,
    metadata: { topic: "performance-royalties", source: "PRO-system" },
  },
  {
    content: `NFT Music Monetization: Artists can tokenize music rights, creating fractional ownership
of royalty streams. Smart contracts on Ethereum/Polygon automate royalty splits. Key platforms:
Royal.io, Catalog, Sound.xyz. Average NFT music sale: $500-$5000 for independent artists.`,
    metadata: { topic: "nft-monetization", source: "web3-research" },
  },
  {
    content: `Platform-Specific Strategies: Spotify Discovery Mode trades royalty rate for playlist
placement. Apple Music pays ~$0.01/stream (2x Spotify). TikTok syncs drive catalog streams
(average 30% boost). YouTube Content ID catches unauthorized uses. Amazon Music HD premium
tier pays higher per-stream rates.`,
    metadata: { topic: "platform-strategies", source: "industry-analysis" },
  },
  {
    content: `Contract Negotiation Best Practices: Standard publishing deals offer 50/50 splits.
360 deals give labels share of touring/merch (avoid unless necessary). Sync licensing can
pay $1,000-$500,000+ per placement. Always retain your writer's share (never sign away).
Reversion clauses should be 2-5 years.`,
    metadata: { topic: "contracts", source: "legal-guide" },
  },
  {
    content: `Revenue Optimization: Register with all PROs and the MLC. Use DistroKid, TuneCore,
or CD Baby for distribution. Claim SoundExchange royalties separately. File with the MLC
directly. Use ISRC codes on every release. Monitor for unclaimed "black box" royalties.
The MLC holds millions in unmatched royalties.`,
    metadata: { topic: "revenue-optimization", source: "best-practices" },
  },
  {
    content: `Music Modernization Act (MMA): Enacted 2018. Created the MLC to handle mechanical
licensing. Established a blanket license for streaming services. Intended to help songwriters
but centralized control. If your data doesn't match exactly (ISRCs, publisher info), money
goes to the "black box" or gets distributed to major publishers.`,
    metadata: { topic: "mma", source: "legislation" },
  },
  {
    content: `GOAT Force Members: Harvey Miller (DJ Speedy) - Commander, musician, producer.
Waka Flocka Flame - artist, performer, GOAT Force muscle. Money Penny - operations, admin.
Codex - technical, development, AI training. Ms. Vanessa - creative director, visual brand.
Apex (Meridian) - AI system, security sentinel, knowledge keeper. Each member has unique
loyalty keys and HMAC-based authentication tokens.`,
    metadata: { topic: "goat-force", source: "internal" },
  },
  {
    content: `Information Security Risk Management (CGRC): Categorize information systems by
impact level (low/moderate/high). Select security controls from NIST SP 800-53. Implement
controls with proper documentation. Assess controls through testing and evaluation.
Authorize systems through risk acceptance. Monitor continuously for compliance drift.
Incident response requires preparation, detection, containment, eradication, recovery,
and lessons learned phases.`,
    metadata: { topic: "security-governance", source: "CGRC-training" },
  },
  {
    content: `LLM Architecture & Routing: Large Language Models use transformer architecture
with attention mechanisms. Key considerations for multi-model routing: latency vs quality
tradeoffs, cost optimization (smaller models for simple tasks), capability matching
(code models for code, analysis models for reasoning), fallback chains when primary
provider is unavailable. Knowledge graph integration enhances factual accuracy.
Prompt engineering affects output quality significantly.`,
    metadata: { topic: "llm-architecture", source: "LLM-training" },
  },
  {
    content: `Music Industry Rights Management: Sync licensing for film/TV placements can
earn $1,000-$500,000+. Master recording rights vs composition rights are separate revenue
streams. 360 deals give labels share of all revenue (avoid unless necessary). Digital
distribution through DistroKid, TuneCore, CD Baby. Always register with SoundExchange
separately from your PRO. ISRC codes must be unique per recording, not per song.
UPC/EAN codes for albums. GS1 product codes for physical merchandise.`,
    metadata: { topic: "rights-management", source: "industry-guide" },
  },
];

export class RAGService {
  private documents: Document[] = [];
  private cache = new Map<string, { result: string; expiry: number }>();
  private cacheHours = 1;

  constructor() {
    // Load industry knowledge on init
    for (const doc of INDUSTRY_KNOWLEDGE) {
      this.addDocument(doc.content, doc.metadata);
    }
  }

  addDocument(content: string, metadata: Record<string, string> = {}): string {
    const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const chunks = this.chunkText(content, 1000, 200);

    for (const chunk of chunks) {
      this.documents.push({
        id: `${id}-${this.documents.length}`,
        content: chunk,
        metadata,
        embedding: this.simpleEmbed(chunk),
        addedAt: new Date(),
      });
    }

    return id;
  }

  retrieve(query: string, topK = 5): RetrievalResult[] {
    const queryEmbedding = this.simpleEmbed(query);

    const scored = this.documents.map((doc) => ({
      document: doc,
      score: this.cosineSimilarity(queryEmbedding, doc.embedding || []),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  buildContext(query: string, topK = 5): string {
    const results = this.retrieve(query, topK);
    if (results.length === 0) return "";

    const context = results
      .filter((r) => r.score > 0.1)
      .map((r) => `[${r.document.metadata.topic || "general"}]: ${r.document.content}`)
      .join("\n\n");

    return `Use the following knowledge to inform your response:\n\n${context}\n\n`;
  }

  getCached(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.result;
  }

  setCache(key: string, result: string): void {
    this.cache.set(key, {
      result,
      expiry: Date.now() + this.cacheHours * 3600000,
    });
  }

  getStats() {
    return {
      totalDocuments: this.documents.length,
      cacheSize: this.cache.size,
      topics: [...new Set(this.documents.map((d) => d.metadata.topic).filter(Boolean))],
    };
  }

  // Simple TF-IDF-like embedding (production would use real embeddings)
  private simpleEmbed(text: string): number[] {
    const words = text.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
    const vocab = [
      "royalty", "music", "artist", "stream", "revenue", "payment", "contract",
      "platform", "spotify", "apple", "youtube", "tiktok", "mechanical", "performance",
      "songwriter", "publisher", "ascap", "bmi", "sesac", "soundexchange", "mlc",
      "isrc", "nft", "blockchain", "split", "distribution", "license", "copyright",
      "sync", "master", "recording", "composition", "digital", "physical", "download",
      "plays", "listeners", "catalog", "release", "album", "single", "track",
    ];

    return vocab.map((v) => {
      const count = words.filter((w) => w.includes(v)).length;
      return count / Math.max(words.length, 1);
    });
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i]! * b[i]!;
      magA += a[i]! * a[i]!;
      magB += b[i]! * b[i]!;
    }

    const mag = Math.sqrt(magA) * Math.sqrt(magB);
    return mag === 0 ? 0 : dot / mag;
  }

  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      chunks.push(text.slice(start, start + chunkSize));
      start += chunkSize - overlap;
    }
    return chunks;
  }
}

// Singleton
export const ragService = new RAGService();
