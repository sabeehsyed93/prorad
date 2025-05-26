import os
import json
import logging
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import anthropic
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import database and reports modules
from database import create_tables, get_db, SessionLocal, Template as DBTemplate, Report
import reports

# Load environment variables
load_dotenv()

# Initialize Claude API (debug mode)
logger.info("Starting API key configuration...")
logger.info(f"Current working directory: {os.getcwd()}")

# List environment variable keys for debugging (without showing values for security)
env_var_keys = list(os.environ.keys())
logger.info(f"Available environment variable keys: {env_var_keys}")

# Try multiple ways to get the API key
CLAUDE_API_KEY = ""

# Check for various possible environment variable names
possible_env_vars = [
    "ANTHROPIC_API_KEY",  # Primary key name
    "CLAUDE_API_KEY",     # Alternative key name
    "GEMINI_API_KEY"      # Fallback to the old key name
]

# Try each possible environment variable
for var_name in possible_env_vars:
    api_key = os.getenv(var_name, "")
    if api_key:
        CLAUDE_API_KEY = api_key
        logger.info(f"Found API key in environment variable: {var_name}")
        break

logger.info(f"Final API key status - exists: {bool(CLAUDE_API_KEY)}, length: {len(CLAUDE_API_KEY) if CLAUDE_API_KEY else 0}")

# Initialize Claude client
if CLAUDE_API_KEY:
    logger.info("Configuring Claude API with provided key")
    if len(CLAUDE_API_KEY) >= 4:
        logger.info(f"Key starts with: {CLAUDE_API_KEY[:4]}...")
    claude_client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)
else:
    logger.error("No API key found in any of the expected environment variables")

# Initialize FastAPI app
app = FastAPI(title="Radiology Transcription API")

