from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db, Report

router = APIRouter()

# Pydantic models for request/response
class ReportBase(BaseModel):
    title: str
    raw_transcription: str
    processed_text: str
    template_name: Optional[str] = None

class ReportCreate(ReportBase):
    pass

class ReportResponse(ReportBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

# CRUD operations
@router.post("/reports/", response_model=ReportResponse)
def create_report(report: ReportCreate, db: Session = Depends(get_db)):
    # For now, we're not handling authentication, so we'll use a default user_id
    # In a real application, you would get the user_id from the authenticated user
    default_user_id = 1
    
    db_report = Report(
        title=report.title,
        raw_transcription=report.raw_transcription,
        processed_text=report.processed_text,
        template_name=report.template_name,
        user_id=default_user_id
    )
    
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    
    return db_report

@router.get("/reports/", response_model=List[ReportResponse])
def get_reports(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # For now, we're not handling authentication, so we'll return all reports
    # In a real application, you would filter by the authenticated user's ID
    reports = db.query(Report).offset(skip).limit(limit).all()
    return reports

@router.get("/reports/{report_id}", response_model=ReportResponse)
def get_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.put("/reports/{report_id}", response_model=ReportResponse)
def update_report(report_id: int, report: ReportCreate, db: Session = Depends(get_db)):
    db_report = db.query(Report).filter(Report.id == report_id).first()
    if db_report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Update report fields
    for key, value in report.dict().items():
        setattr(db_report, key, value)
    
    db.commit()
    db.refresh(db_report)
    
    return db_report

@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(report_id: int, db: Session = Depends(get_db)):
    db_report = db.query(Report).filter(Report.id == report_id).first()
    if db_report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    
    db.delete(db_report)
    db.commit()
    
    return None
