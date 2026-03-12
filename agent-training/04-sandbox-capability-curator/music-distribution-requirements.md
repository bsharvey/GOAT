---
archetypes: [alvin, harvey, chairman]
skills: [sandbox-curation, music-signal, market-sensing]
training_cluster: 04-sandbox-capability-curator
domain: media
difficulty: intermediate
version: 1.0
---
# Music Distribution Metadata Requirements

> Purpose: Sandbox Capability Curator -- validating music artifacts for distribution readiness
> Covers: Spotify, Apple Music, Amazon Music, YouTube Music, Tidal, Deezer, and other DSPs
> Topics: Required metadata, artwork specs, ISRC codes, audio specs, release readiness

---

## 1. Overview

Digital Service Providers (DSPs) like Spotify, Apple Music, and others require specific metadata, audio quality standards, and artwork specifications before accepting a release for distribution. Music distributors (DistroKid, TuneCore, CD Baby, LANDR, Amuse, UnitedMasters, etc.) enforce these requirements as intermediaries.

This document catalogs the requirements so the artifact ingestion pipeline can validate uploaded music and flag missing or non-compliant elements.

---

## 2. Required Metadata Fields

### 2.1 Release-Level Metadata (Album/EP/Single)

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| **Release Title** | Yes | Title of the album, EP, or single | "Midnight Sessions" |
| **Release Artist** | Yes | Primary artist name | "Jane Doe" |
| **Release Date** | Yes | Scheduled release date (YYYY-MM-DD) | "2024-06-15" |
| **Release Type** | Yes | Single, EP, or Album | "Album" |
| **Genre** | Yes | Primary genre (from DSP-approved list) | "Electronic" |
| **Subgenre** | Recommended | Secondary genre classification | "Ambient" |
| **Label Name** | Yes | Record label (can be self-released) | "Independent" |
| **UPC/EAN** | Yes | Universal Product Code (barcode) for the release | "012345678905" |
| **Copyright (C)** | Yes | Copyright holder and year | "2024 Jane Doe" |
| **Sound Recording (P)** | Yes | Sound recording copyright holder and year | "2024 Jane Doe Music LLC" |
| **Language** | Yes | Primary language of lyrics/title | "English" |
| **Explicit Content** | Yes | Whether release contains explicit content | "No" / "Yes" / "Clean" |
| **Previously Released** | Conditional | Whether content was previously released | "No" |
| **Artwork** | Yes | Cover art (see specs below) | -- |
| **Territory** | Recommended | Release territories | "Worldwide" |

### 2.2 Track-Level Metadata

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| **Track Title** | Yes | Song title | "Ocean Waves" |
| **Track Artist** | Yes | Primary artist for this track | "Jane Doe" |
| **Featured Artist(s)** | If applicable | Featured/guest artists | "feat. John Smith" |
| **ISRC** | Yes | International Standard Recording Code | "USRC12345678" |
| **Track Number** | Yes | Position in the release | 3 |
| **Disc Number** | If applicable | Disc number for multi-disc releases | 1 |
| **Duration** | Auto-detected | Track length | "3:45" |
| **Genre** | Recommended | Track-level genre (if different from release) | "Downtempo" |
| **Composer(s)** | Yes* | Songwriter/composer names | "Jane Doe, John Smith" |
| **Lyricist(s)** | Recommended | Lyric writers (if different from composer) | "Jane Doe" |
| **Producer(s)** | Recommended | Producer credits | "Jane Doe" |
| **Explicit** | Yes | Track-level explicit flag | "No" |
| **Language** | Yes | Language of lyrics (or "Instrumental") | "English" |
| **Preview Start** | Optional | Start time for the preview clip | "0:30" |
| **Lyrics** | Recommended | Full lyrics (required for Apple Music lyrics display) | -- |
| **BPM** | Optional | Beats per minute | 120 |
| **Key** | Optional | Musical key | "C minor" |
| **ISWC** | Optional | International Standard Musical Work Code | "T-345246800-1" |

> *Composer is required by most distributors and is essential for publishing/royalty tracking.

### 2.3 Credits and Roles

