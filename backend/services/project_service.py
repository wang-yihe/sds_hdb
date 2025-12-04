from repository.project_repository import ProjectRepository
from schemas.project_schema import ProjectCreate, ProjectUpdate
from models.project_model import Project
from typing import List, Optional

class ProjectService:
    
    @staticmethod
    async def create_project(project_data: ProjectCreate, owner_id: str) -> Project:
        try:
            return await ProjectRepository.create_project(
                name=project_data.name,
                description=project_data.description,
                owner_id=owner_id
            )
        except Exception as e:
            raise e
    
    @staticmethod
    async def get_project(project_id: str) -> Optional[Project]:
        try:
            return await ProjectRepository.get_project_by_id(project_id)
        except Exception as e:
            raise e
    
    @staticmethod
    async def get_user_projects(user_id: str) -> List[Project]:
        try:
            return await ProjectRepository.get_projects_by_user_id(user_id)
        except Exception as e:
            raise e
    
    @staticmethod
    async def update_project(project_id: str, project_data: ProjectUpdate) -> Optional[Project]:
        try:
            update_dict = project_data.model_dump(exclude_unset=True)
            return await ProjectRepository.update_project(
                project_id=project_id,
                **update_dict  # Unpack the dict to pass as kwargs
            )
        except Exception as e:
            raise e
    
    @staticmethod
    async def delete_project(project_id: str) -> bool:
        try:
            return await ProjectRepository.delete_project(project_id)
        except Exception as e:
            raise e
    
    @staticmethod
    async def add_collaborator(project_id: str, email: str) -> Optional[Project]:
        try:
            return await ProjectRepository.add_collaborator_by_email(project_id, email)
        except Exception as e:
            raise e
    
    @staticmethod
    async def remove_collaborator(project_id: str, email: str) -> Optional[Project]:
        try:
            return await ProjectRepository.remove_collaborator_by_email(project_id, email)
        except Exception as e:
            raise e