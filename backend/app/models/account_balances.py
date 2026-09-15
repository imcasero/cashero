import uuid

from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AccountBalance(Base):
    """Read-only mapping of the `account_balances` SQL view (never write to it;
    it has no INSERT/UPDATE/DELETE semantics of its own — see the migration)."""

    __tablename__ = "account_balances"

    account_id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    current_balance: Mapped[float]
