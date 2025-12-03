from fastapi import APIRouter, Query
from typing import List
from controllers.ai_controller import AIController
from schemas.ai_schema import PromptItem, AnalyzeBody, Stage1Body, Stage2Body, Stage3Body, GenerateAllSmartBody, MaskFromGreenBody

@app.post("/register", response_model=UserResponse, status_code=201)
async def register(user_data: UserCreate):
    return await controller.create_user(user_data)

