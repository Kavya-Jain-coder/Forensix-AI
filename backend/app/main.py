from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import api
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Forensix AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api.router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)