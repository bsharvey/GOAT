---
archetypes: [alvin, oranos]
skills: [sandbox-curation, threat-detection, constitutional-validation]
training_cluster: 04-sandbox-capability-curator
domain: security
difficulty: advanced
version: 1.0
---
# C2PA Specification - Content Provenance and Authenticity

> Reference: C2PA Specification v2.0
> Source: https://c2pa.org/specifications/specifications/2.0/specs/C2PA_Specification.html
> Purpose: Sandbox Capability Curator -- understanding content credentials for ingested artifacts

---

## 1. What is C2PA?

The **Coalition for Content Provenance and Authenticity (C2PA)** is a Joint Development Foundation project that defines an open technical standard for certifying the provenance and history of digital content. The specification provides a mechanism for producers, editors, and publishers to cryptographically bind **content credentials** to media assets (images, video, audio, documents, and other file types).

### Core Goals

- **Provenance**: Track the origin of digital content -- who created it, when, with what tool.
- **Authenticity**: Verify that content has not been tampered with since it was signed.
- **Transparency**: Disclose AI-generated or AI-edited content through standardized assertions.
- **Interoperability**: Work across platforms, applications, and file formats via a common manifest format.

### Key Terminology

| Term | Definition |
|------|-----------|
| **Content Credential** | A signed set of metadata bound to an asset, providing provenance information |
| **Manifest** | A structured data object containing claims and assertions about an asset |
| **Manifest Store** | A container embedded in or linked to an asset that holds one or more manifests |
| **Claim** | A signed assertion set within a manifest declaring facts about the asset |
| **Assertion** | An individual statement of fact (e.g., "this image was created by tool X") |
| **Active Manifest** | The most recent manifest in the manifest store, representing current state |
| **Ingredient** | A reference to a source asset that was used to produce the current asset |

---

## 2. How Content Credentials Work

### Lifecycle Overview

1. **Creation**: A tool (camera, editor, AI generator) creates or modifies content.
2. **Claim Generation**: The tool generates a claim containing assertions about what was done.
3. **Signing**: The claim is cryptographically signed using a certificate chain.
4. **Embedding**: The signed manifest (containing the claim) is embedded into the asset or stored externally and linked.
5. **Verification**: A consumer/validator reads the manifest store, checks the signature, and verifies the hash bindings to confirm integrity.

### Hash Binding

The content of the asset itself is hashed, and that hash is included in the claim. This creates a tamper-evident link between the manifest and the actual media data. If even a single byte of the asset changes (outside the manifest store area), the hash will no longer match, and verification will fail.

### Chain of Provenance

When an asset is edited, the editor creates a **new manifest** that:
- References the previous manifest(s) as **ingredients**
- Describes what actions were performed
- Signs the new claim with its own certificate

This creates a chain of manifests, each pointing back to their predecessors, forming a **provenance chain**.

---

## 3. Manifest Structure

### Manifest Store

The **Manifest Store** is the top-level container. It is a JUMBF (JPEG Universal Metadata Box Format) structure that can be:

- **Embedded** directly in the asset file (preferred for JPEG, PNG, TIFF, MP4, WAV, etc.)
- **Sidecar** stored as a separate `.c2pa` file linked to the asset
- **Cloud-stored** and referenced via a URL

Structure:
```
Manifest Store
  +-- Manifest 1 (oldest)
  |     +-- Claim
  |     +-- Claim Signature
  |     +-- Assertions
  |     +-- Credential Store
  +-- Manifest 2
  |     +-- Claim
  |     +-- ...
  +-- Manifest N (Active Manifest -- most recent)
        +-- Claim
        +-- Claim Signature
        +-- Assertions
        +-- Credential Store
```

### Manifest

Each **Manifest** is a JUMBF superbox containing:

| Component | Description |
|-----------|-------------|
| **Claim** | The signed declaration of assertions; references each assertion by URI |
| **Claim Signature** | A COSE (CBOR Object Signing and Encryption) signature over the claim |
| **Assertion Store** | Contains all assertion boxes referenced by the claim |
| **Credential Store** | Contains the X.509 certificate chain used for signing |

### Claim

The **Claim** is a CBOR-encoded structure containing:

