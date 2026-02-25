**docker-compose.md**

DATABASE_URL: postgresql+psycopg2://postgres:postgres@db:5432/agm

postgresql+psycopg2://: The Protocol & Driver. It says "We are using a Postgres database, and we are using the psycopg2 Python library to translate our code into database language."

postgres:postgres: The Credentials. The first postgres is the username; the second is the password (separated by a colon).

@db: The Hostname. In Docker, you don't use localhost to talk to other containers. You use the service name defined in your YAML file. Since your database service is named db, the backend looks for a machine named db.

:5432: The Internal Port. Even though you mapped the database to 5433 for your computer to see, containers talk to each other on their internal ports. Postgres always defaults to 5432.

/agm: The Database Name. This tells the backend specifically which folder (database) inside Postgres to open.

BACKEND_CORS_ORIGINS: http://localhost:5173,http://localhost:3000

The Problem: By default, a browser will block a website (like your frontend) from making requests to a different API (your backend) for security reasons. This prevents a random malicious site from stealing data from your backend.

The Solution: This line is an "Allow List." It tells your backend: "Hey, if a request comes from http://localhost:5173 (your Vite frontend) or http://localhost:3000 (another common React port), let it through. Everyone else is blocked."