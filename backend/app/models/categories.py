import enum
import uuid
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class CategoryKind(enum.StrEnum):
    EXPENSE = "expense"
    INCOME = "income"


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    name: Mapped[str]
    kind: Mapped[CategoryKind] = mapped_column(
        PgEnum(
            CategoryKind,
            name="category_kind",
            create_type=False,
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        )
    )
    color: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now())

    def __repr__(self) -> str:
        return f"<Category {self.name!r} ({self.kind.value})>"
