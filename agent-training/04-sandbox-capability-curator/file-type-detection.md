---
archetypes: [alvin]
skills: [sandbox-curation, threat-detection]
training_cluster: 04-sandbox-capability-curator
domain: security
difficulty: intermediate
version: 1.0
---
# File Type Detection in JavaScript

> Reference: sindresorhus/file-type
> Repository: https://github.com/sindresorhus/file-type
> npm: https://www.npmjs.com/package/file-type
> Purpose: Sandbox Capability Curator -- detecting file types of uploaded artifacts by magic bytes

---

## 1. Overview

The `file-type` library detects the file type of a Buffer, Uint8Array, ArrayBuffer, Readable Stream, Blob, or file path by inspecting the **magic bytes** (binary signatures) at specific offsets in the file data. Unlike relying on file extensions (which can be wrong or missing), magic byte detection is reliable and tamper-resistant.

### Key Characteristics

- **Pure JavaScript** -- no native dependencies
- **ESM only** (v17+) -- requires `import`, not `require`
- **Works in Node.js and browsers**
- **Supports 100+ file types**
- **Small and fast** -- only reads the minimum bytes needed
- **Typed** -- full TypeScript type definitions included

### Installation

```bash
npm install file-type
```

> **Note:** Since v17, `file-type` is ESM-only. For CommonJS projects, use v16 or use dynamic `import()`.

---

## 2. Core API

### `fileTypeFromBuffer(buffer)`

Detect file type from a `Uint8Array` or `ArrayBuffer`.

```javascript
import { fileTypeFromBuffer } from 'file-type';
import { readFile } from 'node:fs/promises';

const buffer = await readFile('unknown-file');
const result = await fileTypeFromBuffer(buffer);

if (result) {
  console.log(result.ext);  // "png"
  console.log(result.mime); // "image/png"
} else {
  console.log('Could not determine file type');
}
```

**Returns:** `{ ext: string, mime: string } | undefined`

### `fileTypeFromFile(filePath)`

Detect file type from a file path. Only reads the minimum bytes needed (does not load entire file into memory).

```javascript
import { fileTypeFromFile } from 'file-type';

const result = await fileTypeFromFile('/path/to/unknown-file');
// { ext: 'mp4', mime: 'video/mp4' }
```

### `fileTypeFromStream(readableStream)`

Detect file type from a Node.js Readable Stream. The stream is not consumed -- it can still be piped/read after detection.

```javascript
import { fileTypeFromStream } from 'file-type';
import { createReadStream } from 'node:fs';

const stream = createReadStream('/path/to/file');
const result = await fileTypeFromStream(stream);
// { ext: 'wav', mime: 'audio/wav' }
// stream is still readable
```

### `fileTypeFromBlob(blob)`

Detect file type from a `Blob` (useful in browser contexts and Web API environments).

```javascript
import { fileTypeFromBlob } from 'file-type';

// From a fetch response
const response = await fetch('https://example.com/file');
const blob = await response.blob();
const result = await fileTypeFromBlob(blob);
```

### `fileTypeFromTokenizer(tokenizer)`

Low-level API for custom data sources. Uses the `strtok3` tokenizer interface.

```javascript
import { fileTypeFromTokenizer } from 'file-type';
import { fromBuffer } from 'strtok3';

const tokenizer = fromBuffer(buffer);
const result = await fileTypeFromTokenizer(tokenizer);
```

---

## 3. Supported File Types

### Images

| Extension | MIME Type | Description |
|-----------|----------|-------------|
| `jpg` | `image/jpeg` | JPEG image |
| `png` | `image/png` | PNG image |
| `gif` | `image/gif` | GIF image |
| `webp` | `image/webp` | WebP image |
| `tif` | `image/tiff` | TIFF image |
| `bmp` | `image/bmp` | BMP image |
| `ico` | `image/x-icon` | ICO icon |
| `avif` | `image/avif` | AVIF image |
| `heic` | `image/heic` | HEIC image (Apple) |
| `heif` | `image/heif` | HEIF image |
| `jxl` | `image/jxl` | JPEG XL |
| `psd` | `image/vnd.adobe.photoshop` | Photoshop document |
| `svg` | (not detected) | SVG is text-based, not magic-byte detectable |
| `cr2` | `image/x-canon-cr2` | Canon RAW |
| `cr3` | `image/x-canon-cr3` | Canon RAW v3 |
| `nef` | `image/x-nikon-nef` | Nikon RAW |
| `arw` | `image/x-sony-arw` | Sony RAW |
| `dng` | `image/x-adobe-dng` | Adobe DNG |
| `orf` | `image/x-olympus-orf` | Olympus RAW |
| `rw2` | `image/x-panasonic-rw2` | Panasonic RAW |

