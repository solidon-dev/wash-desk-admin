ALTER TABLE clients
  ADD CONSTRAINT chk_clients_contract_dates
  CHECK (
    contract_start_date IS NULL
    OR contract_end_date IS NULL
    OR contract_start_date <= contract_end_date
  );
