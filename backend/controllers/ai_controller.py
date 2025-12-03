from services.ai_service import AIService
from schemas.ai_schema import AnalyzeBody, DragPlaceBody, GenerateAllSmartBody, MaskFromGreenBody, PreviewMaskBody, Stage1Body, Stage2Body, Stage3Body
from fastapi import HTTPException, status

class AIController:
    @staticmethod
    async def analyze_inputs(body: AnalyzeBody):
        try:
            return await AIService.analyze_inputs(body)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error analyzing inputs: {str(e)}"
            )
        
    @staticmethod
    async def stage1(body: Stage1Body):
        try:
            return await AIService.stage1(body)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error in stage 1 processing: {str(e)}"
            )
    
    @staticmethod
    async def stage2(body: Stage2Body):
        try:
            return await AIService.stage2(body)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error in stage 2 processing: {str(e)}"
            )
            
    @staticmethod
    async def stage3(body: Stage3Body):
        try:
            return await AIService.stage3(body)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error in stage 3 processing: {str(e)}"
            )
            
    @staticmethod
    async def generate_all_smart(body: GenerateAllSmartBody):
        try:
            return await AIService.generate_all_smart(body)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error generating all smart: {str(e)}"
            )
            
    @staticmethod
    async def drag_place_plant(body: DragPlaceBody):
        try:
            return await AIService.drag_place_plant(body)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error in drag and place plant: {str(e)}"
            )
            
    @staticmethod
    async def get_file(name: str):
        try:
            return await AIService.get_file(name)
        except FileNotFoundError as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error retrieving file: {str(e)}"
            )
            
    @staticmethod
    async def preview_mask(body: PreviewMaskBody):
        try:
            return await AIService.preview_mask(body)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error generating preview mask: {str(e)}"
            )
            
    @staticmethod
    async def mask_from_green(body: MaskFromGreenBody):
        try:
            return await AIService.mask_from_green(body)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error generating masks from green overlay: {str(e)}"
            )
            
