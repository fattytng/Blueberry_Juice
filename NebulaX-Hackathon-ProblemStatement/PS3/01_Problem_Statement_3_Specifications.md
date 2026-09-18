# Problem Statement 3 - Train Condition Monitoring

## 1. Challenge Statement

Rail vehicles generate large volumes of sensor data from their onboard subsystems during
day-to-day operation. Turning that data into automated fault and anomaly detection — rather
than relying on manual inspection or fixed thresholds — is a core condition monitoring
(CdM) capability for rail operators.

This hackathon problem statement covers **four independent subsystems** of a rail vehicle, each
with its own business context, dataset, and modelling task. Teams may choose to tackle one
subsystem in depth or attempt several; each is self-contained and does not depend on the others. The more subsystems attempted, the higher the score (see scoring section). 

## 2. Challenge Details

### 2.1 The Four Subsystems

| # | Subsystem | Task | Signal type |
|---|---|---|---|
| 1 | Door | Temporal segment detection — find each door-open/close cycle in a continuous stream and classify it normal vs. abnormal-resistance | Motor current / voltage / back-EMF + door position |
| 2 | ACV | Fault diagnosis / localisation — identify the car with a refrigerant leak | Cabin/ambient temperature + control-mode telemetry |
| 3 | Rail Corrugation | Multi-class classification — Normal / Side I / Side II corrugation | Axle-box vibration + shock (multi-channel) |
| 4 | SHM | Regression — cumulative fatigue damage estimation | Dynamic stress time series |

The table above is only a quick side-by-side summary — see each subsystem's own Info Kit
(Section 2.2) for that subsystem's full business background, dataset, and defined task; the Info
Kit is the authoritative problem definition, not this table.

All four are condition-monitoring problems in the same broad sense — using time-series sensor
data to infer the health state of a physical subsystem — but they span different task types
(binary classification, multi-class classification, ranking/localisation, and regression), so the
appropriate modelling approach differs across subsystems.

### 2.2 Repository Structure

```
FOR PARTICIPANTS/
├── 01_Problem_Statement_3_Specifications.md   # this file
├── 02_Datasets/                 # raw data files, by subsystem
│   ├── Door/                    # Test is a single continuous unlabeled stream (Test.csv),
│   │                             # not per-file -- see its info kit
│   ├── ACV/
│   ├── Rail_Corrugation/
│   └── SHM/
├── 03_References/               # each subsystem's Info Kit (.._Info_Kit.md), plus any
│   │                             # supporting docs/images for that subsystem
│   ├── Door/
│   ├── ACV/
│   ├── Rail_Corrugation/
│   └── SHM/
└── 04_Example_Submission/       # sample output CSVs showing the required prediction-file
                                  # format (see Deliverables below) -- illustrative only, not
                                  # real data
```

Each subsystem has:

- A **.md file** (`.._Info_Kit.md`) in `03_References/<Subsystem>/` describing the business
  background, data acquisition method, file/column schema, and the reference labels for the
  training data provided to you.
- The **raw data files** (`.txt`, `.csv`, or `.xlsx`, depending on the subsystem) in
  `02_Datasets/<Subsystem>/` — this is the full set of data you have to work with.

Read the subsystem-specific info kit before starting — it defines the specific problem statement,
dataset, and task for the subsystem.

### 2.3 Data Conventions

- The data provided to you up front is for training and validation. A separate **held-out test
  set exists for each subsystem, but only its reference labels/values are kept by the organising
  team** — the unlabelled held-out test **input files** are distributed to teams ahead of the
  submission deadline (see **Deliverables** below) so you can run them through your own app and
  submit the resulting predictions yourself; the files are not secret, only the correct answers
  for them are.
- Design and justify your own train/validation split from the data you're given (e.g. by
  operating condition, by file, or by another grouping relevant to that subsystem) — the
  subsystem documentation will tell you what reference labels are available to split against.
