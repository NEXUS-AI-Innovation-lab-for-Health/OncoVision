import os
import dotenv
import tempfile
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.sql.connection import SQLConnection, SQLCredentials
from database.s3.connection import S3Connection, S3Credentials
from database.mongo.connection import MongoConnection, MongoCredentials

import models as _ # Load models

# Import controllers
from controllers.viewer import ViewerController
from controllers.patient import PatientController

# Import startup utilities
from utils.startup import auto_register_images, create_fake_patients

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

# Exemple de fonction upload_image modifiée (à placer dans controllers/viewer.py)
def upload_image(content):
    try:
        # Utilise tempfile pour créer un fichier temporaire valide
        with tempfile.NamedTemporaryFile(delete=False, suffix=".svs") as temp_file:
            temp_path = Path(temp_file.name)
            temp_path.write_bytes(content)
        print(f"Fichier temporaire créé : {temp_path}")
        return temp_path
    except Exception as e:
        print(f"Erreur lors de l'écriture du fichier temporaire : {e}")
        raise

routers = [
    ViewerController(s3_connection),
]

# Initialize PatientController
patient_controller = PatientController()
routers.append(patient_controller)

# Auto-register images from the images directory at startup
images_dir = Path(__file__).parent.parent / "images"
print(f"\n[startup] Auto-registering images from: {images_dir}")
viewer_controller = routers[0]  # Get the ViewerController instance
image_map = auto_register_images(viewer_controller.registry, images_dir, debug=True)

if image_map:
    print(f"\n[startup] Successfully registered {len(image_map)} images:")
    for filename, image_id in image_map.items():
        print(f"  - {filename} → {image_id}")
else:
    print(f"[startup] No images registered from {images_dir}")

# Create fake patients with the registered image IDs
patients = create_fake_patients(image_map)
patient_controller.set_patients(patients)
print(f"\n[startup] Created {len(patients)} patients with valid image IDs")

for router in routers:
    app.include_router(router)
    print(f"Router '{router.prefix}' included.")
print(f"Total of {len(routers)} routers included.")

if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host=host, port=port, reload=dev_env)
