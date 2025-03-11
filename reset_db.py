from database import Base, engine, get_db, Template as DBTemplate
from main import default_templates

# Drop all tables
Base.metadata.drop_all(bind=engine)

# Create all tables
Base.metadata.create_all(bind=engine)

# Initialize default templates
def init_templates():
    db = next(get_db())
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
