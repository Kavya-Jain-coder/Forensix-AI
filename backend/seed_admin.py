"""
Run once to create the initial admin user:
  python seed_admin.py
"""
from app.database import SessionLocal, engine
from app import models
from app.auth import hash_password

models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

if db.query(models.User).filter(models.User.username == "admin").first():
    print("Admin user already exists.")
else:
    admin = models.User(
        username="admin",
        email="admin@forensix.local",
        full_name="System Administrator",
        hashed_password=hash_password("ForensixAdmin@2024"),
        role=models.UserRole.ADMIN,
        badge_number="ADMIN-001",
        department="Forensic Laboratory",
    )
    db.add(admin)
    db.commit()
    print("✓ Admin user created.")
    print("  Username: admin")
    print("  Password: ForensixAdmin@2024")
    print("  CHANGE THIS PASSWORD IMMEDIATELY after first login.")

db.close()
