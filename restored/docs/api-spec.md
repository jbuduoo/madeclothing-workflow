# MadeClothing Restored API

Base URL for local recovery:

```text
http://127.0.0.1:8787
```

## POST /login

Request:

```json
{
  "username": "admin",
  "password": "admin123"
}
```

Response:

```json
{
  "success": true,
  "user": {
    "username": "admin",
    "displayName": "管理員"
  }
}
```

## GET /dashboard-data

Returns order cards used by the dashboard.

## GET /get-workflow-steps/:id

Returns the workflow buttons and customer name for an order.

## GET /get-completed-records/:id

Returns history rows for an order.

## POST /update-workflow-step

Request:

```json
{
  "orderId": "20250428-001",
  "stepName": "布",
  "completed": true,
  "user": "測試人員",
  "feedback": "已完成",
  "isfinish": "已完成"
}
```