DSPs increasingly support detailed credits:

| Role | Description |
|------|-------------|
| Primary Artist | Main performing artist |
| Featured Artist | Guest artist featured on the track |
| Remixer | Artist who created a remix |
| Composer | Writer of the musical composition |
| Lyricist | Writer of the lyrics |
| Producer | Music producer |
| Arranger | Musical arranger |
| Mixer | Mixing engineer |
| Mastering Engineer | Mastering engineer |
| Performer | Session musician or vocalist |

---

## 3. ISRC Codes

### What is an ISRC?

The **International Standard Recording Code (ISRC)** is a unique 12-character identifier assigned to each individual sound recording. It is the global standard for identifying recordings (ISO 3901).

### Format

```
ISRC: CC-XXX-YY-NNNNN

CC    = Country code (2 characters, ISO 3166-1 alpha-2)
XXX   = Registrant code (3 alphanumeric characters, assigned by national agency)
YY    = Year of reference (2 digits)
NNNNN = Designation code (5 digits, assigned by registrant)

Example: US-RC1-24-00001 (displayed as USRC12400001 without hyphens)
```

### Key Rules

- Each **unique recording** gets its own ISRC -- even if the same song appears on multiple albums.
- A **remix** or **remaster** gets a new ISRC (it is a different recording).
- A **live version** gets a new ISRC.
- The same recording released on different platforms uses the **same ISRC**.
- ISRCs are **permanent** -- once assigned, they never change or get reassigned.
- ISRCs are **free** to obtain from national ISRC agencies or through distributors.

### How to Obtain

1. **Through a distributor**: DistroKid, TuneCore, CD Baby, etc. auto-assign ISRCs if you do not provide one.
2. **Directly from a national agency**: In the US, this is the RIAA (via usisrc.org). In the UK, PPL. Each country has a designated agency.
3. **Through a label**: Labels typically manage ISRC assignment.

### ISRC in Metadata

ISRCs should be embedded in the audio file metadata:
- **ID3v2**: `TSRC` frame
- **Vorbis Comments**: `ISRC` field
- **MP4/M4A**: `----:com.apple.iTunes:ISRC` atom

---

## 4. UPC/EAN Barcodes

### What is a UPC?

The **Universal Product Code (UPC)** or **European Article Number (EAN)** is a barcode that identifies the **release** (album/EP/single) as a product. While ISRCs identify individual recordings, UPCs identify the collection/release.

### Format

- **UPC-A**: 12 digits (North America)
- **EAN-13**: 13 digits (international, superset of UPC)

### How to Obtain

1. **Through a distributor**: Most distributors auto-assign UPCs.
2. **From GS1**: Purchase a block of UPCs from GS1 (the global barcode authority).
3. **From a barcode reseller**: Services like SnapUPC or Nationwide Barcode.

---

## 5. Artwork Specifications

### Universal Requirements (Accepted by All Major DSPs)

| Specification | Requirement |
|--------------|-------------|
| **Minimum Size** | 3000 x 3000 pixels |
| **Recommended Size** | 3000 x 3000 pixels |
| **Maximum Size** | 10000 x 10000 pixels (varies by DSP) |
| **Aspect Ratio** | 1:1 (square) -- mandatory |
| **File Format** | JPEG or PNG |
| **Color Space** | RGB (not CMYK) |
| **Resolution** | 72 DPI minimum (300 DPI recommended for print) |
| **Max File Size** | 36 MB (varies by distributor) |
| **Bit Depth** | 8-bit or 16-bit per channel |

### Content Rules (Will Cause Rejection)

| Rule | Description |
|------|-------------|
| **No blurry/pixelated images** | Art must be clear and high-resolution |
| **No misleading text** | Cannot include "Exclusive" or "Limited Edition" unless true |
| **No pricing information** | No "$9.99" or "Free" on artwork |
| **No URLs or social media** | No website addresses, @handles, or QR codes |
| **No logos of other brands** | No Spotify, Apple, etc. logos |
| **No contact information** | No email addresses or phone numbers |
| **No pornographic content** | Adult content is rejected |
| **No generic/stock photos** | Some DSPs reject obvious stock imagery |
| **Text must match metadata** | Artist name and title on art must match metadata |
| **No excessive whitespace** | Art should fill the square frame |

