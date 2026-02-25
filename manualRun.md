cd "/Users/jiacheng/Documents/NUS_Course/DSA3101/Group project files/agm-portal-mvp"

**Start database first**
docker compose up -d db

**Wait until DB is ready**
docker compose logs -f db

**Wait for this line, then press Ctrl+C:**
(database system is ready to accept connections)

**Start backend and frontend**
docker compose up -d backend frontend

**Check all services**
docker compose ps

**Open app**
 - Frontend: http://localhost:5173
 - Backend docs: http://localhost:8000/docs

**Useful commands:**
Stop everything: docker compose down
Fresh reset (delete DB data): docker compose down -v