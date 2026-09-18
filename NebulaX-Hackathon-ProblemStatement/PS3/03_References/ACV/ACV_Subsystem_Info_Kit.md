# Introduction to Refrigerant Leakage Faults in Train ACV System

*Fault Diagnosis and Localisation of Refrigerant Leakage*

## 1. Problem statement

### 1.1 Business background

The train ACV (air conditioning and ventilation) system is critical trainborne equipment ensuring
passenger-compartment comfort and operating conditions for crew. Its reliability directly affects
passenger service quality and operational safety. Refrigerant, as the core working fluid in
vapour-compression refrigeration cycles, plays a key role in heat transport and energy
conversion; refrigerant leakage is one of the most common failure modes in the train ACV system.

Industry statistics show that undercharge due to refrigerant leakage accounts for about 40% of
ACV cooling faults. ACV system faults represent over 30% of all vehicle faults, and the failure
rate increases significantly during summer high-temperature periods. Refrigerant leakage is a
primary cause of insufficient cooling capacity and ACV shutdown.

In this context, real-time condition monitoring based on trainborne pressure and temperature
sensors, combined with intelligent algorithms for leakage warning and localisation, is gradually
becoming an industry trend. Continuous acquisition and analysis of high-side/low-side pressures,
temperatures, and other parameters enable early detection of leakage and proactive maintenance,
promoting the transition from "planned maintenance" to "condition-based maintenance" for the ACV
system. 

### 1.2 Core problems to be solved

1. Only a small number of documented fault cases exist, limiting how much a data-driven model can
   learn from typical failure signatures compared with the other subsystems' datasets.
2. Diagnosis must distinguish genuine leakage-induced anomalies from normal cyclic variation in
   ACV control across the 8 cars of a train, and correctly **localise** the fault to the affected
   car — not merely detect that a fault exists somewhere on the train.

## 2. Dataset description

### 2.1 Data file format and parameter description

Each case is provided as a single `.xlsx` file containing continuous multivariate telemetry from
all 8 cars of a train, sampled every 30 seconds. Every row is one timestamp; each file has 3
identifying columns (car model, train number, time) plus, for each of the 8 cars, a set of
ACV-related parameters. **The exact parameter set differs between case files** — most files record
8 parameters per car (setting mode, running mode, control temperature for cooling and heating,
indoor/outdoor average temperature, load-halved status, and information-valid status), while one
file records a much richer set of telemetry per car (over 60 parameters, including operating mode,
control mode, running mode, self-check status, grounding detection/test, startup commands, target
temperature, and more). Your data-loading code should read each file's own column headers rather
than assuming a fixed parameter list or column count.

Per-car columns are named `Car <NN> - <parameter>`, where `<NN>` is the two-digit car identifier
exactly as it appears in that file's own headers (e.g. `Car 03 - ACV Running Mode`) — this is the
same identifier your `ranked_cars` values must use (see **Your task and expected output** below).

### 2.2 Training Dataset

6 documented fault cases are provided in the "Train" folder. In each case, only one car has a
refrigerant leakage fault, while the others are normal. The faulty car for each training case is
disclosed in **`Train_Labels.csv`** (at the root of this dataset), giving you ground truth to
develop and validate your approach against before applying it to the held-out test case.

### 2.3 Test Dataset

A test case file, **`acv_test_case.xlsx`**, is provided in the "Test" folder, in the same
multivariate-telemetry format described above (check its own column headers rather than assuming
Train's exact parameter set — see **Data file format and parameter description** above). As with each Train case, exactly one car in this file has a refrigerant leakage fault; unlike the
Train cases (where the faulty car is disclosed in `Train_Labels.csv`), which car that is here is
not published — it is used by the organising committee to independently evaluate submitted models
after the hackathon.

## 3. Your task and expected output

For each held-out case file, identify which car has the refrigerant leak fault, and rank every
car in that file from most to least likely to be the faulty one. This is a localisation/ranking
task rather than a plain classification: given only a handful of held-out-style cases across the
hackathon, being close (e.g. ranking the true faulty car 2nd) is scored better than an unranked
miss — see **Section 4 (Scoring)** below for the full formula and a worked example, but for your
submission, simply provide your best-ranked guess for every car in the file.

Your submitted inference script (`predict.py` — see the top-level README's **Deliverables**
section for the full requirement) must produce an `acv_predictions.csv` with one row per file:

| Column | Value |
|---|---|
| `file_id` | The source file name, including its extension — e.g. `acv_test_case.xlsx` (the actual test file provided in the "Test" folder). |
| `ranked_cars` | Every car in the file, ordered from most- to least-likely faulty, using the car identifier **exactly as it appears in that file's own column headers** (e.g. `03`, not `Car 3`), separated by `\|` — e.g. `03\|01\|05\|02\|04\|06\|07\|08`. |

See `04_Example_Submission/acv_predictions.csv` for a sample file in this exact format (the
file name and values there are illustrative placeholders, not real data).

This section covers only what your model needs to predict and how to format its output. The
top-level README's **Deliverables** section covers everything else you need to submit — your
development code, the trained model plus `predict.py`, and a short write-up — and the exact
`--input`/`--output` command-line interface `predict.py` must follow.

## 4. Scoring

ACV is graded with a **linear rank-decay score**, not plain top-1 accuracy — ranking the true
faulty car 2nd or 3rd still earns solid partial credit rather than counting as a complete miss,
since correctly narrowing down to a short list of likely-faulty cars has real diagnostic value
even when the top pick isn't exactly right.

For each held-out case file, your `ranked_cars` places the true faulty car at some rank `r`
(1 = most likely) out of `n` cars ranked in that file. The score for that file is:

**score = (n − (r − 1)) / n**

Worked example, for an 8-car file (n = 8):

| True faulty car ranked... | Score |
|---|---|
| 1st (top pick) | (8 − 0) / 8 = **1.000** |
| 2nd | (8 − 1) / 8 = **0.875** |
| 3rd | (8 − 2) / 8 = **0.750** |
| 4th | (8 − 3) / 8 = **0.625** |
| ... | ... |
| 8th (last place) | (8 − 7) / 8 = **0.125** |
| Not ranked at all (missing from `ranked_cars`, or the row is missing) | **0** |

Your overall ACV score (`primary_metric`) is the average of this per-file score across every
held-out case you are scored against — see the top-level Problem Statement 3 specification's
grading-rubric section for how this feeds into the overall Technical Execution score.
