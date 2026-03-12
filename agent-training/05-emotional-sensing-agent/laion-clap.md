---
archetypes: [george, harvey]
skills: [emotional-sensing, signal-sensing]
training_cluster: 05-emotional-sensing-agent
domain: emotional-intelligence
difficulty: advanced
version: 1.0
---
# LAION-CLAP: Contrastive Language-Audio Pretraining

## Training Context

This document describes LAION-CLAP, the foundational model enabling the JARVIS Emotional Sensing Agent to bridge audio signals and semantic text descriptions. CLAP is what allows us to take raw audio (music, speech, ambient sound) and project it into the same embedding space as textual emotion descriptors, enabling continuous emotional state estimation from audio streams.

---

## What Is CLAP?

**Contrastive Language-Audio Pretraining (CLAP)** is a model that learns to align audio and text in a shared embedding space through contrastive learning. Developed by LAION (Large-scale Artificial Intelligence Open Network), CLAP is the audio equivalent of OpenAI's CLIP (which aligns images and text).

The core idea: given a pair of (audio clip, text description), CLAP learns representations such that matched audio-text pairs are close together in embedding space, while unmatched pairs are pushed apart. After training, you can:

- Encode any audio clip into a **512-dimensional embedding vector**
- Encode any text description into a **512-dimensional embedding vector**
- Compute cosine similarity between them to measure semantic alignment
- Perform **zero-shot audio classification** by comparing an audio embedding against text label embeddings

### Key Paper

- **Title**: "Large-Scale Contrastive Language-Audio Pretraining with Feature Fusion and Keyword-to-Caption Augmentation"
- **Authors**: Yusong Wu, Ke Chen, Tianyu Zhang, Yuchen Hui, Taylor Berg-Kirkpatrick, Shlomo Dubnov (LAION)
- **Published**: 2023 (ICASSP 2023)
- **ArXiv**: 2211.06687

---

## The 512-Dimensional Embedding Space

Both audio and text encoders produce **512-dimensional embedding vectors**. This shared dimensionality is critical:

```
Audio Waveform --> Audio Encoder --> [512-d vector]
                                          |
                                    cosine similarity
                                          |
Text Description --> Text Encoder --> [512-d vector]
```

### Properties of the Embedding Space

- **Normalized**: Vectors are L2-normalized, so cosine similarity reduces to a dot product
- **Continuous**: Nearby points represent semantically similar content
- **Cross-modal**: Audio and text occupy the same space, enabling direct comparison
- **Compositional**: The space captures combinations of attributes (e.g., "sad slow piano" occupies a different region than "energetic fast drums")

### What the 512 Dimensions Encode

The dimensions are not individually interpretable (they are learned features), but collectively they encode:

- **Acoustic properties**: Timbre, pitch range, tempo, spectral characteristics
- **Semantic content**: What the sound "is about" or "sounds like"
- **Emotional qualities**: Mood, energy, valence (inherited from training descriptions)
- **Genre/style**: Musical genre, sound category, environmental context

---

## How Audio Maps to Text Descriptions

### Contrastive Learning Objective

CLAP uses the **InfoNCE contrastive loss** (also called NT-Xent):

1. Take a batch of N (audio, text) pairs
2. Compute embeddings for all audio clips: `a_1, a_2, ..., a_N`
3. Compute embeddings for all text descriptions: `t_1, t_2, ..., t_N`
4. The loss encourages `sim(a_i, t_i)` to be high (matched pairs) and `sim(a_i, t_j)` to be low for `i != j` (unmatched pairs)

```python
# Simplified contrastive loss
logits = (audio_embeds @ text_embeds.T) / temperature
labels = torch.arange(batch_size)
loss = (cross_entropy(logits, labels) + cross_entropy(logits.T, labels)) / 2
```

### Training Data

LAION-CLAP was trained on large-scale audio-text pairs:

- **LAION-Audio-630K**: ~633,526 audio-text pairs
- Sources include:
  - **FreeSound**: Environmental sounds with user descriptions
  - **BBC Sound Effects**: Professionally annotated sound effects
  - **AudioSet** (with generated captions): YouTube audio with label-to-caption augmentation
  - **Clotho**: Audio captioning dataset
  - **AudioCaps**: Audio captioning from AudioSet
