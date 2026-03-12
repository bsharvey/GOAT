---
archetypes: [george, harvey]
skills: [emotional-sensing, music-signal, signal-sensing]
training_cluster: 05-emotional-sensing-agent
domain: emotional-intelligence
difficulty: advanced
version: 1.0
---
# Music Emotion Recognition (MER) with Deep Learning

## Training Context

Music Emotion Recognition is the task of automatically predicting the emotional content conveyed by music. For the JARVIS Emotional Sensing Agent, MER is a critical capability: music is one of the most emotionally potent signals in any environment. This document covers how music maps to emotional dimensions, the features and models used, and the datasets that enable training.

---

## Overview: How Music Conveys Emotion

Music communicates emotion through multiple interacting layers:

| Musical Element | Emotional Impact | Example |
|----------------|-----------------|---------|
| **Tempo** | Faster = higher arousal; slower = calmer | 140 BPM = energetic; 60 BPM = relaxed |
| **Mode** | Major = positive valence; minor = negative valence | C major = bright; C minor = melancholic |
| **Dynamics** | Louder = more arousing, dominant; softer = calmer, submissive | Fortissimo = powerful; pianissimo = gentle |
| **Timbre** | Bright timbres = positive; dark timbres = negative | Flute = airy; cello = somber |
| **Harmony** | Consonance = pleasant; dissonance = tense | Perfect fifth = stable; tritone = tense |
| **Rhythm** | Regular = stable; syncopated = exciting; irregular = anxious | Steady 4/4 = grounded; complex polyrhythm = energetic |
| **Pitch register** | High = lighter, brighter; low = heavier, darker | Soprano = bright; bass = dark |
| **Articulation** | Legato = smooth, flowing; staccato = sharp, percussive | Legato strings = romantic; staccato brass = martial |
| **Lyrics** | Semantic content directly conveys emotional meaning | "I love you" vs "I'm broken" |

---

## Emotion Representation in MER

### Categorical Approach

Classify music into discrete emotion categories. Common taxonomies:

1. **Ekman's basic emotions**: Happy, Sad, Angry, Fear, Surprise, Disgust
2. **Russell's four quadrants**: Q1 (happy/excited), Q2 (angry/anxious), Q3 (sad/bored), Q4 (calm/relaxed)
3. **Mood tags**: Genre-derived tags like "melancholic", "uplifting", "aggressive", "dreamy"

### Dimensional Approach (Preferred for JARVIS)

Map music to continuous coordinates in emotional space:

- **Valence-Arousal (VA)**: 2D, most common in MER research
- **Valence-Arousal-Dominance (VAD)**: 3D, more expressive
- **GEMS (Geneva Emotional Music Scales)**: 9 dimensions specific to music-induced emotions: wonder, transcendence, tenderness, nostalgia, peacefulness, power, joyful activation, tension, sadness

### Static vs Dynamic Recognition

- **Static MER**: Predict a single emotion label/vector for an entire song
- **Dynamic MER**: Predict time-varying emotion, producing a continuous trajectory (emotion per segment, typically 0.5-2 second windows)
- Dynamic MER is what the Emotional Sensing Agent needs for real-time operation

---

## Audio Features for MER

### Low-Level Acoustic Features

These are the classic hand-crafted features that remain relevant as baselines and complementary inputs:

