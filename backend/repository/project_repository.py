from models.project_model import Project
from models.user_model import User
from bson.objectid import ObjectId
from typing import List, Optional
from datetime import datetime

class ProjectRepository:
    
    @staticmethod
    async def create_project(name: str, description: str, owner_id: str) -> Project:
        try:
            project = Project(
                name=name,
                description=description,
                owner_id=ObjectId(owner_id),
                collaborator_ids=[]
            )
            await project.insert()
            return project
        except Exception as e:
            raise e
    
    @staticmethod
    async def get_project_by_id(project_id: str) -> Optional[Project]:
        try:
            return await Project.get(ObjectId(project_id))
        except Exception as e:
            raise e
    
    @staticmethod
    async def get_projects_by_user_id(user_id: str) -> List[Project]:
        try:
            user_oid = ObjectId(user_id)
            # Find projects where user is owner OR collaborator
            return await Project.find(
                {"$or": [
                    {"owner_id": user_oid},
                    {"collaborator_ids": user_oid}
                ]}
            ).to_list()
        except Exception as e:
            raise e
    
    @staticmethod
    async def update_project(project_id: str, name: Optional[str] = None, description: Optional[str] = None) -> Optional[Project]:
        try:
            project = await Project.get(ObjectId(project_id))
            if not project:
                return None
            
            if name is not None:
                project.name = name
            if description is not None:
                project.description = description
            
            project.updated_at = datetime.utcnow()
            await project.save()
            return project
        except Exception as e:
            raise e
    
    @staticmethod
    async def delete_project(project_id: str) -> bool:
        try:
            project = await Project.get(ObjectId(project_id))
            if not project:
                return False
            await project.delete()
            return True
        except Exception as e:
            raise e
    
    @staticmethod
    async def add_collaborator_by_email(project_id: str, email: str) -> Optional[Project]:
        try:
            user = await User.find_one(User.email == email)
            if not user:
                raise ValueError(f"User with email {email} not found")
            
            project = await Project.get(ObjectId(project_id))
            if not project:
                return None
            
            if user.id == project.owner_id:
                raise ValueError("Cannot add project owner as collaborator")
            
            if user.id and user.id not in project.collaborator_ids:
                project.collaborator_ids.append(user.id)
                project.updated_at = datetime.utcnow()
                await project.save()
            
            return project
        except Exception as e:
            raise e
    
    @staticmethod
    async def remove_collaborator_by_email(project_id: str, email: str) -> Optional[Project]:
        try:
            user = await User.find_one(User.email == email)
            if not user:
                raise ValueError(f"User with email {email} not found")
            
            project = await Project.get(ObjectId(project_id))
            if not project:
                return None
            
            if user.id and user.id in project.collaborator_ids:
                project.collaborator_ids.remove(user.id)
                project.updated_at = datetime.utcnow()
                await project.save()
            
            return project
        except Exception as e:
            raise e