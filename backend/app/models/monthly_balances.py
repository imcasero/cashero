import uuid
from datetime import date, datetime

from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class MonthlyBalance(Base):
    """Snapshot of one account's balance at month close, interest included.

    Written only by the month close, and unique per (account, month) in the
    database — that constraint is what makes re-running a close for the same
    month fail instead of duplicating history.
    """

    __tablename__ = "monthly_balances"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    account_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("accounts.id"))
    # Always the first day of the month; a CHECK constraint enforces it.
    period_month: Mapped[date]
    closing_balance: Mapped[float]
    interest_accrued: Mapped[float] = mapped_column(server_default="0")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    def __repr__(self) -> str:
        return f"<MonthlyBalance {self.period_month} {self.closing_balance}>"
