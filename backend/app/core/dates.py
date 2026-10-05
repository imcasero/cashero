"""Month arithmetic shared by the endpoints that take a `YYYY-MM` parameter."""

from datetime import date, timedelta

MONTH_PATTERN = r"^\d{4}-(0[1-9]|1[0-2])$"


def month_bounds(month: str) -> tuple[date, date]:
    """'YYYY-MM' -> (first day of that month, first day of the next month).

    A half-open range beats comparing EXTRACT(month) because it lets Postgres
    use the index on `occurred_on`.
    """
    year, month_num = (int(part) for part in month.split("-"))
    start = date(year, month_num, 1)
    end = date(year + (month_num == 12), month_num % 12 + 1, 1)
    return start, end


def previous_month_start(month_start: date) -> date:
    """First day of the month before the given month start."""
    last_day_before = month_start - timedelta(days=1)
    return last_day_before.replace(day=1)
