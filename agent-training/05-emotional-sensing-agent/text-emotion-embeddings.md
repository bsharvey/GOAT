---
archetypes: [george, karen]
skills: [emotional-sensing, meaning-detection, silence-reading]
training_cluster: 05-emotional-sensing-agent
domain: emotional-intelligence
difficulty: intermediate
version: 1.0
---
# Sentence Embeddings for Emotional Tone Analysis

## Training Context

The JARVIS Emotional Sensing Agent processes not only audio but also text signals -- lyrics, conversation transcripts, chat messages, and contextual metadata. This document covers how sentence-level embeddings capture emotional register and tone, which models to use, and integration patterns for the emotional sensing pipeline.

---

## How Text Embeddings Capture Emotional Register

### The Fundamental Mechanism

Modern sentence embedding models (sentence-transformers) encode text into dense vector spaces where **semantic similarity corresponds to geometric proximity**. Because emotional tone is a core component of meaning, these embeddings inherently capture emotional qualities:

- "I'm so excited about this!" and "This is absolutely thrilling!" will have **nearby embeddings** (both express positive high-arousal emotion)
- "I'm devastated" and "Everything is wonderful" will have **distant embeddings** (opposite valence)
- The angular position and magnitude in the embedding space encode emotional qualities among other semantic properties

### What Gets Encoded

Sentence embeddings capture multiple layers of emotional information:

1. **Lexical emotion**: Individual words with emotional valence ("love", "hate", "joy", "misery")
2. **Compositional emotion**: How words combine to modify emotion ("not happy", "barely tolerable", "absolutely ecstatic")
3. **Pragmatic tone**: Implied emotion from context and phrasing ("Well, isn't THAT wonderful" = sarcasm = negative)
4. **Register and formality**: Formal vs casual, professional vs intimate -- these carry emotional connotation
5. **Intensity markers**: Amplifiers ("extremely", "absolutely") and diminishers ("slightly", "somewhat")

### Embedding Geometry and Emotion

In a well-trained embedding space:

```
Dimension clusters (not individual dims, but subspaces):

Valence subspace:
  "I love this beautiful day"  ------>  [positive direction]
  "This is terrible and awful" ------>  [negative direction]

Arousal subspace:
  "INCREDIBLE! AMAZING! WOW!"  ------>  [high activation]
  "quiet calm peaceful gentle" ------>  [low activation]

Dominance subspace:
  "I demand this immediately"  ------>  [high dominance]
  "please, if it's not too much trouble" --> [low dominance]
```

These are not literally separate dimensions, but the information is encoded as **distributed representations** across the full embedding vector. Linear probes and simple classifiers can reliably extract VAD values from embeddings.

---

## Model Recommendations

### Primary Recommendation: sentence-transformers

The `sentence-transformers` library (by UKP Lab / Nils Reimers) provides the best ecosystem for text emotion embedding.

#### Top Models for Emotional Tone

| Model | Dimensions | Speed | Emotional Sensitivity | Notes |
|-------|-----------|-------|----------------------|-------|
| `all-MiniLM-L6-v2` | 384 | Very fast | Good | Best speed/quality trade-off for real-time |
| `all-mpnet-base-v2` | 768 | Medium | Very good | Best overall quality for general semantic similarity |
| `paraphrase-MiniLM-L6-v2` | 384 | Very fast | Good | Strong on paraphrase detection, captures tone well |
| `all-MiniLM-L12-v2` | 384 | Fast | Good | 12-layer variant, slightly better than L6 |
| `bge-base-en-v1.5` | 768 | Medium | Very good | BAAI model, strong general performance |
| `gte-base` | 768 | Medium | Very good | General Text Embeddings, Alibaba DAMO |
| `e5-base-v2` | 768 | Medium | Good | Microsoft, trained with instructions |
| `instructor-base` | 768 | Medium | Very good | Can be instructed to focus on emotion |

#### Specialized Emotion Models