- `dc:title` -- optional title for the manifest
- `dc:format` -- MIME type of the asset
- `instanceID` -- unique identifier for this asset instance
- `claim_generator` -- identifier of the software that created the claim
- `claim_generator_info` -- detailed info about the generating tool (name, version)
- `assertions` -- array of hashed URIs pointing to assertions in the assertion store
- `ingredients` -- references to source manifests/assets
- `alg` -- hash algorithm used (e.g., `sha256`, `sha384`, `sha512`)
- `hash.data` -- array of hash exclusion ranges and data hashes binding the claim to asset bytes

### Claim Signature (COSE Sign1)

The claim is signed using **COSE Sign1** (RFC 9052):

```
COSE_Sign1 = [
  protected_headers,   // algorithm, certificate chain reference
  unprotected_headers, // timestamp token (RFC 3161)
  payload,             // the serialized claim bytes
  signature            // the digital signature
]
```

---

## 4. Assertions

Assertions are individual statements of fact about the asset. Each assertion is stored in the Assertion Store and referenced by the Claim via a hashed URI.

### Standard Assertion Types

#### 4.1 Actions Assertion (`c2pa.actions`)

Describes what actions were performed on the asset:

```json
{
  "actions": [
    {
      "action": "c2pa.created",
      "softwareAgent": "Adobe Photoshop 25.0",
      "when": "2024-01-15T10:30:00Z"
    },
    {
      "action": "c2pa.edited",
      "softwareAgent": "Adobe Photoshop 25.0",
      "parameters": {
        "description": "Color correction applied"
      }
    }
  ]
}
```

**Standard actions include:**
- `c2pa.created` -- asset was originally created
- `c2pa.edited` -- asset was modified
- `c2pa.cropped` -- asset was cropped
- `c2pa.resized` -- asset was resized
- `c2pa.filtered` -- a filter was applied
- `c2pa.drawing` -- manual drawing/painting
- `c2pa.opened` -- asset was opened (no changes)
- `c2pa.placed` -- asset was placed/composited into another
- `c2pa.transcoded` -- format conversion
- `c2pa.published` -- asset was published
- `c2pa.removed` -- content was removed
- `c2pa.repackaged` -- asset was repackaged without content change
- `c2pa.unknown` -- action type is unknown

#### 4.2 Creative Work Assertion (`stds.schema-org.CreativeWork`)

Provides authorship and copyright metadata using schema.org vocabulary:

```json
{
  "@type": "CreativeWork",
  "author": [
    {
      "@type": "Person",
      "name": "Jane Photographer",
      "identifier": "https://example.com/janep"
    }
  ],
  "copyrightNotice": "Copyright 2024 Jane Photographer",
  "copyrightYear": 2024
}
```

#### 4.3 EXIF Assertion (`stds.exif`)

Contains EXIF metadata from cameras:

```json
{
  "EXIF": {
    "Make": "Canon",
    "Model": "EOS R5",
    "DateTimeOriginal": "2024:01:15 10:30:00",
    "GPSLatitude": "37.7749",
    "GPSLongitude": "-122.4194"
  }
}
```

#### 4.4 Data Hash Assertion (`c2pa.hash.data`)

Binds the manifest to the asset data via hash:

```json
{
  "exclusions": [
    { "start": 0, "length": 1024 },
    { "start": 50000, "length": 8192 }
  ],
  "name": "jumbf manifest",
  "alg": "sha256",
  "hash": "base64-encoded-hash-value"
}
```

#### 4.5 Ingredient Assertion (via Claim)

References source assets used to create the current one, including:
- `title` -- name of the ingredient
- `format` -- MIME type
- `instanceID` / `documentID` -- unique identifiers
- `relationship` -- `parentOf`, `componentOf`, or `inputTo`
- `thumbnail` -- optional thumbnail of the ingredient
- `manifest` -- reference to the ingredient's own manifest

#### 4.6 Thumbnail Assertion (`c2pa.thumbnail.claim.*`)

An embedded thumbnail image for display in credential viewers.

#### 4.7 AI/ML Training and Usage Assertions

- `c2pa.ai_generated` -- indicates the asset was generated by AI
- `c2pa.ai_trained` -- indicates the asset was used in AI training
- Custom assertions can declare AI model info, prompts used, etc.

### Custom Assertions

Third parties can define custom assertions using reverse-domain notation:
```
com.example.myassertion
```

---

## 5. Signing

### Trust Model

C2PA uses an **X.509 PKI trust model**:

