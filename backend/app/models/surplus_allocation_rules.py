import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SurplusAllocationRule(Base):
    """How much of a month's surplus goes to one account. The percentages need
    not add up to 100: whatever is left uncovered goes to the primary account,
    computed at month close rather than stored as a rule."""

    __tablename__ = "surplus_allocation_rules"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    account_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("accounts.id"), unique=True)
    percentage: Mapped[float]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now())

    def __repr__(self) -> str:
        return f"<SurplusAllocationRule {self.percentage}% -> {self.account_id}>"