| Model | Dimensions | Notes |
|-------|-----------|-------|
| `SamLowe/roberta-base-go_emotions` | 768 | Fine-tuned on GoEmotions (28 emotions) |
| `j-hartmann/emotion-english-distilroberta-base` | 768 | Emotion classification (6 basic emotions) |
| `cardiffnlp/twitter-roberta-base-sentiment-latest` | 768 | Sentiment (positive/negative/neutral) |
| `bhadresh-savani/distilbert-base-uncased-emotion` | 768 | Emotion classification |
| `nateraw/bert-base-uncased-emotion` | 768 | Emotion classification |

### For the Emotional Sensing Agent: Recommended Stack

1. **Real-time text embedding**: `all-MiniLM-L6-v2` (384-d, ~14ms per sentence on CPU)
2. **High-quality analysis**: `all-mpnet-base-v2` (768-d, ~70ms per sentence on CPU)
3. **Emotion classification overlay**: `SamLowe/roberta-base-go_emotions` for explicit emotion labels
4. **Sentiment baseline**: `cardiffnlp/twitter-roberta-base-sentiment-latest`

---

## Installation and Basic Usage

### Installation

```bash
pip install sentence-transformers
```

### Basic Embedding

```python
from sentence_transformers import SentenceTransformer

# Load model (auto-downloads on first use)
model = SentenceTransformer('all-MiniLM-L6-v2')

# Encode sentences
sentences = [
    "I'm absolutely thrilled about this opportunity!",
    "This is the worst day of my entire life.",
    "The quarterly report shows moderate growth.",
    "Please leave me alone, I can't take this anymore."
]

embeddings = model.encode(sentences)
print(embeddings.shape)  # (4, 384)
```

### Computing Emotional Similarity

```python
from sentence_transformers import SentenceTransformer, util
import numpy as np

model = SentenceTransformer('all-MiniLM-L6-v2')

# Define emotional anchor texts
emotion_anchors = {
    "joy":       "feeling happy joyful delighted wonderful",
    "sadness":   "feeling sad depressed miserable heartbroken",
    "anger":     "feeling angry furious enraged hostile",
    "fear":      "feeling scared terrified anxious frightened",
    "love":      "feeling loved cherished adored tender",
    "surprise":  "feeling surprised shocked amazed astonished",
    "calm":      "feeling calm peaceful serene tranquil relaxed",
    "excitement": "feeling excited thrilled energized pumped exhilarated"
}

# Encode anchors once
anchor_embeddings = {
    emotion: model.encode(text)
    for emotion, text in emotion_anchors.items()
}

# Classify a new text
text = "I just got promoted! This is the best news ever!"
text_embedding = model.encode(text)

# Compute similarities
similarities = {
    emotion: util.cos_sim(text_embedding, anchor_emb).item()
    for emotion, anchor_emb in anchor_embeddings.items()
}

# Sort by similarity
sorted_emotions = sorted(similarities.items(), key=lambda x: -x[1])
for emotion, score in sorted_emotions:
    print(f"  {emotion}: {score:.3f}")
# Output: joy: 0.52, excitement: 0.48, love: 0.31, ...
```

---

## Mapping Text Embeddings to VAD Space

### Approach 1: Anchor-Based Projection

Define text anchors at known VAD coordinates and project via similarity:

```python
import numpy as np
from sentence_transformers import SentenceTransformer, util

model = SentenceTransformer('all-MiniLM-L6-v2')

# VAD anchors: (text, valence, arousal, dominance)
vad_anchors = [
    ("ecstatic overjoyed thrilled euphoric",       +0.9, +0.8, +0.5),
    ("happy cheerful delighted pleased",           +0.7, +0.4, +0.4),
    ("content satisfied peaceful calm",            +0.6, -0.4, +0.3),
    ("serene tranquil quiet gentle",               +0.5, -0.7, +0.2),
    ("bored indifferent apathetic listless",       -0.3, -0.6, -0.3),
    ("sad depressed melancholic hopeless",         -0.7, -0.3, -0.4),
    ("grieving devastated heartbroken despairing", -0.8, -0.1, -0.6),
    ("anxious worried nervous tense",             -0.5, +0.6, -0.4),
    ("afraid terrified scared panicked",          -0.6, +0.7, -0.5),
    ("angry furious enraged hostile",             -0.5, +0.7, +0.5),
    ("powerful confident dominant commanding",     +0.3, +0.5, +0.8),
    ("submissive helpless powerless vulnerable",   -0.4, -0.2, -0.7),
    ("excited energized enthusiastic pumped",      +0.6, +0.8, +0.4),
    ("disgusted repulsed revolted sickened",       -0.6, +0.4, +0.2),
]

# Encode all anchor texts
anchor_texts = [a[0] for a in vad_anchors]
anchor_vad = np.array([[a[1], a[2], a[3]] for a in vad_anchors])
anchor_embeddings = model.encode(anchor_texts)  # (N, 384)

def text_to_vad(text):
    """Map any text to VAD coordinates via anchor similarity."""
    text_emb = model.encode(text)  # (384,)

    # Compute similarities to all anchors
    sims = util.cos_sim(text_emb, anchor_embeddings).numpy()[0]  # (N,)

    # Softmax to get weights
    temperature = 0.1
    weights = np.exp(sims / temperature)
    weights = weights / weights.sum()

    # Weighted average of VAD coordinates
    vad = (weights[:, None] * anchor_vad).sum(axis=0)
    return {"valence": vad[0], "arousal": vad[1], "dominance": vad[2]}

# Examples
print(text_to_vad("I'm so happy today!"))
# {'valence': 0.72, 'arousal': 0.35, 'dominance': 0.38}

print(text_to_vad("I'm scared and I don't know what to do"))
# {'valence': -0.55, 'arousal': 0.52, 'dominance': -0.48}

print(text_to_vad("The meeting is at 3pm"))
# {'valence': 0.05, 'arousal': -0.10, 'dominance': 0.02}  # ~neutral
```

### Approach 2: Trained Linear Probe

Train a small regression head on labeled emotion data:

```python
import torch
import torch.nn as nn
from sentence_transformers import SentenceTransformer

class VADPredictor(nn.Module):
    def __init__(self, input_dim=384):
        super().__init__()
        self.probe = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 3),  # V, A, D
            nn.Tanh()           # bound to [-1, 1]
        )

    def forward(self, embeddings):
        return self.probe(embeddings)

# Training loop (pseudocode)
encoder = SentenceTransformer('all-MiniLM-L6-v2')
predictor = VADPredictor(384)
optimizer = torch.optim.Adam(predictor.parameters(), lr=1e-3)

for texts, vad_labels in train_dataloader:
    with torch.no_grad():
        embeddings = encoder.encode(texts, convert_to_tensor=True)
    predictions = predictor(embeddings)
    loss = nn.MSELoss()(predictions, vad_labels)
    loss.backward()
    optimizer.step()
    optimizer.zero_grad()
```

### Approach 3: Dimension-Specific Contrastive Anchors

For more precise VAD estimation, use **bipolar anchor pairs** for each dimension:

```python
# Valence anchors (positive vs negative poles)
valence_positive = model.encode([
    "wonderful amazing beautiful fantastic great",
    "love happiness joy delight pleasure",
    "perfect brilliant excellent magnificent superb"
])
valence_negative = model.encode([
    "terrible horrible awful disgusting dreadful",
    "hate misery suffering pain anguish",
    "worst pathetic miserable wretched abysmal"
])
valence_pos_centroid = valence_positive.mean(axis=0)
valence_neg_centroid = valence_negative.mean(axis=0)

# Arousal anchors (high vs low poles)
arousal_high = model.encode([
    "exciting thrilling intense explosive urgent",
    "screaming shouting running panicking",
    "incredible unbelievable shocking electrifying"
])
arousal_low = model.encode([
    "calm quiet peaceful still silent",
    "sleeping resting relaxing meditating",
    "gentle soft slow tranquil serene"
])
arousal_high_centroid = arousal_high.mean(axis=0)
arousal_low_centroid = arousal_low.mean(axis=0)

# Dominance anchors (high vs low poles)
dominance_high = model.encode([
    "powerful commanding authoritative dominant controlling",
    "I demand require insist command order",
    "confident bold assertive decisive strong"
])
dominance_low = model.encode([
    "helpless weak powerless vulnerable submissive",
    "please help me I can't I give up",
    "uncertain timid hesitant meek obedient"
])
dominance_high_centroid = dominance_high.mean(axis=0)
dominance_low_centroid = dominance_low.mean(axis=0)

def text_to_vad_bipolar(text):
    emb = model.encode(text)

    v = (util.cos_sim(emb, valence_pos_centroid).item() -
         util.cos_sim(emb, valence_neg_centroid).item())
    a = (util.cos_sim(emb, arousal_high_centroid).item() -
         util.cos_sim(emb, arousal_low_centroid).item())
    d = (util.cos_sim(emb, dominance_high_centroid).item() -
         util.cos_sim(emb, dominance_low_centroid).item())

    # Normalize to [-1, 1] range (the raw differences are typically in [-0.5, 0.5])
    scale = 2.0
    return {
        "valence": np.clip(v * scale, -1, 1),
        "arousal": np.clip(a * scale, -1, 1),
        "dominance": np.clip(d * scale, -1, 1)
    }
```

