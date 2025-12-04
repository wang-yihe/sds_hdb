import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import projectAPI from "@/api/projectAPI";

const initialState = {
  projectList: [],
  currentProject: null,
  loadingFlags: {
    isSaving: false,
    isAwaitingResponse: false,
  },
};

export const getUserProjects = createAsyncThunk("project/get_user_projects", async (_, { rejectWithValue }) => {
  try {
    const { data } = await projectAPI.getUserProjects();
    return data;
  } catch (error) {
    const msg = error?.message || String(error);
    return rejectWithValue(msg);
  }
});

export const getProjectById = createAsyncThunk("project/get_project_by_id", async (projectId, { rejectWithValue }) => {
  try {
    const { data } = await projectAPI.getProjectById(projectId);
    return data;
  } catch (error) {
    const msg = error?.message || String(error);
    return rejectWithValue(msg);
  }
});

export const createProject = createAsyncThunk("project/create_project", async (projectData, { rejectWithValue }) => {
  try {
    const { data } = await projectAPI.createProject(projectData);
    return data;
  } catch (error) {
    const msg = error?.message || String(error);
    return rejectWithValue(msg);
  }
});

export const updateProject = createAsyncThunk("project/update_project", async ({ projectId, projectData }, { rejectWithValue }) => {
  try {
    const { data } = await projectAPI.updateProject(projectId, projectData);
    return data;
  } catch (error) {
    const msg = error?.message || String(error);
    return rejectWithValue(msg);
  }
});

export const deleteProject = createAsyncThunk("project/delete_project", async (projectId, { rejectWithValue }) => {
  try {
    await projectAPI.deleteProject(projectId);
    return projectId;
  } catch (error) {
    const msg = error?.message || String(error);
    return rejectWithValue(msg);
  }
});

export const addCollaborator = createAsyncThunk("project/add_collaborator", async ({ projectId, email }, { rejectWithValue }) => {
  try {
    const { data } = await projectAPI.addCollaborator(projectId, email);
    return data;
  } catch (error) {
    const msg = error?.message || String(error);
    return rejectWithValue(msg);
  }
});

export const removeCollaborator = createAsyncThunk("project/remove_collaborator", async ({ projectId, email }, { rejectWithValue }) => {
  try {
    const { data } = await projectAPI.removeCollaborator(projectId, email);
    return data;
  } catch (error) {
    const msg = error?.message || String(error);
    return rejectWithValue(msg);
  }
});

const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {
    clearCurrentProject: (state) => {
      state.currentProject = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get User Projects
      .addCase(getUserProjects.pending, (state) => {
        state.loadingFlags.isAwaitingResponse = true;
      })
      .addCase(getUserProjects.fulfilled, (state, action) => {
        state.projectList = action.payload;
        state.loadingFlags.isAwaitingResponse = false;
      })
      .addCase(getUserProjects.rejected, (state) => {
        state.loadingFlags.isAwaitingResponse = false;
      })

      // Get Project By Id
      .addCase(getProjectById.pending, (state) => {
        state.loadingFlags.isAwaitingResponse = true;
      })
      .addCase(getProjectById.fulfilled, (state, action) => {
        state.currentProject = action.payload;
        state.loadingFlags.isAwaitingResponse = false;
      })
      .addCase(getProjectById.rejected, (state) => {
        state.loadingFlags.isAwaitingResponse = false;
      })

      // Create Project
      .addCase(createProject.pending, (state) => {
        state.loadingFlags.isSaving = true;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.projectList.push(action.payload);
        state.loadingFlags.isSaving = false;
      })
      .addCase(createProject.rejected, (state) => {
        state.loadingFlags.isSaving = false;
      })

      // Update Project
      .addCase(updateProject.pending, (state) => {
        state.loadingFlags.isSaving = true;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        const index = state.projectList.findIndex(project => project.id === action.payload.id);
        if (index !== -1) {
          state.projectList[index] = action.payload;
        }
        if (state.currentProject?.id === action.payload.id) {
          state.currentProject = action.payload;
        }
        state.loadingFlags.isSaving = false;
      })
      .addCase(updateProject.rejected, (state) => {
        state.loadingFlags.isSaving = false;
      })

      // Delete Project
      .addCase(deleteProject.pending, (state) => {
        state.loadingFlags.isSaving = true;
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.projectList = state.projectList.filter(project => project.id !== action.payload);
        if (state.currentProject?.id === action.payload) {
          state.currentProject = null;
        }
        state.loadingFlags.isSaving = false;
      })
      .addCase(deleteProject.rejected, (state) => {
        state.loadingFlags.isSaving = false;
      })

      // Add Collaborator
      .addCase(addCollaborator.pending, (state) => {
        state.loadingFlags.isSaving = true;
      })
      .addCase(addCollaborator.fulfilled, (state, action) => {
        const index = state.projectList.findIndex(project => project.id === action.payload.id);
        if (index !== -1) {
          state.projectList[index] = action.payload;
        }
        if (state.currentProject?.id === action.payload.id) {
          state.currentProject = action.payload;
        }
        state.loadingFlags.isSaving = false;
      })
      .addCase(addCollaborator.rejected, (state) => {
        state.loadingFlags.isSaving = false;
      })

      // Remove Collaborator
      .addCase(removeCollaborator.pending, (state) => {
        state.loadingFlags.isSaving = true;
      })
      .addCase(removeCollaborator.fulfilled, (state, action) => {
        const index = state.projectList.findIndex(project => project.id === action.payload.id);
        if (index !== -1) {
          state.projectList[index] = action.payload;
        }
        if (state.currentProject?.id === action.payload.id) {
          state.currentProject = action.payload;
        }
        state.loadingFlags.isSaving = false;
      })
      .addCase(removeCollaborator.rejected, (state) => {
        state.loadingFlags.isSaving = false;
      });
  },
});

export const { clearCurrentProject } = projectSlice.actions;
export default projectSlice.reducer; 