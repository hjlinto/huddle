"""
ESPN FBS weekly ingestion command.

Fetches one college football FBS week from ESPN's scoreboard JSON and can
preview the data or upsert games and betting lines into the database.
"""

import argparse
import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
SERVICES_DIR = BACKEND_DIR / "app" / "services"
sys.path.append(str(BACKEND_DIR))
sys.path.append(str(SERVICES_DIR))

import espn_scoreboard_client


def main() -> None:
    """Run ESPN weekly FBS ingestion from the command line."""
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--season",
        required=True,
        type=int,
        help="Season year to fetch from ESPN.",
    )

    parser.add_argument(
        "--week",
        required=True,
        type=_parse_week,
        help="Regular season week number to fetch.",
    )

    parser.add_argument(
        "--season-type",
        default=2,
        type=int,
        help="ESPN season type. Defaults to 2 for regular season.",
    )

    parser.add_argument(
        "--group",
        default=80,
        type=int,
        help="ESPN group ID. Defaults to 80 for FBS.",
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and print games without writing to the database.",
    )

    parser.add_argument(
        "--fields",
        action="store_true",
        help="Print raw ESPN field groups from the first event.",
    )

    parser.add_argument(
        "--raw-json",
        action="store_true",
        help="Print the full ESPN JSON payload.",
    )

    args = parser.parse_args()

    try:
        payload = espn_scoreboard_client.fetch_espn_fbs_scoreboard(
            season=args.season,
            week=args.week,
            season_type=args.season_type,
            group=args.group,
        )
        games = [
            espn_scoreboard_client.map_espn_event(event)
            for event in payload.get("events", [])
        ]
    except espn_scoreboard_client.EspnScoreboardError as exc:
        raise SystemExit(str(exc)) from exc

    print("ESPN fetch complete")
    print(f"Season: {args.season}")
    print(f"Week: {args.week}")
    print(f"Season type: {args.season_type}")
    print(f"Group: {args.group}")
    print(f"Games returned: {len(games)}")

    if args.fields:
        _print_fields(payload)

    if args.raw_json:
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return

    for game in games:
        print(_preview_line(game))

    if args.dry_run:
        return

    from app import create_app
    from app.services.espn_scoreboard_service import ingest_espn_games

    app = create_app()

    with app.app_context():
        result = ingest_espn_games(
            games=games,
            season=args.season,
            week=args.week,
        )

    print("Ingestion complete")
    print(f"Games created: {result['games_created']}")
    print(f"Games updated: {result['games_updated']}")
    print(f"Odds created: {result['odds_created']}")
    print(f"Odds updated: {result['odds_updated']}")


def _preview_line(game: dict) -> str:
    game_time = game["game_time"].strftime("%I:%M %p").lstrip("0")
    away_rank = f"#{game['away_rank']} " if game["away_rank"] else ""
    home_rank = f"#{game['home_rank']} " if game["home_rank"] else ""
    spread = "NA" if game["spread"] is None else game["spread"]
    total = "NA" if game["total"] is None else game["total"]

    return (
        f"{game['game_date']} {game_time} | "
        f"{away_rank}{game['away_team']} ({game['away_record'] or 'NA'}) at "
        f"{home_rank}{game['home_team']} ({game['home_record'] or 'NA'}) | "
        f"spread {spread}, total {total}"
    )


def _print_fields(payload: dict) -> None:
    events = payload.get("events") or []
    if not events:
        print("No events returned, so no fields are available.")
        return

    event = events[0]
    competition = (event.get("competitions") or [{}])[0]
    competitor = (competition.get("competitors") or [{}])[0]
    odds = (competition.get("odds") or [{}])[0]

    print("Event fields:")
    for key in sorted(event.keys()):
        print(f"- {key}: {type(event[key]).__name__}")

    print("Competition fields:")
    for key in sorted(competition.keys()):
        print(f"- {key}: {type(competition[key]).__name__}")

    print("Competitor fields:")
    for key in sorted(competitor.keys()):
        print(f"- {key}: {type(competitor[key]).__name__}")

    print("Odds fields:")
    for key in sorted(odds.keys()):
        print(f"- {key}: {type(odds[key]).__name__}")


def _parse_week(value: str) -> int:
    week = int(value)
    if week < 1:
        raise argparse.ArgumentTypeError("week must be 1 or greater")

    return week


if __name__ == "__main__":
    main()
