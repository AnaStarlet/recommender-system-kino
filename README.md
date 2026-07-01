# recommender-system-kino
## Запуск проекта

### 1. Запуск через Docker (рекомендуемый способ)

```bash
docker-compose up --build
После запуска:

Фронтенд: http://localhost:5173

Бэкенд: http://localhost:8000

Swagger документация: http://localhost:8000/docs

2. Ручная настройка (для разработки)
Шаг 1: Настройка Backend (FastAPI)
Создайте виртуальное окружение:

bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
Установите зависимости:

bash
cd backend
pip install -r requirements.txt
Запустите PostgreSQL с pgvector:

bash
docker run --name kinodb -e POSTGRES_PASSWORD=secret_password_1337 -e POSTGRES_DB=kinodb -p 5432:5432 -d ankane/pgvector
Создайте файл .env в папке backend/:

env
DATABASE_URL=postgresql+asyncpg://postgres:secret_password_1337@localhost:5432/kinodb
JWT_SECRET=super_secret_coursework_key_9999
TMDB_API_KEY=your_tmdb_api_key
GEMINI_API_KEY=your_gemini_api_key
Запустите бэкенд:

bash
uvicorn app.main:app --reload --port 8000
Шаг 2: Настройка Frontend (React / Vite)
Установите зависимости:

bash
cd frontend
npm install
Запустите сервер разработки:

bash
npm run dev
Фронтенд будет доступен по адресу: http://localhost:5173

Шаг 3: Загрузка фильмов в базу данных
Для Docker:

bash
docker exec -it kinodb_backend python -m app.seed_data
Для ручного запуска (локально):

bash
cd backend
python -m app.seed_data
