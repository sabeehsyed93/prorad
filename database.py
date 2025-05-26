from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database engine
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logger.warning("No DATABASE_URL found in environment, falling back to SQLite")
    DATABASE_URL = "sqlite:///./radiology_reports.db"

# Log database type without exposing credentials
try:
    db_type = DATABASE_URL.split(":")[0]
    logger.info(f"Initializing database connection to: {db_type}")
except Exception as e:
    logger.warning(f"Could not parse DATABASE_URL: {str(e)}")

# Handle PostgreSQL database URLs
if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        logger.info("Converting postgres:// URL to postgresql:// format")
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    if "postgresql" in DATABASE_URL:
        logger.info("Using PostgreSQL database")
    else:
        logger.info("Using SQLite database")
else:
    logger.info("Using SQLite database")

# Configure SQLAlchemy engine with connection pooling and retry settings
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Enable connection health checks
    pool_recycle=1800,  # Recycle connections after 30 minutes
    echo=False  # Disable duplicate SQL logging
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

# Define models
class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    raw_transcription = Column(Text)
    processed_text = Column(Text)
    template_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Create tables
def create_tables():
    try:
        # Test the database connection first
        with engine.connect() as conn:
            logger.info("Database connection test successful")
        
        # Create tables
        Base.metadata.create_all(bind=engine)
        logger.info("Successfully created database tables")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")
        
        # Don't crash the application in production, just log the error
        if os.getenv("ENVIRONMENT") == "production" or os.getenv("RAILWAY_ENVIRONMENT"):
            logger.warning("Running in production environment, continuing despite database error")
        else:
            # In development, raise the error for debugging
            raise

# Get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