- **Keyword-to-Caption Augmentation**: AudioSet only has keyword labels (e.g., "piano", "rain"). CLAP uses a template-based and GPT-assisted method to convert keywords into natural language captions (e.g., "The sound of a piano playing softly in the background")

### Zero-Shot Classification

After training, CLAP can classify audio without any task-specific fine-tuning:

```python
# Zero-shot: "What emotion does this music convey?"
emotion_texts = [
    "music that sounds happy and joyful",
    "music that sounds sad and melancholic",
    "music that sounds angry and aggressive",
    "music that sounds calm and peaceful",
    "music that sounds anxious and tense"
]

audio_embed = model.get_audio_embedding(audio_file)     # [512]
text_embeds = model.get_text_embedding(emotion_texts)    # [5, 512]

similarities = audio_embed @ text_embeds.T               # [5]
emotion_probs = softmax(similarities / temperature)       # [5]
```

---

## Mood / Energy / Genre Encoding

This is where CLAP becomes critical for the Emotional Sensing Agent. Because text and audio share the same embedding space, we can define **semantic probes** -- text descriptions that map out specific emotional and musical dimensions.

### Mood Encoding

Define text anchors for mood dimensions:

```python
mood_anchors = {
    "happy":     "upbeat happy cheerful joyful music",
    "sad":       "sad melancholic sorrowful depressing music",
    "angry":     "angry aggressive intense furious music",
    "calm":      "calm peaceful serene tranquil relaxing music",
    "anxious":   "anxious tense nervous unsettling music",
    "nostalgic": "nostalgic wistful bittersweet reminiscent music",
    "romantic":  "romantic tender loving intimate music",
    "epic":      "epic triumphant grand powerful cinematic music"
}

# Encode all mood anchors once
mood_embeddings = {k: model.get_text_embedding(v) for k, v in mood_anchors.items()}

# For any audio, compute mood distribution
audio_embed = model.get_audio_embedding(audio)
mood_scores = {k: cosine_sim(audio_embed, v) for k, v in mood_embeddings.items()}
```

### Energy Encoding

```python
energy_anchors = {
    "very_low":  "extremely quiet still ambient minimal music",
    "low":       "soft gentle quiet slow relaxing music",
    "medium":    "moderate tempo steady rhythm balanced music",
    "high":      "fast energetic driving upbeat loud music",
    "very_high": "extremely intense aggressive fast powerful explosive music"
}
```

### Genre Encoding

```python
genre_anchors = {
    "classical":   "classical orchestral symphony string quartet music",
    "jazz":        "jazz improvisation swing bebop saxophone music",
    "electronic":  "electronic synthesizer EDM techno house music",
    "rock":        "rock electric guitar drums bass band music",
    "hip_hop":     "hip hop rap beats bass heavy rhythmic music",
    "ambient":     "ambient atmospheric drone pad texture music",
    "folk":        "folk acoustic guitar singer songwriter music",
    "metal":       "heavy metal distorted guitar aggressive fast music"
}
```

### Composite Emotional Vector

By computing similarities against all these anchor sets, we build a **composite emotional state vector** from a single audio embedding:

```python
def compute_emotional_state(audio_embed, anchor_sets):
    state = {}
    for dimension_name, anchors in anchor_sets.items():
        scores = {}
        for label, text_embed in anchors.items():
            scores[label] = cosine_similarity(audio_embed, text_embed)
        state[dimension_name] = scores
    return state

# Result example:
# {
#   "mood": {"happy": 0.82, "sad": 0.12, "calm": 0.45, ...},
#   "energy": {"low": 0.15, "medium": 0.35, "high": 0.78, ...},
#   "genre": {"electronic": 0.91, "rock": 0.23, ...}
# }
```

---

## Model Architecture

### Audio Encoder

CLAP supports multiple audio encoder backbones:

1. **HTSAT (HTS-Audio Transformer)** -- Default and recommended
   - Hierarchical Token-Semantic Audio Transformer
   - Based on Swin Transformer architecture adapted for audio
   - Input: Log-mel spectrogram (64 mel bins, typically 10s of audio at 48kHz)
   - Processes spectrograms as 2D "images" using shifted window attention
   - Output: 512-d embedding after projection head

