"""
Weekly data ingestion command.

Loads game and odds data from a weekly CSV file and optionally grades
predictions when final scores are present.
"""

import argparse

from app import create_app
from app.services.grading_service import grade_all_predictions
from app.services.ingestion_service import ingest_week_csv


def main() -> None:
    """
    Run weekly data ingestion from the command line.
    """
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--league",
        required=True,
        choices=["nfl", "ncaaf"],
        help="League to ingest data for.",
    )

    parser.add_argument(
    "--season",
    required=True,
    type=int,
    help="Season year to attach to ingested games.",
    )

    parser.add_argument(
        "--week",
        required=True,
        type=int,
        help="Week number to attach to ingested games.",
    )

    parser.add_argument(
        "--weekfile",
        required=True,
        help="CSV file containing weekly game and odds data.",
    )

    parser.add_argument(
        "--grade",
        action="store_true",
        help="Grade predictions after ingestion.",
    )

    args = parser.parse_args()

    app = create_app()

    with app.app_context():
        ingestion_result = ingest_week_csv(
            csv_file_path=args.weekfile,
            league=args.league,
            season=args.season,
            week=args.week,
        )

        print("Ingestion complete")
        print(f"League: {args.league}")
        print(
            f"Games created: {ingestion_result['games_created']}"
        )
        print(
            f"Games updated: {ingestion_result['games_updated']}"
        )
        print(
            f"Odds created: {ingestion_result['odds_created']}"
        )
        print(
            f"Odds updated: {ingestion_result['odds_updated']}"
        )

        if args.grade:
            grading_result = grade_all_predictions()

            print(
                f"Predictions graded: {grading_result['graded']}"
            )
            print(
                f"Skipped (missing odds): "
                f"{grading_result['skipped_no_odds']}"
            )


if __name__ == "__main__":
    main()