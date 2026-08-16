-- Unicidade de identidade do usuário: e-mail único por tenant (case-insensitive).
-- Nome pode repetir (homônimos legítimos) — apenas o e-mail identifica a conta.

-- Normaliza e-mails existentes (trim) antes de criar o índice.
UPDATE public.profiles SET email = btrim(email) WHERE email <> btrim(email);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_tenant_email_unique_idx
  ON public.profiles (tenant_id, lower(email))
  WHERE email IS NOT NULL;
