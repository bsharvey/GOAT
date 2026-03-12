---
archetypes: [alvin, harvey]
skills: [sandbox-curation, music-signal]
training_cluster: 04-sandbox-capability-curator
domain: media
difficulty: intermediate
version: 1.0
---
# Audio Metadata Extraction in JavaScript

> Purpose: Sandbox Capability Curator -- extracting metadata from ingested audio artifacts
> Covers: ID3v2, FLAC, WAV, and other common audio metadata formats
> Key Libraries: music-metadata, node-id3, jsmediatags, music-metadata-browser

---

## 1. Overview of Audio Metadata Standards

Audio files carry metadata in format-specific containers. Understanding these formats is critical for the artifact ingestion pipeline to extract, validate, and normalize metadata from uploaded audio.

### Metadata Format Summary

| Audio Format | Metadata Container(s) | Common Extension |
|-------------|----------------------|-----------------|
| MP3 | ID3v1, ID3v2, APEv2 | `.mp3` |
| FLAC | Vorbis Comments, FLAC metadata blocks | `.flac` |
| WAV | RIFF INFO chunks, BWF (Broadcast Wave), ID3v2 | `.wav` |
| AAC/M4A | iTunes/MP4 atoms (moov/udta/meta) | `.m4a`, `.aac` |
| OGG Vorbis | Vorbis Comments | `.ogg` |
| OGG Opus | Vorbis Comments (OpusTags) | `.opus` |
| AIFF | ID3v2, AIFF chunks | `.aiff`, `.aif` |
| WMA | ASF metadata objects | `.wma` |
| APE | APEv2 tags | `.ape` |
| WavPack | APEv2 tags | `.wv` |

---

## 2. ID3v2 Tags (MP3)

### What is ID3v2?

ID3v2 is the dominant metadata format for MP3 files. It is a container of **frames**, each holding a specific piece of metadata. The tag is typically stored at the **beginning** of the MP3 file (ID3v2) or the **end** (ID3v1).

### Versions

| Version | Max Tag Size | Features |
|---------|-------------|----------|
| ID3v1 | 128 bytes (fixed) | Title, artist, album, year, comment, genre (limited) |
| ID3v1.1 | 128 bytes | Adds track number |
| ID3v2.2 | Up to 256 MB | 3-character frame IDs, obsolete |
| ID3v2.3 | Up to 256 MB | 4-character frame IDs, most widely supported |
| ID3v2.4 | Up to 256 MB | UTF-8 support, improved footer, current standard |

### Key ID3v2 Frames

| Frame ID (v2.3/v2.4) | Frame ID (v2.2) | Description |
|----------------------|-----------------|-------------|
| `TIT2` | `TT2` | Title/songname |
| `TPE1` | `TP1` | Lead performer(s)/Artist |
| `TPE2` | `TP2` | Band/Orchestra/Album Artist |
| `TALB` | `TAL` | Album/Movie/Show title |
| `TRCK` | `TRK` | Track number (e.g., "3/12") |
| `TPOS` | `TPA` | Part of a set / Disc number |
| `TYER` | `TYE` | Year (v2.3) |
| `TDRC` | -- | Recording date (v2.4, replaces TYER) |
| `TCON` | `TCO` | Content type / Genre |
| `COMM` | `COM` | Comments |
| `APIC` | `PIC` | Attached picture (album art) |
| `TXXX` | `TXX` | User-defined text frame |
| `UFID` | `UFI` | Unique file identifier |
| `TSRC` | -- | ISRC (International Standard Recording Code) |
| `TPUB` | `TPB` | Publisher |
| `TCOP` | `TCR` | Copyright message |
| `TCOM` | `TCM` | Composer |
| `TKEY` | `TKE` | Initial key |
| `TBPM` | `TBP` | BPM (beats per minute) |
| `TLAN` | `TLA` | Language(s) |
| `USLT` | `ULT` | Unsynchronized lyrics |
| `SYLT` | `SLT` | Synchronized lyrics |
| `WXXX` | `WXX` | User-defined URL |
| `PRIV` | -- | Private frame |
| `PCNT` | `CNT` | Play counter |
| `POPM` | `POP` | Popularimeter (rating) |
| `GEOB` | `GEO` | General encapsulated object |

