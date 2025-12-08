import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import userAPI from "@/api/userAPI"; 

const initialState = {
  userList: [],
  loadingFlags: {
    isSaving: false,
    isAwaitingResponse: false,
  },
};

export const findAllUsers = createAsyncThunk("user/get_all_users", async (_, { rejectWithValue }) => {
  try {
    const { data } = await userAPI.findAllUser();
    return data;
  } catch (error) {
    const msg = error?.message || String(error);
    return rejectWithValue(msg);
  }
});

export const createUser = createAsyncThunk("user/create_user", async (userData, { rejectWithValue }) => {
  try {
    const { data } = await userAPI.createUser(userData);
    return data;
  } catch (error) {
    const msg = error?.message || String(error);
    return rejectWithValue(msg);
  }
});

export const updateUser = createAsyncThunk("user/update_user", async ({ id, userData }, { rejectWithValue }) => {
  try {
    const { data } = await userAPI.updateUser(id, userData);
    return data;
  } catch (error) {
    const msg = error?.message || String(error);
    return rejectWithValue(msg);
  }
});

export const deleteUser = createAsyncThunk("user/delete_user", async (id, { rejectWithValue }) => {
  try {
    await userAPI.deleteUser(id);
    return id; 
  } catch (error) {
    const msg = error?.message || String(error);
    return rejectWithValue(msg);
  }
});

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(findAllUsers.pending, (state) => {
        state.loadingFlags.isAwaitingResponse = true;
      })
      .addCase(findAllUsers.fulfilled, (state, action) => {
        state.userList = action.payload;
        state.loadingFlags.isAwaitingResponse = false;
      })
      .addCase(findAllUsers.rejected, (state) => {
        state.loadingFlags.isAwaitingResponse = false;
      })

      // Create User
      .addCase(createUser.pending, (state) => {
        state.loadingFlags.isSaving = true;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.userList.push(action.payload); // Add new user to the list
        state.loadingFlags.isSaving = false;
      })
      .addCase(createUser.rejected, (state) => {
        state.loadingFlags.isSaving = false;
      })

      // Update User
      .addCase(updateUser.pending, (state) => {
        state.loadingFlags.isSaving = true;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        const index = state.userList.findIndex(user => user.id === action.payload.id);
        if (index !== -1) {
          state.userList[index] = action.payload; // Update user in the list
        }
        state.loadingFlags.isSaving = false;
      })
      .addCase(updateUser.rejected, (state) => {
        state.loadingFlags.isSaving = false;
      })
      
      // Delete User
      .addCase(deleteUser.pending, (state) => {
        state.loadingFlags.isSaving = true;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.userList = state.userList.filter(user => user.id !== action.payload);
        state.loadingFlags.isSaving = false;
      })
      .addCase(deleteUser.rejected, (state) => {
        state.loadingFlags.isSaving = false;
      });
  },
});

export default userSlice.reducer;