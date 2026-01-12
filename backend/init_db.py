"""Database initialization and seeding script."""

from app.auth.utils import hash_password
from app.db.database import Base, SessionLocal, engine
from app.db.models import User

# Create all tables
print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("✓ Tables created")

# Seed with test users
print("\nSeeding test users...")
db = SessionLocal()

TEST_USERS = [
    {
        "username": "testuser1",
        "email": "testuser1@relaypacs.local",
        "password": "testuser@123",
        "full_name": "Test User One",
        "role": "clinician",
    },
    {
        "username": "admin",
        "email": "admin@relaypacs.local",
        "password": "adminuser@123",
        "full_name": "Admin User",
        "role": "admin",
    },
    {
        "username": "testclinician",
        "email": "testclinician@relaypacs.local",
        "password": "testclinician@123",
        "full_name": "Test Clinician",
        "role": "clinician",
    },
    {
        "username": "testradiographer",
        "email": "testradiographer@relaypacs.local",
        "password": "testradiographer@123",
        "full_name": "Test Radiographer",
        "role": "radiographer",
    },
    {
        "username": "testclinic",
        "email": "testclinic@relaypacs.local",
        "password": "testclinic@123",
        "full_name": "Test Clinic User",
        "role": "clinician",
    },
    {
        "username": "testradiologist",
        "email": "testradiologist@relaypacs.local",
        "password": "testradiologist@123",
        "full_name": "Test Radiologist",
        "role": "radiologist",
    },
]

for user_data in TEST_USERS:
    # Check if user already exists
    existing = db.query(User).filter(User.username == user_data["username"]).first()
    if existing:
        print(f"  ⊙ User '{user_data['username']}' already exists, skipping")
        continue

    # Create user with hashed password
    user = User(
        username=user_data["username"],
        email=user_data["email"],
        hashed_password=hash_password(user_data["password"]),
        full_name=user_data["full_name"],
        role=user_data["role"],
    )
    db.add(user)
    print(f"  ✓ Created user: {user_data['username']} ({user_data['role']})")

db.commit()
db.close()

print("\n✓ Database initialization complete!")
print("\nTest users available:")
for user in TEST_USERS:
    print(f"  • {user['username']} / {user['password']}")