### APIC (Album Art) Structure

```
APIC Frame:
  - Text encoding (1 byte)
  - MIME type (e.g., "image/jpeg")
  - Picture type (1 byte):
      0x00 = Other
      0x01 = 32x32 file icon
      0x02 = Other file icon
      0x03 = Front cover  <-- most common
      0x04 = Back cover
      0x05 = Leaflet page
      0x06 = Media
      ...
  - Description (text)
  - Picture data (binary)
```

---

## 3. FLAC Metadata

### FLAC Metadata Block Structure

FLAC files use a series of **metadata blocks** before the audio frames:

```
FLAC File:
  "fLaC" marker (4 bytes)
  +-- STREAMINFO block (required, always first)
  +-- PADDING block (optional)
  +-- APPLICATION block (optional)
  +-- SEEKTABLE block (optional)
  +-- VORBIS_COMMENT block (tags)
  +-- CUESHEET block (optional)
  +-- PICTURE block (album art)
  +-- Audio frames...
```

### Metadata Block Types

| Type ID | Block Type | Description |
|---------|-----------|-------------|
| 0 | STREAMINFO | Sample rate, channels, bits per sample, total samples, MD5 hash |
| 1 | PADDING | Empty space for future tag editing without rewriting |
| 2 | APPLICATION | Application-specific data (registered app IDs) |
| 3 | SEEKTABLE | Seek points for fast seeking |
| 4 | VORBIS_COMMENT | The primary tag container (Vorbis Comments format) |
| 5 | CUESHEET | CD cue sheet information |
| 6 | PICTURE | Embedded pictures (same structure as ID3v2 APIC) |

### Vorbis Comments (FLAC/OGG Tags)

Vorbis Comments use a simple `FIELD=value` format. Field names are case-insensitive ASCII.

**Standard Fields:**

| Field | Description |
|-------|-------------|
| `TITLE` | Track title |
| `ARTIST` | Track artist |
| `ALBUMARTIST` | Album artist |
| `ALBUM` | Album name |
| `TRACKNUMBER` | Track number |
| `TRACKTOTAL` / `TOTALTRACKS` | Total tracks |
| `DISCNUMBER` | Disc number |
| `DISCTOTAL` / `TOTALDISCS` | Total discs |
| `DATE` | Date (usually year, e.g., "2024") |
| `GENRE` | Genre |
| `COMMENT` | Comment |
| `COMPOSER` | Composer |
| `PERFORMER` | Performer |
| `LYRICIST` | Lyricist |
| `CONDUCTOR` | Conductor |
| `ISRC` | ISRC code |
| `BARCODE` / `UPC` | UPC/EAN barcode |
| `LABEL` | Record label |
| `CATALOGNUMBER` | Catalog number |
| `REPLAYGAIN_TRACK_GAIN` | ReplayGain track gain |
| `REPLAYGAIN_TRACK_PEAK` | ReplayGain track peak |
| `REPLAYGAIN_ALBUM_GAIN` | ReplayGain album gain |
| `REPLAYGAIN_ALBUM_PEAK` | ReplayGain album peak |
| `MUSICBRAINZ_TRACKID` | MusicBrainz track ID |
| `MUSICBRAINZ_ALBUMID` | MusicBrainz album ID |
| `MUSICBRAINZ_ARTISTID` | MusicBrainz artist ID |

---

## 4. WAV Headers and Metadata

### WAV/RIFF Structure

WAV files use the RIFF (Resource Interchange File Format) container:

