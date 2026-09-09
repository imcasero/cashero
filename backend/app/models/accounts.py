import enum
import uuid
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AccountInterestType(enum.StrEnum):
    SIMPLE = "simple"
    COMPOUND = "compound"


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    name: Mapped[str]
    type: Mapped[str]
    currency: Mapped[str] = mapped_column(server_default="EUR")
    initial_balance: Mapped[float] = mapped_column(server_default="0")
    interest_type: Mapped[AccountInterestType | None] = mapped_column(
        PgEnum(
            AccountInterestType,
            name="account_interest_type",
            create_type=False,
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        )
    )
    interest_rate: Mapped[float | None]
    is_primary: Mapped[bool] = mapped_column(server_default="false")

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now())

    def __repr__(self) -> str:
        return f"<Account {self.name!r} ({self.type})>"
