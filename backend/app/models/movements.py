import enum
import uuid
from datetime import date, datetime

from sqlalchemy import ForeignKey, func
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class MovementKind(enum.StrEnum):
    EXPENSE = "expense"
    INCOME = "income"
    TRANSFER = "transfer"


class MovementOrigin(enum.StrEnum):
    MANUAL = "manual"
    RECURRING = "recurring"
    MONTH_CLOSE_SURPLUS = "month_close_surplus"
    MONTH_CLOSE_DEFICIT = "month_close_deficit"


class Movement(Base):
    __tablename__ = "movements"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    kind: Mapped[MovementKind] = mapped_column(
        PgEnum(
            MovementKind,
            name="movement_kind",
            create_type=False,
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        )
    )
    amount: Mapped[float]
    occurred_on: Mapped[date]
    description: Mapped[str | None]
    account_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("accounts.id"))
    counterparty_account_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("accounts.id")
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("categories.id"))
    origin: Mapped[MovementOrigin] = mapped_column(
        PgEnum(
            MovementOrigin,
            name="movement_origin",
            create_type=False,
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        server_default="manual",
    )
    # No ForeignKey() here yet: SQLAlchemy needs the referenced table registered
    # in Base.metadata to compute insert order, and MovementTemplate has no model
    # yet (IMC-22). The DB migration already enforces the real FK constraint.
    # Add ForeignKey("movement_templates.id") once that model exists.
    template_id: Mapped[uuid.UUID | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now())

    def __repr__(self) -> str:
        return f"<Movement {self.kind.value} {self.amount} ({self.occurred_on})>"
