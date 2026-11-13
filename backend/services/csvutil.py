import csv
import io


def safe_cell(v):
    """Neutralise spreadsheet formula injection in text cells."""
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return v
    s = "" if v is None else str(v)
    return "'" + s if s[:1] in ("=", "+", "-", "@", "\t", "\r") else s


def to_csv(header: list[str], rows: list[list]) -> str:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(header)
    for r in rows:
        w.writerow([safe_cell(c) for c in r])
    return buf.getvalue()
