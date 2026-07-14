def parse_user_id(value):
    """Return int user_id or None; never raises ValueError."""
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None
