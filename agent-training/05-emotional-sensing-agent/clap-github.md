---
archetypes: [george, harvey]
skills: [emotional-sensing, music-signal]
training_cluster: 05-emotional-sensing-agent
domain: emotional-intelligence
difficulty: advanced
version: 1.0
---
# CLAP GitHub Repository: Installation, Usage, and Inference

## Training Context

This is the practical implementation guide for LAION-CLAP. The Emotional Sensing Agent uses CLAP as its core audio-to-semantic bridge. This document covers how to install, load, and run inference with CLAP in production.

**Repository**: https://github.com/LAION-AI/CLAP

---

## Installation

### Via PyPI (Recommended)

```bash
pip install laion-clap
```

### From Source

```bash
git clone https://github.com/LAION-AI/CLAP.git
cd CLAP
pip install -e .
```

### Dependencies

Key dependencies installed automatically:
- `torch` (>= 1.11)
- `torchaudio`
- `transformers` (HuggingFace)
- `librosa`
- `numpy`
- `h5py`

### System Requirements

- Python 3.8+
- CUDA-capable GPU recommended for real-time inference (CPU works but is slower)
- Approximately 500MB-1GB GPU memory per loaded model

---

## Model Downloads

Model checkpoints are hosted on HuggingFace and are **auto-downloaded** on first use. You can also pre-download them:

### Available Checkpoints

| Checkpoint | Description | Auto-download Key |
|-----------|-------------|-------------------|
| `630k-audioset-best.pt` | HTSAT encoder, trained on 630K + AudioSet | Yes |
| `630k-audioset-fusion-best.pt` | HTSAT with feature fusion, best overall | Yes |
| `630k-best.pt` | HTSAT encoder, trained on 630K only | Yes |
| `630k-fusion-best.pt` | HTSAT with feature fusion, 630K only | Yes |
| `music_audioset_epoch_15_esc_90.14.pt` | PANN-based, music-focused | Yes |
| `music_speech_audioset_epoch_15_esc_89.98.pt` | PANN-based, music+speech | Yes |

### Manual Download

```bash
# From HuggingFace
wget https://huggingface.co/lukewys/laion_clap/resolve/main/630k-audioset-fusion-best.pt
```

---

## Core Usage

### Loading the Model

```python
import laion_clap

# Standard model (no feature fusion)
model = laion_clap.CLAP_Module(enable_fusion=False, amodel='HTSAT-tiny')
model.load_ckpt()  # auto-downloads default checkpoint

# Feature fusion model (recommended for best performance)
model = laion_clap.CLAP_Module(enable_fusion=True, amodel='HTSAT-tiny')
model.load_ckpt()  # auto-downloads fusion checkpoint

# Specific checkpoint
model = laion_clap.CLAP_Module(enable_fusion=True)
model.load_ckpt(ckpt="path/to/630k-audioset-fusion-best.pt")

# Music-focused model with PANN backend
model = laion_clap.CLAP_Module(enable_fusion=False, amodel='PANN-14')
model.load_ckpt(model_id=3)  # music_audioset checkpoint
```

### GPU Usage

```python
# Move model to GPU
model = laion_clap.CLAP_Module(enable_fusion=True, device='cuda')
model.load_ckpt()
```

---

## Inference Examples

### Getting Audio Embeddings from Files

```python
import laion_clap
import numpy as np

model = laion_clap.CLAP_Module(enable_fusion=True)
model.load_ckpt()

# Single file
audio_file = ["path/to/audio.wav"]
audio_embed = model.get_audio_embedding_from_filelist(x=audio_file, use_tensor=False)
print(audio_embed.shape)  # (1, 512)

# Multiple files
audio_files = ["audio1.wav", "audio2.wav", "audio3.wav"]
audio_embeds = model.get_audio_embedding_from_filelist(x=audio_files, use_tensor=False)
print(audio_embeds.shape)  # (3, 512)
```

### Getting Audio Embeddings from Raw Data

```python
import laion_clap
import numpy as np
import librosa

model = laion_clap.CLAP_Module(enable_fusion=True)
model.load_ckpt()

# Load audio as numpy array (48kHz expected)
audio_data, sr = librosa.load("audio.wav", sr=48000)

# Ensure correct shape: list of 1D numpy arrays
audio_embed = model.get_audio_embedding_from_data(
    x=[audio_data],
    use_tensor=False
)
print(audio_embed.shape)  # (1, 512)

# For real-time: process chunks
chunk_duration = 10  # seconds
chunk_samples = 48000 * chunk_duration
chunks = [audio_data[i:i+chunk_samples] for i in range(0, len(audio_data), chunk_samples)]

# Pad last chunk if needed
if len(chunks[-1]) < chunk_samples:
    chunks[-1] = np.pad(chunks[-1], (0, chunk_samples - len(chunks[-1])))

chunk_embeds = model.get_audio_embedding_from_data(x=chunks, use_tensor=False)
print(chunk_embeds.shape)  # (num_chunks, 512)
```

