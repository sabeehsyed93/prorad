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
# First try to construct URL from individual environment variables (Railway preferred method)
pg_host = os.getenv("PGHOST") or os.getenv("DB_HOST")
pg_port = os.getenv("PGPORT") or os.getenv("DB_PORT")
pg_user = os.getenv("PGUSER") or os.getenv("DB_USER")
pg_password = os.getenv("PGPASSWORD") or os.getenv("DB_PASSWORD")
pg_database = os.getenv("PGDATABASE") or os.getenv("DB_NAME")

# Log all environment variables for debugging
logger.info("Database-related environment variables:")
for key, value in os.environ.items():
    if any(db_key in key.upper() for db_key in ["PG", "DB_", "DATABASE"]):
        # Mask password
        if "PASSWORD" in key.upper() and value:
            masked_value = value[:2] + "*****" + value[-2:] if len(value) > 6 else "*****"
            logger.info(f"  {key}={masked_value}")
        else:
            logger.info(f"  {key}={value}")

# Check if we're in Railway environment
is_railway = bool(os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_PROJECT_ID"))
if is_railway:
    logger.info("Running in Railway environment")
    # Try to ping the PostgreSQL host to check connectivity
    if pg_host:
        import subprocess
        try:
            logger.info(f"Attempting to ping PostgreSQL host: {pg_host}")
            result = subprocess.run(["ping", "-c", "1", pg_host], 
                                  stdout=subprocess.PIPE, 
                                  stderr=subprocess.PIPE,
                                  timeout=5)
            if result.returncode == 0:
                logger.info(f"Successfully pinged {pg_host}")
            else:
                logger.warning(f"Failed to ping {pg_host}: {result.stderr.decode()}")
        except Exception as e:
            logger.warning(f"Error pinging PostgreSQL host: {str(e)}")


# Check if we have all the individual components
if pg_host and pg_port and pg_user and pg_password and pg_database:
    # Construct the DATABASE_URL from individual components
    DATABASE_URL = f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_database}"
    logger.info(f"Using constructed PostgreSQL connection from individual environment variables")
    logger.info(f"Host: {pg_host}, Port: {pg_port}, Database: {pg_database}")
else:
    # Fall back to DATABASE_URL if provided
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        logger.warning("No database connection details found in environment, falling back to SQLite")
        DATABASE_URL = "sqlite:///./radiology_reports.db"
    else:
        # Log database type without exposing credentials
        try:
            db_type = DATABASE_URL.split(":")[0]
            logger.info(f"Initializing database connection from DATABASE_URL: {db_type}")
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
# Determine if we're using PostgreSQL or SQLite
is_postgres = "postgresql" in DATABASE_URL

# Set up engine with appropriate settings based on database type
if is_postgres:
    # Handle Railway's internal vs external PostgreSQL access
    if is_railway and "postgres.railway.internal" in DATABASE_URL:
        # Try both internal and external URLs
        logger.info("Attempting to use Railway's internal PostgreSQL connection")
        
        # Also check for external URL as fallback
        external_url = os.getenv("DATABASE_PUBLIC_URL")
        if external_url:
            if external_url.startswith("postgres://"):
                external_url = external_url.replace("postgres://", "postgresql://", 1)
            logger.info("Found external DATABASE_PUBLIC_URL as fallback")
        
        # Try to use the internal URL first
        try:
            # PostgreSQL-specific settings with shorter timeouts for Railway internal networking
            engine = create_engine(
                DATABASE_URL,
                pool_pre_ping=True,  # Enable connection health checks
                pool_recycle=300,    # Recycle connections after 5 minutes
                connect_args={
                    'connect_timeout': 5,  # Shorter connection timeout for internal network
                    'application_name': 'rad_transcription',
                    'keepalives': 1,
                    'keepalives_idle': 30,
                    'keepalives_interval': 10,
                    'keepalives_count': 5
                },
                pool_size=2,         # Smaller pool for Railway
                max_overflow=3,
                pool_timeout=5,
                echo=False
            )
            
            # Test the connection immediately
            with engine.connect() as conn:
                conn.execute("SELECT 1")
                logger.info("Successfully connected to Railway internal PostgreSQL")
        except Exception as e:
            logger.warning(f"Failed to connect to Railway internal PostgreSQL: {str(e)}")
            
            # Fall back to external URL if available
            if external_url:
                logger.info("Falling back to external DATABASE_PUBLIC_URL")
                try:
                    engine = create_engine(
                        external_url,
                        pool_pre_ping=True,
                        pool_recycle=300,
                        connect_args={
                            'connect_timeout': 10,
                            'application_name': 'rad_transcription',
                            'keepalives': 1,
                            'keepalives_idle': 30,
                            'keepalives_interval': 10,
                            'keepalives_count': 5
                        },
                        pool_size=2,
                        max_overflow=3,
                        pool_timeout=10,
                        echo=False
                    )
                    # Test the connection
                    with engine.connect() as conn:
                        conn.execute("SELECT 1")
                        logger.info("Successfully connected to Railway external PostgreSQL")
                        # Store that we're using the external URL
                        logger.info("Using external PostgreSQL URL for all future connections")
                        # We don't need to modify the global DATABASE_URL as we've already created the engine
                except Exception as ex:
                    logger.error(f"Failed to connect to Railway external PostgreSQL: {str(ex)}")
                    # Fall back to SQLite if both connection methods fail
                    logger.warning("Falling back to SQLite as last resort")
                    DATABASE_URL = "sqlite:///./radiology_reports.db"
                    engine = create_engine(
                        DATABASE_URL,
                        connect_args={'check_same_thread': False},
                        echo=False
                    )
            else:
                # No external URL available, fall back to SQLite
                logger.warning("No external DATABASE_PUBLIC_URL available, falling back to SQLite")
                DATABASE_URL = "sqlite:///./radiology_reports.db"
                engine = create_engine(
                    DATABASE_URL,
                    connect_args={'check_same_thread': False},
                    echo=False
                )
    else:
        # Standard PostgreSQL settings for non-Railway or when using external URL directly
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,  # Enable connection health checks
            pool_recycle=300,    # Recycle connections after 5 minutes
            connect_args={
                'connect_timeout': 10,  # Connection timeout
                'application_name': 'rad_transcription',  # Identify our app in PostgreSQL logs
                'keepalives': 1,       # Enable TCP keepalives
                'keepalives_idle': 30, # Seconds before sending keepalive
                'keepalives_interval': 10, # Seconds between keepalives
                'keepalives_count': 5   # Max number of keepalives
            },
            pool_size=3,
            max_overflow=5,
            pool_timeout=10,
            echo=False
        )
        logger.info("Configured PostgreSQL engine with standard settings")
