# Recovery Notes

The original project only had a built `dist/` folder. The restored version keeps that folder unchanged and recreates a maintainable working app under `restored/`.

## Structure

```text
restored/
  frontend/  Vue 3 + Vite app
  backend/   Express JSON API
  docs/      API notes and recovery notes
```

## Local test accounts

```text
admin / admin123
test / test123
```

## Original API endpoints found in the built frontend

```text
POST /login
GET /dashboard-data
GET /get-workflow-steps/:id
GET /get-completed-records/:id
POST /update-workflow-step
```

The local backend implements the same endpoint names so the frontend can later be pointed back to Firebase or another production backend with minimal changes.