```
RIFF Header:
  "RIFF" (4 bytes)
  File size (4 bytes, little-endian)
  "WAVE" (4 bytes)
  +-- "fmt " chunk (format information)
  |     - Audio format (PCM=1, IEEE Float=3, etc.)
  |     - Number of channels
  |     - Sample rate
  |     - Byte rate
  |     - Block align
  |     - Bits per sample
  +-- "data" chunk (audio samples)
  +-- "LIST" chunk (INFO metadata, optional)
  +-- "id3 " chunk (ID3v2 tags, optional)
  +-- "bext" chunk (Broadcast Wave Format, optional)
```

### LIST INFO Chunk Tags

| Tag | Description |
|-----|-------------|
| `IART` | Artist |
| `INAM` | Title/Name |
| `IPRD` | Album/Product |
| `ICMT` | Comment |
| `ICRD` | Creation date |
| `IGNR` | Genre |
| `ITRK` | Track number |
| `ISFT` | Software |
| `ICOP` | Copyright |
| `IENG` | Engineer |
| `ITCH` | Technician |
| `IMED` | Medium |
| `ISRC` | Source |

### Broadcast Wave Format (BWF) `bext` Chunk

Used in professional audio:

| Field | Size | Description |
|-------|------|-------------|
| Description | 256 bytes | Free text description |
| Originator | 32 bytes | Name of originator |
| OriginatorReference | 32 bytes | Unique reference |
| OriginationDate | 10 bytes | YYYY-MM-DD |
| OriginationTime | 8 bytes | HH:MM:SS |
| TimeReference | 8 bytes | Sample count since midnight |
| Version | 2 bytes | BWF version |
| UMID | 64 bytes | SMPTE UMID |
| LoudnessValue | 2 bytes | EBU R 128 loudness |
| LoudnessRange | 2 bytes | EBU R 128 range |
| MaxTruePeakLevel | 2 bytes | Max true peak |
| MaxMomentaryLoudness | 2 bytes | Max momentary loudness |
| MaxShortTermLoudness | 2 bytes | Max short-term loudness |
| CodingHistory | variable | Coding/processing history |

---

## 5. JavaScript Libraries for Audio Metadata

### 5.1 music-metadata (Recommended)

**Package:** `music-metadata` (npm)
**Repository:** https://github.com/borewit/music-metadata
**Browser version:** `music-metadata-browser`

The most comprehensive JavaScript/TypeScript library for audio metadata parsing. Supports reading (not writing) metadata from virtually all audio formats.

#### Supported Formats

MP3 (ID3v1, ID3v2.2/v2.3/v2.4, APEv2), FLAC, OGG Vorbis, OGG Opus, WAV, AIFF, AAC, M4A/M4B/MP4, WMA/ASF, WavPack, APE, MPC (Musepack), DSF/DSD, Matroska/WebM

#### Usage

```javascript
import { parseFile, parseBuffer, parseStream } from 'music-metadata';

// Parse from file path (Node.js)
const metadata = await parseFile('/path/to/audio.mp3');

// Parse from Buffer
const metadata = await parseBuffer(buffer, { mimeType: 'audio/mpeg' });

// Parse from readable stream
const metadata = await parseStream(readableStream, { mimeType: 'audio/flac' });

// Access common metadata (normalized across formats)
console.log(metadata.common.title);        // "Song Title"
console.log(metadata.common.artist);       // "Artist Name"
console.log(metadata.common.album);        // "Album Name"
console.log(metadata.common.year);         // 2024
console.log(metadata.common.track);        // { no: 3, of: 12 }
console.log(metadata.common.disk);         // { no: 1, of: 2 }
console.log(metadata.common.genre);        // ["Rock"]
console.log(metadata.common.picture);      // [{ format, data, type, description }]
console.log(metadata.common.isrc);         // ["USRC17607839"]
console.log(metadata.common.bpm);          // 120
console.log(metadata.common.key);          // "Cm"
console.log(metadata.common.composers);    // ["Composer Name"]
console.log(metadata.common.comment);      // ["A comment"]

// Access format info
console.log(metadata.format.container);      // "MPEG"
console.log(metadata.format.codec);          // "MPEG 1 Layer 3"
console.log(metadata.format.sampleRate);     // 44100
console.log(metadata.format.numberOfChannels); // 2
console.log(metadata.format.bitrate);        // 320000
console.log(metadata.format.duration);       // 245.67 (seconds)
console.log(metadata.format.bitsPerSample);  // 16
console.log(metadata.format.lossless);       // false

// Access native/raw tags
console.log(metadata.native['ID3v2.3']);     // Array of raw ID3v2.3 frames
console.log(metadata.native.vorbis);         // Array of raw Vorbis comments
```