---

## Advanced: Using Instruction-Tuned Embedding Models

Instruction-tuned models like `instructor-base` can be directed to focus on emotional content:

```python
from InstructorEmbedding import INSTRUCTOR

model = INSTRUCTOR('hkunlp/instructor-base')

# Instruct the model to focus on emotional tone
instruction = "Represent the emotional tone and sentiment of this text: "

texts = [
    [instruction, "I'm absolutely devastated by this news"],
    [instruction, "What a beautiful and peaceful morning"],
    [instruction, "This makes me so angry I could scream"],
]

embeddings = model.encode(texts)
# These embeddings will be more focused on emotional content
# compared to general-purpose embeddings
```

---

## GoEmotions: Fine-Grained Emotion Classification

For explicit emotion labels (complementing VAD estimation), the GoEmotions dataset and models provide 28 emotion categories:

```python
from transformers import pipeline

# Load emotion classifier
classifier = pipeline(
    "text-classification",
    model="SamLowe/roberta-base-go_emotions",
    top_k=None  # return all scores
)

text = "I can't believe they did this to me, I'm so hurt"
results = classifier(text)

# Returns scores for 28 emotions:
# admiration, amusement, anger, annoyance, approval, caring,
# confusion, curiosity, desire, disappointment, disapproval,
# disgust, embarrassment, excitement, fear, gratitude, grief,
# joy, love, nervousness, optimism, pride, realization, relief,
# remorse, sadness, surprise, neutral

for r in sorted(results[0], key=lambda x: -x['score'])[:5]:
    print(f"  {r['label']}: {r['score']:.3f}")
# Output: sadness: 0.72, disappointment: 0.45, anger: 0.38, ...
```

### Mapping GoEmotions to VAD

```python
# Map each GoEmotion label to approximate VAD coordinates
GOEMOTION_TO_VAD = {
    "admiration":     (0.60, 0.30, -0.10),
    "amusement":      (0.72, 0.53, 0.42),
    "anger":          (-0.51, 0.59, 0.56),
    "annoyance":      (-0.40, 0.35, 0.25),
    "approval":       (0.50, 0.15, 0.35),
    "caring":         (0.65, 0.20, 0.15),
    "confusion":      (-0.15, 0.30, -0.30),
    "curiosity":      (0.25, 0.45, 0.10),
    "desire":         (0.35, 0.55, 0.20),
    "disappointment": (-0.50, -0.10, -0.30),
    "disapproval":    (-0.40, 0.25, 0.30),
    "disgust":        (-0.60, 0.35, 0.23),
    "embarrassment":  (-0.45, 0.35, -0.50),
    "excitement":     (0.62, 0.75, 0.38),
    "fear":           (-0.64, 0.60, -0.43),
    "gratitude":      (0.70, 0.25, -0.05),
    "grief":          (-0.77, -0.10, -0.50),
    "joy":            (0.76, 0.48, 0.35),
    "love":           (0.87, 0.54, 0.18),
    "nervousness":    (-0.40, 0.55, -0.40),
    "optimism":       (0.55, 0.30, 0.25),
    "pride":          (0.77, 0.38, 0.65),
    "realization":    (0.10, 0.40, 0.15),
    "relief":         (0.50, -0.30, 0.20),
    "remorse":        (-0.55, 0.10, -0.40),
    "sadness":        (-0.63, -0.27, -0.33),
    "surprise":       (0.15, 0.67, -0.10),
    "neutral":        (0.00, 0.00, 0.00),
}

def goemotion_to_vad(emotion_scores):
    """Convert GoEmotion probability distribution to VAD."""
    vad = np.zeros(3)
    total_weight = 0
    for emotion_dict in emotion_scores:
        label = emotion_dict['label']
        score = emotion_dict['score']
        if label in GOEMOTION_TO_VAD:
            vad += np.array(GOEMOTION_TO_VAD[label]) * score
            total_weight += score
    if total_weight > 0:
        vad /= total_weight
    return {"valence": vad[0], "arousal": vad[1], "dominance": vad[2]}
```

