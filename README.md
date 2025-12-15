# SDS HDB

An AI-powered canvas application for project management and visual collaboration, featuring intelligent content generation, RAG capabilities, and video generation.

## Overview

SDS HDB is a full-stack web application that combines a modern React frontend with a powerful FastAPI backend. The application provides an interactive canvas workspace where users can create projects, leverage AI-powered features, and manage visual content with advanced capabilities like background removal, video generation, and intelligent content suggestions through RAG (Retrieval Augmented Generation).

## Tech Stack

### Frontend
- **Framework**: React 18 with Vite
- **UI Library**: shadcn/ui (built on Radix UI primitives)
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit with Redux Persist
- **Routing**: React Router v6
- **Canvas/Drawing**:
  - tldraw for advanced drawing capabilities
- **Forms**: React Hook Form

### Backend
- **Framework**: FastAPI (Python 3.12+)
- **Database**: MongoDB with Motor (async driver) and Beanie ODM
- **Authentication**: JWT-based auth with python-jose
- **AI/ML Services**:
  - Google Generative AI (Gemini)
  - OpenAI integration
  - LangChain for AI orchestration
  - ChromaDB for vector storage (RAG)
  - HuggingFace embeddings
  - Sentence Transformers
- **Image Processing**:
  - OpenCV for computer vision
  - Pillow for image manipulation
  - rembg for background removal
- **Package Management**: uv (modern Python package manager)

## Features

### Core Functionality
- **User Authentication**: Secure JWT-based authentication system
- **Project Management**: Create and manage multiple projects
- **Interactive Canvas**: Rich canvas workspace for visual content creation
- **AI-Powered Features**:
  - AI content generation and suggestions
  - RAG (Retrieval Augmented Generation) for intelligent context-aware responses
  - Video generation capabilities
  - Image processing and background removal

### API Endpoints

The backend provides the following main route groups:

- `/auth` - User authentication (login, signup, etc.)
- `/user` - User profile management (protected)
- `/project` - Project CRUD operations (protected)
- `/canvas` - Canvas operations and asset management (protected)
- `/ai` - AI-powered content generation (protected)
- `/rag` - RAG-based intelligent features (protected)
- `/video` - Video generation and processing (protected)

## Project Structure

```
sds_hdb/
├── frontend/                # React + Vite frontend
│   ├── src/
│   │   ├── api/            # API client configuration
│   │   ├── auth/           # Authentication components & routes
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── layout/         # Layout components
│   │   ├── router/         # Application routing
│   │   ├── store/          # Redux store configuration
│   │   └── utils/          # Utility functions
│   └── package.json
│
└── backend/                # FastAPI backend
    ├── auth/              # Authentication middleware
    ├── controllers/       # Request controllers
    ├── core/              # Core configuration
    ├── db/                # Database configuration
    ├── models/            # Data models (Beanie/MongoDB)
    ├── routes/            # Main router
    ├── sub_routes/        # Feature-specific routes
    ├── schemas/           # Pydantic schemas
    ├── services/          # Business logic services
    ├── storage/           # File storage handling
    ├── utils/             # Utility functions
    ├── data/              # Data files and assets
    └── pyproject.toml     # Python dependencies (uv)
```

### Prerequisites

- **Frontend**: Node.js 18+ and npm/yarn
- **Backend**: Python 3.12+, uv package manager
- **Database**: MongoDB instance
- **API Keys**:
  - Google Generative AI API key
  - OpenAI API key (if using OpenAI features)

### Installation

#### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies using uv:
   ```bash
   uv sync
   ```

3. Create a `.env` file with required environment variables:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET_KEY=your_secret_key
   GOOGLE_API_KEY=your_google_api_key
   OPENAI_API_KEY=your_openai_api_key
   ENVIRONMENT=development
   APP_PORT=8000
   ALLOW_ORIGINS=http://localhost:5173
   CANVAS_ASSET_DIR=./storage/canvas-assets
   ```

4. Start the backend server:
   ```bash
   uv run python server.py
   ```

   Or using uvicorn directly:
   ```bash
   uvicorn server:app --reload --port 8000
   ```

#### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file if needed for API endpoint configuration:
   ```env
   VITE_API_URL=http://localhost:8000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```