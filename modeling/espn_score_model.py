"""
Standalone ESPN FBS score model.

Fetches historical ESPN scoreboard data, builds recency-weighted team ratings,
and predicts scores for a target FBS week.
"""

import argparse
import csv
import json
import math
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from statistics import mean
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo


ESPN_SCOREBOARD_URL = (
    "https://site.api.espn.com/apis/site/v2/sports/football/"
    "college-football/scoreboard"
)
EASTERN_TZ = ZoneInfo("America/New_York")
FBS_GROUP_ID = 80
REGULAR_SEASON_TYPE = 2
UNRANKED_VALUE = 99
DATA_DIR = Path(__file__).resolve().parent / "data"
PREDICTIONS_DIR = Path(__file__).resolve().parent / "predictions"


@dataclass
class TeamRating:
    games: int
    points_for: float
    points_against: float
    margin: float
    schedule_margin: float
    recent_margin: float


@dataclass
class ScoreModel:
    ratings: dict[str, TeamRating]
    average_points: float
    home_field_points: float


class EspnModelError(RuntimeError):
    """Raised when model data cannot be fetched or parsed."""


def main() -> None:
    """Run the score model command line interface."""
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    predict_parser = subparsers.add_parser("predict-week")
    predict_parser.add_argument("--season", required=True, type=int)
    predict_parser.add_argument("--week", required=True, type=_parse_week)
    predict_parser.add_argument("--history-start-season", type=int)
    predict_parser.add_argument("--history-end-season", type=int)
    predict_parser.add_argument("--date")
    predict_parser.add_argument("--refresh", action="store_true")
    predict_parser.add_argument("--output")

    backtest_parser = subparsers.add_parser("backtest")
    backtest_parser.add_argument("--season", required=True, type=int)
    backtest_parser.add_argument("--history-start-season", type=int)
    backtest_parser.add_argument("--history-end-season", type=int)
    backtest_parser.add_argument("--team")
    backtest_parser.add_argument("--refresh", action="store_true")

    args = parser.parse_args()

    if args.command == "predict-week":
        predict_week(args)
        return

    backtest(args)


def predict_week(args: argparse.Namespace) -> None:
    """Train from history and write target-week score predictions."""
    history_start, history_end = _history_window(args)
    historical_games = load_completed_games(
        start_season=history_start,
        end_season=history_end,
        refresh=args.refresh,
    )
    target_events = fetch_scoreboard_week(season=args.season, week=args.week).get(
        "events", []
    )
    model = train_model(historical_games)
    predictions = [
        predict_event(model=model, event=event, season=args.season, week=args.week)
        for event in target_events
    ]
    predictions = _filter_predictions_by_date(predictions, args.date)
    output_path = Path(args.output) if args.output else _prediction_path(
        season=args.season,
        week=args.week,
        game_date=args.date,
    )

    write_predictions(predictions=predictions, output_path=output_path)

    print("Prediction complete")
    print(f"History seasons: {history_start}-{history_end}")
    print(f"Historical games: {len(historical_games)}")
    print(f"Target games: {len(predictions)}")
    print(f"Output: {output_path}")


def backtest(args: argparse.Namespace) -> None:
    """Backtest one season against the previous five years."""
    history_start, history_end = _history_window(args)
    historical_games = load_completed_games(
        start_season=history_start,
        end_season=history_end,
        refresh=args.refresh,
    )
    target_games = load_completed_games(
        start_season=args.season,
        end_season=args.season,
        refresh=args.refresh,
    )
    if args.team:
        target_games = [
            game
            for game in target_games
            if args.team.lower() in {game["home_team"].lower(), game["away_team"].lower()}
        ]

    target_games = [
        enrich_game_with_historical_odds(game=game, refresh=args.refresh)
        for game in target_games
    ]
    model = train_model(historical_games)
    errors = []
    ats_results = []
    total_results = []

    for game in target_games:
        prediction = predict_game(model=model, game=game)
        ats_result = _ats_result(game=game, prediction=prediction)
        total_result = _total_result(game=game, prediction=prediction)

        if ats_result is not None:
            ats_results.append(ats_result)

        if total_result is not None:
            total_results.append(total_result)

        errors.append(
            {
                "home": abs(prediction["predicted_home_score"] - game["home_score"]),
                "away": abs(prediction["predicted_away_score"] - game["away_score"]),
                "total": abs(prediction["predicted_total"] - game["total"]),
                "margin": abs(prediction["predicted_margin"] - game["margin"]),
            }
        )

    print("Backtest complete")
    print(f"History seasons: {history_start}-{history_end}")
    print(f"Backtest season: {args.season}")
    if args.team:
        print(f"Team filter: {args.team}")
    print(f"Backtest games: {len(errors)}")
    print(f"Home score MAE: {_mae(errors, 'home'):.2f}")
    print(f"Away score MAE: {_mae(errors, 'away'):.2f}")
    print(f"Total MAE: {_mae(errors, 'total'):.2f}")
    print(f"Margin MAE: {_mae(errors, 'margin'):.2f}")
    print(f"ATS picks: {len(ats_results)}")
    print(f"ATS accuracy: {_accuracy(ats_results):.1%}")
    print(f"Total picks: {len(total_results)}")
    print(f"Over/under accuracy: {_accuracy(total_results):.1%}")