---

## Usage Patterns for the Emotional Sensing Agent

### Pattern 1: Real-Time Text Stream Processing

```python
from sentence_transformers import SentenceTransformer
import numpy as np
from collections import deque

class TextEmotionStream:
    def __init__(self, model_name='all-MiniLM-L6-v2', window_size=10):
        self.model = SentenceTransformer(model_name)
        self.anchor_embeddings = self._init_anchors()
        self.history = deque(maxlen=window_size)
        self.current_vad = np.zeros(3)
        self.alpha = 0.3  # smoothing factor

    def _init_anchors(self):
        # Pre-compute bipolar VAD anchors (see above)
        ...

    def process_text(self, text):
        """Process incoming text and update emotional state."""
        embedding = self.model.encode(text)
        vad = self._embedding_to_vad(embedding)

        # Exponential smoothing
        self.current_vad = self.alpha * vad + (1 - self.alpha) * self.current_vad

        # Store in history for trajectory analysis
        self.history.append({
            'text': text,
            'vad': vad,
            'smoothed_vad': self.current_vad.copy()
        })

        return {
            'instant_vad': vad,
            'smoothed_vad': self.current_vad,
            'emotional_shift': self._detect_shift()
        }

    def _detect_shift(self):
        """Detect sudden emotional shifts in text stream."""
        if len(self.history) < 2:
            return None
        prev = self.history[-2]['vad']
        curr = self.history[-1]['vad']
        delta = np.linalg.norm(curr - prev)
        if delta > 0.5:  # threshold for significant shift
            return {"magnitude": delta, "direction": curr - prev}
        return None
```

### Pattern 2: Lyrics Analysis (Batch)

```python
def analyze_lyrics_emotion(lyrics_text, model):
    """Analyze emotional trajectory of song lyrics."""
    # Split into lines/stanzas
    lines = [l.strip() for l in lyrics_text.split('\n') if l.strip()]

    # Embed all lines
    embeddings = model.encode(lines)

    # Convert each to VAD
    vad_trajectory = []
    for i, (line, emb) in enumerate(zip(lines, embeddings)):
        vad = embedding_to_vad(emb)
        vad_trajectory.append({
            'line_num': i,
            'text': line,
            'valence': vad[0],
            'arousal': vad[1],
            'dominance': vad[2]
        })

    # Compute summary statistics
    vad_array = np.array([[v['valence'], v['arousal'], v['dominance']]
                          for v in vad_trajectory])

    return {
        'trajectory': vad_trajectory,
        'mean_vad': vad_array.mean(axis=0),
        'std_vad': vad_array.std(axis=0),
        'emotional_range': vad_array.max(axis=0) - vad_array.min(axis=0),
        'most_intense_line': vad_trajectory[
            np.argmax(np.linalg.norm(vad_array, axis=1))
        ]
    }
```

### Pattern 3: Multi-Signal Fusion (Audio + Text)

