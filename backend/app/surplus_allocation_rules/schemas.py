import uuid

from pydantic import BaseModel, Field, model_validator

# The DB stores percentages as numeric(5, 2), so two decimals is the real
# precision; comparisons against 100 are rounded to that to avoid float noise.
PERCENTAGE_DECIMALS = 2


class SurplusAllocationRuleWrite(BaseModel):
    account_id: uuid.UUID
    percentage: float = Field(gt=0, le=100)


class SurplusAllocationRuleRead(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    percentage: float
    model_config = {"from_attributes": True}


class SurplusAllocationReplace(BaseModel):
    """Body of the PUT: the complete set of rules, replacing whatever is stored.

    An empty list is valid and means "send the whole surplus to the primary
    account". There is no active flag: a rule that shouldn't apply is simply
    left out of the list.
    """

    rules: list[SurplusAllocationRuleWrite]

    @model_validator(mode="after")
    def check_one_rule_per_account(self) -> "SurplusAllocationReplace":
        account_ids = [rule.account_id for rule in self.rules]
        if len(set(account_ids)) != len(account_ids):
            raise ValueError("each account can appear only once")
        return self

    @model_validator(mode="after")
    def check_total_percentage(self) -> "SurplusAllocationReplace":
        total = round(sum(rule.percentage for rule in self.rules), PERCENTAGE_DECIMALS)
        if total > 100:
            raise ValueError(f"the percentages add up to {total}, which exceeds 100")
        return self
