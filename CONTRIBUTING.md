# Contributing to StockLine Inventory SE

Welcome to **StockLine Inventory SE** (Enterprise Warehouse & Inventory Management System)! We are excited to collaborate as a team to build and maintain this enterprise-grade platform.

Please review this guide to understand our repository workflow, coding standards, branch conventions, and Trello sprint synchronization.

---

## 1. Team Collaboration & Roles

- **Saiful Ahnm Sajed** ([@saifulahnmsajed](https://github.com/saifulahnmsajed)):
  - Frontend Architecture & UI/UX Design
  - Responsive Component Systems & State Management
  - Trello Board Task Tracking & Sprint Synchronization
- **MD Ismail** ([@mmdrismail](https://github.com/mmdrismail)):
  - Backend API Architecture & Database Engineering
  - Authentication, Role-based Access Control (RBAC) & Caching
  - Automated Integration Testing & CI/CD Deployment

---

## 2. Environment Setup

### Prerequisites
- **Node.js**: v18.x or v20.x LTS
- **npm**: v9.x or higher
- **MongoDB**: Local MongoDB community server or MongoDB Atlas URI

### Installation
```bash
# Clone the repository
git clone https://github.com/saifulahnmsajed/inventory-se.git
cd inventory-se

# Install root dependencies (Frontend)
npm install

# Install server dependencies (Backend)
cd server && npm install && cd ..
```

### Environment Configuration
1. Copy `.env.example` in `server/.env.example` to `server/.env`:
   ```bash
   cp server/.env.example server/.env
   ```
2. Verify environment keys:
   - `PORT=5000`
   - `MONGO_URI=mongodb://localhost:27017/stockline_db` (or MongoDB Atlas connection string)
   - `JWT_SECRET=your_super_secret_jwt_key`
   - `JWT_EXPIRES_IN=7d`

---

## 3. Development Workflow

### Starting Development Servers
Run both backend and frontend concurrently:
```bash
# Terminal 1 - Backend Server
npm run server

# Terminal 2 - Frontend Development Server
npm run dev
```
- Frontend will run on: `http://localhost:5173/`
- Backend API will run on: `http://localhost:5000/api`

### Running Test Suite
Before committing or creating a pull request, always run the full automated test suite:
```bash
npm test
```
The test suite validates:
- Authentication & JWT token generation
- Product CRUD & SKU validation
- Lot tracking & scrap auction bids
- Order processing & stock deductions
- Multi-tier price cipher hashing
- Audit logging & analytics

---

## 4. Git Branch & Commit Conventions

### Branch Naming
- `feature/<feature-name>`: New UI or backend feature
- `fix/<bug-name>`: Bug fix or patch
- `docs/<doc-name>`: Documentation improvements
- `refactor/<module>`: Code refactoring without changing functionality

### Commit Message Format
We follow the **Conventional Commits** specification:
- `feat(scope): add new capability`
- `fix(scope): resolve issue or regression`
- `docs(scope): update documentation`
- `chore(scope): configuration or maintenance`
- `test(scope): add or improve test coverage`

---

## 5. Trello Sprint Integration

All sprint tasks are tracked on our collaborative **Trello Board**:
- **Board URL**: [Trello Sprint Board](https://trello.com/b/B7EZLSFY/my-trello-board)
- **Sprint Sync Command**:
  ```bash
  npm run sprint:sync
  ```
- Always move cards from **In Progress** to **Review/QA** and **Done** as features are implemented and tested.

---

## 6. Code Style & Quality Guidelines

- Use React functional components with modern hooks.
- Follow Tailwind CSS utility classes; avoid inline styles.
- Ensure all interactive buttons, modals, and tables support keyboard accessibility.
- Keep components modular inside `src/components/` and shared helpers in `src/utils/`.

Thank you for contributing to StockLine Inventory SE!