### Getting Text Embeddings

```python
import laion_clap

model = laion_clap.CLAP_Module(enable_fusion=True)
model.load_ckpt()

# Single text
text = ["a happy upbeat song with guitar"]
text_embed = model.get_text_embedding(text, use_tensor=False)
print(text_embed.shape)  # (1, 512)

# Multiple texts
texts = [
    "sad melancholic piano music",
    "energetic electronic dance music",
    "calm ambient nature sounds",
    "angry aggressive heavy metal",
    "peaceful classical string quartet"
]
text_embeds = model.get_text_embedding(texts, use_tensor=False)
print(text_embeds.shape)  # (5, 512)
```

### Computing Similarity (Zero-Shot Classification)

```python
import laion_clap
import numpy as np

model = laion_clap.CLAP_Module(enable_fusion=True)
model.load_ckpt()

# Define categories as text descriptions
categories = [
    "happy cheerful uplifting music",
    "sad melancholic depressing music",
    "angry aggressive intense music",
    "calm peaceful relaxing music",
    "fearful tense suspenseful music"
]

# Get embeddings
audio_embed = model.get_audio_embedding_from_filelist(
    x=["test_song.wav"], use_tensor=False
)  # (1, 512)

text_embeds = model.get_text_embedding(categories, use_tensor=False)  # (5, 512)

# Compute cosine similarity
# Embeddings are already L2-normalized by the model
similarities = audio_embed @ text_embeds.T  # (1, 5)

# Convert to probabilities
temperature = 0.07
logits = similarities / temperature
probs = np.exp(logits) / np.exp(logits).sum(axis=-1, keepdims=True)

for cat, prob in zip(categories, probs[0]):
    print(f"{cat}: {prob:.3f}")
```

### Using PyTorch Tensors (GPU-accelerated)

```python
import laion_clap
import torch

model = laion_clap.CLAP_Module(enable_fusion=True, device='cuda')
model.load_ckpt()

# Get embeddings as tensors (stays on GPU)
audio_embed = model.get_audio_embedding_from_filelist(
    x=["audio.wav"], use_tensor=True
)  # torch.Tensor on CUDA, shape (1, 512)

text_embed = model.get_text_embedding(
    ["upbeat electronic music"], use_tensor=True
)  # torch.Tensor on CUDA, shape (1, 512)

# GPU-accelerated similarity
similarity = torch.cosine_similarity(audio_embed, text_embed)
print(f"Similarity: {similarity.item():.4f}")
```

---

## Advanced Usage

### Batch Processing for Throughput

```python
import laion_clap
import numpy as np
import librosa
from pathlib import Path

model = laion_clap.CLAP_Module(enable_fusion=True, device='cuda')
model.load_ckpt()

# Process a directory of audio files
audio_dir = Path("music_library/")
audio_files = list(audio_dir.glob("*.wav")) + list(audio_dir.glob("*.mp3"))

# Process in batches
batch_size = 32
all_embeddings = []

for i in range(0, len(audio_files), batch_size):
    batch = [str(f) for f in audio_files[i:i+batch_size]]
    embeds = model.get_audio_embedding_from_filelist(x=batch, use_tensor=False)
    all_embeddings.append(embeds)

all_embeddings = np.concatenate(all_embeddings, axis=0)
print(f"Processed {len(audio_files)} files, shape: {all_embeddings.shape}")
```

### Streaming / Real-Time Audio Processing

```python
import laion_clap
import numpy as np
import sounddevice as sd

model = laion_clap.CLAP_Module(enable_fusion=True)
model.load_ckpt()

# Pre-compute emotion anchors
emotion_texts = [
    "happy joyful music", "sad melancholic music",
    "energetic intense music", "calm peaceful music"
]
emotion_embeds = model.get_text_embedding(emotion_texts, use_tensor=False)

# Real-time processing
SAMPLE_RATE = 48000
CHUNK_DURATION = 5  # seconds
CHUNK_SIZE = SAMPLE_RATE * CHUNK_DURATION
buffer = np.zeros(CHUNK_SIZE, dtype=np.float32)

def audio_callback(indata, frames, time, status):
    global buffer
    # Shift buffer and append new data
    buffer = np.roll(buffer, -frames)
    buffer[-frames:] = indata[:, 0]

def get_current_emotion():
    audio_embed = model.get_audio_embedding_from_data(
        x=[buffer], use_tensor=False
    )
    similarities = audio_embed @ emotion_embeds.T
    return dict(zip(emotion_texts, similarities[0]))

# Start streaming
stream = sd.InputStream(
    samplerate=SAMPLE_RATE,
    channels=1,
    callback=audio_callback,
    blocksize=1024
)
stream.start()
```