### Audio

| Extension | MIME Type | Description |
|-----------|----------|-------------|
| `mp3` | `audio/mpeg` | MP3 audio |
| `flac` | `audio/x-flac` | FLAC audio |
| `wav` | `audio/wav` | WAV audio |
| `ogg` | `audio/ogg` | OGG audio |
| `opus` | `audio/opus` | Opus audio |
| `m4a` | `audio/x-m4a` | M4A (AAC) audio |
| `aac` | `audio/aac` | AAC audio |
| `aif` | `audio/aiff` | AIFF audio |
| `wma` | `audio/x-ms-wma` | Windows Media Audio |
| `mid` | `audio/midi` | MIDI |
| `ape` | `audio/ape` | Monkey's Audio |
| `wv` | `audio/wavpack` | WavPack |
| `mpc` | `audio/x-musepack` | Musepack |
| `dsf` | `audio/x-dsf` | DSD Stream File |
| `amr` | `audio/amr` | AMR audio |

### Video

| Extension | MIME Type | Description |
|-----------|----------|-------------|
| `mp4` | `video/mp4` | MP4 video |
| `mkv` | `video/x-matroska` | Matroska video |
| `webm` | `video/webm` | WebM video |
| `mov` | `video/quicktime` | QuickTime video |
| `avi` | `video/x-msvideo` | AVI video |
| `wmv` | `video/x-ms-wmv` | Windows Media Video |
| `flv` | `video/x-flv` | Flash Video |
| `3gp` | `video/3gpp` | 3GPP video |
| `ogv` | `video/ogg` | OGG video |
| `m4v` | `video/x-m4v` | M4V video |
| `mpg` | `video/mpeg` | MPEG video |

### Documents

| Extension | MIME Type | Description |
|-----------|----------|-------------|
| `pdf` | `application/pdf` | PDF document |
| `docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | Word |
| `xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | Excel |
| `pptx` | `application/vnd.openxmlformats-officedocument.presentationml.presentation` | PowerPoint |
| `epub` | `application/epub+zip` | EPUB ebook |
| `odt` | `application/vnd.oasis.opendocument.text` | OpenDocument Text |

### Archives

| Extension | MIME Type | Description |
|-----------|----------|-------------|
| `zip` | `application/zip` | ZIP archive |
| `gz` | `application/gzip` | GZIP |
| `tar` | `application/x-tar` | TAR archive |
| `bz2` | `application/x-bzip2` | BZIP2 |
| `xz` | `application/x-xz` | XZ |
| `7z` | `application/x-7z-compressed` | 7-Zip |
| `rar` | `application/x-rar-compressed` | RAR archive |
| `zst` | `application/zstd` | Zstandard |
| `lz4` | `application/x-lz4` | LZ4 |

### Fonts

| Extension | MIME Type | Description |
|-----------|----------|-------------|
| `woff` | `font/woff` | WOFF |
| `woff2` | `font/woff2` | WOFF2 |
| `ttf` | `font/sfnt` | TrueType |
| `otf` | `font/otf` | OpenType |

### Other

| Extension | MIME Type | Description |
|-----------|----------|-------------|
| `wasm` | `application/wasm` | WebAssembly |
| `exe` | `application/x-msdownload` | Windows Executable |
| `elf` | `application/x-elf` | ELF binary |
| `mach-o` | `application/x-mach-binary` | Mach-O binary |
| `swf` | `application/x-shockwave-flash` | Flash SWF |
| `sqlite` | `application/x-sqlite3` | SQLite database |
| `ics` | `text/calendar` | iCalendar |
| `glb` | `model/gltf-binary` | glTF binary 3D |
| `stl` | `model/stl` | STL 3D model |

---

## 4. Usage Patterns

### Pattern 1: Upload Validation

```javascript
import { fileTypeFromBuffer } from 'file-type';

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'audio/mpeg', 'audio/x-flac', 'audio/wav',
  'video/mp4', 'video/quicktime',
  'application/pdf'
]);

async function validateUpload(buffer, declaredMimeType) {
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected) {
    return { valid: false, reason: 'Unknown file type' };
  }

  if (!ALLOWED_TYPES.has(detected.mime)) {
    return { valid: false, reason: `File type ${detected.mime} not allowed` };
  }

  // Warn if declared type doesn't match detected type
  if (declaredMimeType && declaredMimeType !== detected.mime) {
    console.warn(`Declared MIME ${declaredMimeType} differs from detected ${detected.mime}`);
  }

  return { valid: true, ext: detected.ext, mime: detected.mime };
}
```

### Pattern 2: Route Processing by Type

