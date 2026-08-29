# Huddle Score Model

This folder contains a standalone FBS score prediction model. It lives outside
the app's `frontend/` and `backend/` folders so it can evolve independently.

The model uses ESPN scoreboard data from the previous five FBS regular seasons,
then predicts one target week. It is intentionally dependency-light and uses
Python's standard library only.

## Predict A Week

```bash
python modeling/espn_score_model.py predict-week --season 2026 --week 1
```

By default, this trains from seasons `2021-2025` when predicting 2026.

Outputs are written to:

```text
modeling/predictions/fbs_predictions_2026_week1.csv
```

## Useful Options

```bash
python modeling/espn_score_model.py predict-week \
  --history-start-season 2021 \
  --history-end-season 2025 \
  --season 2026 \
  --week 1
```

Use `--refresh` to ignore cached ESPN data and fetch everything again.

```bash
python modeling/espn_score_model.py predict-week --season 2026 --week 1 --refresh
```

## Backtest

Backtest one season by training on the five years before it:

```bash
python modeling/espn_score_model.py backtest --season 2025
```

The model reports mean absolute error for home points, away points, total, and
margin.

## Model Shape

For each team, the model builds recency-weighted ratings from completed games:

- points scored
- points allowed
- point differential
- schedule strength proxy based on opponent margin rating
- recent form from the team's latest games

Predicted scores blend team offense, opponent defense, home-field advantage,
recent form, and current ESPN rankings when available.

This is a baseline model, not a betting recommendation engine. It is designed
to be understandable, inspectable, and good enough to serve as a foundation.
