# Guia de Deploy — Casa Tarefas

## Pré-requisitos
- Conta no GitHub
- Conta no [Railway](https://railway.app) (grátis)
- Conta no [Vercel](https://vercel.com) (grátis)

---

## 1. Subir para o GitHub

```bash
cd casa-tarefas
git init
git add .
git commit -m "feat: casa tarefas inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/casa-tarefas.git
git push -u origin main
```

---

## 2. Deploy do Backend no Railway

1. Acesse [railway.app](https://railway.app) → **New Project**
2. **Deploy from GitHub repo** → selecione `casa-tarefas`
3. Clique em **Add Service → Database → PostgreSQL**
4. Na aba do serviço da aplicação, vá em **Settings → Root Directory**: `backend`
5. Em **Variables**, adicione:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   DATABASE_USERNAME=${{Postgres.PGUSER}}
   DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
   DATABASE_DRIVER=org.postgresql.Driver
   FRONTEND_URL=https://seu-app.vercel.app
   ```
6. Railway irá buildar e fazer deploy automaticamente
7. Em **Settings → Domains**, copie a URL gerada (ex: `https://casa-tarefas-backend.up.railway.app`)

---

## 3. Deploy do Frontend no Vercel

1. Acesse [vercel.com](https://vercel.com) → **New Project**
2. Importe o repositório `casa-tarefas`
3. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Em **Environment Variables**, adicione:
   ```
   VITE_API_URL=https://casa-tarefas-backend.up.railway.app
   ```
5. Clique em **Deploy**
6. Copie a URL gerada (ex: `https://casa-tarefas.vercel.app`)

---

## 4. Atualizar CORS no Railway

Volte no Railway e atualize a variável:
```
FRONTEND_URL=https://casa-tarefas.vercel.app
```

Railway fará redeploy automático.

---

## Desenvolvimento Local

```bash
# Terminal 1 — Backend
cd backend
./gradlew bootRun
# API em http://localhost:8080
# H2 Console em http://localhost:8080/h2-console

# Terminal 2 — Frontend
cd frontend
cp .env.example .env.local
npm install
npm run dev
# App em http://localhost:5173
```

---

## Atualizar depois

Qualquer `git push` na branch `main` faz redeploy automático no Railway e Vercel.

```bash
git add .
git commit -m "feat: nova tarefa"
git push
```

---

## API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET  | `/api/health` | Status |
| GET  | `/api/board?weekStart=2024-01-15` | Quadro da semana |
| GET  | `/api/tasks` | Listar tarefas |
| POST | `/api/tasks` | Criar tarefa |
| POST | `/api/assignments/assign` | Atribuir tarefa |
| POST | `/api/assignments/{id}/complete` | Marcar como feito |
| POST | `/api/assignments/{id}/uncomplete` | Desmarcar |
| POST | `/api/assignments/{id}/penalty` | Aplicar penalidade |
| GET  | `/api/rewards` | Listar recompensas |
| GET  | `/api/points/history` | Histórico de pontos |