### Platform-Specific Notes

**Spotify:**
- Minimum 640x640, recommended 3000x3000
- JPEG or PNG
- No text other than artist name and title preferred

**Apple Music:**
- Minimum 3000x3000 (strictly enforced)
- Must be PNG or JPEG
- 72 DPI minimum
- RGB color space only

**Amazon Music:**
- Minimum 1400x1400, recommended 3000x3000
- Maximum 10000x10000
- JPEG only (some pipelines accept PNG)

---

## 6. Audio Specifications

### Accepted Audio Formats by DSPs

| Format | Accepted | Notes |
|--------|----------|-------|
| **WAV** | Yes (preferred) | Uncompressed, highest quality |
| **FLAC** | Yes (preferred) | Lossless compression |
| **AIFF** | Yes | Uncompressed (Apple ecosystem) |
| **ALAC** | Some DSPs | Apple Lossless |
| **MP3** | Some distributors | Lossy -- generally discouraged |
| **AAC/M4A** | Rarely | Lossy -- generally not accepted for distribution |
| **OGG** | No | Not accepted for distribution |

### Audio Quality Requirements

| Specification | Minimum | Recommended | Maximum |
|--------------|---------|-------------|---------|
| **Sample Rate** | 44.1 kHz | 44.1 kHz or 48 kHz | 192 kHz |
| **Bit Depth** | 16-bit | 24-bit | 32-bit float |
| **Channels** | Stereo (2ch) | Stereo (2ch) | Dolby Atmos (7.1.4) |
| **Bitrate (lossy)** | 320 kbps | N/A (use lossless) | -- |

### Audio Quality Checks

| Check | Requirement |
|-------|-------------|
| **No clipping** | Audio should not clip (exceed 0 dBFS) |
| **Appropriate loudness** | Masters should target -14 LUFS (Spotify) or -16 LUFS (Apple) integrated |
| **No silence padding** | Excessive silence at start/end will be flagged |
| **Minimum duration** | Most DSPs require at least 1 second (some require 30 seconds for royalty eligibility) |
| **Maximum duration** | No strict limit, but tracks over 30 minutes may face scrutiny |
| **No corruption** | File must decode fully without errors |
| **No upsampling** | Do not upsample a 44.1kHz file to 96kHz -- DSPs may detect this |

### Spatial Audio / Dolby Atmos

- Apple Music and Amazon Music support Dolby Atmos (7.1.4 bed + objects)
- Requires ADM BWF files or Dolby Atmos master files
- Standard stereo masters are still required alongside Atmos masters

---

## 7. Release Types and Track Count

| Release Type | Track Count | Typical Duration |
|-------------|-------------|-----------------|
| **Single** | 1-3 tracks | Under 10 minutes total |
| **EP** | 4-6 tracks | Under 30 minutes total |
| **Album** | 7+ tracks | Over 30 minutes total |

> Note: DSP definitions vary. Spotify considers a release with 1-3 tracks under 10 minutes a single, 4-6 tracks or under 30 minutes an EP, and 7+ tracks or 30+ minutes an album.

---

## 8. Common Rejection Reasons

### Metadata Issues
1. Missing or invalid ISRC code
2. Artist name mismatch between metadata and artwork
3. Title contains version info that should be in a separate field (e.g., "Song Title (Remix)" should use "Remix" in the version field)
4. Special characters or encoding issues in text fields
5. Missing composer/songwriter credits
6. Genre does not match an approved genre from the DSP's taxonomy
7. Incorrect language tag

### Audio Issues
1. Audio file is corrupted or truncated
2. Sample rate below 44.1 kHz
3. Upsampled audio detected
4. Excessive clipping
5. File contains only silence
6. Duration too short (under 1 second)
7. Lossy format submitted (MP3 when WAV/FLAC required)

