# RealWear Atlas — Quick Start

## First-time setup

Open **two terminals** from this folder:

### Terminal 1 — Backend
```bash
cd backend
npm install
npm run dev        # starts on http://localhost:3001
```

### Terminal 2 — Frontend
```bash
cd frontend
npm install
npm run dev        # starts on http://localhost:5173
```

Then open **http://localhost:5173** in your browser.

### Optional: Image upload hosting (recommended)
Create `frontend/.env` with:

```bash
VITE_API_URL=http://localhost:3001
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
```

Inventory image upload now stores hosted URLs (Cloudinary), not base64.

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/items` | List / create items |
| GET/PATCH/DELETE | `/api/items/:id` | Get / update / delete item |
| GET/POST | `/api/sales` | List / create sales |
| GET/PATCH/DELETE | `/api/sales/:id` | Get / update / delete sale |
| GET/POST | `/api/expenses` | List / create expenses |
| GET/PATCH/DELETE | `/api/expenses/:id` | Get / update / delete expense |
| GET | `/api/dashboard/stats` | KPI stats |
| GET | `/api/dashboard/revenue-over-time` | Chart data |
| GET | `/api/dashboard/category-breakdown` | Sales by category |
| GET | `/api/dashboard/expenses-breakdown` | Expenses by category |
| GET | `/api/dashboard/recent-activity` | Activity feed |

## Database
SQLite file is created automatically at `backend/database/realwearatlas.db` on first run. No setup needed.
