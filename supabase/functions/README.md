# Edge Functions — fluxos pré-login

Após o `rls_lockdown.sql`, leituras anônimas estão fechadas. Estes dois fluxos
acontecem ANTES de qualquer sessão e por isso rodam server-side, com
`SUPABASE_SERVICE_ROLE_KEY` (nunca no cliente, nunca logado).

| Function | Uso |
| --- | --- |
| `validate-activation` | `POST { token }` → `{ state: 'valid' \| 'expired' \| 'used' \| 'invalid' }` (link `/activate`) |
| `client-portal-login` | `POST { email }` → dados mínimos da sessão do Portal do Cliente |

Ambas têm CORS habilitado, não exigem sessão e aplicam rate-limit básico por IP.

## Deploy

```bash
supabase functions deploy validate-activation
supabase functions deploy client-portal-login
```

Os segredos `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são injetados
automaticamente no runtime das Edge Functions — não precisam ser configurados.

## Teste rápido

```bash
curl -X POST "$SUPABASE_URL/functions/v1/validate-activation" \
  -H "Content-Type: application/json" -d '{"token":"..."}'
```
