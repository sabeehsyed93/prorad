import os
import json
import logging
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import database and reports modules
from database import create_tables, get_db
import reports

# Load environment variables
load_dotenv()

# Initialize Gemini API
# Initialize Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("Warning: GEMINI_API_KEY not found in environment variables")

# Initialize FastAPI app
app = FastAPI(title="Radiology Transcription API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the reports router
app.include_router(reports.router, tags=["reports"])

# Initialize database tables
try:
    create_tables()
    logger.info("Database tables created successfully")
except Exception as e:
    logger.error(f"Error creating database tables: {str(e)}")
    # Don't raise the error here, let the app start even if tables exist

class ProcessTextRequest(BaseModel):
    text: str
    template_name: Optional[str] = None

class Template(BaseModel):
    name: str
    content: str

# In-memory template storage (replace with database in production)
templates = {
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

# Routes
@app.get("/")
async def root():
    return {"message": "Radiology Transcription API is running"}

@app.post("/process")
async def process_text(request: ProcessTextRequest, db: Session = Depends(get_db)):
    """Process transcribed text with Gemini API and save to database"""
    try:
        if not GEMINI_API_KEY:
            logger.error("Gemini API key not configured")
            raise HTTPException(status_code=500, detail="Gemini API key not configured")
        
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
        if request.template_name and request.template_name in templates:
            template_content = templates[request.template_name]
        
        # Prepare prompt for Gemini
        prompt = f"""
        You are an expert radiologist writing a radiology report. Convert the following transcribed speech into a professional report.

        Instructions:
        1. Remove speech artifacts (um, uh, pauses, repetitions)
        2. Write in clear, natural prose paragraphs without bullet points or section headers
        3. Use standard medical terminology
        4. Be concise and clear
        5. If something is not mentioned, simply state it as normal (e.g., "Normal bones" instead of "Bones not mentioned, assume normal")
        6. Use precise measurements if provided
        7. Highlight any critical findings
        8. End with a brief impression
        9. Start directly with the findings - do not include any introductory text like "Here's a report..."

        Transcribed speech:
        {text}

        {"Use the following template structure:\n" + template_content if template_content else ""}

        Important: Write in a natural, flowing style as a radiologist would dictate. Avoid breaking the report into many sections.
        """
        
        try:
            # Call Gemini API
            model = genai.GenerativeModel('models/gemini-2.0-pro-exp')
            response = model.generate_content(prompt, generation_config={
                'temperature': 0.1,
                'top_p': 0.8,
                'top_k': 40
            })
            
            if not response or not hasattr(response, 'text'):
                print(f"Unexpected Gemini API response: {response}")
                return {"error": "Invalid response from Gemini API"}
                
            processed_text = response.text
        except Exception as e:
            print(f"Gemini API error: {str(e)}")
            return {"error": f"Error calling Gemini API: {str(e)}"}
        
        # Save the report to the database
        # Generate a title from the first line of the processed text or use a default
        title_lines = processed_text.strip().split('\n')
        title = next((line for line in title_lines if line.strip()), "Radiology Report")
        if len(title) > 50:  # Limit title length
            title = title[:47] + "..."
        
        # Create a new report
        new_report = reports.ReportCreate(
            title=title,
            raw_transcription=text,
            processed_text=processed_text,
            template_name=request.template_name
        )
        
        # Save to database
        db_report = reports.create_report(new_report, db)
        
        return {
            "processed_text": processed_text,
            "report_id": db_report.id
        }
    
    except Exception as e:
        print(f"Text processing error: {str(e)}")
        # Return a proper JSON response
        return {"error": f"Error processing text: {str(e)}"}
    finally:
        # Clean up any resources if needed
        pass

@app.get("/templates")
async def get_templates():
    """Get all available templates"""
    return {"templates": [{"name": k, "content": v} for k, v in templates.items()]}

@app.post("/templates")
async def add_template(template: Template):
    """Add a new template"""
    if template.name in templates:
        raise HTTPException(status_code=400, detail="Template already exists")
    templates[template.name] = template.content
    return {"message": f"Template '{template.name}' added successfully"}

@app.put("/templates/{template_name}")
async def update_template(template_name: str, template: Template):
    """Update an existing template"""
    if template_name not in templates:
        raise HTTPException(status_code=404, detail="Template not found")
    templates[template_name] = template.content
    return {"message": f"Template '{template_name}' updated successfully"}

@app.delete("/templates/{template_name}")
async def delete_template(template_name: str):
    """Delete a template"""
    if template_name not in templates:
        raise HTTPException(status_code=404, detail="Template not found")
    del templates[template_name]
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