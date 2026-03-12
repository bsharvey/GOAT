---
archetypes: [jarvis, alvin]
skills: [infrastructure, sandbox-curation]
training_cluster: 01-infrastructure-architect
domain: infrastructure
difficulty: intermediate
version: 1.0
---
# Cloudflare R2 - Training Reference

> Training material for JARVIS Infrastructure Architect agent.
> Source: https://developers.cloudflare.com/r2/

---

## 1. Overview

Cloudflare R2 is an S3-compatible object storage service with **zero egress fees**. It stores data across Cloudflare's global network and is accessible via the S3 API, Workers bindings, or public bucket URLs.

### Key Properties
- **Zero egress fees**: No charges for data read out of R2 (unlike AWS S3, GCS, Azure Blob)
- **S3 API compatible**: Drop-in replacement for most S3 workflows
- **Workers binding**: Native integration with Workers for low-latency access
- **Global distribution**: Objects are stored with automatic redundancy
- **Multipart uploads**: Support for large file uploads
- **Object lifecycle rules**: Automatic deletion or transition of objects
- **Public buckets**: Serve objects directly via HTTP
- **Event notifications**: Trigger Workers on object changes

---

## 2. Access Methods

### Method 1: Workers Binding (Recommended for Workers)

```toml
# wrangler.toml
[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "my-bucket"
preview_bucket_name = "my-bucket-preview"  # for local dev
```

```javascript
export default {
  async fetch(request, env) {
    // No authentication needed - binding is pre-authenticated
    const object = await env.MY_BUCKET.get("file.txt");
    return new Response(object.body);
  },
};
```

### Method 2: S3 API (For external tools, SDKs, CLI)

```javascript
// Using AWS SDK v3
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const S3 = new S3Client({
  region: "auto",
  endpoint: "https://<ACCOUNT_ID>.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "<R2_ACCESS_KEY_ID>",
    secretAccessKey: "<R2_SECRET_ACCESS_KEY>",
  },
});

// Upload
await S3.send(new PutObjectCommand({
  Bucket: "my-bucket",
  Key: "file.txt",
  Body: "Hello R2",
  ContentType: "text/plain",
}));

// Download
const response = await S3.send(new GetObjectCommand({
  Bucket: "my-bucket",
  Key: "file.txt",
}));
```

```bash
# Using AWS CLI
aws s3 ls s3://my-bucket \
  --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com

aws s3 cp ./local-file.txt s3://my-bucket/remote-file.txt \
  --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

### Method 3: Public Bucket (Direct HTTP access)

```
# Enable public access via dashboard or API
# Objects are then accessible at:
https://pub-<hash>.r2.dev/<key>

