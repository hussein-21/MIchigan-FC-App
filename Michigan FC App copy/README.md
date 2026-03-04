# Michigan FC – Backend API

Express REST API backed by Azure SQL Database with JWT auth, RBAC (PARENT / COACH / DIRECTOR), and Firebase Cloud Messaging push notifications.

---

## Quick Start (local)

```bash
cd backend
cp .env.example .env          # fill in your credentials
npm install
npm run dev                    # starts on http://localhost:4000
```

If `DB_SERVER` is missing or wrong the process exits with a clear message telling you to update `.env`.

---

## Tech Stack

| Layer        | Choice                                 |
| ------------ | -------------------------------------- |
| Runtime      | Node.js 18+                            |
| Framework    | Express 4                              |
| Database     | Azure SQL via `mssql` (connection pool) |
| Auth         | JWT + bcrypt                           |
| Validation   | Zod                                    |
| Push         | Firebase Admin SDK (FCM)               |
| Tests        | Jest + Supertest                       |

---

## Project Layout

```
backend/
├── package.json
├── .env.example
├── jest.config.js
├── sql/
│   ├── schema.sql          ← tables + indexes (idempotent)
│   └── seed.sql            ← sample director, coach, team
├── src/
│   ├── server.js           ← entry point (connects DB, starts listening)
│   ├── app.js              ← Express app (exported for tests)
│   ├── config/index.js     ← env-var loader
│   ├── db/
│   │   ├── pool.js         ← mssql connection pool + GUID normalisation
│   │   └── queries.js      ← re-export convenience
│   ├── middleware/
│   │   ├── auth.js         ← JWT verification
│   │   ├── roles.js        ← RBAC
│   │   ├── validate.js     ← Zod body validation
│   │   └── errorHandler.js
│   ├── utils/
│   │   ├── errors.js       ← AppError
│   │   ├── asyncHandler.js
│   │   └── localise.js     ← en/ar notification templates
│   ├── services/
│   │   ├── fcm.service.js
│   │   └── notification.service.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── users.controller.js
│   │   ├── players.controller.js
│   │   ├── events.controller.js
│   │   ├── notifications.controller.js
│   │   └── devices.controller.js
│   └── routes/
│       ├── index.js
│       ├── auth.routes.js
│       ├── users.routes.js
│       ├── players.routes.js
│       ├── events.routes.js
│       ├── notifications.routes.js
│       └── devices.routes.js
└── tests/
    ├── setup.js
    ├── globalTeardown.js
    ├── health.test.js
    ├── auth.test.js
    ├── events.test.js
    ├── notifications.test.js
    └── devices.test.js
```

---

## Azure SQL Setup

### 1. Create the database

In the Azure Portal → SQL databases → Create. Note the server name, admin user, and password.

### 2. Allow your IP

Server → Networking → add your client IP (or "Allow Azure services").

### 3. Run the schema

```bash
sqlcmd -S your-server.database.windows.net \
       -d MichiganFC -U your_user -P your_password \
       -i sql/schema.sql
```

### 4. (Optional) Seed sample data

```bash
sqlcmd -S your-server.database.windows.net \
       -d MichiganFC -U your_user -P your_password \
       -i sql/seed.sql
```

### 5. Fill in .env

```
DB_SERVER=your-server.database.windows.net
DB_NAME=MichiganFC
DB_USER=your_user
DB_PASSWORD=your_password
DB_ENCRYPT=true
```

---

## Running Tests

Tests run against a separate database so they never pollute production data.

```bash
# 1. Create a test database (MichiganFC_Test) and run schema.sql against it
# 2. Make sure DB_NAME_TEST is set in .env
npm test
```

Jest is configured with `--runInBand` so tests share one DB pool.
The pool is closed once via `tests/globalTeardown.js`.

---

## Environment Variables

| Variable                       | Required | Default            | Notes                              |
| ------------------------------ | -------- | ------------------ | ---------------------------------- |
| `PORT`                         | no       | 4000               |                                    |
| `NODE_ENV`                     | no       | development        | Set to `test` for test DB          |
| `DB_SERVER`                    | **yes**  |                    | Azure SQL server FQDN              |
| `DB_PORT`                      | no       | 1433               |                                    |
| `DB_NAME`                      | **yes**  | MichiganFC         |                                    |
| `DB_NAME_TEST`                 | for tests| MichiganFC_Test    |                                    |
| `DB_USER`                      | **yes**  |                    |                                    |
| `DB_PASSWORD`                  | **yes**  |                    |                                    |
| `DB_ENCRYPT`                   | no       | true               |                                    |
| `JWT_SECRET`                   | **yes**  | dev-secret…        | Change in production!              |
| `JWT_EXPIRES_IN`               | no       | 7d                 |                                    |
| `FIREBASE_SERVICE_ACCOUNT_PATH`| no       |                    | Path to Firebase JSON key          |
| `CORS_ORIGIN`                  | no       | *                  |                                    |

---

## API Reference

All routes are prefixed with `/api`.

### Auth
| Method | Path                  | Auth | Roles | Description                     |
| ------ | --------------------- | ---- | ----- | ------------------------------- |
| POST   | `/api/auth/register`  | —    | —     | Register parent + optional player |
| POST   | `/api/auth/login`     | —    | —     | Returns JWT + roles             |

### Users
| Method | Path              | Auth   | Roles          | Description      |
| ------ | ----------------- | ------ | -------------- | ---------------- |
| GET    | `/api/users`      | Bearer | DIRECTOR       | List all users   |
| GET    | `/api/users/:id`  | Bearer | DIRECTOR / self| Get user profile |
| PUT    | `/api/users/:id`  | Bearer | DIRECTOR / self| Update profile   |

### Players
| Method | Path                           | Auth   | Roles                              |
| ------ | ------------------------------ | ------ | ---------------------------------- |
| POST   | `/api/players`                 | Bearer | PARENT (own) / DIRECTOR (any)      |
| GET    | `/api/players/:id`             | Bearer | DIRECTOR / COACH / parent owner    |
| GET    | `/api/players/parent/:parentId`| Bearer | DIRECTOR / that parent             |

### Events
| Method | Path                       | Auth   | Roles    |
| ------ | -------------------------- | ------ | -------- |
| POST   | `/api/events`              | Bearer | DIRECTOR |
| GET    | `/api/events`              | Bearer | any      |
| GET    | `/api/events/team/:teamId` | Bearer | any      |

Creating an event triggers: insert Event → find affected parents → insert Notification rows (localised en/ar) → FCM push to stored device tokens.

### Notifications
| Method | Path                          | Auth   | Roles          |
| ------ | ----------------------------- | ------ | -------------- |
| POST   | `/api/notifications/send`     | Bearer | DIRECTOR       |
| GET    | `/api/notifications/user/:id` | Bearer | DIRECTOR / self|

### Devices
| Method | Path                 | Auth   | Roles |
| ------ | -------------------- | ------ | ----- |
| POST   | `/api/devices/token` | Bearer | any   |

---

## Design Notes

- **SQL injection prevention**: every query uses `request.input()` parameterisation — zero string concatenation.
- **GUID normalisation**: `mssql` returns UUIDs in UPPERCASE but JWTs store lowercase. The pool wrapper lowercases all GUID-shaped strings so `===` comparisons work.
- **Notification guarantee**: the DB row is always inserted *before* FCM is attempted, and FCM errors are caught per-user so remaining recipients are never skipped.
- **DIRECTOR role**: assigned manually via SQL (no self-service escalation).

---

## License

Proprietary — Michigan FC.