```python
class MultiModalEmotionFuser:
    """Fuse audio-derived and text-derived emotional signals."""

    def __init__(self):
        self.audio_weight = 0.6   # music/audio is primary
        self.text_weight = 0.4    # text/lyrics is secondary

    def fuse(self, audio_vad, text_vad, context=None):
        """
        Fuse VAD signals from audio and text modalities.

        Args:
            audio_vad: (V, A, D) from CLAP-based audio analysis
            text_vad: (V, A, D) from text embedding analysis
            context: optional dict with context-dependent weights
        """
        audio_vad = np.array(audio_vad)
        text_vad = np.array(text_vad)

        # Adaptive weighting based on confidence
        aw = self.audio_weight
        tw = self.text_weight

        if context:
            # If lyrics are present, increase text weight
            if context.get('has_lyrics'):
                aw, tw = 0.5, 0.5
            # If speech is detected, text (transcript) gets more weight
            if context.get('is_speech'):
                aw, tw = 0.3, 0.7
            # If instrumental only, audio dominates
            if context.get('is_instrumental'):
                aw, tw = 0.9, 0.1

        fused = aw * audio_vad + tw * text_vad

        # Agreement metric: how aligned are the modalities?
        agreement = 1.0 - np.linalg.norm(audio_vad - text_vad) / np.sqrt(12)

        return {
            'fused_vad': fused,
            'audio_vad': audio_vad,
            'text_vad': text_vad,
            'agreement': agreement,  # 0 = total disagreement, 1 = perfect agreement
            'confidence': agreement * np.linalg.norm(fused)
        }
```

---

## Training Data for Text Emotion Models

### Key Datasets

| Dataset | Size | Labels | Source |
|---------|------|--------|--------|
| **GoEmotions** | 58K comments | 28 emotions | Reddit comments (Google) |
| **EmoBank** | 10K sentences | V, A, D (continuous) | News, fiction, blogs |
| **ISEAR** | 7,666 sentences | 7 emotions | Self-reported situations |
| **AffectiveText** | 1,250 headlines | 6 emotions + valence | News headlines (SemEval) |
| **Empathetic Dialogues** | 25K conversations | 32 emotion labels | Crowdsourced dialogues |
| **NRC Emotion Lexicon** | 14K words | 8 emotions + sentiment | Word-level annotations |
| **NRC VAD Lexicon** | 20K words | V, A, D (continuous) | Word-level VAD ratings |
| **SemEval 2018 Task 1** | 10K tweets | V, A, D + emotions | Twitter (multi-label) |

### EmoBank: The Gold Standard for Text VAD

EmoBank provides sentence-level VAD annotations, making it ideal for training VAD regression models on text embeddings:

- 10,000 sentences from various genres
- Annotated for both **writer perspective** (what the author intended) and **reader perspective** (what the reader perceives)
- Scale: 1-5 for each dimension
- Suitable for training the linear probes described above

---

## Performance Considerations

### Inference Speed (CPU, single sentence)

| Model | Dimensions | Time | Memory |
|-------|-----------|------|--------|
| `all-MiniLM-L6-v2` | 384 | ~14ms | ~90MB |
| `all-MiniLM-L12-v2` | 384 | ~25ms | ~130MB |
| `all-mpnet-base-v2` | 768 | ~70ms | ~420MB |
| `instructor-base` | 768 | ~85ms | ~500MB |
| GoEmotions classifier | 768 | ~50ms | ~330MB |

### Batch Processing

```python
# Batch encoding is significantly faster than one-by-one
texts = ["text1", "text2", ..., "text100"]

# Fast: batch encode
embeddings = model.encode(texts, batch_size=32)  # GPU-optimized batching

# Slow: individual encode
for text in texts:
    embedding = model.encode(text)  # Much slower
```

### GPU Acceleration

```python
model = SentenceTransformer('all-MiniLM-L6-v2', device='cuda')
# Or
model = SentenceTransformer('all-MiniLM-L6-v2')
model = model.to('cuda')
```

---

## Key References

- Reimers, N. & Gurevych, I. (2019). "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks." EMNLP.
- Demszky, D., et al. (2020). "GoEmotions: A Dataset of Fine-Grained Emotions." ACL.
- Buechel, S. & Hahn, U. (2017). "EmoBank: Studying the Impact of Annotation Perspective and Representation Format on Dimensional Emotion Analysis." EACL.
- Mohammad, S.M. (2018). "Obtaining Reliable Human Ratings of Valence, Arousal, and Dominance for 20,000 English Words." ACL.
- Su, H., et al. (2023). "One Embedder, Any Task: Instruction-Finetuned Text Embeddings." ACL (Instructor model).
- Xiao, S., et al. (2023). "C-Pack: Packaged Resources To Advance General Chinese Embedding." (BGE models).
- Hartmann, J. (2022). "Emotion English DistilRoBERTa-base." HuggingFace.
- Sentence-Transformers Documentation: https://www.sbert.net/