# Or via custom domain:
https://assets.example.com/<key>
```

---

## 3. Workers Binding API

### Put (Upload)

```javascript
export default {
  async fetch(request, env) {
    // Simple put
    await env.MY_BUCKET.put("file.txt", "Hello World");

    // Put with metadata
    await env.MY_BUCKET.put("image.png", imageBuffer, {
      httpMetadata: {
        contentType: "image/png",
        cacheControl: "public, max-age=86400",
        contentDisposition: 'attachment; filename="image.png"',
        contentEncoding: "gzip",
        contentLanguage: "en-US",
      },
      customMetadata: {
        uploadedBy: "user-123",
        originalName: "photo.png",
        processedAt: new Date().toISOString(),
      },
      // Optional: SHA-256 checksum for integrity
      sha256: hexDigest,
      // Optional: MD5 checksum
      md5: base64Digest,
    });

    // Put from a ReadableStream
    await env.MY_BUCKET.put("large-file.dat", request.body);

    // Put with conditional (only if not exists)
    await env.MY_BUCKET.put("file.txt", data, {
      onlyIf: {
        // Standard conditional headers
        etagDoesNotMatch: "*",  // Only put if object doesn't exist
      },
    });

    return new Response("Uploaded");
  },
};
```

### Get (Download)

```javascript
export default {
  async fetch(request, env) {
    // Simple get
    const object = await env.MY_BUCKET.get("file.txt");

    if (object === null) {
      return new Response("Not found", { status: 404 });
    }

    // Object properties
    // object.key         - object key (string)
    // object.version     - version ID (string)
    // object.size        - size in bytes (number)
    // object.etag        - ETag (string)
    // object.httpEtag    - ETag with quotes for HTTP headers (string)
    // object.uploaded    - upload timestamp (Date)
    // object.httpMetadata - { contentType, cacheControl, ... }
    // object.customMetadata - { key: value, ... }
    // object.range       - requested range info
    // object.body        - ReadableStream
    // object.bodyUsed    - whether body has been consumed
    // object.arrayBuffer() - read as ArrayBuffer
    // object.text()      - read as string
    // object.json()      - read as parsed JSON
    // object.blob()      - read as Blob

    // Return as HTTP response with proper headers
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("content-length", object.size);

    return new Response(object.body, { headers });
  },
};
```

### Get with Range Requests

```javascript
export default {
  async fetch(request, env) {
    // Range request (partial content)
    const object = await env.MY_BUCKET.get("large-file.mp4", {
      range: {
        offset: 0,
        length: 1024 * 1024, // First 1MB
      },
    });

    // Or use HTTP range header
    const rangeHeader = request.headers.get("range");
    const objectWithRange = await env.MY_BUCKET.get("large-file.mp4", {
      range: request.headers,  // Pass the headers directly
    });

    if (objectWithRange === null) {
      return new Response("Not found", { status: 404 });
    }

    const headers = new Headers();
    objectWithRange.writeHttpMetadata(headers);
    headers.set("etag", objectWithRange.httpEtag);

    // 206 for partial content
    const status = objectWithRange.range ? 206 : 200;

    return new Response(objectWithRange.body, { status, headers });
  },
};
```

### Conditional Get

```javascript
const object = await env.MY_BUCKET.get("file.txt", {
  onlyIf: {
    etagMatches: '"abc123"',       // If-Match
    etagDoesNotMatch: '"xyz789"',  // If-None-Match
    uploadedBefore: new Date("2024-01-01"), // If-Unmodified-Since
    uploadedAfter: new Date("2023-01-01"),  // If-Modified-Since
  },
});
```

### Head (Metadata Only)

```javascript
const head = await env.MY_BUCKET.head("file.txt");
if (head) {
  console.log(head.size);          // file size
  console.log(head.etag);          // ETag
  console.log(head.httpMetadata);  // content type, etc.
  console.log(head.customMetadata);
  // Note: head does NOT have a body
}
```

### Delete

```javascript
// Delete single object
await env.MY_BUCKET.delete("file.txt");

// Delete multiple objects
await env.MY_BUCKET.delete(["file1.txt", "file2.txt", "file3.txt"]);
```

### List

```javascript
const listed = await env.MY_BUCKET.list({
  prefix: "uploads/2024/",     // Filter by prefix
  delimiter: "/",              // Group by delimiter (folder simulation)
  limit: 1000,                 // Max objects per page (default: 1000)
  cursor: "...",               // Pagination cursor from previous response
  include: ["httpMetadata", "customMetadata"], // Include metadata in listing
});

// listed.objects: R2Object[] (without body)
// listed.truncated: boolean (more results available)
// listed.cursor: string (use for next page)
// listed.delimitedPrefixes: string[] (when using delimiter)

// Paginate through all objects
let cursor;
let allObjects = [];
do {
  const result = await env.MY_BUCKET.list({ prefix: "data/", cursor });
  allObjects.push(...result.objects);
  cursor = result.truncated ? result.cursor : undefined;
} while (cursor);
```

---

## 4. Multipart Uploads

For large files (recommended for files > 100 MB):

```javascript
export default {
  async fetch(request, env) {
    const key = "large-file.zip";

    // Create multipart upload
    const mpu = await env.MY_BUCKET.createMultipartUpload(key, {
      httpMetadata: { contentType: "application/zip" },
      customMetadata: { uploadType: "backup" },
    });

    // Upload parts (minimum 5 MB per part, except the last)
    const part1 = await mpu.uploadPart(1, chunk1); // partNumber, data
    const part2 = await mpu.uploadPart(2, chunk2);
    const part3 = await mpu.uploadPart(3, chunk3);

    // Complete the upload
    const object = await mpu.complete([part1, part2, part3]);
    // object is the completed R2Object

    return new Response(`Uploaded: ${object.key}, size: ${object.size}`);
  },
};
```

### Resume/Abort Multipart Upload

```javascript
// Resume an existing multipart upload
const mpu = env.MY_BUCKET.resumeMultipartUpload(key, uploadId);
const part4 = await mpu.uploadPart(4, chunk4);
await mpu.complete([part1, part2, part3, part4]);

