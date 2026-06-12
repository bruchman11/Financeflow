# Integração WhatsApp + IA (n8n) — FinanceFlow

Automação para **lançar movimentações** (texto, áudio ou foto de comprovante) e **conversar**
com os dados, tudo pelo WhatsApp. A IA e o orquestrador rodam no **n8n**; o app expõe uma
**API de integração** segura que o n8n chama.

```
WhatsApp (Meta Cloud API) ──webhook──▶ n8n ──(IA: áudio→texto, visão, extração, chat)
        ▲                                 │
        └──────── respostas ──────────────┘   HTTPS + header x-api-key
                                          ▼
                       App: /api/integrations/*  (service-role, escopo por empresa)
                                          ▼
                                     Supabase
```

> O app **não** fala com o WhatsApp. Quem envia/recebe mensagens é o n8n.

---

## 1. Configuração no app (Vercel)

Defina estas variáveis de ambiente (Vercel → Settings → Environment Variables):

| Variável | Para que serve |
|---|---|
| `INTEGRATION_API_KEY` | Chave que o n8n envia no header `x-api-key`. Gere uma forte: `openssl rand -hex 32`. |
| `INTEGRATION_CONTACTS` | Allowlist telefone→empresa (JSON). Só números aqui podem lançar/consultar. |
| `SUPABASE_SERVICE_ROLE_KEY` | Já deve existir (Supabase → Settings → API). Garanta que está setada. |

**Formato do `INTEGRATION_CONTACTS`** (telefone só com dígitos, E.164 sem `+`):

```json
[{"phone":"5567999999999","companyId":"<uuid-da-empresa>","userId":"<uuid-do-profile>"}]
```

**SQL para obter `companyId` e `userId`** (rode no SQL Editor do Supabase):

```sql
select c.id  as company_id,
       cm.user_id as user_id,
       c.name, cm.role
  from companies c
  join company_members cm on cm.company_id = c.id
 where c.name = 'iPhone Barato'
   and cm.role = 'owner';
```

Use o `company_id` e `user_id` do dono no JSON acima.

---

## 2. Referência da API

Base: `https://SEU-APP.vercel.app/api/integrations`
Header obrigatório em **todas**: `x-api-key: <INTEGRATION_API_KEY>`
Erros: `401` sem/má chave · `403` telefone fora da allowlist · `422` validação/recurso não achado.

### POST `/transactions` — lançar
```json
{
  "phone": "5567999999999",
  "type": "expense",                 // "income" | "expense"
  "amount": "150,00",                // aceita "150,00", "150.00" ou número
  "account": "Mercado Pago",         // nome OU id da conta (precisa existir)
  "category": "05.07.02",            // opcional: código, "código nome" ou nome
  "occurred_on": "2026-06-05",       // opcional (AAAA-MM-DD); default: hoje
  "description": "Entrega motoboy",  // opcional
  "client_request_id": "wamid.HBg..."  // opcional, RECOMENDADO: id estável da msg (idempotência)
}
```
Resposta `201` (ou `200` se já existia o mesmo `client_request_id`):
```json
{ "ok": true, "duplicated": false,
  "transaction": { "id": "...", "type": "expense", "amount": "150.00", "account": "Mercado Pago", "category": "05.07.02 Entregas Motoboy", "occurred_on": "2026-06-05" },
  "resumo": "Saída de R$ 150,00 em Mercado Pago · 05.07.02 Entregas Motoboy · 05/06/2026" }
```
> **Idempotência:** envie um `client_request_id` **estável por mensagem** — pode ser o próprio
> `messages[0].id` (wamid) do WhatsApp. O servidor converte para um UUID determinístico
> (UUIDv5), então reenvios/retentativas **não duplicam**.

### GET `/context?phone=...` — contas + categorias
Retorna `{ accounts:[{id,name,kind}], categories:[{code,name,dre_type}] }`.
A IA usa para escolher uma **conta válida** e o **código de categoria** correto.

### GET `/summary?phone=...&from=AAAA-MM-DD&to=AAAA-MM-DD`
`{ from, to, totalIncome, totalExpense, balance }` (padrão: mês corrente).

### GET `/balances?phone=...`
`{ total, accounts:[{id,name,kind,currentBalance}] }` — saldo atual por conta.

