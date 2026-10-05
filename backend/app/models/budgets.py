import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Budget(Base):
    """A standing monthly spending limit for one category. There is no stored
    counter and no carry-over: what has been spent is computed from the month's
    movements every time it is asked for, so the budget resets by itself."""

    __tablename__ = "budgets"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("categories.id"), unique=True)
    monthly_limit: Mapped[float]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now())

    def __repr__(self) -> str:
        return f"<Budget {self.monthly_limit} for category {self.category_id}>"