```javascript
import { fileTypeFromBuffer } from 'file-type';

async function routeArtifact(buffer, filename) {
  const type = await fileTypeFromBuffer(buffer);

  if (!type) {
    // Fall back to extension-based detection for text files
    if (filename.endsWith('.md')) return processMarkdown(buffer);
    if (filename.endsWith('.json')) return processJSON(buffer);
    if (filename.endsWith('.yaml') || filename.endsWith('.yml')) return processYAML(buffer);
    throw new Error('Cannot determine file type');
  }

  // Route based on MIME category
  const category = type.mime.split('/')[0];

  switch (category) {
    case 'image':  return processImage(buffer, type);
    case 'audio':  return processAudio(buffer, type);
    case 'video':  return processVideo(buffer, type);
    default:
      // Route by specific MIME
      switch (type.mime) {
        case 'application/pdf':  return processPDF(buffer);
        case 'application/zip':  return processArchive(buffer, type);
        default: return processGeneric(buffer, type);
      }
  }
}
```

### Pattern 3: Stream Processing (Memory Efficient)

```javascript
import { fileTypeFromStream } from 'file-type';
import { createReadStream } from 'node:fs';

async function processLargeFile(filePath) {
  const stream = createReadStream(filePath);

  // Detect type without loading full file
  const type = await fileTypeFromStream(stream);

  if (!type) {
    stream.destroy();
    throw new Error('Unknown file type');
  }

  // Stream is still usable -- pipe it to the appropriate processor
  if (type.mime.startsWith('audio/')) {
    stream.pipe(audioProcessor(type));
  } else if (type.mime.startsWith('video/')) {
    stream.pipe(videoProcessor(type));
  } else {
    stream.destroy();
  }
}
```

### Pattern 4: Browser File Input

```javascript
import { fileTypeFromBlob } from 'file-type';

document.getElementById('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const type = await fileTypeFromBlob(file);

  if (type) {
    console.log(`Detected: ${type.ext} (${type.mime})`);
  } else {
    console.log('Could not detect file type -- may be a text file');
  }
});
```

### Pattern 5: Checking Minimum Bytes Needed

```javascript
import { fileTypeFromBuffer } from 'file-type';

// file-type typically needs only the first 4100 bytes
// For network scenarios, you can fetch just the header
async function detectRemoteFileType(url) {
  const response = await fetch(url, {
    headers: { Range: 'bytes=0-4100' }
  });
  const buffer = await response.arrayBuffer();
  return fileTypeFromBuffer(new Uint8Array(buffer));
}
```

---

## 5. Important Caveats

### Text-Based Formats Not Detected

`file-type` works on **binary magic bytes** and cannot detect text-based formats:
- `.txt`, `.csv`, `.tsv`
- `.json`, `.xml`, `.yaml`
- `.html`, `.css`, `.js`, `.ts`
- `.md`, `.rst`
- `.svg` (even though it is an image format)

For these, fall back to file extension checking or content heuristics.

### Minimum Buffer Size

The library needs a minimum number of bytes to detect certain types. While most types can be detected from the first few bytes, some (like MP3 without ID3 headers) may need more. Generally, **4100 bytes** is sufficient for all supported types.

### ESM-Only (v17+)

Since version 17, the package is ESM-only:

```javascript
// This works
import { fileTypeFromBuffer } from 'file-type';

// This does NOT work in v17+
const { fileTypeFromBuffer } = require('file-type');

// Workaround for CommonJS
const { fileTypeFromBuffer } = await import('file-type');
```

### Return Value When Unknown

All functions return `undefined` (not `null`) when the file type cannot be determined. Always check for this.

---

## 6. Companion Libraries

| Library | Purpose |
|---------|---------|
| `file-type` | Detect file type from binary data |
| `image-type` | Subset -- detect image types only |
| `is-jpg`, `is-png`, etc. | Check for specific types |
| `file-type-mime` | Alternative: MIME detection from extension |
| `mmmagic` | Node.js binding to libmagic (more formats, native dep) |
| `mime-types` | Map extensions to MIME types (not magic-byte based) |

---

## 7. Relevance to Sandbox Capability Curator

In the artifact ingestion pipeline:

1. **First step of ingestion**: Always detect file type from magic bytes before trusting the file extension or user-declared MIME type.
2. **Security**: Prevent disguised files (e.g., an executable renamed to `.jpg`) from being processed as media.
3. **Router**: Use detected MIME type to route artifacts to the correct processing pipeline (image, audio, video, document, archive).
4. **Metadata enrichment**: Attach the verified MIME type and extension to the artifact record.
5. **Format support matrix**: Know which formats the pipeline can handle and reject unsupported ones early with clear error messages.
6. **Memory efficiency**: Use `fileTypeFromStream` for large files to avoid loading entire buffers into memory.
