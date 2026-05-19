# Socket.IO Events

This module exposes ARI real-time events emitted through `ServerGateway`.

## `result.pool-funding-alignment.changed`

Emitted after `PATCH /api/v1/results/:resultCode/pool-funding-alignment` persists a Pool Funding Alignment change.

Payload:

```ts
{
  result_code: string;
  by_user_id: number;
  at: string;
}
```