- Units, sampling frequencies, and column definitions vary by subsystem and are specified in each
  subsystem's documentation — do not assume they carry over between subsystems.
- Class balance varies significantly across subsystems and datasets; check the label distribution
  before choosing an evaluation metric.

## 3. Expectations & Goals

### 3.1 Getting Started

1. Pick one or more subsystems.
2. Read that subsystem's documentation in full — business background, schema, and baseline data
   sections all matter for framing the problem correctly.
3. Load and visualise a few sample files to sanity-check your understanding of the schema before
   building features at scale.
4. Establish a train/validation split appropriate to the data (see **Data conventions** above).
5. Build a baseline model, then iterate.
6. Develop the app that houses your trained model(s) — it's a compulsory deliverable (Section
   4.1, item 3), not an afterthought once your model is ready.

### 3.2 What we're looking for

- **Methodologically sound work**: valid train/validation splits and no data leakage. This is
  assessed as much as the headline metric itself — a high score achieved through a leaky split
  will not score well. Each subsystem's own scoring metric is already fixed and fully disclosed,
  with a worked example, in that subsystem's Info Kit (Section 4) — no need to choose or justify
  a metric yourself.
- **Clear reasoning**: where the documentation leaves a design decision open (e.g. how to split
  data when no official split is given), state the assumption you made and why.
- **Number of subsystems attempted**: the more subsystems a team attempts, the higher their overall score.

## 4. Deliverables

### 4.1 Compulsory Submission Items

Every team must submit all three of the following for each subsystem they attempt. Submissions
missing any of these will not be scored for that subsystem.

**1. A short demo video of your app.**
A short screen recording (not more than 3 minutes) showing your app in use end to end: selecting a
subsystem, uploading/dragging in a data file, and viewing (and downloading) the prediction/result
on screen. This is the primary evidence judges use to score Ease of Use (Section 6.3) — see item 3
below for what the app itself must do.

