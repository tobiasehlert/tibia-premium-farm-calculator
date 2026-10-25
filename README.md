# Tibia Premium Farm Calculator

Aplicação full-stack para calcular o gold necessário para comprar 250 Tibia Coins antes do fim da Premium Time, com autenticação, histórico e importação de hunts.

## Visão Geral

- Calcula metas de farm e acompanha evolução.
- Importa JSONs de hunts para reaproveitar dados.
- Mantém históricos de Premium Time, Tibia Coin e metas.
- Suporta modo visitante e contas autenticadas.

## Stack

- **Frontend**: React + Vite + Recharts (porta padrão 5174)
- **Backend**: Node.js + Express + Prisma + SQLite (porta padrão 4000)
- **Autenticação**: JWT + bcryptjs

## Funcionalidades

- Cadastro e login com validações
- Gestão de personagens com consulta pela TibiaData API v5
- Cadastro e histórico de Premium Time
- Histórico de preço de Tibia Coin
- Metas de farm com gráficos
- Dashboard com resumo de indicadores

## Como Rodar Localmente

### 1) Backend

```powershell
cd server
npm install
npm run dev
```

API em `http://localhost:4000`.

### 2) Frontend

```powershell
npm install
npm run dev
```

App em `http://localhost:5174`.

## Variáveis de Ambiente

### Backend (`server/.env`)

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="troque-este-segredo"
CORS_ORIGIN="http://localhost:5174"
PORT=4000
```

### Frontend (`.env.local`)

```env
VITE_API_URL=http://localhost:4000
```

`VITE_API_URL` não deve ter barra no final (ex: `https://seu-dominio.com`).

## Scripts Úteis

### Frontend

```powershell
npm run dev
npm run build
npm run lint
```

### Backend

```powershell
cd server
npm run dev
npm run build
npm start
```

### Prisma

```powershell
cd server
npx prisma migrate dev --name init
npx prisma studio
```

## Endpoints Principais

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Usuários

- `GET /users/me`
- `PUT /users/me`

### Personagens

- `GET /characters`
- `POST /characters`
- `PUT /characters/:id`
- `DELETE /characters/:id`
- `PUT /characters/:id/set-active`

### Premium Time

- `GET /premium-time/history`
- `POST /premium-time/update`

### Tibia Coin

- `GET /tibia-coin/history`
- `POST /tibia-coin/update-price`

### Meta de Farm

- `GET /farm-goal/history`
- `POST /farm-goal/update`


### Dashboard

- `GET /dashboard/summary`

## Estrutura do Projeto

```
projeto calculadora tibia/
├── src/                          # Frontend React
│   ├── components/               # Componentes reutilizáveis
│   ├── contexts/                 # AuthContext
│   ├── services/                 # Chamadas à API
│   ├── types/                    # Tipos TypeScript
│   ├── utils/                    # Funções auxiliares
│   ├── App.tsx                   # Componente principal
│   └── main.tsx                  # Entrada
├── server/                       # Backend Node.js
│   ├── src/
│   │   ├── routes/               # Rotas Express
│   │   ├── middleware/           # Autenticação, CORS
│   │   ├── prisma.ts             # Cliente Prisma
│   │   └── index.ts              # Servidor
│   ├── prisma/
│   │   ├── schema.prisma         # Modelo de banco
│   │   └── migrations/           # Histórico de schemas
│   ├── package.json              # Dependências
│   └── .env                      # Variáveis de ambiente
└── .env.local                    # Variáveis do frontend
```

## Solução de Problemas

- **Porta em uso**: o Vite tenta uma porta livre automaticamente.
- **Erro de conexão com API**: confirme `http://localhost:4000` e `VITE_API_URL`.
- **Token expirado**: faça login novamente.
- **Banco não existe**: rode `npx prisma migrate dev --name init` em `server/`.

## Contribuição

1. Faça um fork do projeto.
2. Crie uma branch: `git checkout -b minha-feature`.
3. Commit: `git commit -m "feat: minha feature"`.
4. Push: `git push origin minha-feature`.
5. Abra um Pull Request.