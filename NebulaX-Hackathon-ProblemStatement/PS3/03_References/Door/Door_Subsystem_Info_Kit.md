# Documentation of Door Fault Diagnosis Dataset for Rail Vehicles

*Identification of Abnormal Resistance During Door Opening/Closing Process (Temporal Segment
Detection Problem)*

## 1. Problem Statement

### 1.1 Business Background

During the operation of saloon doors of metro vehicles, foreign objects in slide rails, rubber
strip jamming, door leaf deformation, etc. may cause abnormal opening/closing resistance.
Prolonged exposure may lead to door jamming, motor overload, and running faults. Current
operations and maintenance relies on manual onboard inspection, which is inefficient and has a
high missed-detection rate. An identification model is therefore required, based on time-series
data collected by the door controller — such as motor voltage, current, back electromotive
force, and door position — to automatically distinguish normal from abnormal-resistance
opening/closing conditions.

**What you're given is a live-style data stream, not pre-cut examples.** You will not be handed
one file per door cycle with the boundaries already marked — you're given one continuous
time-series recording that runs through many door-open/close cycles back to back, the way a real
onboard system would actually read the controller's output. Your model has to find where each
cycle starts and ends *before* it can even ask whether that cycle looks normal.

### 1.2 Core Problems to be Solved

1. Using statistical methods to set threshold-based mechanism models suffers from scarce fault
   samples, making it difficult to evaluate whether the thresholds are reasonably set.
2. Data distributions differ among doors; applying a uniform threshold leads to false alarms and
   missed detection of slight resistance faults.
3. In a live deployment, a model isn't handed pre-segmented, one-cycle-per-file recordings — it
   has to find where each door-open/close cycle starts and ends within a continuous stream of
   sensor readings *before* it can even ask whether that cycle looks normal.

## 2. Dataset Description

### 2.1 What you're given

Three files, at the root of this folder:

| File | What it is |
|---|---|
| `Train.csv` | A continuous data stream containing many door-open/close cycles back to back, with irregular gaps between cycles. Labelled — see `Train_Segments_Answer.csv`. |
| `Train_Segments_Answer.csv` | Ground truth for `Train.csv`: one row per true cycle, giving exactly where it starts and ends and whether it's Normal or Abnormal resistance. Columns: `segment_id`, `start_time`, `end_time`, `operation` (`Open`/`Close` — informational only, not something you need to predict), `status` (`Normal`/`Abnormal resistance`), `n_rows`. |
| `Test.csv` | The held-out counterpart to `Train.csv` — another continuous stream, same format, built the same way. **Unlabeled.** This is what your model needs to process end-to-end: find the cycles, then classify each one. |

Use `Train.csv` + `Train_Segments_Answer.csv` together to develop and validate your
segmentation-plus-classification approach (e.g. hold out part of `Train.csv` yourself to check
your pipeline before running it on `Test.csv`), then run that same pipeline on `Test.csv` to
produce your submission.

### 2.2 Data File Format and Parameter Description

Both `Train.csv` and `Test.csv` are `*.csv` files with a header row followed by the same 17
parameters per reading: time (year-month-day-hour-minute-second-millisecond, hyphen-separated,
not zero-padded — e.g. `2023-7-5-0-0-3-760`), door motor current (mA), door motor voltage (10 mV),
door motor back electromotive force, door opening time (0.1 s), door closing time (0.1 s), close
command, open command, DCSR, DCSL, DLSR, DLSL, door opened, door locked, opening, closing, door
position.

See **`Door Data Headers.pdf`** in this folder for the full parameter list, including what each
column and abbreviation (e.g. `DCSR`, `DLSL`) actually measures and how to interpret its values —
refer to it whenever a column name isn't self-explanatory.

**A note on finding cycle boundaries:** don't assume any particular column (e.g. the
opening/closing flags) is necessarily the easiest or most robust signal for detecting where one
cycle ends and the next begins — think about what actually changes at a cycle boundary versus
within a cycle, and design your segmentation approach around that.

## 3. Your Task and Expected Output

Given the continuous, unlabeled `Test.csv` stream, find each door-open/close cycle within it and
classify it as **Normal** or **Abnormal resistance**, using the motor current/voltage/back-EMF and
door-position signals described above (see **Section 1.2** for why a fixed threshold isn't
sufficient). You do not need to predict or report the operation (Open/Close) of each segment —
only its status.

Your submitted inference script (`predict.py` — see the top-level README's **Deliverables**
section for the full requirement) must produce a `door_predictions.csv` with **one row per
predicted segment** — not one row per file, since Test is a single continuous stream:

