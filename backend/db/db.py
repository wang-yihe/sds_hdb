from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient   
import os

#import models
from models.user import User
from models.canvas import Canvas

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "user_management_db")

document_models = [
    User,
    Canvas,
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
    Canvas = Canvas
    
db = DB()
