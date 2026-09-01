from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared declarative base for all SQLAlchemy models.

    Every feature's models.py should subclass this so a single metadata object
    knows about all tables (needed for migrations and create_all).
    """
