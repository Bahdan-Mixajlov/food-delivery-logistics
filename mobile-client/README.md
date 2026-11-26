# Mobile client

Мобильное приложение клиента: каталог, планы питания, корзина, оформление заказа и отслеживание доставки.

## Запуск

```bash
npm install
cp .env.example .env
npm start
```

Для Windows PowerShell:

```powershell
npm install
Copy-Item .env.example .env
npm start
```

Для веб-версии:

```bash
npm run web
```

## Переменные окружения

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000/api
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

В `EXPO_PUBLIC_API_URL` укажите IP компьютера в локальной сети, чтобы приложение на телефоне видело backend. Для эмулятора можно использовать `http://10.0.2.2:3000/api` (Android) или `http://localhost:3000/api` (iOS).

Подробная инструкция по всему проекту — в корневом `README.md`.