2. **PANN (Pretrained Audio Neural Networks)**
   - CNN-based (CNN14 variant)
   - Pretrained on AudioSet for audio tagging
   - Faster inference but slightly lower performance than HTSAT

### Audio Preprocessing Pipeline

```
Raw Audio (any sample rate)
    --> Resample to 48,000 Hz
    --> Convert to mono
    --> Extract log-mel spectrogram
        - n_fft: 1024
        - hop_length: 480
        - n_mels: 64
        - window: Hann
    --> Segment/pad to fixed duration (default 10s)
    --> Feed to audio encoder
    --> 512-d normalized embedding
```

### Text Encoder

1. **BERT-based** (default for some checkpoints)
   - Standard BERT architecture for text encoding
   - Tokenization via WordPiece
   - [CLS] token output projected to 512-d

2. **RoBERTa-based**
   - More robust text encoder
   - Used in larger model variants

3. **GPT-2-based** (experimental)
   - Autoregressive text encoder option

### Feature Fusion

A key innovation in LAION-CLAP is **feature fusion** between audio encoder layers:

- Instead of only using the final layer output, CLAP fuses features from multiple intermediate layers
- This captures both low-level acoustic features (from early layers) and high-level semantic features (from later layers)
- Fusion is done via a learned weighted sum with a projection layer

### Model Variants

| Variant | Audio Encoder | Text Encoder | Parameters | Notes |
|---------|--------------|--------------|------------|-------|
| `630k-audioset-best.pt` | HTSAT | RoBERTa | ~130M | Best general performance |
| `630k-audioset-fusion-best.pt` | HTSAT (fusion) | RoBERTa | ~130M | Feature fusion, recommended |
| `630k-best.pt` | HTSAT | BERT | ~120M | BERT text encoder |
| `630k-fusion-best.pt` | HTSAT (fusion) | BERT | ~120M | Fusion + BERT |
| `music_audioset_epoch_15_esc_90.14.pt` | PANN | BERT | ~80M | Music-focused |

### Training Configuration

- **Optimizer**: AdamW
- **Learning Rate**: 1e-4 with cosine annealing
- **Batch Size**: 2048 (effective, with gradient accumulation)
- **Temperature**: Learnable, initialized at 0.07
- **Training Duration**: ~45 epochs on LAION-Audio-630K
- **Augmentation**: SpecAugment on mel-spectrograms, text paraphrasing

---

## Relevance to Emotional Sensing Agent

CLAP is the **primary audio perception backbone** for JARVIS emotional sensing:

1. **Real-time audio embedding**: Every audio frame is encoded into a 512-d vector
2. **Semantic grounding**: The embedding is inherently aligned with natural language, so emotional descriptors can be directly compared
3. **Zero-shot flexibility**: New emotional dimensions can be added by simply defining new text anchors -- no retraining required
4. **Multi-modal fusion**: CLAP audio embeddings can be concatenated with text embeddings from other sources (lyrics, conversation) for multi-modal emotional state estimation
5. **Temporal dynamics**: By tracking how the 512-d embedding evolves over time, we capture emotional trajectories, not just static snapshots

### Integration Pattern

```python
import laion_clap

# Load model once at startup
model = laion_clap.CLAP_Module(enable_fusion=True)
model.load_ckpt("630k-audioset-fusion-best.pt")

# Pre-compute all emotional anchor embeddings
emotional_anchors = precompute_anchors(model, anchor_definitions)

# In the real-time processing loop:
def process_audio_frame(audio_chunk):
    embedding = model.get_audio_embedding_from_data(
        [audio_chunk], use_tensor=True
    )  # [1, 512]

    emotional_state = compute_similarities(embedding, emotional_anchors)
    return emotional_state  # feeds into composite state vector
```

---

## Key References

- Wu et al., "Large-Scale Contrastive Language-Audio Pretraining with Feature Fusion and Keyword-to-Caption Augmentation" (ICASSP 2023)
- Elizalde et al., "CLAP: Learning Audio Concepts from Natural Language Supervision" (ICASSP 2023)
- GitHub: https://github.com/LAION-AI/CLAP
- HuggingFace: https://huggingface.co/laion/clap-htsat-unfused, https://huggingface.co/laion/clap-htsat-fused
- PyPI: `pip install laion-clap`
