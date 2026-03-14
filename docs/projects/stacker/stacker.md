---
title: "Amos (Stacker): Project README"
description: "Overview of the Amos hospitality PMS built with Ash Framework on Elixir/Phoenix, including setup instructions, domain architecture, and project structure."
date: 2025-03-14
tags: amos, stacker, pms, hospitality, elixir, phoenix, ash-framework, readme
group: projects/stacker
---

# Amos

> Hospitality property management system built with the Ash Framework on Elixir/Phoenix.

Amos is a ground-up rebuild of a prior NestJS system ("Stacker"), preserving the domain model while leveraging Ash's declarative resource system. It serves as the single source of truth for niche hospitality operations -- a single-business PMS, not a multi-tenant SaaS platform.

This repository contains the API backend only. No frontend code lives here.

## Tech Stack

- **Elixir 1.18+** / **Phoenix 1.8**
- **Ash Framework 3.x** -- declarative resources, domains, actions, and policies
- **PostgreSQL** via AshPostgres
- **AshAuthentication** -- staff authentication (password strategy, token revocation)
- **AshStateMachine** -- reservation and task state management
- **AshArchival** -- soft deletes with base filters
- **AshMoney** -- monetary amounts (no raw decimals or integer cents)
- **UUIDv7** primary keys -- sortable, with embedded creation timestamps

## Prerequisites

- Elixir ~> 1.18
- PostgreSQL (running and accessible)
- Hex and Mix (included with Elixir)

## Setup

```bash
# Clone the repo and enter it
git clone <repo-url> && cd amos

# Install dependencies, run Ash setup (codegen + migrations), install git hooks, seed data
mix setup
```

`mix setup` runs: `deps.get` -> `ash.setup` -> `git_hooks.install` -> `seeds.exs`.

If the database already exists and you just need to migrate:

```bash
mix ash_postgres.migrate
```

## Development Commands

| Command | Purpose |
|---------|---------|
| `mix deps.get` | Install dependencies |
| `mix ash.setup` | Run all Ash setup tasks (codegen, migrations) |
| `mix ash.codegen` | Generate code from Ash resources |
| `mix ash_postgres.generate_migrations` | Generate migrations from resource changes |
| `mix ash_postgres.migrate` | Run database migrations |
| `mix test` | Run all tests |
| `mix test path/to/test.exs` | Run a single test file |
| `mix test path/to/test.exs:42` | Run a single test at a specific line |
| `mix credo --strict` | Static analysis (strict mode) |
| `mix format` | Auto-format code |
| `mix precommit` | Full pre-commit check (compile, format, credo, sobelow) |

### Git Hooks

Installed automatically by `mix setup`. Configured in `config/dev.exs`.

- **Pre-commit**: format check, compile with warnings-as-errors, credo strict
- **Pre-push**: full test suite

## Domain Architecture

Domains are organized in dependency tiers. Lower tiers are foundational; higher tiers depend on those below them.

| Tier | Domain | Resources |
|------|--------|-----------|
| 0 | **Identity** | User, Token, Profile, UserRole |
| 0 | **Property** | Property |
| 1 | **Contacts** | Contact, MagicLinkToken |
| 1 | **Villas** | Villa |
| 1 | **Catalog** | CatalogItem, Tax, Fee, CatalogItemTax, CatalogItemFee, Bundle, BundleItem, Rate |
| 1 | **Media** | Media |
| 1 | **Staff** | StaffSchedule |
| 2 | **Reservations** | Reservation, ReservationItem |
| 2 | **Spa** | SpaRoom, SpaService, SpaSchedule |
| 3 | **Payments** | Folio, Transaction, PaymentSchedule, PaymentScheduleLine, PosCharge, Commission |
| 3 | **Tasks** | TaskGroup, Checklist, Task, TaskMedia |
| 3 | **Comms** | Channel, ChannelMember, Message, MessageMedia |

Property-scoped resources use attribute-based multitenancy (`property_id`). Global resources (User, Contact, Channel, Media) are cross-property by nature.

## Project Structure

```
lib/
  amos/                  # Business logic (domains and resources)
    identity/            # Users, auth tokens, profiles, roles
    property/            # Property configuration
    contacts/            # Guest contacts
    villas/              # Villa (room) inventory
    catalog/             # Products, taxes, fees, bundles, rates
    media/               # File/media management
    staff/               # Staff scheduling
    reservations/        # Reservations and line items
    spa/                 # Spa rooms, services, schedules
    payments/            # Folios, transactions, commissions
    tasks/               # Task groups, checklists, tasks
    comms/               # Messaging channels and messages
    validations/         # Shared validation modules
    repo.ex              # Ecto repo
  amos_web/              # Phoenix web layer (API endpoints)
config/                  # Application configuration
plans/                   # Layer and phase planning docs
reference/               # Original Prisma schema for domain reference
test/                    # Test suite (async, factory-based)
```

## Further Reading

- [CLAUDE.md](CLAUDE.md) -- detailed conventions, patterns, and anti-patterns for development
- [plans/](plans/) -- layer roadmaps and phase plans
- [reference/schema.prisma](reference/schema.prisma) -- original domain model reference