// Abort a multipart upload (clean up incomplete parts)
const mpu = env.MY_BUCKET.resumeMultipartUpload(key, uploadId);
await mpu.abort();
```

---

## 5. Presigned URLs

Generate temporary URLs that grant access to private objects without exposing credentials:

```javascript
import { AwsClient } from "aws4fetch";

export default {
  async fetch(request, env) {
    const client = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    });

    const url = new URL(
      `https://${env.ACCOUNT_ID}.r2.cloudflarestorage.com/my-bucket/file.txt`
    );

    // Generate a presigned URL valid for 1 hour
    const signed = await client.sign(
      new Request(url, { method: "GET" }),
      {
        aws: { signQuery: true },
        headers: {
          "X-Amz-Expires": "3600", // 1 hour
        },
      }
    );

    return new Response(signed.url);
  },
};
```

---

## 6. Event Notifications

Trigger Workers when objects are created, updated, or deleted:

```toml
# wrangler.toml
[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "my-bucket"

# Event notification (configured via dashboard or API)
# Triggers a Worker when objects change
```

```javascript
// The notification consumer Worker
export default {
  async queue(batch, env) {
    for (const msg of batch.messages) {
      const event = msg.body;
      // event.action: "PutObject", "DeleteObject", "CopyObject"
      // event.bucket: bucket name
      // event.object: { key, size, eTag }

      if (event.action === "PutObject") {
        console.log(`New object: ${event.object.key} (${event.object.size} bytes)`);
        // Trigger processing pipeline
        await processNewObject(env, event.object.key);
      }

      msg.ack();
    }
  },
};
```

---

## 7. Object Lifecycle Rules

Automatically manage object lifecycles:

```javascript
// Configured via API or dashboard
// Example lifecycle rule:
{
  "rules": [
    {
      "id": "expire-temp-files",
      "enabled": true,
      "conditions": {
        "prefix": "tmp/"
      },
      "action": {
        "type": "Expire",
        "days": 7
      }
    },
    {
      "id": "abort-incomplete-uploads",
      "enabled": true,
      "action": {
        "type": "AbortIncompleteMultipartUpload",
        "days": 1
      }
    }
  ]
}
```

---

## 8. CORS Configuration

```json
[
  {
    "AllowedOrigins": ["https://example.com", "https://app.example.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## 9. S3 API Compatibility

### Supported S3 Operations

| Operation | Supported |
|-----------|-----------|
| PutObject | Yes |
| GetObject | Yes |
| HeadObject | Yes |
| DeleteObject | Yes |
| DeleteObjects (batch) | Yes |
| ListObjectsV2 | Yes |
| CopyObject | Yes |
| CreateMultipartUpload | Yes |
| UploadPart | Yes |
| CompleteMultipartUpload | Yes |
| AbortMultipartUpload | Yes |
| ListMultipartUploads | Yes |
| ListParts | Yes |
| PutBucketCors | Yes |
| GetBucketCors | Yes |
| HeadBucket | Yes |
| ListBuckets | Yes |

### Not Supported
- Bucket versioning (no versioned objects)
- Object Lock / Legal Hold
- Server-Side Encryption configuration (encryption is automatic)
- Bucket policies (use R2 API tokens or Worker bindings)
- S3 Select
- Storage classes (single storage class)
- Replication configuration

### S3 API Endpoint

```
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

Region is always `auto` for R2.

---

## 10. Migration from S3

### Using Wrangler (built-in)

```bash
# Copy from S3 to R2
npx wrangler r2 object put my-bucket/file.txt --file ./file.txt

# Bulk migration using super slurper (Dashboard)
# Dashboard > R2 > Create bucket > Migrate data
```

### Using rclone

```ini
# rclone.conf
[r2]
type = s3
provider = Cloudflare
access_key_id = <R2_ACCESS_KEY_ID>
secret_access_key = <R2_SECRET_ACCESS_KEY>
endpoint = https://<ACCOUNT_ID>.r2.cloudflarestorage.com
acl = private

[s3]
type = s3
provider = AWS
access_key_id = <AWS_ACCESS_KEY_ID>
secret_access_key = <AWS_SECRET_ACCESS_KEY>
region = us-east-1
```

```bash
# Sync from S3 to R2
rclone sync s3:source-bucket r2:dest-bucket --progress

# Copy specific files
rclone copy s3:source-bucket/path/ r2:dest-bucket/path/ --progress
```

---

## 11. Pricing

### Free Tier
| Resource | Included |
|----------|----------|
| Storage | 10 GB/month |
| Class A ops (write) | 1 million/month |
| Class B ops (read) | 10 million/month |
| Egress | Free (always) |

### Paid
| Resource | Price |
|----------|-------|
| Storage | $0.015 per GB/month |
| Class A operations (PUT, POST, LIST, etc.) | $4.50 per million |
| Class B operations (GET, HEAD) | $0.36 per million |
| Egress (data transfer out) | **Free** |
| Multipart upload parts | Counted as Class A |

### Cost Comparison (1 TB stored, 10M reads/month)

| Service | Storage | Egress (100GB) | Reads | Total |
|---------|---------|----------------|-------|-------|
| R2 | $15 | $0 | $3.60 | ~$18.60 |
| S3 | $23 | $9 | $4 | ~$36 |
| GCS | $20 | $12 | $4 | ~$36 |

---

## 12. Wrangler CLI for R2

```bash
# Create a bucket
npx wrangler r2 bucket create my-bucket

# List buckets
npx wrangler r2 bucket list

# Delete a bucket
npx wrangler r2 bucket delete my-bucket

# Upload an object
npx wrangler r2 object put my-bucket/path/file.txt --file ./local-file.txt

# Download an object
npx wrangler r2 object get my-bucket/path/file.txt --file ./local-file.txt

# Delete an object
npx wrangler r2 object delete my-bucket/path/file.txt
```

---

## 13. Patterns for JARVIS

### Pattern 1: Static Asset Storage with Cache

```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const key = url.pathname.slice(1); // Remove leading /

    // Check cache first
    const cache = caches.default;
    let response = await cache.match(request);
    if (response) return response;

    // Fetch from R2
    const object = await env.ASSETS.get(key);
    if (!object) {
      return new Response("Not found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=31536000, immutable");

    response = new Response(object.body, { headers });

    // Cache the response
    ctx.waitUntil(cache.put(request, response.clone()));

    return response;
  },
};
```

### Pattern 2: Upload with Processing Pipeline

```javascript
export default {
  async fetch(request, env) {
    if (request.method === "PUT") {
      const key = new URL(request.url).pathname.slice(1);

      // Upload to R2
      await env.UPLOADS.put(key, request.body, {
        httpMetadata: {
          contentType: request.headers.get("content-type"),
        },
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          status: "pending",
        },
      });

      // Queue for processing
      await env.PROCESS_QUEUE.send({
        bucket: "uploads",
        key,
        action: "process",
      });

      return new Response("Upload accepted", { status: 202 });
    }
  },
};
```

### Pattern 3: Presigned Upload URL (Client-Side Upload)

```javascript
export default {
  async fetch(request, env) {
    // Generate a presigned URL for the client to upload directly to R2
    // This avoids routing the upload through the Worker (size limits)
    const key = `uploads/${crypto.randomUUID()}`;

    // Create presigned URL using aws4fetch
    const client = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY,
      secretAccessKey: env.R2_SECRET_KEY,
    });

    const url = new URL(
      `https://${env.ACCOUNT_ID}.r2.cloudflarestorage.com/${env.BUCKET_NAME}/${key}`
    );

    const signed = await client.sign(
      new Request(url, { method: "PUT" }),
      { aws: { signQuery: true }, headers: { "X-Amz-Expires": "3600" } }
    );

    return Response.json({
      uploadUrl: signed.url,
      key,
    });
  },
};
```

---

## 14. Key Architectural Considerations for JARVIS

1. **Zero egress is the killer feature**: R2 eliminates egress costs entirely. For data-heavy workloads, this can save 30-60% vs. S3/GCS.
2. **Workers binding vs. S3 API**: Use Workers binding for Worker-to-R2 access (fastest, no auth overhead). Use S3 API for external tools, existing SDKs, and client-side presigned uploads.
3. **No versioning**: R2 does not support object versioning. If you need versioning, implement it in the key naming scheme (e.g., `file-v1.txt`, `file-v2.txt`).
4. **Max object size**: 5 TB per object. Use multipart uploads for files > 100 MB.
5. **Consistency**: R2 provides strong read-after-write consistency.
6. **Pair with Queues for processing**: Use R2 event notifications or explicit queue messages to trigger processing pipelines after uploads.
7. **Public buckets for CDN**: Enable public access on a bucket and attach a custom domain for a free CDN with no egress fees.
8. **Lifecycle rules**: Use lifecycle rules to automatically clean up temporary files, abort incomplete multipart uploads, and manage storage costs.
