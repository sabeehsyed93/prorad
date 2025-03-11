import os
from sqlalchemy import create_engine, text
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

def run_migration():
    # Create a session
    db = SessionLocal()
    try:
        # Check if reports table exists
        result = db.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reports')"))
        table_exists = result.scalar()
        
        if table_exists:
            # Modify reports table to make user_id nullable
            print("Making user_id nullable in reports table...")
            db.execute(text("ALTER TABLE reports ALTER COLUMN user_id DROP NOT NULL"))
            db.commit()
            print("Successfully made user_id nullable")
        else:
            # Create all tables if they don't exist
            print("Creating all tables...")
            Base.metadata.create_all(bind=engine)
            print("Successfully created tables")
            
            # Initialize default templates
            print("Initializing default templates...")
            existing_templates = db.query(DBTemplate).all()
            if not existing_templates:
                for name, content in default_templates.items():
                    db_template = DBTemplate(name=name, content=content)
                    db.add(db_template)
                db.commit()
                print("Successfully initialized templates")
            else:
                print("Templates already exist, skipping initialization")
                
    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
