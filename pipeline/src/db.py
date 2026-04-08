import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
from contextlib import contextmanager
from .config import config


@contextmanager
def get_db():
    conn = psycopg2.connect(config.DATABASE_URL)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@contextmanager
def get_cursor(conn=None):
    if conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            yield cur
        finally:
            cur.close()
    else:
        with get_db() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            try:
                yield cur
            finally:
                cur.close()


def bulk_insert(table: str, columns: list[str], rows: list[tuple], on_conflict: str = "DO NOTHING"):
    if not rows:
        return 0
    cols = ", ".join(columns)
    template = f"({', '.join(['%s'] * len(columns))})"
    query = f"INSERT INTO {table} ({cols}) VALUES %s ON CONFLICT {on_conflict}"
    with get_db() as conn:
        with conn.cursor() as cur:
            execute_values(cur, query, rows, template=template)
            return cur.rowcount
