import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, Template as DBTemplate
from main import default_templates

# Get DATABASE_URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create engine
engine = create_engine(DATABASE_URL if DATABASE_URL else "sqlite:///./radiology_reports.db")

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Get database session
def get_db():
    return SessionLocal()

# Drop all tables
Base.metadata.drop_all(bind=engine)

# Create all tables
Base.metadata.create_all(bind=engine)

# Initialize default templates
def init_templates():
    db = get_db()
    try:
        # Check if templates already exist
        existing_templates = db.query(DBTemplate).all()
        if not existing_templates:
            # Add default templates
            for name, content in default_templates.items():
                db_template = DBTemplate(name=name, content=content)
                db.add(db_template)
            db.commit()
    except Exception as e:
        print(f"Error initializing templates: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("Initializing default templates...")
    init_templates()
    print("Done!")
