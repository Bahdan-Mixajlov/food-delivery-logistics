# Admin panel

Веб-панель администратора: заказы, курьеры, маршруты, каталог и аналитика.

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

Приложение откроется на `http://localhost:5173`.

## Переменные окружения

```env
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Сборка

```bash
npm run build
```

Подробная инструкция по всему проекту — в корневом `README.md`.