### GET `/by-category?phone=...&from=&to=`
`{ from, to, categories:[{code,name,income,expense}] }`.

### GET `/transactions?phone=...` — listar/buscar
Filtros: `from,to,type,q,accountId,categoryCode,limit` (limit ≤ 200, default 25).

**Teste rápido (curl):**
```bash
curl -X POST https://SEU-APP.vercel.app/api/integrations/transactions \
  -H "x-api-key: $INTEGRATION_API_KEY" -H "Content-Type: application/json" \
  -d '{"phone":"5567999999999","type":"expense","amount":"12,50","account":"Mercado Pago","category":"05.07.02","client_request_id":"11111111-1111-1111-1111-111111111111"}'
```

---

## 3. Setup do WhatsApp (Meta Cloud API)

1. **Meta for Developers** → crie um App (tipo *Business*) → adicione **WhatsApp**.
2. Pegue: **Phone Number ID**, **WABA ID** e um **token permanente** (System User token).
3. **Webhook**: aponte para a URL do seu n8n (ver abaixo); defina um **Verify Token** (string sua).
   Assine os campos `messages`.
4. Para produção, faça a verificação do número/negócio na Meta.

> Áudio e imagem chegam como **media id**; o n8n baixa o binário via Graph API
> (`GET /v19.0/<media-id>` → pega a URL → baixa com o token).

---

## 4. Workflow A no n8n — lançar movimentação

1. **Webhook (Trigger)** — recebe o POST da Meta. Trate o `GET` de verificação
   (responder `hub.challenge` quando `hub.verify_token` bater).
2. **Switch por tipo de mensagem** (`messages[0].type`):
   - `text` → usa `text.body`.
   - `audio` → baixa o media → **OpenAI Whisper** (transcrição) → texto.
   - `image` → baixa o media → **modelo de visão** (GPT‑4o / Claude) → extrai dados do comprovante.
3. **HTTP Request → GET `/context`** (com o telefone do remetente) → lista de contas e categorias.
4. **LLM (saída estruturada / JSON)** — prompt do tipo:
   > "Extraia da mensagem: `type` (income/expense), `amount`, `occurred_on` (AAAA-MM-DD, default hoje),
   > `account` (escolha uma das contas), `category` (escolha um código da lista), `description`.
   > Contas e categorias válidas: {{ $json.accounts }} / {{ $json.categories }}.
   > Se faltar dado essencial, peça ao usuário."
5. **Enviar confirmação no WhatsApp**: "Confirmar? {{ resumo }}" (monte um resumo legível).
6. **Aguardar resposta** (nó *Wait* ou um 2º webhook por conversa). Se **sim** →
   **HTTP Request → POST `/transactions`** com os campos + `client_request_id` = `messages[0].id`
   (o wamid, direto — o servidor cuida do UUID). Responda o sucesso (`resumo`). Se **não** →
   peça correção/descarte.

## 5. Workflow B no n8n — chat sobre os dados

1. **Classifique a intenção** (LLM): *lançamento* vs *pergunta* vs *confirmação* → roteia.
2. Para *pergunta*: nó **AI Agent** com **ferramentas HTTP Request**:
   - `GET /summary`, `GET /balances`, `GET /by-category`, `GET /transactions` (todas com `x-api-key` e `phone`).
   - System prompt: "Você é o assistente financeiro da empresa. Use as ferramentas para responder
     com dados reais; valores em BRL; seja direto."
3. Responda no WhatsApp com o texto do agente.

---

## 6. Segurança

- `INTEGRATION_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY` ficam **só** no app (Vercel) e no n8n (credenciais).
- Só telefones na allowlist (`INTEGRATION_CONTACTS`) conseguem lançar/consultar.
- A API filtra `company_id` em toda query (isolamento entre empresas).
- Não logue valores/PII nos fluxos do n8n.

## 7. Teste ponta-a-ponta

1. Configure as variáveis no Vercel e faça deploy.
2. `curl` no POST `/transactions` (seção 2) → veja a movimentação aparecer no app.
3. Repita o mesmo `client_request_id` → resposta `duplicated: true`, sem duplicar.
4. Monte os workflows no n8n, conecte a Meta, e mande **texto / áudio / foto** no WhatsApp →
   confirme → veja o lançamento no app. Pergunte "qual o saldo das contas?" → resposta do chat.
