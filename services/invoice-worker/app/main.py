from datetime import date, datetime
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field


class LineItem(BaseModel):
    description: str = Field(min_length=1, max_length=240)
    quantity: float = Field(gt=0)
    unit_price: float = Field(ge=0, alias="unitPrice")


class InvoiceSummaryRequest(BaseModel):
    organization_id: str = Field(min_length=1, alias="organizationId")
    document_type: Literal["invoice", "quote"] = Field(alias="documentType")
    document_number: str = Field(min_length=1, alias="documentNumber")
    client_name: str = Field(min_length=1, alias="clientName")
    due_date: date | None = Field(default=None, alias="dueDate")
    line_items: list[LineItem] = Field(min_length=1, alias="lineItems")
    tax_rate: float = Field(default=0, ge=0, le=100, alias="taxRate")
    amount_paid: float = Field(default=0, ge=0, alias="amountPaid")


class InvoiceSummaryResponse(BaseModel):
    organization_id: str = Field(alias="organizationId")
    document_type: str = Field(alias="documentType")
    document_number: str = Field(alias="documentNumber")
    client_name: str = Field(alias="clientName")
    subtotal: float
    tax_amount: float = Field(alias="taxAmount")
    total: float
    balance: float
    is_overdue: bool = Field(alias="isOverdue")


app = FastAPI(title="TradeTrack Invoice Worker")


def money(value: float) -> float:
    return round(value + 1e-9, 2)


def calculate_summary(payload: InvoiceSummaryRequest, today: date | None = None) -> InvoiceSummaryResponse:
    current_date = today or datetime.utcnow().date()
    subtotal = money(sum(item.quantity * item.unit_price for item in payload.line_items))
    tax_amount = money(subtotal * (payload.tax_rate / 100))
    total = money(subtotal + tax_amount)
    balance = money(max(total - payload.amount_paid, 0))

    return InvoiceSummaryResponse(
        organizationId=payload.organization_id,
        documentType=payload.document_type,
        documentNumber=payload.document_number,
        clientName=payload.client_name,
        subtotal=subtotal,
        taxAmount=tax_amount,
        total=total,
        balance=balance,
        isOverdue=bool(payload.due_date and payload.due_date < current_date and balance > 0),
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/summaries/overdue", response_model=InvoiceSummaryResponse, response_model_by_alias=True)
def create_overdue_summary(payload: InvoiceSummaryRequest) -> InvoiceSummaryResponse:
    return calculate_summary(payload)
