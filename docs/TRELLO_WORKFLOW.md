# StockLine Trello Sprint Workflow

This document outlines our team sprint cycle and Trello board organization.

---

## 1. Board Structure

- **Board Name**: `My Trello Board`
- **Board URL**: [https://trello.com/b/B7EZLSFY/my-trello-board](https://trello.com/b/B7EZLSFY/my-trello-board)

The board is structured into five standard Kanban phases:
1. **Backlog**: Product ideas, technical debt, and pending feature proposals.
2. **To Do**: Sprint backlog items committed for the current release milestone.
3. **In Progress**: Active development tasks currently being written.
4. **Review / QA**: Feature code complete; awaiting automated test suite pass and peer review.
5. **Done**: Successfully merged into `main`, passing tests, and deployed live.

---

## 2. Automated Sprint Synchronization

We have implemented an automated CLI script to verify and synchronize Trello sprint milestones with the repository:
```bash
npm run sprint:sync
```

This command:
- Connects to the Trello board via public API.
- Confirms cards in each sprint column.
- Validates that all 10 core milestones are documented in `TRELLO_SPRINT_LOG.md`.

---

## 3. Sprint Checklist & Task Definition of Done (DoD)

Before any card moves to **Done**, it must satisfy:
- [x] Code written and adheres to clean component architecture.
- [x] Integration tests executed (`npm test`) with 100% pass rate.
- [x] Responsive layout verified across mobile, tablet, and desktop viewports.
- [x] Git commit authored with conventional commit messages.
- [x] Live GitHub Pages build verified.
