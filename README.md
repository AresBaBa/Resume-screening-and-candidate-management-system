# Resume Screening and Candidate Management System

AI-powered resume screening and candidate management system.

## Tech Stack

### Frontend
- **User Portal**: Next.js 15 + TypeScript + Tailwind CSS + Zustand + SWR
- **Admin Portal**: Vue 3 + TypeScript + Vite + Pinia + Element Plus

### Backend
- Python (Flask) + SQLAlchemy + PostgreSQL + Redis

### Infrastructure
- Docker + GitHub Actions + PM2 + Nginx

### AI Integration
- OpenAI API + Custom Agent Framework

## Project Structure

```
resume-screening-and-candidate-management-system/
├── backend/                 # Flask API
│   ├── app/
│   │   ├── models/         # SQLAlchemy models
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   └── utils/         # Utilities
│   ├── config.py          # Configuration
│   ├── run.py             # Entry point
│   └── requirements.txt   # Python dependencies
│
├── frontend/               # Next.js User Portal
│   ├── src/
│   │   ├── app/          # Next.js app router
│   │   ├── components/   # React components
│   │   ├── lib/         # Utilities
│   │   ├── stores/      # Zustand stores
│   │   └── types/       # TypeScript types
│   └── package.json
│
├── admin/                  # Vue Admin Portal
│   ├── src/
│   │   ├── views/       # Page components
│   │   ├── router/      # Vue Router
│   │   ├── stores/      # Pinia stores
│   │   └── api/         # API client
│   └── package.json
│
└── docker/                 # Docker configurations
    ├── docker-compose.yml
    ├── Dockerfile.backend
    ├── Dockerfile.frontend
    └── Dockerfile.admin
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker & Docker Compose

### Development Mode

1. **Backend**
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
pip install -r requirements.txt
flask db init
flask db migrate
flask db upgrade
python run.py
```

2. **Frontend (User Portal)**
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

3. **Admin Portal**
```bash
cd admin
npm install
npm run dev
```

### Docker Deployment

```bash
cd docker
cp .env.example .env
# Edit .env with your configuration
docker-compose up -d
```

## Environment Variables

### Backend
| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/resume_screening` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `SECRET_KEY` | Flask secret key | - |
| `JWT_SECRET_KEY` | JWT secret key | - |
| `OPENAI_API_KEY` | OpenAI API key | - |

### Frontend
| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:5000` |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user

### Jobs
- `GET /api/jobs` - List jobs
- `POST /api/jobs` - Create job
- `GET /api/jobs/:id` - Get job
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job

### Candidates
- `GET /api/candidates` - List candidates
- `GET /api/candidates/:id` - Get candidate
- `PUT /api/candidates/:id` - Update candidate

### Resumes
- `GET /api/resumes` - List resumes
- `POST /api/resumes` - Upload resume
- `GET /api/resumes/:id` - Get resume
- `DELETE /api/resumes/:id` - Delete resume

### AI
- `POST /api/ai/parse-resume/:id` - Parse resume with AI
- `POST /api/ai/score-application/:id` - Score application
- `GET /api/ai/generate-interview-questions/:job_id` - Generate questions

## License

MIT
