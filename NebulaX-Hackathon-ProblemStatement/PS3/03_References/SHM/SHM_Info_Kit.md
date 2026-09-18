# Documentation of Rail Vehicle Structural Health Monitoring Dataset

*Dynamic Stress Fatigue Cumulative Damage Assessment*

## 1. Problem Statement

### 1.1 Business Background

The critical load-bearing structures of rail vehicles — such as carbodies and bogie frames — are
complex dynamic response systems with multiple mutually coupled loads. To ensure safety during
line operation, dedicated sensors are installed during testing to build monitoring devices,
collecting key measured data to verify design boundary rationality and assess structural service
safety. However, short-term dynamic stress tests cannot fully capture load fluctuations caused by
external dynamic factors — such as track irregularities and deteriorating wheel-rail interaction
— over long-term actual operation, nor reflect the load variation characteristics during real
service. They also cannot effectively identify potential safety risks due to material property
degradation over time.

Deploying a Structural Health Monitoring (SHM) system for long-term dynamic stress data
monitoring enables a clear understanding of wear patterns and potential hidden hazards of vehicle
structures during actual service — for example, identifying risk zones and cumulative damage
trends at measurement points — thereby providing data support and evidence for optimising
subsequent maintenance strategies.

**Data acquisition rules**: the system automatically starts when the vehicle is powered on,
continuously acquires dynamic stress data, and saves them periodically as independent files, each
containing all monitoring points.

### 1.2 Core Problems to be Solved

1. Traditional Miner's linear damage rule relies on manual rainflow counting and time-series
   statistics, lacking automation, computational efficiency, and real-time capability.
2. It lacks machine-learning-based time-series intelligence, making it difficult to perform rapid,
   online fatigue damage and remaining-life assessments on massive dynamic-stress time-series
   data, and cannot meet the demands of dynamic, real-time intelligent evaluation.

### 1.3 Fatigue Assessment Background

Miner's linear cumulative damage rule, combined with rainflow counting for processing random
dynamic stress time histories, is the mainstream method used to produce the reference damage
values in this dataset. The principle, step-by-step calculation, and formulae are explained below
— you are not required to use this same method, but it may help in understanding what the target
value represents.

#### 1.3.1 Miner's Linear Cumulative Damage Rule

Under multi-level alternating loads, the total damage is the sum of cyclic damages at each stress
level. Fatigue failure occurs when the total damage $D \geq 1$.

Total damage formula:

$$D = \sum_{i = 1}^{k}{D_{i} = \sum_{i = 1}^{k}\frac{n_{i}}{N_{i}}}$$

- $D$: total cumulative damage (target to compute)
- $n_{i}$: actual number of cycles at stress level $i$
- $N_{i}$: number of fatigue damage cycles of materials/components at stress level $i$ (from the
  S-N curve)
- $k$: total number of stress levels

#### 1.3.2 S-N Curve (Stress-Life Curve)

It describes the relationship between alternating stress amplitude and fatigue life, commonly
expressed in power-law form:

$$\sigma_{a}^{m}.N = C$$

Deformation fatigue life:

$$N_{i} = \frac{C}{\sigma_{a,i}^{m}}$$

Where $\sigma_{a,i}$ is the stress amplitude at level $i$, and $(m, C)$ are S-N curve constants
obtained from material/component testing.

#### 1.3.3 Rainflow Counting Method

It extracts independent stress cycles (stress amplitude, mean stress, cycle count) from a random
continuous dynamic stress time series — the standard preprocessing method for random dynamic
stress.

## 2. Dataset Description

### 2.1 Data File Format and Parameter Description

All dynamic stress data files are saved in `*.csv` format, which contains the dynamic stress
calculation results for equal-length time segments from a certain measurement point on a line
— one file per segment. Training files are named `train01.csv`–`train64.csv` (in the `Train/`
folder). File numbers are assigned at random and do not follow the order the segments were
recorded in, nor do they correlate with a file's cumulative damage level — treat the number as an
arbitrary identifier, not as a sequence.