#### Spectral Features
- **Mel-Frequency Cepstral Coefficients (MFCCs)**: 13-40 coefficients capturing spectral envelope shape; standard in audio analysis
- **Mel spectrogram**: Time-frequency representation on a perceptually-motivated mel scale; primary input for deep learning models
- **Chroma features**: 12-dimensional pitch class representation (C, C#, D, ..., B); captures harmonic content
- **Spectral centroid**: Center of mass of the spectrum; correlates with perceived "brightness"
- **Spectral rolloff**: Frequency below which a specified percentage of energy falls
- **Spectral contrast**: Difference between peaks and valleys in the spectrum
- **Spectral flatness**: How noise-like vs. tonal the spectrum is

#### Temporal Features
- **Tempo / BPM**: Beats per minute; strongly correlated with arousal
- **Beat strength**: How pronounced the rhythmic pulse is
- **Onset rate**: Number of note onsets per second; correlates with density and arousal
- **Zero crossing rate**: Rate of sign changes in the waveform; rough measure of noisiness

#### Harmonic Features
- **Key / Mode**: Major vs minor tonality; correlates with valence
- **Chord progressions**: Harmonic movement patterns
- **Tonnetz features**: Representation of tonal relationships on a geometric surface
- **Harmonic-to-noise ratio**: Tonal clarity

#### Dynamic Features
- **RMS energy**: Root mean square of waveform amplitude; measures loudness over time
- **Dynamic range**: Difference between loudest and quietest parts
- **Loudness (LUFS)**: Perceptual loudness measurement

### Feature Extraction Libraries

```python
import librosa
import numpy as np

y, sr = librosa.load("song.wav", sr=22050)

# Mel spectrogram (primary deep learning input)
mel_spec = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128)
log_mel = librosa.power_to_db(mel_spec)

# MFCCs
mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=20)

# Chroma
chroma = librosa.feature.chroma_stft(y=y, sr=sr)

# Spectral centroid
centroid = librosa.feature.spectral_centroid(y=y, sr=sr)

# Tempo
tempo, beats = librosa.beat.beat_track(y=y, sr=sr)

# Tonnetz
tonnetz = librosa.feature.tonnetz(y=y, sr=sr)

# RMS energy
rms = librosa.feature.rms(y=y)
```

### Learned Features (Deep Learning)

Modern approaches skip hand-crafted features entirely and learn directly from:

- **Raw waveforms**: 1D CNNs or transformers operating on raw audio
- **Log-mel spectrograms**: 2D CNNs or Vision Transformers treating spectrograms as images
- **Pre-trained representations**: CLAP embeddings, Wav2Vec 2.0, HuBERT, Music2Vec, MERT

---

## Deep Learning Models for MER

### Convolutional Neural Networks (CNNs)

CNNs operating on mel spectrograms have been the workhorse of MER:

```
Log-Mel Spectrogram (128 x T)
    --> Conv2D blocks (3x3 kernels, BatchNorm, ReLU, MaxPool)
    --> Global Average Pooling
    --> Dense layers
    --> Output: [valence, arousal] or [valence, arousal, dominance]
```

**Key architectures**:
- **VGG-like**: Stacked 3x3 convolutions, simple and effective
- **ResNet adaptations**: Skip connections for deeper networks
- **Sample-level CNN (SampleCNN)**: Operates on raw waveform with very small (3-sample) 1D convolutions

### Recurrent Neural Networks (RNNs)

For dynamic/continuous MER, RNNs capture temporal evolution:

```
Mel Spectrogram frames --> CNN feature extractor --> LSTM/GRU --> Dense --> VA(D) per frame
```

- **LSTM (Long Short-Term Memory)**: Captures long-range dependencies in emotional trajectory
- **GRU (Gated Recurrent Unit)**: Lighter alternative to LSTM
- **Bidirectional RNNs**: Use future context (offline analysis)

### CRNN (Convolutional Recurrent Neural Network)

The **CRNN** architecture combines CNNs and RNNs and has been one of the most successful approaches:

```python
class MER_CRNN(nn.Module):
    def __init__(self):
        super().__init__()
        # CNN feature extractor
        self.conv_blocks = nn.Sequential(
            ConvBlock(1, 64),    # (1, 128, T) -> (64, 64, T/2)
            ConvBlock(64, 128),  # -> (128, 32, T/4)
            ConvBlock(128, 256), # -> (256, 16, T/8)
            ConvBlock(256, 512), # -> (512, 8, T/16)
        )
        self.pool = nn.AdaptiveAvgPool2d((1, None))  # collapse frequency

        # RNN temporal model
        self.rnn = nn.GRU(512, 256, num_layers=2,
                          batch_first=True, bidirectional=True)

        # Output head
        self.fc = nn.Linear(512, 2)  # valence, arousal

    def forward(self, mel_spec):
        x = self.conv_blocks(mel_spec)      # (B, 512, 8, T')
        x = self.pool(x).squeeze(2)         # (B, 512, T')
        x = x.permute(0, 2, 1)              # (B, T', 512)
        x, _ = self.rnn(x)                  # (B, T', 512)
        x = self.fc(x)                      # (B, T', 2)
        return x  # valence, arousal per time step
```

### Transformer-Based Models

Transformers have become increasingly dominant in MER:

1. **Audio Spectrogram Transformer (AST)**
   - Treats mel spectrogram as a sequence of patches (like Vision Transformer)
   - Self-attention captures long-range temporal dependencies
   - Pre-trained on AudioSet, fine-tuned for emotion

2. **MERT (Music undERstanding model with large-scale self-supervised Training)**
   - Self-supervised pre-training on large music corpora
   - Learns general music representations
   - Fine-tuned for emotion recognition with small labeled datasets
   - Based on HuBERT architecture adapted for music

3. **Music Transformer**
   - Relative positional encoding for musical structure
   - Captures hierarchical musical structure (beat, bar, phrase, section)

4. **HTSAT (HTS-Audio Transformer)**
   - The same architecture used in CLAP's audio encoder
   - Hierarchical shifted-window attention
   - Can be fine-tuned directly for VA regression

### Pre-trained Foundation Models

The most effective modern approach uses large pre-trained models:

```
Pre-trained Model (frozen or fine-tuned)
    |
    v
[Rich audio representation]
    |
    v
Small regression head --> VA(D) output
```

| Model | Pre-training | Parameters | Music-aware |
|-------|-------------|------------|-------------|
| **CLAP** | Contrastive (audio-text) | ~130M | Yes (with music data) |
| **MERT** | Self-supervised (music) | ~330M | Yes (music-specific) |
| **Wav2Vec 2.0** | Self-supervised (speech) | ~300M | Partially |
| **HuBERT** | Self-supervised (speech) | ~300M | Partially |
| **Jukebox** | Generative (music) | ~5B | Yes |
| **MusicGen encoder** | Generative (music) | Varies | Yes |
| **EnCodec** | Compression (audio) | ~15M | Yes |

---

## Datasets for Music Emotion Recognition

### Static Annotation Datasets

| Dataset | Size | Annotations | Scale |
|---------|------|-------------|-------|
| **MER (Emotion in Music DB)** | 1,000 songs | V, A (continuous) | [-1, 1] |
| **AMG1608** | 1,608 clips (30s) | V, A (continuous) | [-1, 1] |
| **DEAM (MediaEval)** | 2,058 clips (45s) | V, A (continuous, per-second) | [1, 9] |
| **PMEmo** | 794 songs | V, A (continuous, per-second) + physiological | [1, 9] |
| **4Q Audio Emotion** | 900 clips (30s) | 4 quadrant labels | Categorical |
| **MoodyLyrics** | 2,595 songs | V, A (based on lyrics) | Categorical |
| **Million Song Dataset (MSD)** | 1M songs | Tags (including mood) | Multi-label |
| **MTG-Jamendo** | 55,000 tracks | 195 tags (including mood/theme) | Multi-label |
| **MIREX Mood** | ~600 clips | 5 mood clusters | Categorical |

### Dynamic Annotation Datasets (Continuous VA Over Time)

| Dataset | Size | Annotation Rate | Notes |
|---------|------|----------------|-------|
| **DEAM** | 2,058 clips | Per second | Most widely used for dynamic MER |
| **PMEmo** | 794 songs | Per 0.5 second | Includes EDA and heart rate |
| **MediaEval Emotion in Music** | 1,000 clips | Per second | MediaEval challenge dataset |
| **VOCALOID** | 100 clips | Per second | Synthesized singing voice |

### The DEAM Dataset (Key Reference)

The **Database for Emotional Analysis of Music (DEAM)** is the most widely used benchmark:

- 2,058 royalty-free music clips (45 seconds each)
- Genres: rock, pop, electronic, classical, folk, etc.
- Annotations: Valence and arousal, both static (per-song) and dynamic (per-second)
- Annotators: Crowdsourced via Amazon Mechanical Turk
- Scale: 1-9 for both valence and arousal (typically rescaled to [-1, 1])
- Public domain music from Free Music Archive and Jamendo

---

## State-of-the-Art Approaches (2023-2024)

### Approach 1: Pre-trained Foundation Model + VA Head

```python
# Most effective current approach
from transformers import AutoModel
import torch.nn as nn

class MER_Foundation(nn.Module):
    def __init__(self, model_name="m-a-p/MERT-v1-330M"):
        super().__init__()
        self.encoder = AutoModel.from_pretrained(model_name)
        # Freeze encoder or fine-tune with small LR
        self.va_head = nn.Sequential(
            nn.Linear(1024, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 2),  # valence, arousal
            nn.Tanh()  # bound to [-1, 1]
        )

    def forward(self, audio_input):
        features = self.encoder(audio_input).last_hidden_state
        pooled = features.mean(dim=1)  # temporal average pooling
        va = self.va_head(pooled)
        return va
```

### Approach 2: CLAP Zero-Shot (No Training Required)

This is what the Emotional Sensing Agent uses as its primary method:

```python
import laion_clap
import numpy as np

model = laion_clap.CLAP_Module(enable_fusion=True)
model.load_ckpt()

# Define VA anchor texts
va_anchors = {
    "high_valence": [
        "happy joyful uplifting cheerful music",
        "bright positive upbeat celebratory music"
    ],
    "low_valence": [
        "sad melancholic depressing sorrowful music",
        "dark gloomy tragic heartbreaking music"
    ],
    "high_arousal": [
        "energetic exciting intense powerful fast music",
        "aggressive loud driving explosive music"
    ],
    "low_arousal": [
        "calm peaceful quiet gentle slow music",
        "soft ambient relaxing soothing tranquil music"
    ]
}

# Encode anchors
anchor_embeds = {}
for key, texts in va_anchors.items():
    embeds = model.get_text_embedding(texts, use_tensor=False)
    anchor_embeds[key] = embeds.mean(axis=0)  # average multiple descriptions

def predict_va(audio_file):
    audio_embed = model.get_audio_embedding_from_filelist(
        [audio_file], use_tensor=False
    )[0]

    # Compute valence as relative similarity
    v_pos = np.dot(audio_embed, anchor_embeds["high_valence"])
    v_neg = np.dot(audio_embed, anchor_embeds["low_valence"])
    valence = (v_pos - v_neg) / (v_pos + v_neg + 1e-8)

    # Compute arousal as relative similarity
    a_pos = np.dot(audio_embed, anchor_embeds["high_arousal"])
    a_neg = np.dot(audio_embed, anchor_embeds["low_arousal"])
    arousal = (a_pos - a_neg) / (a_pos + a_neg + 1e-8)

    return valence, arousal
```

### Approach 3: Multi-Modal (Audio + Lyrics)

```python
class MultiModalMER(nn.Module):
    def __init__(self):
        super().__init__()
        self.audio_encoder = CLAPAudioEncoder()   # 512-d
        self.text_encoder = SentenceTransformer()  # 384-d
        self.fusion = nn.Sequential(
            nn.Linear(512 + 384, 256),
            nn.ReLU(),
            nn.Linear(256, 3),  # V, A, D
            nn.Tanh()
        )

    def forward(self, audio, lyrics_text):
        audio_feat = self.audio_encoder(audio)
        text_feat = self.text_encoder(lyrics_text)
        combined = torch.cat([audio_feat, text_feat], dim=-1)
        return self.fusion(combined)
```

### Approach 4: Attention-Based Temporal Model

For dynamic emotion recognition with time-varying output:

```python
class TemporalMER(nn.Module):
    def __init__(self):
        super().__init__()
        self.feature_extractor = MelSpectrogramCNN()
        self.temporal_attention = nn.MultiheadAttention(
            embed_dim=256, num_heads=8, batch_first=True
        )
        self.va_projection = nn.Linear(256, 2)

    def forward(self, mel_frames):
        # mel_frames: (B, T, 128, F) -- T time segments
        features = []
        for t in range(mel_frames.shape[1]):
            feat = self.feature_extractor(mel_frames[:, t])
            features.append(feat)
        features = torch.stack(features, dim=1)  # (B, T, 256)

        attended, _ = self.temporal_attention(
            features, features, features
        )  # (B, T, 256)

        va_trajectory = self.va_projection(attended)  # (B, T, 2)
        return va_trajectory  # per-frame valence, arousal
```

---

## Evaluation Metrics

### For Continuous VA Prediction

- **R^2 (coefficient of determination)**: How much variance is explained; typical good scores are 0.5-0.7 for valence, 0.6-0.8 for arousal
- **RMSE (Root Mean Square Error)**: Absolute error magnitude
- **CCC (Concordance Correlation Coefficient)**: Measures agreement between predicted and annotated values, accounting for both correlation and bias; the standard metric for continuous emotion prediction
- **Pearson's r**: Linear correlation

```python
def concordance_correlation_coefficient(y_true, y_pred):
    """CCC: the standard metric for continuous emotion prediction."""
    mean_true = np.mean(y_true)
    mean_pred = np.mean(y_pred)
    var_true = np.var(y_true)
    var_pred = np.var(y_pred)
    covariance = np.mean((y_true - mean_true) * (y_pred - mean_pred))
    ccc = (2 * covariance) / (var_true + var_pred + (mean_true - mean_pred)**2)
    return ccc
```

### Typical State-of-the-Art Performance (DEAM dataset)

| Method | Valence CCC | Arousal CCC |
|--------|-------------|-------------|
| Hand-crafted features + SVR | 0.35 | 0.65 |
| CNN on mel spectrogram | 0.45 | 0.72 |
| CRNN | 0.50 | 0.75 |
| Pre-trained (MERT) + fine-tune | 0.55 | 0.78 |
| CLAP zero-shot (our approach) | ~0.40 | ~0.70 |
| Multi-modal (audio + lyrics) | 0.58 | 0.77 |

Note: Arousal is consistently easier to predict than valence, because arousal correlates strongly with easily-measurable acoustic features (energy, tempo), while valence depends on more subtle harmonic and cultural cues.

---

## Challenges and Considerations

### Subjectivity
- Different listeners perceive different emotions in the same music
- Cultural background affects emotional interpretation
- Personal associations override acoustic cues (e.g., a sad song at your wedding becomes "happy")

### Perceived vs Induced Emotion
- **Perceived**: What emotion the music expresses (what it sounds like)
- **Induced/Felt**: What emotion the listener actually feels
- These can differ significantly (you can enjoy listening to "sad" music)
- Most MER systems predict perceived emotion

### Temporal Resolution
- Emotions in music evolve over seconds, not milliseconds
- Too fine a resolution introduces noise; too coarse misses transitions
- 1-2 second windows are standard for dynamic MER

### Genre Bias
- Models trained on one genre may not generalize to others
- Western tonal music assumptions (major = happy) don't hold universally
- Training data diversity is critical

---

## Key References

- Yang, Y., & Chen, H. (2012). "Machine Recognition of Music Emotion: A Review." ACM Transactions on Intelligent Systems and Technology.
- Aljanaki, A., Yang, Y., & Soleymani, M. (2017). "Developing a Benchmark for Emotional Analysis of Music." PLoS ONE 12(3). (DEAM dataset)
- Delbouys, R., et al. (2018). "Music Mood Detection Based on Audio and Lyrics with Deep Neural Net." ISMIR.
- Castellon, R., et al. (2021). "CALM: Codebook-enhanced Audio-Language Fusion for Music Information Retrieval."
- Li, Y., et al. (2023). "MERT: Acoustic Music Understanding Model with Large-Scale Self-supervised Training." ArXiv.
- Chowdhury, S., et al. (2019). "Towards Explainable Music Emotion Recognition: The Route via Mid-Level Features." ISMIR.
- Eerola, T. & Vuoskoski, J.K. (2011). "A comparison of the discrete and dimensional models of emotion in music." Psychology of Music.
