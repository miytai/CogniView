# Cogni View

![Header](https://github.com/miytai/CogniView/blob/develop/Assets/images/icon/banner.jpg)

**Cogni View** — Roadmap веб-приложение для совместной работы с зашифрованными документами и построения базы знаний.

Всё содержимое шифруется на клиенте (E2E-шифрование, AES-256-GCM): сервер никогда не видит открытый текст документов, а ключ хранится только в памяти браузера участника.

---

## Возможности

- **Совместная работа в реальном времени** — синхронизация документов через Yjs / Hocuspocus поверх зашифрованного WebSocket-канала (сервер хранит только шифротекст).
- **E2E-шифрование** — каждый проект защищён ключом шифрования (32 байта, base64). Документ доступен только после ввода ключа.
- **Проекты и доступ** — роли участников `owner / editor / viewer`, приглашение по email, публикация проекта по открытой ссылке.
- **Документы** — редактор Markdown на CodeMirror 6 с совместным редактированием (yCollab), превью, режим split-view, экспорт в PDF.
- **Коммиты и версии** — снапшоты документа шифруются на клиенте и сохраняются на сервере: создание коммита, сравнение (diff), откат и «взять за основу».
- **Wiki-граф** — автоопределение `[[wiki-ссылок]]` между документами и визуализация графа знаний.
- **Комментарии** — обсуждение прямо в документе.
- **Регистрация и вход** — JWT-сессия (httpOnly cookie), bcrypt, защита от перебора (rate limiting по IP+email).

## Технологический стек

| Слой | Технологии |
| --- | --- |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS |
| Редактор | CodeMirror 6, y-codemirror.next (yCollab) |
| Realtime | Yjs, Hocuspocus 2 (WebSocket), y-protocols |
| ORM / БД | Prisma, PostgreSQL 16 |
| Кэш / лимиты | Redis 7 |
| События | Redpanda (Kafka API, best-effort) |
| Криптография | Web Crypto API, AES-256-GCM (клиент) |
| Инфраструктура | Docker Compose |

## Архитектура

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  apps/web (Next.js, :3000)  │        │  apps/realtime (Hocuspocus)  │
│  • UI, редактор, коммиты    │  WS    │  • Yjs WebSocket :1234        │
│  • шифрование на клиенте    │───────▶│  • PostgresDatabase          │
│  • REST API (App Router)    │        │  • хранит только ciphertext  │
└──────────┬────────┬─────────┘        └──────────────┬───────────────┘
           │        │                                │
     PostgreSQL    Redis                        Redpanda (опц.)
```

- **Веб-приложение** (`apps/web`) — Next.js App Router, серверные и клиентские компоненты, REST API в `src/app/api`, Prisma.
- **Realtime-сервер** (`apps/realtime`) — Hocuspocus, аутентификация через JWT, хранение состояния документов в PostgreSQL.
- **Единый формат хранения** — `Document.yjsState` = `base64(iv(12) + ciphertext AES-256-GCM)` от Yjs-обновления.

## Модель безопасности

1. При создании проекта генерируется ключ шифрования и показывается **один раз**.
2. Текст документа хранится в Yjs-документе; в канал realtime публикуется **только шифрованное значение** (base64 IV + ciphertext).
3. Сервер (web и realtime) хранит исключительно шифротекст; расшифровка происходит в браузере.
4. Без ключа проект отображается как заблокированный: документы, редактор и граф недоступны.
5. Ключ живёт только в памяти текущей сессии (контекст проекта) и сбрасывается кнопкой «Забыть ключ».

## Быстрый старт (Docker)

Требуется: Docker с Docker Compose (v2).

```bash
# 1. Переменные окружения (POSTGRES_*, JWT_SECRET, ...)
cp .env.example .env

# 2. Сборка и запуск всего стека
docker compose up -d --build

# 3. Проверка
docker compose ps
```

| Сервис | Порт |
| --- | --- |
| app (web) | http://localhost:3000 |
| realtime (Hocuspocus) | ws://localhost:1234 (health: `/health`) |
| postgres | 5432 |
| redis | 6379 |
| redpanda | 9092 / 29092 |

## Локальная разработка

```bash
# Веб-приложение
cd apps/web
npm install
npm run dev          # http://localhost:3000

# Realtime-сервер
cd apps/realtime
npm install
npm run dev          # ws://localhost:1234
```

Для Prisma на Alpine-сборках в `schema.prisma` заданы `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]`.

## Переменные окружения

| Переменная | Описание |
| --- | --- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Учётные данные PostgreSQL |
| `POSTGRES_PORT` | Порт PostgreSQL |
| `REDIS_PORT` | Порт Redis |
| `KAFKA_PORT` | Порт Redpanda (Kafka API) |
| `WEB_URL` | Публичный URL веб-приложения |
| `APP_PORT` | Порт контейнера app |
| `REALTIME_WS_URL` | URL realtime WebSocket (`ws://...`) |
| `JWT_SECRET` | Секрет подписи JWT (обязательно заменить в production) |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | MinIO (опционально, объектное хранилище) |
| `MINIO_PORT` / `MINIO_CONSOLE_PORT` | Порты MinIO |

## Структура проекта

```
apps/
  web/                 # Next.js-приложение
    src/app/           # маршруты + REST API (api/…)
    src/components/    # UI и фичи (EditorPage, CommitModal, VersionsPanel, …)
    src/contexts/      # ProjectContext, AppContext
    src/lib/           # client-api, yjs-encryption, client-crypto, rate-limit, …
    prisma/schema.prisma
    scripts/           # E2E-скрипты (realtime-sync, commit-e2e, encryption-smoke)
  realtime/            # Hocuspocus-сервер
    src/index.ts       # конфигурация Server + /health
    src/auth.ts        # PostgresDatabase: хранение шифротекста
Assets/                # изображения (banner, иконки)
docker-compose.yml     # стек: app, realtime, postgres, redis, redpanda
```

## Тестирование

Проверка E2E-синхронизации с шифрованием и потока коммитов выполняется скриптами в `apps/web/scripts` и `apps/realtime/scripts` (запуск через `npx tsx`):

- `realtime-sync-test.ts` — зашифрованная синхронизация A↔B, проверка, что сервер хранит только ciphertext.
- `commit-e2e-test.ts` — коммит → правка → откат из версии → сверка состояния на сервере.
- `encryption-smoke.ts` — самодостаточный тест крипто-слоя Yjs.

## Лицензия

[LICENSE](LICENSE)