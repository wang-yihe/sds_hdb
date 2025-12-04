from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient   

#import models
from models.user_model import User
from models.project_model import Project
# from models.canvas import Canvas

from core.config import get_settings

MONGODB_URL = get_settings().mongodb_url
DATABASE_NAME = get_settings().database_name

document_models = [
    User,
    Project,
    #Canvas,
    ]

#Connection functions

async def connect_to_db():
    global client, database

    try: 
        client = AsyncIOMotorClient(MONGODB_URL)
        database = client[DATABASE_NAME]

        await init_beanie(
            database=database, #type: ignore 
            document_models=document_models
            )
        print(f"Connected to MongoDB: {DATABASE_NAME}")
        print(f"Initialized {len(document_models)} models")

    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        raise
    
async def close_db_connection():
    global client
    if client:
        client.close()
        print("MongoDB connection closed")
        
class DB: 
    User = User
    Project = Project
    # Canvas = Canvas
    
db = DB()
