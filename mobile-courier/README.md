# Mobile courier

Мобильное приложение курьера: доступные заказы, детали доставки, маршрут и смена статусов.

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
```

В `EXPO_PUBLIC_API_URL` укажите IP компьютера в локальной сети. Для Android-эмулятора подойдёт `http://10.0.2.2:3000/api`, для iOS — `http://localhost:3000/api`.

Подробная инструкция по всему проекту — в корневом `README.md`.