### Extracting Intermediate Features

```python
# Access the audio encoder directly for intermediate representations
with torch.no_grad():
    # Get the model's audio branch
    audio_features = model.model.audio_branch(audio_input)
    # This gives you pre-projection features that may be useful
    # for fine-grained analysis
```

---

## Model Variants: When to Use What

### For the Emotional Sensing Agent

| Use Case | Recommended Model | Reason |
|----------|------------------|--------|
| **General emotional sensing** | `630k-audioset-fusion-best.pt` | Best overall accuracy, feature fusion captures nuance |
| **Music-specific analysis** | `music_audioset_epoch_15_esc_90.14.pt` | Optimized for musical content |
| **Low-latency requirements** | `630k-best.pt` (no fusion) | Slightly faster inference |
| **Speech emotion** | `music_speech_audioset_epoch_15_esc_89.98.pt` | Includes speech training data |

### Performance Benchmarks (approximate)

| Model | ESC-50 Accuracy | AudioSet mAP | Inference Time (CPU, 10s audio) |
|-------|----------------|--------------|-------------------------------|
| HTSAT (fusion) | 93.1% | 45.0% | ~150ms |
| HTSAT (no fusion) | 91.5% | 43.2% | ~120ms |
| PANN-14 | 90.1% | 41.8% | ~80ms |

---

## Supported Audio Formats

The model processes audio through `librosa` and `torchaudio`, supporting:

- **WAV** (recommended, lossless)
- **MP3** (via ffmpeg backend)
- **FLAC** (lossless compressed)
- **OGG/Vorbis**
- **M4A/AAC** (via ffmpeg backend)

### Audio Requirements

- **Sample Rate**: Internally resampled to 48,000 Hz
- **Channels**: Converted to mono (averaged if stereo)
- **Duration**: Default 10 seconds; longer audio is truncated or segmented, shorter is zero-padded
- **Bit Depth**: Any standard bit depth (16-bit, 24-bit, 32-bit float)

---

## HuggingFace Transformers Integration

CLAP is also available through the HuggingFace `transformers` library:

```python
from transformers import ClapProcessor, ClapModel
import librosa

# Load from HuggingFace Hub
model = ClapModel.from_pretrained("laion/clap-htsat-fused")
processor = ClapProcessor.from_pretrained("laion/clap-htsat-fused")

# Process audio
audio, sr = librosa.load("audio.wav", sr=48000)
inputs = processor(audios=[audio], return_tensors="pt", sampling_rate=48000)
audio_embed = model.get_audio_features(**inputs)  # (1, 512)

# Process text
inputs = processor(text=["happy upbeat music"], return_tensors="pt", padding=True)
text_embed = model.get_text_features(**inputs)  # (1, 512)

# Similarity
similarity = torch.cosine_similarity(audio_embed, text_embed)
```

### HuggingFace Model IDs

- `laion/clap-htsat-unfused` -- HTSAT without feature fusion
- `laion/clap-htsat-fused` -- HTSAT with feature fusion (recommended)
- `laion/larger_clap_general` -- Larger model variant
- `laion/larger_clap_music` -- Larger model, music-focused
- `laion/larger_clap_music_and_speech` -- Larger model, music + speech

---

## Troubleshooting

### Common Issues

**Out of Memory**: Reduce batch size or use CPU for embedding extraction
```python
model = laion_clap.CLAP_Module(enable_fusion=True, device='cpu')
```

**Audio loading errors**: Ensure ffmpeg is installed for non-WAV formats
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg
```

**Shape mismatch**: Ensure audio data is 1D numpy array at 48kHz
```python
audio = librosa.load("file.wav", sr=48000, mono=True)[0]
assert audio.ndim == 1
```

**Inconsistent similarity scores**: Always use the same model checkpoint for both audio and text embeddings -- they must come from the same model to be in the same space.

---

## Key API Reference

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `CLAP_Module(enable_fusion, amodel, device)` | Config | Model instance | Initialize model |
| `.load_ckpt(ckpt=None, model_id=None)` | Path or ID | None | Load checkpoint |
| `.get_audio_embedding_from_filelist(x, use_tensor)` | List[str] | ndarray/Tensor `(N, 512)` | Embed audio files |
| `.get_audio_embedding_from_data(x, use_tensor)` | List[ndarray] | ndarray/Tensor `(N, 512)` | Embed raw audio data |
| `.get_text_embedding(x, use_tensor)` | List[str] | ndarray/Tensor `(N, 512)` | Embed text descriptions |
