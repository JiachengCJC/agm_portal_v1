cd "/Users/jiacheng/Documents/NUS_Course/DSA3101/Group project files/agm-portal-mvp"

**Confirm containers are running**
Confirm containers are running

**Enter the database shell**
docker compose exec db psql -U postgres -d agm

"""
The Anatomy of the Command
docker compose exec: This tells Docker, "Go inside a container that is already running and execute a command."

db: This is the name of the service from your YAML file. It tells Docker which container to enter.

psql: This is the actual program you want to run. psql is the interactive terminal-based tool for PostgreSQL.

-U postgres: The "User" flag. It tells the database you are logging in as the postgres superuser.

-d agm: The "Database" flag. It tells the tool to jump straight into the agm database instead of the default one.
"""

**Inside psql, navigate and inspect**
\l            -- list databases
\c agm        -- connect to agm (if not already)
\dt           -- list tables
\d users      -- show users table schema
SELECT * FROM users;
SELECT * FROM projects;

**Exit**
\q

**Get Docker volume path**
Get Docker volume path