| Column | Value |
|---|---|
| `start_time` | Your predicted segment's start timestamp. Either the dataset's native `Year-Month-Date-Hour-Minute-Second-Millisecond` format (e.g. `2023-7-5-0-11-17-664`) or a standard ISO-parseable timestamp are both accepted. |
| `end_time` | Your predicted segment's end timestamp, same format rules as `start_time`. |
| `prediction` | `Normal` or `Abnormal resistance`. |

There is no `file_id` column (no per-file structure to key on) and no `confidence` column
required for this subsystem (an extra `confidence` column is fine to include if you have one — it
just isn't used for scoring). See `04_Example_Submission/door_predictions.csv` for a sample
file in this exact format (the values there are illustrative placeholders, not real data).

## 4. How Your Submission Is Scored

Unlike the other subsystems' plain accuracy, Door uses a single metric that rewards getting
*both* the timing and the label right: **IoU-weighted F1**. This section gives you the exact
formula — knowing precisely how it works will help you design and debug your segmentation
approach, and nothing here depends on the actual held-out labels.

### 4.1 Matching your predicted segments to the true ones

1. Every predicted segment is only allowed to match a true segment that has the **same** label.
   A segment with perfectly overlapping timing but the wrong label (`Normal` vs. `Abnormal
   resistance`) cannot match at all — it contributes nothing, exactly as if it weren't submitted.
2. Among same-label candidate pairs, a match is only considered if their time ranges actually
   overlap: **IoU** (intersection-over-union) of `[start_time, end_time]` must be greater than 0.
   IoU is computed as:

   ```
   intersection = max(0, min(true_end, pred_end) - max(true_start, pred_start))
   union        = (true_end - true_start) + (pred_end - pred_start) - intersection
   IoU          = intersection / union   (0 if union <= 0)
   ```

   IoU is 1.0 for a perfect match, approaches 0 as the overlap becomes negligible, and is exactly
   0 for no overlap at all.
3. Matching is **one-to-one**: each true segment can be matched to at most one predicted segment,
   and vice versa. Among all valid (same-label, IoU > 0) candidate pairs, matches are assigned
   greedily in order of **highest IoU first** — so the best-overlapping pairs are matched before
   any looser ones, and once a segment (true or predicted) is used, it's removed from further
   consideration.
4. A true segment with no matching prediction is a **miss**. A predicted segment that doesn't
   match any true segment (wrong label, no overlap, or already claimed by a better-overlapping
   pair) is a **false positive**. Both count against you.

### 4.2 Turning matches into a score

Each match's credit is its **IoU value itself** — not a flat 1 point per match. A loosely
overlapping (but correctly labelled) match is worth less than a tightly overlapping one.

```
soft_recall    = (sum of IoU over all matches) / (number of true segments)
soft_precision = (sum of IoU over all matches) / (number of predicted segments you submitted)

score = 2 * soft_recall * soft_precision / (soft_recall + soft_precision)
       (harmonic mean of soft_recall and soft_precision; 0 if both are 0)
```

This single `score` is what's reported as your result for this subsystem. Some intuition for how
it behaves:

- **Perfect submission** (every true segment found, with exactly matching boundaries and the
  correct label, nothing extra predicted): `soft_recall = soft_precision = 1.0`, `score = 1.0`.
- **Missing segments** (true cycles your model never found) lowers `soft_recall`, and therefore
  the score — even if everything you *did* predict is spot-on.
- **Spurious extra segments** (predictions that don't correspond to any real cycle) lower
  `soft_precision`, and therefore the score — over-segmenting the stream is penalised, not free.
- **Sloppy boundaries** (right cycle, right label, but a start/end time that's noticeably off)
  reduce the IoU of that match, which reduces its contribution to both `soft_recall` and
  `soft_precision`, even though it still counts as a "match" rather than a miss.
- **Wrong label** on an otherwise well-timed segment scores exactly the same as missing that
  segment entirely and predicting a spurious extra one — it cannot match at all.

There is no separate accuracy or IoU number reported alongside this — `score` (the harmonic mean
above) is the single value your Door submission is ranked on.

## 5. Everything Else

This section covers only what your model needs to predict and how to format its output, and how
that output is scored. The top-level README's **Deliverables** section covers everything else you
need to submit — your development code, the trained model plus `predict.py`, and a short
write-up — and the exact `--input`/`--output` command-line interface `predict.py` must follow.
