---
archetypes: [george, michelle]
skills: [emotional-sensing, emotional-grounding]
training_cluster: 05-emotional-sensing-agent
domain: emotional-intelligence
difficulty: advanced
version: 1.0
---
# Valence-Arousal-Dominance (VAD) Emotion Model

## Training Context

The VAD model is the **theoretical backbone** of the JARVIS Emotional Sensing Agent's emotion representation. Rather than categorizing emotions into discrete buckets (happy, sad, angry), VAD represents every emotional state as a point in a continuous 3D space. This enables smooth emotional trajectories, nuanced blended states, and mathematical operations on emotions.

---

## Dimensional Emotion Theory

### The Core Insight

Human emotions are not discrete categories -- they are points in a continuous, multi-dimensional space. This insight, developed through decades of psychological research, provides the mathematical framework for computational emotion modeling.

### Historical Development

1. **Wilhelm Wundt (1897)**: First proposed that emotions have three dimensions: pleasure-displeasure, arousal-calm, and tension-relaxation
2. **Charles Osgood (1957)**: Semantic Differential studies identified three universal dimensions of affective meaning: Evaluation, Potency, Activity (EPA)
3. **James Russell (1980)**: Proposed the **Circumplex Model of Affect** -- a 2D model with valence and arousal as primary dimensions
4. **Albert Mehrabian (1974, 1980)**: Developed the full **PAD (Pleasure-Arousal-Dominance)** framework, extending Russell's model to three dimensions
5. **Russell & Mehrabian (1977)**: Empirically validated that three dimensions account for the vast majority of variance in emotional experience

### Why Dimensional Over Categorical?

| Aspect | Categorical (Ekman) | Dimensional (VAD) |
|--------|---------------------|-------------------|
| Representation | 6-8 discrete labels | Continuous 3D coordinates |
| Blended emotions | Difficult to represent | Natural (any point in space) |
| Intensity | Separate measure needed | Encoded in distance from origin |
| Transitions | Discrete jumps | Smooth trajectories |
| Computational | Classification problem | Regression problem |
| Cultural bias | Labels are culture-dependent | Dimensions are more universal |
| Granularity | Fixed set of emotions | Infinite emotional states |

---

## The Three Dimensions

### 1. Valence (Pleasure -- Displeasure)

**Range**: -1.0 (maximum displeasure) to +1.0 (maximum pleasure)

Valence captures the **hedonic quality** -- how pleasant or unpleasant an emotional state feels.

| Score | Description | Example Emotions |
|-------|-------------|-----------------|
| +1.0 | Ecstatic pleasure | Euphoria, bliss |
| +0.7 | Strong pleasure | Joy, delight, love |
| +0.3 | Mild pleasure | Contentment, amusement |
| 0.0 | Neutral | Indifference, surprise (neutral) |
| -0.3 | Mild displeasure | Boredom, unease |
| -0.7 | Strong displeasure | Sadness, anger, fear |
| -1.0 | Extreme displeasure | Grief, agony, terror |

**Key properties**:
- Most directly correlated with "positive" vs "negative" affect
- Strongly predicted by facial expressions (smile vs frown)
- In music: major key (+V) vs minor key (-V)
- In text: positive vs negative sentiment

### 2. Arousal (Activation -- Deactivation)

**Range**: -1.0 (maximum deactivation/calm) to +1.0 (maximum activation/excitement)

Arousal captures the **energy level** -- how physiologically activated or deactivated the state is.

| Score | Description | Example Emotions |
|-------|-------------|-----------------|
| +1.0 | Maximum activation | Panic, ecstasy, rage |
| +0.7 | High activation | Excitement, fear, anger |
| +0.3 | Moderate activation | Alertness, interest |
| 0.0 | Neutral activation | Neutral state |
| -0.3 | Moderate deactivation | Relaxation, pensiveness |
| -0.7 | Low activation | Calm, sadness, serenity |
| -1.0 | Minimum activation | Lethargy, deep sleep, coma |

**Key properties**:
- Correlates with physiological measures: heart rate, skin conductance, pupil dilation
- In music: tempo (fast = +A) and dynamics (loud = +A)
- In speech: pitch variation and speech rate
- Orthogonal to valence: anger (+A) and excitement (+A) have similar arousal but opposite valence

