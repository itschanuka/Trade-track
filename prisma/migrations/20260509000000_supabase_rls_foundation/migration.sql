ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE clients FORCE ROW LEVEL SECURITY;
ALTER TABLE jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE quotes FORCE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments FORCE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
ALTER TABLE reminders FORCE ROW LEVEL SECURITY;
ALTER TABLE email_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_isolation_clients ON clients;
CREATE POLICY org_isolation_clients ON clients
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));

DROP POLICY IF EXISTS org_isolation_jobs ON jobs;
CREATE POLICY org_isolation_jobs ON jobs
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));

DROP POLICY IF EXISTS org_isolation_quotes ON quotes;
CREATE POLICY org_isolation_quotes ON quotes
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));

DROP POLICY IF EXISTS org_isolation_invoices ON invoices;
CREATE POLICY org_isolation_invoices ON invoices
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));

DROP POLICY IF EXISTS org_isolation_invoice_payments ON invoice_payments;
CREATE POLICY org_isolation_invoice_payments ON invoice_payments
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));

DROP POLICY IF EXISTS org_isolation_documents ON documents;
CREATE POLICY org_isolation_documents ON documents
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));

DROP POLICY IF EXISTS org_isolation_reminders ON reminders;
CREATE POLICY org_isolation_reminders ON reminders
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));

DROP POLICY IF EXISTS org_isolation_email_logs ON email_logs;
CREATE POLICY org_isolation_email_logs ON email_logs
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));