The dataset is collected from measured signals on rail vehicles operating on two lines, covering
two typical load conditions (AW0 and AW4). All samples represent healthy operating conditions; no
structural fault or damage abnormal samples are included.

### 2.2 Training Dataset

Training dataset folder (Train): 64 data files - training labels are given in
**`Train_Labels.csv`**, alongside the `Train/` folder at the root of this subsystem's data — one
row per file, with `filename` and `damage` columns. 

### 2.3 Test Dataset

Test dataset folder (Test): 16 data files (`test01.csv`–`test16.csv`), in the same file format
as Train (see **Data File Format and Parameter Description** above — these file numbers are
likewise randomly assigned and carry no information about damage level). Reference cumulative-damage
labels for these files are not published here; they are used by the organising committee to
independently evaluate submitted models after the hackathon.

## 3. Your Task and Expected Output

Build a model that predicts a single numeric **cumulative fatigue damage** value for each
dynamic-stress time-series file — a regression task, not classification (see **Section 1.3, Fatigue Assessment Background**
above for the Miner's-rule/rainflow-counting background the reference answers were computed
with, though you are not required to use that same method).

Your submitted inference script (`predict.py` — see the top-level README's **Deliverables**
section for the full requirement) must produce an `shm_predictions.csv` with one row per file:

| Column | Value |
|---|---|
| `file_id` | The source file name, including its extension — e.g. `test03.csv`. |
| `prediction` | Your model's predicted cumulative-damage value (a single number). |

See `04_Example_Submission/shm_predictions.csv` for a sample file in this exact format (the
file names and values there are illustrative placeholders, not real data).

This section covers only what your model needs to predict and how to format its output. The
top-level README's **Deliverables** section covers everything else you need to submit — your
development code, the trained model plus `predict.py`, and a short write-up — and the exact
`--input`/`--output` command-line interface `predict.py` must follow.

## 4. Scoring

SHM is graded on a **MAPE-derived score**, `max(0, 1 − MAPE)`, not MAE, RMSE, or R² directly —
though your `predict.py` script can still compute those for your own reference during development.

**MAPE** (Mean Absolute Percentage Error) is the average, across every held-out file, of how far
off your prediction is *relative to* the true damage value:

**MAPE = mean( |true − predicted| / |true| )**, expressed as a fraction (0.05 = 5% average error).

Your score is then:

**score = max(0, 1 − MAPE)**

- **1.0** — a perfect prediction for every file (0% average error).
- Decreases **linearly** as your average percentage error grows — 10% average error scores 0.90,
  25% scores 0.75, and so on.
- **Floors at 0** once your average error reaches 100% or more (it never goes negative).

This is measured relative to each file's true value rather than in absolute damage units, so a
model that's consistently a little off scores predictably regardless of whether the true damage in
that file happens to be small or large.

Worked example — say the held-out damage values are `[0.10, 0.30, 0.50, 0.70, 0.90]` and your
model predicts `[0.15, 0.28, 0.55, 0.68, 0.85]`:

| True | Predicted | \|error\| / true |
|---|---|---|
| 0.10 | 0.15 | 50.0% |
| 0.30 | 0.28 | 6.7% |
| 0.50 | 0.55 | 10.0% |
| 0.70 | 0.68 | 2.9% |
| 0.90 | 0.85 | 5.6% |

**MAPE = (50.0 + 6.7 + 10.0 + 2.9 + 5.6) / 5 = 15.0%** → **score = 1 − 0.150 = 0.850**

For comparison, a much worse model predicting `[0.50, 0.50, 0.50, 0.50, 0.50]` for every file
(i.e. just guessing a constant) has a MAPE of about 108% on this same example, so its score floors
at **0** rather than going negative.

Your final SHM score (`primary_metric`) is this `max(0, 1 − MAPE)` value directly — there is no
separate combination-only column for SHM, since this score is already on the same 0-1 scale used
for every other subsystem. See the top-level Problem Statement 3 specification's grading-rubric
section for how this feeds into the overall Technical Execution score.
