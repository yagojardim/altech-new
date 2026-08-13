-- App User Connector: armazenamento server-only da chave de conexão (lovack_*) por usuário.
-- A chave é gravada CIFRADA (AES-GCM) pelas edge functions com service_role.
-- Nenhum acesso para anon/authenticated: o navegador nunca lê esta tabela.

CREATE TABLE IF NOT EXISTS public.app_user_connections (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid NOT NULL,
  connector_id              text NOT NULL,
  connection_key_ciphertext text NOT NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections TO service_role;
ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;

-- Índice de deduplicação dos eventos importados do Google (idempotência do import).
CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_external_uidx
  ON public.calendar_events (tenant_id, external_provider, external_id)
  WHERE external_provider IS NOT NULL AND external_id IS NOT NULL;