def load_completed_games(
    start_season: int,
    end_season: int,
    refresh: bool = False,
) -> list[dict]:
    """Load completed FBS regular-season games for a season range."""
    games = []

    for season in range(start_season, end_season + 1):
        for event in load_season_events(season=season, refresh=refresh):
            game = map_completed_event(event)
            if game:
                games.append(game)

    return games


def load_season_events(season: int, refresh: bool = False) -> list[dict]:
    """Load and cache all ESPN FBS regular-season events for one season."""
    cache_path = DATA_DIR / f"espn_fbs_{season}.json"

    if cache_path.exists() and not refresh:
        return json.loads(cache_path.read_text(encoding="utf-8"))

    events = []
    calendar_payload = fetch_scoreboard(
        {
            "dates": season,
            "seasontype": REGULAR_SEASON_TYPE,
            "groups": FBS_GROUP_ID,
            "limit": 1,
        }
    )

    for entry in _regular_season_entries(calendar_payload):
        payload = fetch_scoreboard(
            {
                "dates": _entry_dates(entry),
                "seasontype": REGULAR_SEASON_TYPE,
                "groups": FBS_GROUP_ID,
                "limit": 1000,
            }
        )
        events.extend(payload.get("events", []))

    deduped = {event["id"]: event for event in events}
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(
        json.dumps(list(deduped.values()), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    return list(deduped.values())


def fetch_scoreboard_week(season: int, week: int) -> dict:
    """Fetch one full ESPN FBS week using ESPN's calendar date range."""
    calendar_payload = fetch_scoreboard(
        {
            "dates": season,
            "seasontype": REGULAR_SEASON_TYPE,
            "groups": FBS_GROUP_ID,
            "limit": 1,
        }
    )

    for entry in _regular_season_entries(calendar_payload):
        if int(entry["value"]) == week:
            return fetch_scoreboard(
                {
                    "dates": _entry_dates(entry),
                    "seasontype": REGULAR_SEASON_TYPE,
                    "groups": FBS_GROUP_ID,
                    "limit": 1000,
                }
            )

    raise EspnModelError(f"No ESPN week {week} found for season {season}.")


def fetch_scoreboard(query_params: dict) -> dict:
    """Fetch ESPN scoreboard JSON."""
    query = urlencode(
        {
            key: value
            for key, value in query_params.items()
            if value is not None
        }
    )
    request = Request(f"{ESPN_SCOREBOARD_URL}?{query}")

    try:
        with urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise EspnModelError(f"ESPN returned HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise EspnModelError(f"Could not reach ESPN: {exc.reason}") from exc


def fetch_event_odds(event_id: str, refresh: bool = False) -> dict:
    """Fetch and cache historical ESPN odds for one event."""
    cache_path = DATA_DIR / "odds" / f"{event_id}.json"

    if cache_path.exists() and not refresh:
        return json.loads(cache_path.read_text(encoding="utf-8"))

    odds_url = (
        "https://sports.core.api.espn.com/v2/sports/football/leagues/"
        f"college-football/events/{event_id}/competitions/{event_id}/odds"
    )
    query = urlencode({"lang": "en", "region": "us"})
    request = Request(f"{odds_url}?{query}")

    try:
        with urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise EspnModelError(f"ESPN returned HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise EspnModelError(f"Could not reach ESPN: {exc.reason}") from exc

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    return payload


def enrich_game_with_historical_odds(game: dict, refresh: bool = False) -> dict:
    """Add historical ESPN spread and total to a completed game when available."""
    if game.get("espn_spread") is not None and game.get("espn_total") is not None:
        return game

    odds_payload = fetch_event_odds(event_id=game["event_id"], refresh=refresh)
    odds = _first(odds_payload.get("items")) or {}

    return {
        **game,
        "espn_spread": _optional_float(odds.get("spread")),
        "espn_total": _optional_float(odds.get("overUnder")),
    }


def train_model(games: list[dict]) -> ScoreModel:
    """Train recency-weighted team ratings from completed games."""
    if not games:
        raise EspnModelError("No completed games available for training.")

    season_weights = _season_weights(games)
    team_rows = defaultdict(list)
    margins_by_team = defaultdict(list)
    home_margins = []
    point_totals = []

    for game in games:
        weight = season_weights[game["season"]]
        home_margin = game["home_score"] - game["away_score"]
        away_margin = -home_margin

        team_rows[game["home_team"]].append(
            (weight, game["home_score"], game["away_score"], home_margin)
        )
        team_rows[game["away_team"]].append(
            (weight, game["away_score"], game["home_score"], away_margin)
        )
        margins_by_team[game["home_team"]].append(home_margin)
        margins_by_team[game["away_team"]].append(away_margin)
        point_totals.extend([game["home_score"], game["away_score"]])

        if not game["neutral_site"]:
            home_margins.append(home_margin)

    raw_ratings = {
        team: _team_rating(rows=rows, opponent_margins=[])
        for team, rows in team_rows.items()
    }
    ratings = {}

    for team, rows in team_rows.items():
        opponent_margins = [
            raw_ratings[opponent].margin
            for game in games
            for opponent in _opponents_for_team(game, team)
            if opponent in raw_ratings
        ]
        ratings[team] = _team_rating(rows=rows, opponent_margins=opponent_margins)

    return ScoreModel(
        ratings=ratings,
        average_points=mean(point_totals),
        home_field_points=(mean(home_margins) / 2) if home_margins else 1.5,
    )


def predict_event(model: ScoreModel, event: dict, season: int, week: int) -> dict:
    """Predict one target ESPN event."""
    competition = (event.get("competitions") or [{}])[0]
    competitors = competition.get("competitors") or []
    home = _competitor(competitors, "home")
    away = _competitor(competitors, "away")

    if not home or not away:
        raise EspnModelError(f"Missing home/away team for event {event.get('id')}")

    kickoff = _parse_espn_datetime(competition.get("date") or event["date"])
    odds = _odds(competition)
    game = {
        "season": season,
        "week": week,
        "event_id": event.get("id"),
        "game_date": kickoff.date().isoformat(),
        "game_time": kickoff.time().isoformat(),
        "home_team": _team_name(home),
        "away_team": _team_name(away),
        "home_rank": _rank(home),
        "away_rank": _rank(away),
        "home_record": _overall_record(home),
        "away_record": _overall_record(away),
        "neutral_site": bool(competition.get("neutralSite")),
        "espn_spread": _optional_float(odds.get("spread")),
        "espn_total": _optional_float(odds.get("overUnder")),
    }

    return predict_game(model=model, game=game)


def predict_game(model: ScoreModel, game: dict) -> dict:
    """Predict final scores for one normalized game."""
    home_rating = model.ratings.get(game["home_team"])
    away_rating = model.ratings.get(game["away_team"])
    home_field = 0 if game.get("neutral_site") else model.home_field_points

    home_points = _project_points(
        model=model,
        offense=home_rating,
        defense=away_rating,
        rank=game.get("home_rank"),
    ) + home_field
    away_points = _project_points(
        model=model,
        offense=away_rating,
        defense=home_rating,
        rank=game.get("away_rank"),
    )
    predicted_home = max(0, round(home_points, 1))
    predicted_away = max(0, round(away_points, 1))

    prediction = {
        **game,
        "predicted_home_score": predicted_home,
        "predicted_away_score": predicted_away,
        "predicted_total": round(predicted_home + predicted_away, 1),
        "predicted_margin": round(predicted_home - predicted_away, 1),
        "predicted_winner": (
            game["home_team"] if predicted_home >= predicted_away else game["away_team"]
        ),
    }
    prediction["ats_pick"] = _model_ats_pick(prediction)
    prediction["total_pick"] = _model_total_pick(prediction)

    return prediction


def map_completed_event(event: dict) -> dict | None:
    """Map one ESPN event into a completed historical game row."""
    competition = (event.get("competitions") or [{}])[0]
    status = ((competition.get("status") or {}).get("type") or {})

    if not status.get("completed"):
        return None

    competitors = competition.get("competitors") or []
    home = _competitor(competitors, "home")
    away = _competitor(competitors, "away")

    if not home or not away:
        return None

    home_score = _optional_int(home.get("score"))
    away_score = _optional_int(away.get("score"))
    odds = _odds(competition)

    if home_score is None or away_score is None:
        return None

    return {
        "season": int(event["season"]["year"]),
        "week": int(event["week"]["number"]),
        "event_id": event["id"],
        "home_team": _team_name(home),
        "away_team": _team_name(away),
        "home_rank": _rank(home),
        "away_rank": _rank(away),
        "home_score": home_score,
        "away_score": away_score,
        "total": home_score + away_score,
        "margin": home_score - away_score,
        "neutral_site": bool(competition.get("neutralSite")),
        "espn_spread": _optional_float(odds.get("spread")),
        "espn_total": _optional_float(odds.get("overUnder")),
    }


def write_predictions(predictions: list[dict], output_path: Path) -> None:
    """Write predictions to CSV."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fields = [
        "season",
        "week",
        "event_id",
        "game_date",
        "game_time",
        "away_team",
        "away_rank",
        "away_record",
        "home_team",
        "home_rank",
        "home_record",
        "neutral_site",
        "espn_spread",
        "espn_total",
        "predicted_away_score",
        "predicted_home_score",
        "predicted_total",
        "predicted_margin",
        "predicted_winner",
        "ats_pick",
        "total_pick",
    ]

    with output_path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        writer.writerows(predictions)


def _team_rating(rows: list[tuple], opponent_margins: list[float]) -> TeamRating:
    weight_total = sum(row[0] for row in rows)
    recent_rows = rows[-5:]
    recent_margin = mean(row[3] for row in recent_rows) if recent_rows else 0.0

    return TeamRating(
        games=len(rows),
        points_for=sum(weight * points for weight, points, _, _ in rows) / weight_total,
        points_against=sum(weight * points for weight, _, points, _ in rows)
        / weight_total,
        margin=sum(weight * margin for weight, _, _, margin in rows) / weight_total,
        schedule_margin=mean(opponent_margins) if opponent_margins else 0.0,
        recent_margin=recent_margin,
    )


def _filter_predictions_by_date(predictions: list[dict], game_date: str | None) -> list[dict]:
    if not game_date:
        return predictions

    return [
        prediction
        for prediction in predictions
        if prediction["game_date"] == game_date
    ]


def _ats_result(game: dict, prediction: dict) -> bool | None:
    if game.get("espn_spread") is None:
        return None

    actual_adjusted_margin = game["margin"] + game["espn_spread"]
    predicted_adjusted_margin = prediction["predicted_margin"] + game["espn_spread"]

    if actual_adjusted_margin == 0 or predicted_adjusted_margin == 0:
        return None

    return (actual_adjusted_margin > 0) == (predicted_adjusted_margin > 0)


def _total_result(game: dict, prediction: dict) -> bool | None:
    if game.get("espn_total") is None:
        return None

    actual_delta = game["total"] - game["espn_total"]
    predicted_delta = prediction["predicted_total"] - game["espn_total"]

    if actual_delta == 0 or predicted_delta == 0:
        return None

    return (actual_delta > 0) == (predicted_delta > 0)


def _model_ats_pick(prediction: dict) -> str:
    spread = prediction.get("espn_spread")
    if spread is None:
        return ""

    return (
        prediction["home_team"]
        if prediction["predicted_margin"] + spread > 0
        else prediction["away_team"]
    )


def _model_total_pick(prediction: dict) -> str:
    total = prediction.get("espn_total")
    if total is None:
        return ""

    return "over" if prediction["predicted_total"] > total else "under"


def _project_points(
    model: ScoreModel,
    offense: TeamRating | None,
    defense: TeamRating | None,
    rank: int | None,
) -> float:
    offense_points = offense.points_for if offense else model.average_points
    defense_points = defense.points_against if defense else model.average_points
    form = offense.recent_margin * 0.08 if offense else 0.0
    schedule = offense.schedule_margin * 0.05 if offense else 0.0
    rank_bonus = _rank_bonus(rank)

    return (
        model.average_points * 0.25
        + offense_points * 0.38
        + defense_points * 0.27
        + form
        + schedule
        + rank_bonus
    )


def _rank_bonus(rank: int | None) -> float:
    if rank is None:
        return 0.0

    return math.sqrt(26 - rank) * 0.55


def _season_weights(games: list[dict]) -> dict[int, float]:
    seasons = sorted({game["season"] for game in games})
    latest = seasons[-1]

    return {
        season: 0.65 ** (latest - season)
        for season in seasons
    }


def _regular_season_entries(payload: dict) -> list[dict]:
    calendars = (payload.get("leagues") or [{}])[0].get("calendar") or []

    for calendar in calendars:
        if str(calendar.get("value")) == str(REGULAR_SEASON_TYPE):
            return calendar.get("entries") or []

    return []


def _entry_dates(entry: dict) -> str:
    start_date = _parse_espn_datetime(entry["startDate"])
    end_date = _parse_espn_datetime(entry["endDate"])

    return f"{start_date.strftime('%Y%m%d')}-{end_date.strftime('%Y%m%d')}"


def _opponents_for_team(game: dict, team: str) -> list[str]:
    if game["home_team"] == team:
        return [game["away_team"]]

    if game["away_team"] == team:
        return [game["home_team"]]

    return []


def _competitor(competitors: list[dict], home_away: str) -> dict | None:
    return next(
        (
            competitor
            for competitor in competitors
            if competitor.get("homeAway") == home_away
        ),
        None,
    )


def _team_name(competitor: dict) -> str:
    team = competitor.get("team") or {}
    return team.get("shortDisplayName") or team.get("displayName") or team["name"]


def _rank(competitor: dict) -> int | None:
    rank = (competitor.get("curatedRank") or {}).get("current")
    if rank is None or int(rank) >= UNRANKED_VALUE:
        return None

    return int(rank)


def _odds(competition: dict) -> dict:
    odds = competition.get("odds") or []
    return odds[0] if odds else {}


def _optional_float(value: object) -> float | None:
    if value in (None, "", "NA"):
        return None

    return float(value)


def _overall_record(competitor: dict) -> str | None:
    for record in competitor.get("records") or []:
        if record.get("type") == "total" or record.get("name") == "overall":
            return record.get("summary")

    return None


def _parse_espn_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(EASTERN_TZ)


def _optional_int(value: object) -> int | None:
    if value in (None, "", "NA"):
        return None

    return int(value)


def _history_window(args: argparse.Namespace) -> tuple[int, int]:
    history_end = args.history_end_season or args.season - 1
    history_start = args.history_start_season or history_end - 4

    if history_start > history_end:
        raise EspnModelError("History start season must be before end season.")

    return history_start, history_end


def _prediction_path(season: int, week: int, game_date: str | None = None) -> Path:
    date_suffix = f"_{game_date}" if game_date else ""
    return PREDICTIONS_DIR / f"fbs_predictions_{season}_week{week}{date_suffix}.csv"


def _parse_week(value: str) -> int:
    week = int(value)
    if week < 1:
        raise argparse.ArgumentTypeError("week must be 1 or greater")

    return week


def _mae(errors: list[dict], key: str) -> float:
    if not errors:
        return 0.0

    return mean(error[key] for error in errors)


def _first(values: list | None):
    return values[0] if values else None


def _accuracy(results: list[bool]) -> float:
    if not results:
        return 0.0

    return sum(results) / len(results)


if __name__ == "__main__":
    main()
