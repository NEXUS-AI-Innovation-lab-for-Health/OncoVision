import os
import dotenv
import logging

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.sql.connection import SQLConnection, SQLCredentials

# Configure logging
logging.basicConfig(level=logging.INFO)

# Load env. variables
dotenv.load_dotenv()
dev_env = os.getenv("ENVIRONMENT", "production").lower() == "dev"

logging.info(f"Running as {'development' if dev_env else 'production'} environment.")

# Initialize FastAPI app
app = FastAPI(
    docs_url="/docs" if dev_env else None,
    redoc_url="/redoc" if dev_env else None,
    openapi_url="/openapi.json" if dev_env else None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

if __name__ == "__main__":
    
    sql_credentials = SQLCredentials(
        host=os.getenv("SQL_HOST", "localhost"),
        port=int(os.getenv("SQL_PORT", 3306)),
        user=os.getenv("SQL_USER", "user"),
        password=os.getenv("SQL_PASSWORD", "password"),
        name=os.getenv("SQL_DATABASE", "database"),
    )

    sql_connection = SQLConnection(sql_credentials)
    try:
        sql_connection.connect()
        logging.info("Database connected successfully.")
    except Exception as e:
        logging.error(f"Failed to connect to the database: {e}")
        exit(1)

if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host=host, port=port, reload=dev_env)