### 3. Dominance (Control -- Submission)

**Range**: -1.0 (maximum submission/helplessness) to +1.0 (maximum dominance/control)

Dominance captures the **sense of control** -- how much one feels in command of the situation.

| Score | Description | Example Emotions |
|-------|-------------|-----------------|
| +1.0 | Total control | Arrogance, authority |
| +0.7 | Strong control | Confidence, pride, anger |
| +0.3 | Moderate control | Determination, assertiveness |
| 0.0 | Neutral | Ambivalence |
| -0.3 | Moderate submission | Uncertainty, compliance |
| -0.7 | Low control | Fear, sadness, shame |
| -1.0 | Total helplessness | Despair, terror, utter defeat |

**Key properties**:
- Distinguishes emotions that are similar in valence and arousal
- **Anger vs Fear**: Both negative valence, high arousal, but anger is high dominance, fear is low dominance
- In music: powerful production (+D) vs delicate/vulnerable production (-D)
- In speech: confident tone (+D) vs hesitant/trembling tone (-D)
- Often the most difficult dimension to sense automatically

---

## Russell's Circumplex Model

James Russell's Circumplex Model of Affect is the most widely used 2D subset of VAD (using only Valence and Arousal):

```
                     High Arousal (+A)
                          |
              Tense    Excited    Alert
              Nervous   |      Enthusiastic
                     \  |  /
                      \ | /
    Negative Valence ---+--- Positive Valence
    (-V)              / | \              (+V)
                     /  |  \
              Sad      |     Content
              Bored  Calm    Relaxed
              Depressed  Serene
                          |
                     Low Arousal (-A)
```

### Emotion Positions in the Circumplex

| Emotion | Valence | Arousal | Quadrant |
|---------|---------|---------|----------|
| **Excited** | +0.6 | +0.8 | High V, High A |
| **Happy** | +0.8 | +0.5 | High V, High A |
| **Content** | +0.7 | -0.3 | High V, Low A |
| **Serene** | +0.5 | -0.7 | High V, Low A |
| **Angry** | -0.7 | +0.8 | Low V, High A |
| **Afraid** | -0.6 | +0.7 | Low V, High A |
| **Sad** | -0.7 | -0.5 | Low V, Low A |
| **Bored** | -0.3 | -0.7 | Low V, Low A |

### The Four Quadrants

1. **High Valence, High Arousal** (upper right): Joy, excitement, elation, enthusiasm
2. **Low Valence, High Arousal** (upper left): Anger, fear, anxiety, stress
3. **Low Valence, Low Arousal** (lower left): Sadness, depression, boredom, fatigue
4. **High Valence, Low Arousal** (lower right): Calm, contentment, relaxation, serenity

---

## Full VAD Space: Mapping Specific Emotions

The full 3D VAD space allows precise placement of emotions. Below are empirically validated coordinates from Mehrabian and Russell's research, and the NRC VAD Lexicon:

| Emotion | Valence | Arousal | Dominance |
|---------|---------|---------|-----------|
| **Joy** | +0.76 | +0.48 | +0.35 |
| **Excitement** | +0.62 | +0.75 | +0.38 |
| **Love** | +0.87 | +0.54 | +0.18 |
| **Pride** | +0.77 | +0.38 | +0.65 |
| **Contentment** | +0.72 | -0.29 | +0.31 |
| **Serenity** | +0.65 | -0.62 | +0.25 |
| **Hope** | +0.60 | +0.20 | +0.15 |
| **Amusement** | +0.72 | +0.53 | +0.42 |
| **Anger** | -0.51 | +0.59 | +0.56 |
| **Fear** | -0.64 | +0.60 | -0.43 |
| **Disgust** | -0.60 | +0.35 | +0.23 |
| **Sadness** | -0.63 | -0.27 | -0.33 |
| **Grief** | -0.77 | -0.10 | -0.50 |
| **Shame** | -0.64 | +0.12 | -0.57 |
| **Anxiety** | -0.51 | +0.60 | -0.36 |
| **Boredom** | -0.35 | -0.65 | -0.25 |
| **Surprise** | +0.15 | +0.67 | -0.10 |
| **Nostalgia** | +0.20 | -0.15 | -0.10 |
| **Awe** | +0.40 | +0.55 | -0.25 |
| **Contempt** | -0.45 | +0.10 | +0.55 |