**2. Your prediction outputs, zipped into a single `predictions.zip`.**
Your model's prediction CSVs, packaged into one `predictions.zip` file placed directly in your
team folder — generated by running the **held-out test input files we distribute to you before
the deadline** (Section 2.3) through your own app (item 3 below) — for each subsystem you
attempted, using this schema. Zip only the `*_predictions.csv` file(s) for the subsystem(s) you
attempted, directly at the top level of the zip (no subfolders inside it, and no need to include
files for subsystems you didn't attempt):

| Subsystem | Output filename | `prediction` values |
|---|---|---|
| Door | `door_predictions.csv` | **No `file_id` column** — instead `start_time`, `end_time`, `prediction`, one row per *predicted segment* found in the continuous `Test.csv` stream (`Normal` or `Abnormal resistance`). See the Door info kit for the exact timestamp format and scoring. |
| ACV | `acv_predictions.csv` | **No `prediction` column** — just `file_id` and `ranked_cars`, listing every car in the file from most- to least-likely faulty, using the car identifier **exactly as it appears in that file's own column headers** (e.g. `03`, not `Car 3`), separated by `\|`. |
| Rail corrugation | `rail_predictions.csv` | `Normal`, `Side I`, or `Side II`, one row per file. |
| SHM | `shm_predictions.csv` | A single numeric predicted cumulative-damage value, one row per file. |

For every subsystem other than ACV/Door's special schema above, use `file_id` (source file name,
including its extension) and `prediction` (your model's predicted label or value).

These are the files judges score directly via `judge_leaderboard.py` for Technical Execution
(Section 6.2), after unzipping `predictions.zip` — how you produced them is not separately
re-checked, since your demo video (item 1) and app (item 3) are the evidence a real working
pipeline generated them, not the underlying code.

**See the `04_Example_Submission/` folder** for a sample CSV in the
correct format for each subsystem — the file names and predictions there are illustrative
placeholders only (not real data), included purely to show the schema. Zip your own CSVs
yourself using your OS's ordinary compress/zip feature — no particular zip tool or compression
level is required, just a valid `.zip` archive named `predictions.zip`.

**3. Your app.**
Package your trained model(s) behind a simple interface so a **non-technical user** can use them
without touching code: for example, a small web app where someone selects a subsystem, uploads (or
drags & drops) a data file, and gets the prediction/result back on screen with an option to
download it. Use this same app to produce the predictions you zip and submit in item 2 above —
running the held-out test files through it is how you generate your prediction CSVs.

### 4.2 Optional Items (not required, but strengthen your submission)

Not required for a subsystem to be scored, but they help judges assess Problem Fit (Section 6.1)
and let you show your work:

- **Short write-up or presentation.** Your approach, feature engineering choices, model selection
  and why, the metrics you reported and why they suit the task (Section 3.2), and any assumptions
  you made where the documentation left a design decision open.
- **Your development code and trained model(s).** Not required for scoring, but useful if judges
  want to understand or verify your methodology beyond what the write-up and video cover.

### Submission folder structure

Package everything above into a single folder (or zip), with the **top-level folder named after
your team** exactly as registered — this is how we identify and score your submission:

```
<Your Team Name>/
├── demo_video.<mp4|mov|...>        # Item 1 — short video of your app in use
├── predictions.zip                  # Item 2 — a single zip containing one *_predictions.csv
│                                     # per subsystem attempted, placed directly here
├── app/                              # Item 3 — your app's source/deployment
│   └── ...
└── Optional_Items/                   # Optional — Section 4.2 — everything not required for
    ├── write_up.<pdf|docx|md>        # scoring goes in this one interim folder
    └── Door/                          # one folder per subsystem, using these exact names:
        ├── code/                      # Door, ACV, Rail Corrugation, SHM. Omit any subsystem
        └── model/                     # you didn't attempt, and this whole folder if you skip
                                        # code/model.
```

Notes:
- Do **not** include the `04_Example_Submission/` folder's contents or any of the raw dataset in your
  submission — we already have those.
- `predictions.zip` (item 2) must be its own zip file, separate from optionally zipping your whole
  team folder for upload — if you do zip the whole submission, `predictions.zip` should appear
  inside it as its own file, not already unzipped.
- If your write-up covers multiple subsystems at once rather than one per subsystem, a single copy
  at the top level of `Optional_Items/` is fine — just say so in it.
- Your app should be a single app covering every subsystem you attempt (item 3 above) — submit it
  once at the team-root level, not duplicated per subsystem.

## 5. Judging Rubric

This section is now the source of truth for scoring.

### 5.1 Each subsystem is scored independently

Your `*_predictions.csv` for each subsystem you attempt, zipped into `predictions.zip`
(Section 4.1, item 2), is compared against that held-out test set's reference labels/values, which are kept by the organising team
and never shared — even though the unlabelled test input files themselves are distributed to you
ahead of the deadline (Section 2.3) so you can run them through your app. Each subsystem has its
own primary metric, matched to its task type — see the table below.

A few things worth noting:
- If you don't submit a required file for a subsystem, that subsystem is simply not scored for
  you — it does not count against you beyond not contributing to your overall score (see 5.3).
- A submission that errors out, or has zero overlap with the held-out set (e.g. wrong file
  naming, or for Door, no predicted segment overlapping any true one), will not receive a score
  for that subsystem.
- Methodologically sound work is judged alongside the headline metric — see Section 3.2.

### 5.2 Subsystem weighting and what's scored

| Subsystem | Weight (Overall Score) | What's Scored |
|---|---|---|
| Door | 25% (1/4) | **IoU-weighted F1** — how well your predicted segments' timing *and* label (`Normal`/`Abnormal resistance`) match the held-out segments in the continuous Test stream. **Full formula disclosed in `Door_Subsystem_Info_Kit.md` Section 4.** |
| ACV | 25% (1/4) | **Linear rank-decay score** — how closely your `ranked_cars` ordering places the true faulty car near the top; the true car ranked 1st scores highest, and being off by one or two rank positions still earns solid partial credit rather than counting as a complete miss. **Full formula and a worked example disclosed in `ACV_Subsystem_Info_Kit.md` Section 4.** |
| Rail corrugation | 25% (1/4) | **Macro F1** across the three classes (`Normal`/`Side I`/`Side II`) — the unweighted average of each class's own F1 score, not plain accuracy, so the model is credited for correctly detecting the rare Side I/Side II cases and not just the common Normal case. **Full formula and a worked example disclosed in `Rail_Corrugation_Info_Kit.md` Section 4.** |
| SHM | 25% (1/4) | **max(0, 1 − MAPE)** — a score derived from Mean Absolute Percentage Error between your predicted and true cumulative-damage value: 1.0 is a perfect prediction, decreasing linearly as average percentage error grows, floored at 0 for 100%+ average error. **Full formula and a worked example disclosed in `SHM_Info_Kit.md` Section 5.** |

Every subsystem is weighted equally — there is no per-subsystem difficulty weighting.

> **Every subsystem's exact scoring formula is now disclosed, with a worked example, in that
> subsystem's own Info Kit** (see the pointers above). The table's "What's Scored" column names
> the metric; the Info Kit is where the full worked formula lives. 

### 5.3 Two combined scores across subsystems

Because teams can choose how many of the 4 subsystems to attempt, two combined figures are
reported rather than one:

- **Overall Score** — rewards breadth. Total combination value across **all 4 subsystems**,
  divided by **4**, always — a subsystem you didn't attempt (or attempted but scored 0 on)
  contributes 0 to the sum rather than being excluded, so attempting more subsystems can only
  raise this score, never lower it.
- **Average Score** — rewards depth/focus. Total combination value across only the subsystems you
  actually attempted, divided by the number attempted (e.g. attempt 2 subsystems and each is
  worth 50% of your Average Score) — not diluted by subsystems you chose to skip.

Both numbers are shown so teams that go broad and teams that go deep are each recognised for what
they optimised for.

### 5.4 Per-subsystem leaderboards

In addition to the two combined scores, each subsystem has its own leaderboard sorted by that
subsystem's primary metric, so you can see how your model stacks up against other teams' models
for that subsystem specifically, independent of how many other subsystems anyone attempted.

## 6. Overall Grading Rubric

Sections 3-5 above define how your submission is built and how each subsystem is scored on its
own held-out test set. Beyond that, your submission is also graded against three overall
criteria, each covering a different aspect of your solution: **Problem Fit**, **Technical
Execution**, and **Ease of Use**.

### 6.1 Problem Fit

What it assesses:
- Coverage of the different train datasets
- Fit with LTA predictive maintenance needs
- Anomaly detection, model comparison, forecasting
- Benchmarking and model selection
- Explainability, UI, code quality

### 6.2 Technical Execution

What it assesses: model performance — F1 scores, false-positive/false-negative rates, and
prediction error — in short, how well your submitted models actually perform against the
held-out test set, as measured by the per-subsystem scoring defined in Section 5.

This is scored automatically from your submitted `*_predictions.csv` files inside `predictions.zip`
(Section 4.1, item 2) using `judge_leaderboard.py`, run by the organising/judging team — not by
manual review of your code, app, or write-up. See Section 5 for how each subsystem's held-out test performance is
measured.

### 6.3 Ease of Use

What it assesses:
- Ease of use for non-technical users
- Clarity of visuals and outputs
- Usefulness of results

This maps to **the App** (Section 4.1, item 3), judged from your demo video
(Section 4.1, item 1) and the app itself.

### Questions

For questions on a specific dataset, refer first to that subsystem's documentation file. For
questions on the hackathon itself, contact the organising team.
