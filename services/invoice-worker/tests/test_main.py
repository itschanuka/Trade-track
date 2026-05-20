from datetime import date

from fastapi.testclient import TestClient

from app.main import InvoiceSummaryRequest, app, calculate_summary


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_calculate_overdue_summary() -> None:
    payload = InvoiceSummaryRequest(
        organizationId="org_123",
        documentType="invoice",
        documentNumber="INV-00001",
        clientName="Apex Plumbing",
        dueDate=date(2026, 5, 1),
        lineItems=[{"description": "Labour", "quantity": 2, "unitPrice": 100}],
        taxRate=10,
        amountPaid=50,
    )

    summary = calculate_summary(payload, today=date(2026, 5, 20))

    assert summary.subtotal == 200
    assert summary.tax_amount == 20
    assert summary.total == 220
    assert summary.balance == 170
    assert summary.is_overdue is True


def test_create_overdue_summary_endpoint() -> None:
    response = client.post(
        "/summaries/overdue",
        json={
            "organizationId": "org_123",
            "documentType": "quote",
            "documentNumber": "QT-00001",
            "clientName": "Apex Plumbing",
            "dueDate": None,
            "lineItems": [{"description": "Inspection", "quantity": 1, "unitPrice": 75}],
            "taxRate": 0,
            "amountPaid": 0,
        },
    )

    assert response.status_code == 200
    assert response.json()["total"] == 75
    assert response.json()["isOverdue"] is False
