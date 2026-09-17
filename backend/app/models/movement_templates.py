import enum
import uuid
from datetime import date, datetime

from sqlalchemy import ForeignKey, func
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.categories import CategoryKind


class TemplateFrequency(enum.StrEnum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class MovementTemplate(Base):
    __tablename__ = "movement_templates"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    # Reuses category_kind (expense | income): transfers cannot be templated.
    kind: Mapped[CategoryKind] = mapped_column(
        PgEnum(
            CategoryKind,
            name="category_kind",
            create_type=False,
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        )
    )
    amount: Mapped[float]
    description: Mapped[str | None]
    account_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("accounts.id"))
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("categories.id"))
    frequency: Mapped[TemplateFrequency] = mapped_column(
        PgEnum(
            TemplateFrequency,
            name="template_frequency",
            create_type=False,
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        )
    )
    interval_count: Mapped[int] = mapped_column(server_default="1")
    start_date: Mapped[date]
    end_date: Mapped[date | None]
    next_run_on: Mapped[date]
    last_run_on: Mapped[date | None]
    is_active: Mapped[bool] = mapped_column(server_default="true")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now())

    def __repr__(self) -> str:
        return f"<MovementTemplate {self.kind.value} {self.amount} ({self.frequency.value})>"
