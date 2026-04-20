# Casa Tarefas 🏠

Dashboard de tarefas domésticas para Clara e Bernardo com sistema de pontos e recompensas.

## Estrutura

```
casa-tarefas/
├── backend/     # Kotlin + Spring Boot (Railway)
└── frontend/    # React + TypeScript (Vercel)
```

## Deploy gratuito

### Backend → Railway
1. Crie conta em [railway.app](https://railway.app)
2. New Project → Deploy from GitHub → selecione a pasta `backend`
3. Adicione variável de ambiente: `FRONTEND_URL=https://seu-app.vercel.app`
4. Railway detecta Kotlin automaticamente via `build.gradle.kts`

### Frontend → Vercel
1. Crie conta em [vercel.com](https://vercel.com)
2. New Project → selecione este repositório → Root Directory: `frontend`
3. Adicione variável de ambiente: `VITE_API_URL=https://seu-backend.railway.app`
4. Deploy automático a cada push no GitHub

## Desenvolvimento local

### Backend
```bash
cd backend
./gradlew bootRun
# Roda em http://localhost:8080
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Roda em http://localhost:5173
```

## Funcionalidades
- Dashboard com post-its por tipo (diária, semanal, conjunta, regra)
- Drag & drop para atribuir tarefas entre Clara e Bernardo
- Sistema de pontos com histórico semanal
- Recompensas e consequências configuráveis
- Horários com alertas visuais de prazo
- Persistência em banco PostgreSQL (Railway)