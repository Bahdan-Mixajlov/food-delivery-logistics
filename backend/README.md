# Backend

REST API и WebSocket-сервер сервиса доставки еды.

## Запуск

```bash
npm install
cp .env.example .env
npm run dev
```

Для Windows PowerShell:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Перед запуском заполните `backend/.env`: параметры MySQL, `JWT_SECRET` и настройки логистики.

## База данных

```bash
mysql --default-character-set=utf8mb4 -u root -p < sql/schema.sql
mysql --default-character-set=utf8mb4 -u root -p < sql/seed.sql
```

## Проверки

```bash
npm test
```

Тесты покрывают венгерский алгоритм, расчёт расстояний и построение маршрута.
