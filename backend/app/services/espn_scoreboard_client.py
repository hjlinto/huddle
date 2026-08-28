"""
ESPN college football scoreboard client.

This module has no Flask or database dependencies so scoreboard data can be
previewed from the command line before ingestion.
"""

from datetime import datetime
import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo


ESPN_SCOREBOARD_URL = (
    "https://site.api.espn.com/apis/site/v2/sports/football/"
    "college-football/scoreboard"
)
EASTERN_TZ = ZoneInfo("America/New_York")
UNRANKED_VALUE = 99


class EspnScoreboardError(RuntimeError):
    """Raised when ESPN scoreboard data cannot be fetched or parsed."""


def fetch_espn_fbs_scoreboard(
    season: int,
    week: int,
    season_type: int = 2,
    group: int = 80,
    limit: int = 1000,
) -> dict:
    """
    Fetch one ESPN FBS scoreboard week.
    """
    dates = _resolve_week_dates(
        season=season,
        week=week,
        season_type=season_type,
        group=group,
    )
    return _fetch_scoreboard(
        {
            "dates": dates,
            "seasontype": season_type,
            "groups": group,
            "limit": limit,
        }
    )


def _resolve_week_dates(
    season: int,
    week: int,
    season_type: int,
    group: int,
) -> str:
    calendar_payload = _fetch_scoreboard(
        {
            "dates": season,
            "seasontype": season_type,
            "groups": group,
            "limit": 1,
        }
    )

    for calendar in (calendar_payload.get("leagues") or [{}])[0].get("calendar") or []:
        if str(calendar.get("value")) != str(season_type):
            continue

        for entry in calendar.get("entries") or []:
            if str(entry.get("value")) == str(week):
                start_date = _parse_espn_datetime(entry["startDate"])
                end_date = _parse_espn_datetime(entry["endDate"])
                return (
                    f"{start_date.strftime('%Y%m%d')}-"
                    f"{end_date.strftime('%Y%m%d')}"
                )

    raise EspnScoreboardError(
        f"No ESPN calendar entry found for season {season}, "
        f"season type {season_type}, week {week}."
    )


def _fetch_scoreboard(query_params: dict) -> dict:
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
        raise EspnScoreboardError(f"ESPN returned HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise EspnScoreboardError(f"Could not reach ESPN: {exc.reason}") from exc


def map_espn_event(event: dict) -> dict:
    """
    Convert one ESPN event into normalized game and odds fields.
    """
    competition = _first(event.get("competitions")) or {}
    competitors = competition.get("competitors") or []
    home = _find_competitor(competitors, "home")
    away = _find_competitor(competitors, "away")

    if not home or not away:
        raise EspnScoreboardError(f"Missing home/away team for event {event.get('id')}")

    kickoff = _parse_espn_datetime(competition.get("date") or event["date"])
    odds = _first(competition.get("odds")) or {}
    home_score = _optional_int(home.get("score"))
    away_score = _optional_int(away.get("score"))
    completed = bool(
        ((competition.get("status") or {}).get("type") or {}).get("completed")
    )
    home_team_wins = None

    if completed and home_score is not None and away_score is not None:
        home_team_wins = home_score > away_score

    return {
        "source": "espn",
        "source_event_id": event.get("id"),
        "game_date": kickoff.date(),
        "game_time": kickoff.time()
        if competition.get("timeValid", True)
        else None,
        "home_team": _team_name(home),
        "away_team": _team_name(away),
        "home_rank": _rank(home),
        "away_rank": _rank(away),
        "home_record": _overall_record(home),
        "away_record": _overall_record(away),
        "home_score": home_score,
        "away_score": away_score,
        "home_team_wins": home_team_wins,
        "is_final": completed,
        "spread": _optional_float(odds.get("spread")),
        "total": _optional_float(odds.get("overUnder")),
    }


def _find_competitor(competitors: list[dict], home_away: str) -> dict | None:
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


def _overall_record(competitor: dict) -> str | None:
    for record in competitor.get("records") or []:
        if record.get("type") == "total" or record.get("name") == "overall":
            return record.get("summary")

    return None


def _parse_espn_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(EASTERN_TZ)


def _optional_float(value: object) -> float | None:
    if value in (None, "", "NA"):
        return None

    return float(value)


def _optional_int(value: object) -> int | None:
    if value in (None, "", "NA"):
        return None

    return int(value)


def _first(values: list | None):
    return values[0] if values else None