# Add CORS middleware
origins = [
    "http://localhost:3000",  # Local development
    "https://radiant-fairy-eb4441.netlify.app",  # Production frontend
    "http://localhost:5173",  # Vite dev server
    "http://prorad.co.uk",  # Custom domain
    "https://prorad.co.uk",  # Custom domain (HTTPS)
    "www.prorad.co.uk",  # Custom domain with www
    "https://www.prorad.co.uk",  # Custom domain with www (HTTPS)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the reports router
app.include_router(reports.router, tags=["reports"])

# Initialize database tables
def init_db():
    retries = 3
    for attempt in range(retries):
        try:
            create_tables()
            logger.info("Database tables created successfully")
            return
        except Exception as e:
            if attempt == retries - 1:  # Last attempt
                logger.error("Failed to initialize database after %d attempts: %s", retries, str(e))
            else:
                logger.warning("Database initialization attempt %d failed: %s. Retrying...", attempt + 1, str(e))

# Default templates to initialize
default_templates = {
    "chest_xray": """
    # Chest X-ray Report Template
    
    ## Clinical Information
    [clinical_information]
    
    ## Technique
    [technique]
    
    ## Findings
    [findings]
    
    ## Impression
    [impression]
    """,
    "abdominal_ct": """
    # Abdominal CT Report Template
    
    ## Clinical Information
    [clinical_information]
    
    ## Technique
    [technique]
    
    ## Findings
    ### Liver
    [liver_findings]
    
    ### Gallbladder and Biliary System
    [gallbladder_findings]
    
    ### Pancreas
    [pancreas_findings]
    
    ### Spleen
    [spleen_findings]
    
    ### Adrenal Glands
    [adrenal_findings]
    
    ### Kidneys and Ureters
    [kidney_findings]
    
    ### GI Tract
    [gi_findings]
    
    ### Vascular
    [vascular_findings]
    
    ### Other Findings
    [other_findings]
    
    ## Impression
    [impression]
    """
}

# Initialize templates in database
def init_templates(db: Session):
    for name, content in default_templates.items():
        existing = db.query(DBTemplate).filter(DBTemplate.name == name).first()
        if not existing:
            template = DBTemplate(name=name, content=content)
            db.add(template)
    try:
        db.commit()
    except Exception as e:
        logger.warning(f"Error committing templates to database: {str(e)}")
        logger.warning("Continuing without initializing templates")

# Try to initialize the database and templates
try:
    # First try to create tables
    try:
        create_tables()
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {str(e)}")
        logger.warning("Application will continue but database functionality may be limited")
    
    # Then try to initialize templates
    try:
        with SessionLocal() as db:
            init_templates(db)
            logger.info("Successfully initialized default templates")
    except Exception as e:
        logger.warning(f"Error initializing default templates: {str(e)}")
        logger.warning("Continuing without initializing templates")
except Exception as e:
    logger.error(f"Critical database initialization error: {str(e)}")
    logger.warning("Application will start with limited functionality")

class ProcessTextRequest(BaseModel):
    text: str
    template_name: Optional[str] = None

class Template(BaseModel):
    name: str
    content: str
    
    class Config:
        from_attributes = True

# Default templates to add if none exist
default_templates = {
    "chest_xray": """
    # Chest X-ray Report Template
    
    ## Clinical Information
    [clinical_information]
    
    ## Technique
    [technique]
    
    ## Findings
    [findings]
    
    ## Impression
    [impression]
    """,
    "abdominal_ct": """
    # Abdominal CT Report Template
    
    ## Clinical Information
    [clinical_information]
    
    ## Technique
    [technique]
    
    ## Findings
    ### Liver
    [liver_findings]
    
    ### Gallbladder and Biliary System
    [gallbladder_findings]
    
    ### Pancreas
    [pancreas_findings]
    
    ### Spleen
    [spleen_findings]
    
    ### Adrenal Glands
    [adrenal_findings]
    
    ### Kidneys and Ureters
    [kidney_findings]
    
    ### GI Tract
    [gi_findings]
    
    ### Vascular
    [vascular_findings]
    
    ### Other Findings
    [other_findings]
    
    ## Impression
    [impression]
    """
}

# Initialize default templates in database
def init_templates(db: Session):
    for name, content in default_templates.items():
        existing = db.query(DBTemplate).filter(DBTemplate.name == name).first()
        if not existing:
            template = DBTemplate(name=name, content=content)
            db.add(template)
    db.commit()

# Routes
@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/")
async def root():
    return {"message": "Radiology Transcription API is running"}

@app.post("/process")
async def process_text(request: ProcessTextRequest, db: Session = Depends(get_db)):
    """Process transcribed text with Claude API and save to database"""
    try:
        logger.info(f"Processing text request. API Key present: {bool(CLAUDE_API_KEY)}")
        if not CLAUDE_API_KEY:
            logger.error("Claude API key not configured")
            raise HTTPException(status_code=500, detail="Claude API key not configured")
        logger.info("API key validation passed, proceeding with request")
        
        # Preprocess the transcribed text
        text = request.text
        
        # Convert spoken punctuation to symbols
        print("Original text:", text)
        text = " " + text.lower() + " "  # Add spaces to help with word boundaries
        print("After adding spaces:", text)
        
        punctuation_map = {
            "full stop": ".",
            "period": ".",
            "comma": ",",
            "exclamation mark": "!",
            "question mark": "?",
            "colon": ":",
            "semicolon": ";",
            "new line": "\n",
            "newline": "\n",
            "new paragraph": "\n\n"
        }
        
        # Case-insensitive replacement
        for spoken, symbol in punctuation_map.items():
            old_text = text
            text = text.replace(f" {spoken} ", f"{symbol} ")
            if old_text != text:
                print(f"Replaced '{spoken}' with '{symbol}'")
        
        text = text.strip()  # Remove the extra spaces we added
        print("Final text:", text)
        
        template_content = ""
        if request.template_name:
            # Get template from database
            db_template = db.query(DBTemplate).filter(DBTemplate.name == request.template_name).first()
            if db_template:
                template_content = db_template.content
        
        # Prepare template instruction if template exists
        template_instruction = f"\nUse the following template structure:\n{template_content}" if template_content else ""
        
        # Create system prompt for Claude
        system_prompt = """You are an expert radiologist writing a radiology report. Convert transcribed speech into a professional report.
        Follow these guidelines:
        - Remove speech artifacts (um, uh, pauses, repetitions)
        - Write in clear, natural prose paragraphs
        - Use standard medical terminology
        - Be concise and clear
        - If something is not mentioned, state it as normal
        - Use precise measurements if provided
        - Highlight any critical findings
        - End with a brief impression
        - Start directly with the findings"""
        
        # Create user prompt with the transcribed text
        user_prompt = f"""Here is the transcribed speech to convert into a professional radiology report:

{text}{template_instruction}

Please write in a natural, flowing style as a radiologist would dictate. Avoid breaking the report into many sections."""
        
        try:
            # Call Claude API
            logger.info("Calling Claude API with prompt")
            
            # Add a small delay to avoid rate limits
            import time
            time.sleep(0.2)  # 200ms delay
            
            # Create a message using Claude's Messages API
            response = claude_client.messages.create(
                model="claude-sonnet-4-20250514",  # Using Claude Sonnet 4
                max_tokens=1024,
                temperature=0.1,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            # Extract the response text
            if not response or not hasattr(response, 'content') or not response.content:
                error_msg = f"Unexpected Claude API response: {response}"
                logger.error(error_msg)
                raise HTTPException(status_code=500, detail=error_msg)
            
            # Extract text from the response content
            processed_text = ""
            for content_block in response.content:
                if hasattr(content_block, 'text'):
                    processed_text += content_block.text
            
            logger.info("Successfully processed text with Claude API")
        except Exception as e:
            error_msg = f"Error calling Claude API: {str(e)}"
            logger.error(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)
        
        # Save the report to the database
        # Generate a title from the first line of the processed text or use a default
        title_lines = processed_text.strip().split('\n')
        title = next((line for line in title_lines if line.strip()), "Radiology Report")
        if len(title) > 50:  # Limit title length
            title = title[:47] + "..."
        
        report_id = None
        
        # Try to save to database, but continue even if it fails
        try:
            # Create a new report
            db_report = Report(
                title=title,
                raw_transcription=text,
                processed_text=processed_text,
                template_name=request.template_name
            )
            
            # Save to database
            db.add(db_report)
            db.commit()
            db.refresh(db_report)
            report_id = db_report.id
            logger.info(f"Successfully saved report to database with ID: {report_id}")
        except Exception as e:
            logger.error(f"Failed to save report to database: {str(e)}")
            logger.warning("Continuing without saving to database")
        
        return {
            "processed_text": processed_text,
            "report_id": report_id
        }
    
    except Exception as e:
        print(f"Text processing error: {str(e)}")
        # Return a proper JSON response
        return {"error": f"Error processing text: {str(e)}"}
    finally:
        # Clean up any resources if needed
        pass

@app.get("/templates", response_model=list[Template])
async def get_templates(db: Session = Depends(get_db)):
    """Get all available templates"""
    templates = db.query(DBTemplate).all()
    return [Template(name=t.name, content=t.content) for t in templates]

@app.post("/templates", response_model=Template)
async def add_template(template: Template, db: Session = Depends(get_db)):
    """Add a new template"""
    existing = db.query(DBTemplate).filter(DBTemplate.name == template.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Template already exists")
    db_template = DBTemplate(name=template.name, content=template.content)
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return Template(name=db_template.name, content=db_template.content)

@app.put("/templates/{template_name}")
async def update_template(template_name: str, template: Template, db: Session = Depends(get_db)):
    """Update an existing template"""
    db_template = db.query(DBTemplate).filter(DBTemplate.name == template_name).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    db_template.content = template.content
    db.commit()
    return {"message": f"Template '{template_name}' updated successfully"}

@app.delete("/templates/{template_name}")
async def delete_template(template_name: str, db: Session = Depends(get_db)):
    """Delete a template"""
    db_template = db.query(DBTemplate).filter(DBTemplate.name == template_name).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(db_template)
    db.commit()
    return {"message": f"Template '{template_name}' deleted successfully"}

@app.get("/recent-reports/")
async def get_recent_reports(limit: int = 10, db: Session = Depends(get_db)):
    """Get the most recent reports"""
    try:
        recent_reports = reports.get_reports(skip=0, limit=limit, db=db)
        return {
            "reports": [
                {
                    "id": report.id,
                    "title": report.title,
                    "created_at": report.created_at,
                    "template_name": report.template_name
                } for report in recent_reports
            ]
        }
    except Exception as e:
        print(f"Error fetching recent reports: {str(e)}")
        return {"error": f"Error fetching recent reports: {str(e)}"}

@app.get("/reports/{report_id}")
async def get_report_by_id(report_id: int, db: Session = Depends(get_db)):
    """Get a specific report by ID"""
    try:
        report = reports.get_report(report_id, db)
        return {
            "report": {
                "id": report.id,
                "title": report.title,
                "raw_transcription": report.raw_transcription,
                "processed_text": report.processed_text,
                "template_name": report.template_name,
                "created_at": report.created_at,
                "updated_at": report.updated_at
            }
        }
    except Exception as e:
        print(f"Error fetching report: {str(e)}")
        return {"error": f"Error fetching report: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app",host="0.0.0.0", port=8000, reload=True)