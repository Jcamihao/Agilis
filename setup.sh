#!/bin/bash

# ═══════════════════════════════════════════
# AGILIS — Setup Script
# ═══════════════════════════════════════════

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}"
echo "  ╔═══════════════════════════════════╗"
echo "  ║       AGILIS — Setup Script       ║"
echo "  ║   Plataforma de Gestão Operacional ║"
echo "  ╚═══════════════════════════════════╝"
echo -e "${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale Node.js 20+"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) encontrado${NC}"

# Backend setup
echo -e "\n${YELLOW}📦 Configurando Backend...${NC}"
cd agilis-backend
cp .env.example .env 2>/dev/null || true
npm install
echo -e "${GREEN}✅ Dependências do backend instaladas${NC}"

# Frontend setup
echo -e "\n${YELLOW}📦 Configurando Frontend...${NC}"
cd ../agilis-frontend
npm install
echo -e "${GREEN}✅ Dependências do frontend instaladas${NC}"

cd ..

echo -e "\n${GREEN}"
echo "  ╔═══════════════════════════════════════════════╗"
echo "  ║          Setup Concluído! 🎉                   ║"
echo "  ╠═══════════════════════════════════════════════╣"
echo "  ║                                               ║"
echo "  ║  Para iniciar o projeto:                      ║"
echo "  ║                                               ║"
echo "  ║  1. Inicie o PostgreSQL (ou use Docker):       ║"
echo "  ║     docker-compose up -d postgres              ║"
echo "  ║                                               ║"
echo "  ║  2. Configure o .env do backend               ║"
echo "  ║     (agilis-backend/.env)                      ║"
echo "  ║                                               ║"
echo "  ║  3. Execute as migrations:                    ║"
echo "  ║     cd agilis-backend                          ║"
echo "  ║     npx prisma migrate dev                    ║"
echo "  ║     npm run prisma:seed                       ║"
echo "  ║                                               ║"
echo "  ║  4. Inicie o backend:                         ║"
echo "  ║     npm run start:dev                         ║"
echo "  ║                                               ║"
echo "  ║  5. Inicie o frontend (novo terminal):        ║"
echo "  ║     cd agilis-frontend && npm start           ║"
echo "  ║                                               ║"
echo "  ║  🔗 Frontend: http://localhost:4200            ║"
echo "  ║  🔗 Backend:  http://localhost:3000/api/v1    ║"
echo "  ║  📚 Docs API: http://localhost:3000/docs      ║"
echo "  ║                                               ║"
echo "  ║  Demo: admin@agilis.app / Admin@123           ║"
echo "  ╚═══════════════════════════════════════════════╝"
echo -e "${NC}"
