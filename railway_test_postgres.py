#!/usr/bin/env python3
import os
import sys
import time
import logging
import socket
import json
from sqlalchemy import create_engine, text

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("postgres_test")

def test_network_connectivity(host, port):
    """Test if we can reach the host and port"""
    logger.info(f"Testing network connectivity to {host}:{port}...")
    try:
        # Create a socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)  # 10 second timeout
        
        # Try to connect
        result = sock.connect_ex((host, port))
        if result == 0:
            logger.info(f"Successfully connected to {host}:{port}")
            return True
        else:
            logger.error(f"Failed to connect to {host}:{port}, error code: {result}")
            return False
    except socket.gaierror:
        logger.error(f"Address-related error for {host}:{port}")
        return False
    except socket.error as e:
        logger.error(f"Socket error for {host}:{port}: {e}")
        return False
    finally:
        sock.close()

def test_postgres_connection(url):
    """Test PostgreSQL connection using SQLAlchemy"""
    # Hide password in logs
    safe_url = url
    if '@' in url:
        parts = url.split('@')
        credentials = parts[0].split(':')
        if len(credentials) > 2:
            safe_url = f"{credentials[0]}:{credentials[1]}:***@{parts[1]}"
    
    logger.info(f"Testing PostgreSQL connection to {safe_url}")
    try:
        # Create engine
        engine = create_engine(
            url,
            connect_args={'connect_timeout': 10},
            pool_pre_ping=True
        )
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).scalar()
            logger.info(f"Connection successful! Query result: {result}")
            return True
    except Exception as e:
        logger.error(f"Connection failed: {str(e)}")
        return False

def main():
    """Main function to test PostgreSQL connections"""
    logger.info("Starting PostgreSQL connection tests")
    
    # Print all environment variables for debugging
    logger.info("Environment variables:")
    env_vars = {k: v if 'password' not in k.lower() and 'secret' not in k.lower() else '***' 
               for k, v in os.environ.items()}
    logger.info(json.dumps(env_vars, indent=2))
    
    # Test internal connection
    logger.info("Testing connection to postgres.railway.internal")
    test_network_connectivity("postgres.railway.internal", 5432)
    
    # Check for DATABASE_URL environment variable
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        logger.info("Found DATABASE_URL environment variable")
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
            logger.info("Converted postgres:// to postgresql://")
        
        # Parse the URL to get host and port
        try:
            parts = database_url.split("@")[1].split("/")[0].split(":")
            host = parts[0]
            port = int(parts[1]) if len(parts) > 1 else 5432
            
            # Test network connectivity
            if test_network_connectivity(host, port):
                # Test actual PostgreSQL connection
                test_postgres_connection(database_url)
            else:
                logger.warning(f"Network connectivity test failed to {host}:{port}")
        except Exception as e:
            logger.error(f"Error parsing DATABASE_URL: {str(e)}")
    else:
        logger.warning("DATABASE_URL environment variable not found")
    
    # Check for DATABASE_PUBLIC_URL environment variable
    public_url = os.getenv("DATABASE_PUBLIC_URL")
    if public_url:
        logger.info("Found DATABASE_PUBLIC_URL environment variable")
        if public_url.startswith("postgres://"):
            public_url = public_url.replace("postgres://", "postgresql://", 1)
            logger.info("Converted postgres:// to postgresql://")
        
        # Parse the URL to get host and port
        try:
            parts = public_url.split("@")[1].split("/")[0].split(":")
            host = parts[0]
            port = int(parts[1]) if len(parts) > 1 else 5432
            
            # Test network connectivity
            if test_network_connectivity(host, port):
                # Test actual PostgreSQL connection
                test_postgres_connection(public_url)
            else:
                logger.warning(f"Network connectivity test failed to {host}:{port}")
        except Exception as e:
            logger.error(f"Error parsing DATABASE_PUBLIC_URL: {str(e)}")
    else:
        logger.warning("DATABASE_PUBLIC_URL environment variable not found")
    
    # Check for individual PostgreSQL environment variables
    pg_host = os.getenv("PGHOST")
    pg_port = os.getenv("PGPORT", "5432")
    pg_user = os.getenv("PGUSER")
    pg_password = os.getenv("PGPASSWORD")
    pg_database = os.getenv("PGDATABASE")
    
    if pg_host and pg_user and pg_password and pg_database:
        logger.info(f"Found individual PostgreSQL environment variables: PGHOST={pg_host}, PGPORT={pg_port}")
        
        # Test network connectivity
        if test_network_connectivity(pg_host, int(pg_port)):
            # Construct connection URL
            constructed_url = f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_database}"
            # Test actual PostgreSQL connection
            test_postgres_connection(constructed_url)
        else:
            logger.warning(f"Network connectivity test failed to {pg_host}:{pg_port}")
    else:
        logger.warning("Individual PostgreSQL environment variables not found or incomplete")
    
    logger.info("PostgreSQL connection tests completed")

if __name__ == "__main__":
    main()
