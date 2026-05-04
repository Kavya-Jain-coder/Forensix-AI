from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app import models
from app.routes import auth, cases, evidence, reports, audit
from app.routes import api
import os

models.Base.metadata.create_all(bind=engine)

# Auto-seed admin on first startup
def seed_admin():
    from app.database import SessionLocal
    from app.models import User, UserRole
    from app.auth import hash_password
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.username == "admin").first():
            admin = User(
                username="admin",
                email="admin@forensix.local",
                full_name="System Administrator",
                hashed_password=hash_password("ForensixAdmin@2024"),
                role=UserRole.ADMIN,
                badge_number="ADMIN-001",
                department="Forensic Laboratory",
            )
            db.add(admin)
            db.commit()
            print("[INFO] Admin user created automatically")
    except Exception as e:
        print(f"[WARN] Could not seed admin: {e}")
    finally:
        db.close()

seed_admin()

app = FastAPI(title="ForensixAI API", version="2.0.0")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:4173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(cases.router, prefix="/api")
app.include_router(evidence.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(api.router, prefix="/api")  # legacy

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