#### Options

```javascript
const options = {
  duration: true,        // Calculate duration (may require full file scan)
  skipCovers: false,     // Skip embedded album art (faster if not needed)
  skipPostHeaders: false // Skip post-header metadata
};
```

### 5.2 node-id3

**Package:** `node-id3` (npm)
**Strengths:** Read AND write ID3 tags for MP3 files.

```javascript
import NodeID3 from 'node-id3';

// Read tags
const tags = NodeID3.read('/path/to/file.mp3');
console.log(tags.title);
console.log(tags.artist);
console.log(tags.image); // { mime, type: { id, name }, description, imageBuffer }

// Write tags
const newTags = {
  title: 'New Title',
  artist: 'New Artist',
  album: 'New Album',
  TRCK: '1/10',
  APIC: {
    mime: 'image/jpeg',
    type: { id: 3, name: 'front cover' },
    description: 'Cover',
    imageBuffer: Buffer.from(/* ... */)
  },
  TXXX: [
    { description: 'ISRC', value: 'USRC17607839' }
  ]
};

NodeID3.write(newTags, '/path/to/file.mp3');

// Update tags (merge with existing)
NodeID3.update(newTags, '/path/to/file.mp3');

// Remove tags
NodeID3.removeTags('/path/to/file.mp3');
```

### 5.3 jsmediatags

**Package:** `jsmediatags` (npm)
**Strengths:** Works in browser, reads ID3 and MP4 tags. Lighter weight.

```javascript
import jsmediatags from 'jsmediatags';

// From file (Node.js)
jsmediatags.read('/path/to/song.mp3', {
  onSuccess: function(tag) {
    console.log(tag.type);   // "ID3" or "MP4"
    console.log(tag.tags);   // { title, artist, album, picture, ... }
  },
  onError: function(error) {
    console.log(error);
  }
});

// From URL (browser)
jsmediatags.read('https://example.com/song.mp3', { onSuccess, onError });

// From File/Blob (browser)
jsmediatags.read(fileInput.files[0], { onSuccess, onError });
```

### 5.4 flac-metadata

**Package:** `flac-metadata` (npm)
**Strengths:** Stream-based FLAC metadata reading and writing.

```javascript
import { Processor } from 'flac-metadata';
import fs from 'fs';

const processor = new Processor();
const reader = fs.createReadStream('input.flac');
const writer = fs.createWriteStream('output.flac');

processor.on('preprocess', (mdb) => {
  // Access metadata blocks
  if (mdb.type === Processor.MDB_TYPE_VORBIS_COMMENT) {
    // Modify Vorbis comments
  }
});

reader.pipe(processor).pipe(writer);
```

### 5.5 Library Comparison

| Feature | music-metadata | node-id3 | jsmediatags | flac-metadata |
|---------|---------------|----------|-------------|---------------|
| Read MP3/ID3 | Yes | Yes | Yes | No |
| Read FLAC | Yes | No | No | Yes |
| Read WAV | Yes | No | No | No |
| Read M4A/AAC | Yes | No | Yes | No |
| Read OGG | Yes | No | No | No |
| Write tags | No | Yes (MP3 only) | No | Yes (FLAC only) |
| Browser support | Via music-metadata-browser | No | Yes | No |
| TypeScript | Yes | Partial | No | No |
| Stream support | Yes | No | No | Yes |
| Active maintenance | Yes | Moderate | Low | Low |

---

## 6. Practical Extraction Patterns for the Ingestion Pipeline

### Comprehensive Metadata Extraction

