# PRMS Result Decision Webhooks

> **Related:** [PRMS Normalizer — Technical Field Documentation](https://app.notion.com/p/PRMS-Normalizer-Technical-Field-Documentation-287f271224788055a0d9c2bc23b1a06b?pvs=21) — how to **submit** results. This page covers how PRMS **calls you back**.
> 

When you submit a result through `POST /ingest`, a CGIAR Science Program reviews it. A webhook is how you find out what they decided, without polling.

Registration is **self-service**: one call, using the same API key you already use to ingest.

---

## **🌐 Service URLs**

The webhook endpoints live on the **same base URL as the Normal Ingest API** — same key, same host.

| **Environment** | **URL** |
| --- | --- |
| **PRODUCTION 🚀** | `https://v6a9z2e4y5.execute-api.us-east-1.amazonaws.com/webhook` |
| **TEST 🧪** | `https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com/webhook` |

> ⚠️ The **Bulk Ingest API** is a separate service and does **not** expose `/webhook`. Register once against the Normal Ingest base URL; it applies to every result you submit, bulk included.
> 

---

## **🔑 Authentication**

Identical to `/ingest`: your CLARISA API key in the `x-api-key` header.

```bash
curl -X POST "<https://v6a9z2e4y5.execute-api.us-east-1.amazonaws.com/webhook>" \
  -H "x-api-key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{ "url": "<https://your-platform.example.org/prms/callback>" }'
```

**Your key is your identity.** PRMS resolves your platform from the key and registers the callback against it. That is why the request body has no platform, tenant, or centre field — you cannot register a destination for anyone but yourself, and nobody can register one for you.

---

## **⚠️ Before you start: send `external_reference`**

A callback tells you a result was approved or rejected. For that to be useful you have to know **which of your records it is about** — and PRMS does not know your ids unless you send them.

So when you ingest, put your own identifier in `data.external_reference`:

```json
{
  "type": "knowledge_product",
  "data": {
    "external_reference": "STAR-9f2c-4471",
    "...": "the rest of your payload"
  }
}
```

PRMS stores it verbatim and returns it verbatim at the top level of every callback. **No prefix, no transformation, no parsing.** What you sent is what you receive.

```
you send:      data.external_reference = "STAR-9f2c-4471"
you get back:  external_reference      = "STAR-9f2c-4471"
```

> ℹ️ The field is **optional and stays optional** — a bilateral result created inside the PRMS Reporting Tool has no external system behind it, and arrives as `null`. But a callback for a result you ingested without one carries nothing pointing at your row. See **`external_reference`** in the field documentation.
> 

---

## **📝 1. Register your callback — `POST /webhook`**

### **🔹 Request body**

| **Field** | **Type** | **Required** | **Description** | **Example** |
| --- | --- | --- | --- | --- |
| **url** | string (URI) | ✅ | HTTPS endpoint PRMS will POST to when a Science Program approves or rejects one of your results. Max 500 characters. | `"<https://your-platform.example.org/prms/callback>"` |

> ❗ No other properties are accepted. The recipient comes from your API key.
> 

```json
{
  "url": "<https://your-platform.example.org/prms/callback>"
}
```

### **🔹 URL requirements**

| **Rule** | **Why** |
| --- | --- |
| Must use **`https`** | Decision payloads carry full result data. |
| Must be a **fully qualified public domain** | A bare hostname (`myserver`) is not reachable from PRMS. |
| Must **not** be loopback or a private range | `localhost`, `127.0.0.1`, `10.x`, `172.16–31.x`, `192.168.x`, `169.254.x`, `.local`, `.internal` are refused. |
| Must **not** embed credentials | `https://user:pass@host` is refused — put the secret in a path or query string instead. |
| Max **500** characters | Storage limit. |

### **🔹 Registration is an upsert**

**One platform, one destination.** Calling `POST /webhook` again replaces the URL you registered before — it does not create a second one, and you will not receive duplicate calls. That is also how you change or restore a destination: just POST the new one.

A destination that had been disabled is re-enabled by registering again.

---

## **🔎 2. Check what is registered — `GET /webhook`**

No body. Returns the destination currently on file for your platform.

```bash
curl "<https://v6a9z2e4y5.execute-api.us-east-1.amazonaws.com/webhook>" \
  -H "x-api-key: <your-api-key>"
```

---

## **⏱️ 3. When do you need to register?**

**Registering is *not* a prerequisite for submitting results.** You can ingest today and register next week; already-submitted results are unaffected.

What matters is that a destination exists **before a Science Program takes a decision**, because that is the moment the notification is created.

> 🚨 **A decision taken while you have no destination registered is not replayed later.** There is no backlog to catch up on — nothing was ever queued. Register before your results go under review.
> 

---

## **📬 4. The callback PRMS sends you**

When a Science Program approves or rejects one of your results, PRMS sends:

```
POST <your registered url>
Content-Type: application/json
x-prms-delivery-id: 4172
```

### **🔹 Headers**

| **Header** | **Description** |
| --- | --- |
| **Content-Type** | Always `application/json`. |
| **x-prms-delivery-id** | Unique id of this delivery attempt chain. **Use it to deduplicate** — the same id may arrive more than once (see Retries). |
| **x-prms-signature** | Reserved for a future HMAC signing scheme. **Not sent today** — do not build verification on it yet. |

### **🔹 Body**

| **Field** | **Type** | **Always present** | **Description** | **Example** |
| --- | --- | --- | --- | --- |
| **result_id** | number | ✅ | PRMS id of the reviewed result. | `12345` |
| **external_reference** | string | null | ✅ | **Your own identifier**, exactly as you sent it at ingest. `null` if you did not send one. **This is how you find the record on your side.** | `"STAR-9f2c-4471"` |
| **decision** | string (enum) | ✅ | `"APPROVE"` or `"REJECT"`. | `"APPROVE"` |
| **decided_at** | string (ISO date) | ✅ | When the notification was assembled, UTC. | `"2026-08-25T14:31:02.117Z"` |
| **justification** | string | ❌ | Reviewer's reason. **Omitted entirely when there is none** — never an empty string. Mandatory for the reviewer on `REJECT`, so in practice it is present there. | `"Evidence link is not publicly accessible."` |
| **data** | object | null | ✅ | The **full enriched result document** — the same object `GET /result/:id` returns. `null` if PRMS could not assemble it. | `{ ... }` |

> ℹ️ `decision` is `"APPROVE"` / `"REJECT"` — the reviewer's action, **not** past tense (`APPROVED`).
> 

`data` also carries who we resolved you to be, from your API key rather than from anything you declared:

| **Field on `data`** | **Type** | **Description** | **Example** |
| --- | --- | --- | --- |
| **external_platform_id** | number | null | Your platform's CLARISA MIS id. | `12` |
| **external_platform_code** | string | null | Your platform's CLARISA acronym. | `"STAR"` |

### **🔹 Example — approved**

```json
{
  "result_id": 12345,
  "external_reference": "STAR-9f2c-4471",
  "decision": "APPROVE",
  "decided_at": "2026-08-25T14:31:02.117Z",
  "data": {
    "result_code": 5521,
    "title": "Improved seed varieties adoption in drylands",
    "description": "Summarizes adoption barriers and enabling factors across regions.",
    "result_type_id": 6,
    "external_reference": "STAR-9f2c-4471",
    "external_platform_id": 12,
    "external_platform_code": "STAR",
    "knowledge_product_summary": {
      "handle": "<https://hdl.handle.net/20.500.1176/70001>"
    }
  }
}
```

### **🔹 Example — rejected**

```json
{
  "result_id": 12346,
  "external_reference": "STAR-9f2c-4472",
  "decision": "REJECT",
  "decided_at": "2026-08-25T14:35:48.902Z",
  "justification": "The evidence link is not publicly accessible.",
  "data": { "...": "same enriched document" }
}
```

---

## **✅ 5. What your endpoint must return**

| **Your response** | **PRMS behaviour** |
| --- | --- |
| **2xx** | Delivered. Nothing further. |
| **Any other status** | Counted as a failure and retried. |
| **No response within 15 s** | Timeout — counted as a failure and retried. |

**Return `2xx` as soon as you have stored the payload — do not wait for your own downstream processing.** A slow endpoint reads as a failed one, and you will get retries you did not need.

### **🔹 Retries**

| **Attempt** | **Sent after the previous failure** |
| --- | --- |
| 1 | immediately |
| 2 | 1 minute |
| 3 | 2 minutes |
| 4 | 4 minutes |
| 5 | 8 minutes |

After **5** failed attempts the delivery is abandoned and the PRMS technical team is alerted. Total window: roughly **15 minutes**. Deliveries are checked once per minute.

> ⚠️ **Deduplicate on `x-prms-delivery-id`.** If your endpoint stores the payload and then times out before responding, PRMS retries and you receive the same decision twice.
> 

### **🔹 Changing your URL mid-flight**

A delivery already queued keeps the destination it was created with. Re-registering changes where **future** decisions go, not deliveries already in the retry window.

---

## **🧾 Response Examples**

### **✅ Registration succeeded**

```json
{
  "ok": true,
  "response": {
    "id": 3,
    "recipient_type": "PLATFORM",
    "recipient_id": 12,
    "recipient_acronym": "STAR",
    "url": "<https://your-platform.example.org/prms/callback>",
    "is_active": true,
    "last_updated_date": "2026-08-25T14:22:10.000Z"
  },
  "statusCode": 200,
  "message": "Webhook endpoint registered successfully.",
  "timestamp": "2026-08-25T14:22:10.512Z",
  "path": "/api/bilateral/webhook",
  "requestId": "Root=1-68e94068-747a2a3177dc4a6313b35cd6"
}
```

**Explanation:**

| **Field** | **Type** | **Description** |
| --- | --- | --- |
| **ok** | boolean | `true` when the destination was stored. |
| [**response.id**](http://response.id/) | number | Internal id of the stored destination. |
| **response.recipient_type** | string | Always `"PLATFORM"` for API-key registrations. |
| **response.recipient_id** | number | Your platform's CLARISA MIS id — resolved from your key, not from the body. |
| **response.recipient_acronym** | string | null | Your platform's acronym in CLARISA. |
| **response.url** | string | The destination now on file, normalized. |
| **response.is_active** | boolean | `true` while the destination receives callbacks. |
| **response.last_updated_date** | string (ISO date) | When it was last registered or changed. |
| **message** | string | Human-readable outcome. |
| **requestId** | string | AWS trace id — quote it when reporting a problem. |

---

### **✅ Retrieval — destination on file**

Same `response` object as above, with:

```json
"message": "Webhook endpoint retrieved successfully."
```

---

### **✅ Retrieval — nothing registered yet**

Not an error. `200`, with an **empty `response` object** — read the `message`, not the object:

```json
{
  "ok": true,
  "response": {},
  "statusCode": 200,
  "message": "No webhook endpoint registered for this platform.",
  "timestamp": "2026-08-25T14:40:03.221Z",
  "path": "/api/bilateral/webhook",
  "requestId": "Root=1-68e94068-747a2a3177dc4a6313b35cd6"
}
```

---

### **❌ URL rejected**

`400`. The `message` names the rule you broke.

```json
{
  "ok": false,
  "error": "webhook_registration_failed",
  "message": "The url must use https.",
  "requestId": "Root=1-68e94068-747a2a3177dc4a6313b35cd6"
}
```

| **message** | **Fix** |
| --- | --- |
| `The url is required.` | Send a non-empty `url`. |
| `The url is not a valid absolute URL.` | Include the scheme: `https://…`. |
| `The url must use https.` | Switch from `http` to `https`. |
| `The url must not embed credentials.` | Remove `user:pass@` from the host. |
| `The url must point to a publicly reachable host.` | Not loopback / private range / link-local. |
| `The url must use a fully qualified domain name.` | Use a real domain, not a bare hostname. |
| `The url must be at most 500 characters.` | Shorten it. |

---

### **❌ Authentication failed**

`401` — the key is missing, malformed, or not valid in CLARISA.

```json
{
  "ok": false,
  "error": "unauthorized",
  "message": "A valid API key is required."
}
```

### **❌ Validation service unavailable**

`503` with `Retry-After: 30` — PRMS could not reach CLARISA to check your key. **Your key is not the problem.** Retry.

```json
{
  "ok": false,
  "error": "auth_unavailable",
  "message": "API key validation is temporarily unavailable. Please retry."
}
```

### **❌ Upstream failure**

`502` (or `504` on timeout) — registration could not be completed. Retry; quote `requestId` if it persists.

```json
{
  "ok": false,
  "error": "upstream_timeout",
  "message": "Timed out after 30000ms registering the webhook",
  "requestId": "Root=1-68e94068-747a2a3177dc4a6313b35cd6"
}
```

---

## **❓ FAQ**

**How do I know which of my records a callback is about?**
Send `data.external_reference` when you ingest and read the top-level `external_reference` on the callback. It is the same string, untouched.

**Do I get a callback for results I created directly in the PRMS Reporting Tool?**
No. Callbacks go to the platform that **submitted** the result through the API. A result created inside PRMS has no submitting platform, so there is nothing to call back — the responsible centre is notified inside PRMS instead. Those results also carry no `external_reference`.

**Can I register more than one URL?**
Not today. One platform, one destination. Fan out on your side.

**Can I delete a registration?**
There is no delete operation. Point the URL at an endpoint that discards the payload, or contact the PRMS technical team.

**Will I get a callback when a result is submitted, or only when it is decided?**
Only on the Science Program's approve/reject decision.

**What if my endpoint was down for an hour?**
The delivery is abandoned after ~15 minutes and is not replayed. Reconcile with `GET /result/:code`.