else:
    # SQLite settings
    engine = create_engine(
        DATABASE_URL,
        connect_args={'check_same_thread': False},  # Allow multi-threading with SQLite
        echo=False
    )
    logger.info("Configured SQLite engine")

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
    max_retries = 5  # Increase max retries
    retry_delay = 3  # Start with shorter initial delay
    
    # Check if we're in Railway environment
    is_railway = bool(os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_PROJECT_ID"))
    
    # For Railway, we'll try a different approach if using postgres.railway.internal
    if is_railway and is_postgres:
        logger.info("Detected Railway environment with PostgreSQL")
        
        # Try to create tables with a more resilient approach for Railway
        for attempt in range(max_retries):
            try:
                # First check if we can connect at all
                with engine.connect() as conn:
                    # Just run a simple query to verify connection
                    conn.execute("SELECT 1")
                    logger.info(f"PostgreSQL connection verified on attempt {attempt + 1}")
                
                # If connection succeeded, create tables
                Base.metadata.create_all(bind=engine)
                logger.info("Successfully created database tables")
                return True
            except Exception as e:
                error_msg = str(e)
                logger.error(f"Error creating database tables (attempt {attempt + 1}/{max_retries}): {error_msg}")
                
                # Check for specific timeout errors
                if "timeout" in error_msg.lower() or "timed out" in error_msg.lower():
                    logger.warning("Detected timeout error with Railway PostgreSQL")
                    
                    # If we're using postgres.railway.internal and getting timeouts,
                    # we might need to use the public URL instead
                    if "postgres.railway.internal" in DATABASE_URL and os.getenv("DATABASE_PUBLIC_URL"):
                        logger.info("Attempting to use DATABASE_PUBLIC_URL instead of internal hostname")
                        # This is just a test connection - we don't modify the global engine
                        # as that would require recreating the SessionLocal
                        try:
                            public_url = os.getenv("DATABASE_PUBLIC_URL")
                            test_engine = create_engine(public_url, connect_args={'connect_timeout': 5})
                            with test_engine.connect() as test_conn:
                                test_conn.execute("SELECT 1")
                                logger.info("Public URL connection successful")
                                logger.warning("Consider updating your configuration to use DATABASE_PUBLIC_URL")
                        except Exception as public_e:
                            logger.error(f"Public URL connection also failed: {str(public_e)}")
                
                if attempt < max_retries - 1:
                    import time
                    logger.info(f"Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    # Increase delay for next attempt (exponential backoff with cap)
                    retry_delay = min(retry_delay * 1.5, 15)  # Cap at 15 seconds
                else:
                    # Final attempt failed
                    logger.warning("All database connection attempts failed")
                    
                    # Don't crash in production
                    if is_railway or os.getenv("ENVIRONMENT") == "production":
                        logger.warning("Running in production environment, continuing despite database error")
                        return False
                    else:
                        # In development, raise the error for debugging
                        raise
    else:
        # Standard approach for non-Railway environments or SQLite
        try:
            # Create tables directly
            Base.metadata.create_all(bind=engine)
            logger.info("Successfully created database tables")
            return True
        except Exception as e:
            logger.error(f"Error creating database tables: {str(e)}")
            
            # Don't crash in production
            if os.getenv("ENVIRONMENT") == "production":
                logger.warning("Running in production environment, continuing despite database error")
                return False
            else:
                # In development, raise the error for debugging
                raise
    
    return False

# Get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
