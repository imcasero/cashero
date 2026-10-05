from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.accounts.router import router as accounts_router
from app.categories.router import router as categories_router
from app.core.config import settings
from app.movement_templates.router import router as movement_templates_router
from app.movements.router import router as movements_router
from app.surplus_allocation_rules.router import router as surplus_allocation_rules_router
from app.system.router import router as system_router

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register one router per feature here.
app.include_router(system_router)
app.include_router(categories_router)
app.include_router(accounts_router)
app.include_router(movements_router)
app.include_router(movement_templates_router)
app.include_router(surplus_allocation_rules_router)
