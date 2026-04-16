"""Add unique constraint to phone_number

Revision ID: 003
Revises: 002
Create Date: 2026-04-16

"""
from typing import Sequence, Union
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint("users_phone_number_key", "users", ["phone_number"])


def downgrade() -> None:
    op.drop_constraint("users_phone_number_key", "users", type_="unique")