1. **Signer** holds a private key and an X.509 certificate issued by a Certificate Authority (CA).
2. **Certificate Chain** links the signer's certificate up to a trusted root CA.
3. **Trust Lists** define which root CAs are trusted for C2PA signing.
4. **Validators** check the signature and certificate chain against known trust lists.

### Certificate Requirements

- Certificates MUST include the **Extended Key Usage (EKU)** OID `1.3.6.1.5.5.7.3.36` (id-kp-documentSigning) or the C2PA-specific EKU.
- The signing certificate MUST chain to a root CA in a recognized trust list.
- Certificates SHOULD use RSA (2048+ bits) or ECDSA (P-256, P-384, P-521) keys.
- Ed25519 is also supported.

### Supported Signature Algorithms

| Algorithm | COSE ID | Key Type |
|-----------|---------|----------|
| ES256 | -7 | ECDSA P-256 |
| ES384 | -35 | ECDSA P-384 |
| ES512 | -36 | ECDSA P-521 |
| PS256 | -37 | RSA-PSS 2048+ |
| PS384 | -38 | RSA-PSS 2048+ |
| PS512 | -39 | RSA-PSS 2048+ |
| Ed25519 | -8 | EdDSA |

### Timestamping

- Manifests SHOULD include an **RFC 3161 timestamp** from a trusted Time Stamp Authority (TSA).
- The timestamp is included in the COSE unprotected headers.
- This proves the signature was created at a specific time, even if the certificate later expires or is revoked.

### Signing Process

1. Build all assertions and place them in the Assertion Store.
2. Compute hashes of the asset data (excluding the manifest store region).
3. Create the Claim referencing all assertions by their hashed URIs.
4. Serialize the Claim to CBOR.
5. Sign the CBOR-encoded Claim using COSE Sign1 with the signer's private key.
6. Optionally obtain an RFC 3161 timestamp.
7. Assemble the full Manifest (Claim + Signature + Assertions + Credentials).
8. Embed the Manifest Store into the asset.

### Verification Process

1. Extract the Manifest Store from the asset.
2. Locate the Active Manifest.
3. Verify the COSE signature against the embedded certificate.
4. Validate the certificate chain up to a trusted root.
5. Check the timestamp (if present) for validity.
6. Recompute the data hash and compare it to the hash in the Claim.
7. Verify each assertion's hash matches the Claim's hashed URI references.
8. Report the validation status and display the content credentials.

---

## 6. Supported File Formats

C2PA v2.0 supports embedding manifests in:

| Format | Embedding Method |
|--------|-----------------|
| JPEG | JUMBF in APP11 marker segments |
| PNG | C2PA chunk (caBX) |
| TIFF/DNG | JUMBF IFD entry |
| WebP | RIFF chunk |
| GIF | Application Extension Block |
| MP4/MOV | JUMBF in uuid box |
| WAV | JUMBF in a RIFF chunk |
| RIFF/AVI | JUMBF in RIFF chunk |
| SVG | Base64-encoded in metadata element |
| PDF | Incremental update with JUMBF |
| MP3 | ID3v2 frame |
| HEIF/HEIC | JUMBF in meta box |
| AVIF | JUMBF in meta box |

For unsupported formats, **sidecar manifests** (`.c2pa` files) can be used.

---

## 7. Key Implementation Libraries

| Library | Language | Maintainer |
|---------|----------|-----------|
| `c2pa-rs` | Rust | C2PA / Adobe |
| `c2pa-node` | Node.js (via NAPI bindings to Rust) | C2PA |
| `c2pa-python` | Python (via bindings to Rust) | C2PA |
| `c2pa-c` | C (FFI bindings to Rust) | C2PA |
| `c2pa-js` (WASM) | JavaScript/Browser | C2PA |

---

## 8. Relevance to Sandbox Capability Curator

When ingesting uploaded artifacts, the curator should:

1. **Check for existing C2PA manifests** in uploaded images, audio, and video.
2. **Extract provenance data** to populate skill metadata (author, creation tool, modification history).
3. **Detect AI-generated content** via `c2pa.ai_generated` assertions.
4. **Preserve the manifest chain** when transforming assets -- create new manifests with ingredients referencing the original.
5. **Consider signing curated artifacts** with C2PA credentials to establish a provenance chain for skills and tools produced by the pipeline.
6. **Validate integrity** of uploaded assets by verifying C2PA signatures before processing.