### Key Distinctions Enabled by VAD

- **Anger vs Fear**: Similar V and A, but anger has **high D** (feeling in control) while fear has **low D** (feeling helpless)
- **Sadness vs Depression**: Similar V and D, but depression has **lower A** (less energy)
- **Joy vs Serenity**: Similar V, but joy has **higher A** (more energized)
- **Excitement vs Anxiety**: Similar A (both activated), but opposite **V** (pleasant vs unpleasant)
- **Pride vs Amusement**: Similar V and A, but pride has **higher D** (more sense of personal control)

---

## Mathematical Operations in VAD Space

One of the most powerful aspects of dimensional emotion representation is the ability to perform **mathematical operations** on emotional states.

### Emotion Distance

```python
import numpy as np

def emotion_distance(state1, state2):
    """Euclidean distance between two emotional states in VAD space."""
    v1, a1, d1 = state1
    v2, a2, d2 = state2
    return np.sqrt((v1-v2)**2 + (a1-a2)**2 + (d1-d2)**2)

# How different is current music's emotion from the target?
current = (0.3, 0.7, 0.2)   # mildly positive, highly aroused, neutral control
target  = (0.8, -0.3, 0.4)  # very positive, calm, moderate control
distance = emotion_distance(current, target)  # 1.22 -- quite different
```

### Emotion Blending (Weighted Average)

```python
def blend_emotions(states, weights):
    """Blend multiple emotional states with weights."""
    weights = np.array(weights) / sum(weights)  # normalize
    blended = np.zeros(3)
    for state, weight in zip(states, weights):
        blended += np.array(state) * weight
    return tuple(blended)

# Blend music emotion (60%) with speech emotion (40%)
music_emotion  = (0.7, 0.3, 0.2)   # happy, moderate energy
speech_emotion = (-0.3, 0.6, 0.4)  # negative, high energy, assertive
blended = blend_emotions(
    [music_emotion, speech_emotion],
    [0.6, 0.4]
)
# Result: (0.30, 0.42, 0.28) -- mixed/complex emotional state
```

### Emotion Trajectory (Temporal Dynamics)

```python
def emotion_velocity(state_t, state_t_minus_1, dt):
    """Rate of change in emotional state."""
    return tuple((np.array(state_t) - np.array(state_t_minus_1)) / dt)

def emotion_momentum(trajectory, window=5):
    """Moving average of emotion velocity."""
    velocities = []
    for i in range(1, min(window+1, len(trajectory))):
        v = emotion_velocity(trajectory[-i], trajectory[-i-1], 1.0)
        velocities.append(v)
    return tuple(np.mean(velocities, axis=0))
```

### Nearest Emotion Label

```python
EMOTION_MAP = {
    "joy":         (0.76, 0.48, 0.35),
    "excitement":  (0.62, 0.75, 0.38),
    "anger":       (-0.51, 0.59, 0.56),
    "fear":        (-0.64, 0.60, -0.43),
    "sadness":     (-0.63, -0.27, -0.33),
    "serenity":    (0.65, -0.62, 0.25),
    "contentment": (0.72, -0.29, 0.31),
    # ... more emotions
}

def nearest_emotion(vad_state, top_k=3):
    """Find the k nearest named emotions to a VAD state."""
    distances = {
        name: emotion_distance(vad_state, coords)
        for name, coords in EMOTION_MAP.items()
    }
    sorted_emotions = sorted(distances.items(), key=lambda x: x[1])
    return sorted_emotions[:top_k]

# What emotion is (0.5, 0.6, 0.3)?
result = nearest_emotion((0.5, 0.6, 0.3))
# [("excitement", 0.19), ("joy", 0.29), ...]
```

---

## The NRC Valence-Arousal-Dominance Lexicon

For mapping text to VAD values, the **NRC VAD Lexicon** (Saif Mohammad, 2018, National Research Council Canada) is an invaluable resource:

- **~20,000 English words** with crowdsourced VAD ratings
- Scale: 0.0 to 1.0 for each dimension (can be rescaled to -1 to +1)
- Validated across multiple languages and cultures
- Freely available for research

### Example Entries (rescaled to [-1, +1])

| Word | Valence | Arousal | Dominance |
|------|---------|---------|-----------|
| paradise | +0.96 | +0.32 | +0.46 |
| love | +0.88 | +0.56 | +0.22 |
| triumph | +0.82 | +0.74 | +0.84 |
| calm | +0.60 | -0.72 | +0.34 |
| surprise | +0.20 | +0.76 | -0.08 |
| anxiety | -0.54 | +0.70 | -0.48 |
| murder | -0.94 | +0.72 | +0.16 |
| despair | -0.86 | -0.04 | -0.72 |

### Using the NRC VAD Lexicon for Text-Based Emotion Sensing

```python
def text_to_vad(text, nrc_lexicon):
    """Estimate VAD values for a text passage using word-level VAD lookup."""
    words = tokenize(text.lower())
    vad_scores = []
    for word in words:
        if word in nrc_lexicon:
            vad_scores.append(nrc_lexicon[word])
    if not vad_scores:
        return (0.0, 0.0, 0.0)  # neutral default
    return tuple(np.mean(vad_scores, axis=0))
```

---

## Relevance to the Emotional Sensing Agent

### VAD as the Unified Emotion Representation

The Emotional Sensing Agent maps **all input signals** to VAD coordinates:

```
Audio (CLAP embedding) -------> VAD mapping ----+
                                                 |
Speech prosody (pitch/rate) --> VAD mapping ----+----> Composite
                                                 |     VAD State
Text/lyrics (embeddings) -----> VAD mapping ----+     Vector
                                                 |
Facial expression (if avail) -> VAD mapping ----+
```

### Continuous State Vector

The agent maintains a **time-varying VAD state** with exponential smoothing:

```python
class EmotionalState:
    def __init__(self, alpha=0.3):
        self.valence = 0.0
        self.arousal = 0.0
        self.dominance = 0.0
        self.alpha = alpha  # smoothing factor

    def update(self, new_v, new_a, new_d):
        """Exponential moving average update."""
        self.valence   = self.alpha * new_v   + (1 - self.alpha) * self.valence
        self.arousal   = self.alpha * new_a   + (1 - self.alpha) * self.arousal
        self.dominance = self.alpha * new_d   + (1 - self.alpha) * self.dominance

    @property
    def state(self):
        return (self.valence, self.arousal, self.dominance)

    @property
    def intensity(self):
        """Overall emotional intensity (distance from neutral)."""
        return np.sqrt(self.valence**2 + self.arousal**2 + self.dominance**2)
```

### Why VAD Is Critical for JARVIS

1. **Universal lingua franca**: Every sensing modality (audio, text, speech, visual) maps to the same 3D space
2. **Smooth transitions**: Emotional state evolves continuously, no jarring category switches
3. **Mathematically tractable**: Distance, blending, trajectories, derivatives all well-defined
4. **Culturally robust**: Dimensional models are more universal than emotion labels
5. **Rich enough**: Three dimensions capture the vast majority of emotional variance
6. **Simple enough**: Only three numbers to track, transmit, and reason about

---

## Key References

- Russell, J.A. (1980). "A circumplex model of affect." Journal of Personality and Social Psychology, 39(6), 1161-1178.
- Mehrabian, A. (1996). "Pleasure-Arousal-Dominance: A General Framework for Describing and Measuring Individual Differences in Temperament." Current Psychology, 14, 261-292.
- Mehrabian, A., & Russell, J.A. (1974). "An Approach to Environmental Psychology." MIT Press.
- Mohammad, S.M. (2018). "Obtaining Reliable Human Ratings of Valence, Arousal, and Dominance for 20,000 English Words." ACL 2018.
- Warriner, A.B., Kuperman, V., & Brysbaert, M. (2013). "Norms of valence, arousal, and dominance for 13,915 English lemmas." Behavior Research Methods, 45(4), 1191-1207.
- Barrett, L.F. & Russell, J.A. (1999). "The Structure of Current Affect: Controversies and Emerging Consensus." Current Directions in Psychological Science, 8, 10-14.
