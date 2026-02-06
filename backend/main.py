from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app import models
from app.routers import chat, upload, plans, memos

# Create Database Tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Tutor Backend")

# CORS Configuration
origins = [
    "http://localhost:9000",
    "http://127.0.0.1:9000",
    "http://192.168.10.101:9000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(plans.router, prefix="/api/plans", tags=["plans"])
app.include_router(memos.router, prefix="/api/memos", tags=["memos"])

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "AI Tutor Backend is running"}

@app.get("/")
def root():
    return {"message": "AI Tutor Backend is running. Access /docs for API documentation."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