### Artwork Issues
1. Below minimum resolution (3000x3000)
2. Not square (1:1 aspect ratio)
3. Contains prohibited content (URLs, prices, logos)
4. Blurry or pixelated
5. CMYK color space instead of RGB
6. Text on artwork doesn't match release metadata

---

## 9. Distribution Checklist

### Pre-Distribution Validation

```
RELEASE LEVEL:
[ ] Release title set
[ ] Primary artist name set
[ ] Release date set (future date recommended, at least 2-4 weeks out)
[ ] Release type set (Single/EP/Album)
[ ] Genre selected from approved list
[ ] Label name set
[ ] UPC/EAN assigned (or will be auto-assigned by distributor)
[ ] Copyright (C) line complete with year and holder
[ ] Sound recording (P) line complete with year and holder
[ ] Language set
[ ] Explicit content flag set
[ ] Artwork meets all specifications (3000x3000, square, RGB, JPEG/PNG)
[ ] Artwork contains no prohibited content

TRACK LEVEL (for each track):
[ ] Track title set
[ ] Track artist set
[ ] ISRC assigned
[ ] Track number set
[ ] Composer(s) credited
[ ] Lyricist(s) credited (if applicable)
[ ] Explicit flag set per track
[ ] Language set (or "Instrumental")
[ ] Audio file is WAV or FLAC
[ ] Sample rate is 44.1 kHz or 48 kHz
[ ] Bit depth is 16-bit or 24-bit
[ ] Audio is stereo (2 channels)
[ ] No clipping detected
[ ] Duration is appropriate (>1 second, <30+ minutes)
[ ] Audio file is not corrupted
[ ] Audio is not upsampled from a lower sample rate
```

---

## 10. Publishing vs. Distribution

### Important Distinction

| Aspect | Distribution | Publishing |
|--------|-------------|-----------|
| **What** | Delivering recordings to DSPs | Managing the underlying composition/songwriting |
| **Revenue** | Master recording royalties (streaming, downloads) | Composition royalties (mechanical, performance, sync) |
| **Identifier** | ISRC (recording) | ISWC (composition) |
| **Copyright** | Sound recording (P) | Musical work (C) |
| **Registered with** | Distributor | PRO (ASCAP, BMI, SESAC, PRS, etc.) |

### Collecting Societies / PROs

| Organization | Territory | Type |
|-------------|-----------|------|
| ASCAP | US | Performance Rights |
| BMI | US | Performance Rights |
| SESAC | US | Performance Rights |
| Harry Fox Agency (HFA) | US | Mechanical Rights |
| PRS for Music | UK | Performance + Mechanical |
| GEMA | Germany | Performance + Mechanical |
| SACEM | France | Performance + Mechanical |
| JASRAC | Japan | Performance + Mechanical |
| SoundExchange | US | Digital Performance (non-interactive) |
| MLC (Mechanical Licensing Collective) | US | Mechanical (streaming) |

---

## 11. Relevance to Sandbox Capability Curator

When music files are uploaded to the ingestion pipeline:

1. **Validate audio format**: Ensure WAV or FLAC (lossless) for distribution-ready tracks. Flag lossy formats.
2. **Check audio specs**: Verify sample rate (>=44.1kHz), bit depth (>=16-bit), stereo channels, no clipping.
3. **Extract and validate metadata**: Check for title, artist, ISRC, composer, genre, language, explicit flag.
4. **Validate artwork**: Check dimensions (3000x3000), aspect ratio (1:1), format (JPEG/PNG), color space (RGB).
5. **Flag missing fields**: Create recommended actions for any missing required fields.
6. **ISRC management**: Detect existing ISRCs or flag that one needs to be assigned.
7. **Generate readiness report**: Produce a distribution readiness score and checklist showing what is complete and what is missing.
8. **Normalize metadata**: Map format-specific metadata (ID3, Vorbis Comments, etc.) to a unified schema matching DSP requirements.
9. **Quality assessment**: Check loudness levels against platform targets (-14 LUFS for Spotify, -16 LUFS for Apple Music).
10. **Create Skills**: Generate validation skills that can be reused across future uploads, including format-specific extractors and DSP-specific validators.
