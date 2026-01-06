import os
import dotenv

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.sql.connection import SQLConnection, SQLCredentials
from database.s3.connection import S3Connection, S3Credentials
from database.mongo.connection import MongoConnection, MongoCredentials

import models as _ # Load models

# Import controllers
from controllers.viewer import ViewerController

# Load env. variables
dotenv.load_dotenv()
dev_env = os.getenv("ENVIRONMENT", "production").lower() == "dev"

print(f"Running as {'development' if dev_env else 'production'} environment.")

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

# Initialize sql database connections
sql_credentials = SQLCredentials(
    host=os.getenv("SQL_HOST", "localhost"),
    port=int(os.getenv("SQL_PORT", 3306)),
    user=os.getenv("SQL_USER", "user"),
    password=os.getenv("SQL_PASSWORD", "password"),
    name=os.getenv("SQL_DATABASE", "database"),
)
sql_connection = SQLConnection(sql_credentials)
try:
    sql_session = sql_connection.connect()
    print("SQL database connection established successfully.")
except Exception as e:
    print(f"Failed to establish SQL database connection: {e}")
    exit(1)

# Initialize s3 storage connection
# Setup S3 Connection
s3_credentials = S3Credentials(
    host=os.getenv("S3_HOST", "http://localhost"),
    port=int(os.getenv("S3_PORT", 9000)),
    user=os.getenv("S3_USER", "user"),
    password=os.getenv("S3_PASSWORD", "password"),
    region=os.getenv("S3_REGION", "us-east-1"),
)
s3_connection = None
try:
    s3_connection = S3Connection(s3_credentials)
    s3_session = s3_connection.get_session()
    s3_session.ls("/")
except Exception as e:
    print(f"Failed to establish S3 connection: {e}")
    exit(1)

# Initialize MongoDB connection
mongo_credentials = MongoCredentials(
    host=os.getenv("MONGO_HOST", "localhost"),
    port=int(os.getenv("MONGO_PORT", 27017)),
    user=os.getenv("MONGO_USER", "user"),
    password=os.getenv("MONGO_PASSWORD", "password"),
    database=os.getenv("MONGO_DATABASE", "database"),
)
mongo_connection = None
try:
    mongo_connection = MongoConnection(mongo_credentials)
    if mongo_connection.ping():
        print("MongoDB connection established successfully.")
    else:
        raise Exception("Ping to MongoDB server failed.")
except Exception as e:
    print(f"Failed to establish MongoDB connection: {e}")
    exit(1)

routers = [
    ViewerController(),
]
for router in routers:
    app.include_router(router)
    print(f"Router '{router.prefix}' included.")
print(f"Total of {len(routers)} routers included.")

if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host=host, port=port, reload=dev_env)