```javascript
import { parseBuffer } from 'music-metadata';
import { fileTypeFromBuffer } from 'file-type';

async function extractAudioMetadata(buffer) {
  // Detect file type
  const type = await fileTypeFromBuffer(buffer);
  if (!type || !type.mime.startsWith('audio/')) {
    throw new Error('Not a recognized audio file');
  }

  // Parse metadata
  const metadata = await parseBuffer(buffer, {
    mimeType: type.mime,
    duration: true
  });

  // Normalize to a standard structure
  return {
    // Identity
    title: metadata.common.title || null,
    artist: metadata.common.artist || null,
    albumArtist: metadata.common.albumartist || null,
    album: metadata.common.album || null,

    // Numbering
    trackNumber: metadata.common.track?.no || null,
    trackTotal: metadata.common.track?.of || null,
    discNumber: metadata.common.disk?.no || null,
    discTotal: metadata.common.disk?.of || null,

    // Descriptive
    genre: metadata.common.genre || [],
    year: metadata.common.year || null,
    date: metadata.common.date || null,
    composers: metadata.common.composers || [],
    comment: metadata.common.comment || [],
    lyrics: metadata.common.lyrics || [],

    // Technical identifiers
    isrc: metadata.common.isrc || [],
    barcode: metadata.common.barcode || null,
    musicBrainzRecordingId: metadata.common.musicbrainz_recordingid || null,

    // Musical attributes
    bpm: metadata.common.bpm || null,
    key: metadata.common.key || null,

    // Audio format
    format: {
      container: metadata.format.container,
      codec: metadata.format.codec,
      sampleRate: metadata.format.sampleRate,
      bitrate: metadata.format.bitrate,
      channels: metadata.format.numberOfChannels,
      bitsPerSample: metadata.format.bitsPerSample,
      duration: metadata.format.duration,
      lossless: metadata.format.lossless
    },

    // Album art
    artwork: (metadata.common.picture || []).map(pic => ({
      format: pic.format,
      type: pic.type,
      description: pic.description,
      size: pic.data.length,
      data: pic.data  // Buffer
    })),

    // Rights
    copyright: metadata.common.copyright || null,
    label: metadata.common.label || [],

    // Raw/native tags for format-specific processing
    nativeFormats: Object.keys(metadata.native)
  };
}
```

### Validation Checks for Ingestion

```javascript
function validateAudioForDistribution(meta) {
  const issues = [];

  if (!meta.title) issues.push('Missing title');
  if (!meta.artist) issues.push('Missing artist');
  if (!meta.album) issues.push('Missing album');
  if (!meta.genre.length) issues.push('Missing genre');
  if (!meta.year) issues.push('Missing year');
  if (!meta.isrc.length) issues.push('Missing ISRC code');
  if (!meta.artwork.length) issues.push('Missing album artwork');

  if (meta.artwork.length > 0) {
    const cover = meta.artwork[0];
    if (cover.size < 10000) issues.push('Album art may be too small');
  }

  if (meta.format.sampleRate < 44100) {
    issues.push(`Sample rate ${meta.format.sampleRate}Hz below CD quality (44100Hz)`);
  }

  if (meta.format.bitrate && meta.format.bitrate < 128000 && !meta.format.lossless) {
    issues.push(`Bitrate ${meta.format.bitrate/1000}kbps below minimum quality`);
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
```

---

## 7. Relevance to Sandbox Capability Curator

When audio files are uploaded to the ingestion pipeline:

1. **Detect format** using file-type magic bytes before attempting metadata parse.
2. **Extract all metadata** using `music-metadata` for comprehensive, normalized access.
3. **Validate completeness** against distribution requirements (title, artist, ISRC, artwork).
4. **Extract embedded artwork** for thumbnail generation and quality validation.
5. **Identify technical quality** (sample rate, bit depth, bitrate, lossless vs. lossy).
6. **Preserve native tags** for format-specific processing (e.g., ReplayGain, MusicBrainz IDs).
7. **Flag missing or malformed metadata** and create recommended actions for the user.
