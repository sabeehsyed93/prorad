from sqlalchemy import create_engine, text
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get database URL from environment - this should be Railway's PostgreSQL URL
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# Handle PostgreSQL database URLs
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create engine
engine = create_engine(DATABASE_URL)

def migrate():
    """Remove user_id column and users table from Railway's PostgreSQL database"""
    try:
        with engine.connect() as conn:
            # First drop the foreign key constraint
            logger.info("Dropping foreign key constraint...")
            conn.execute(text("ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_user_id_fkey;"))
            
            # Then drop the user_id column
            logger.info("Dropping user_id column...")
            conn.execute(text("ALTER TABLE reports DROP COLUMN IF EXISTS user_id;"))
            
            # Finally drop the users table
            logger.info("Dropping users table...")
            conn.execute(text("DROP TABLE IF EXISTS users;"))
            
            conn.commit()
            logger.info("Migration completed successfully")
            
        logger.info("Successfully removed user_id column and users table")
        return True
    except Exception as e:
        logger.error(f"Error during migration: {e}")
        return False

if __name__ == "__main__":
    migrate()
