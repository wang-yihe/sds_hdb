import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import userAPI from "@/api/userAPI"; 

const initialState = {
  userList: [],
  loadingFlags: {
    isSaving: false,
    isAwaitingResponse: false,
  },
};

// GET all users
export const findAllUsers = createAsyncThunk("user/find-all", async (_, { rejectWithValue }) => {
  try {
    const { data } = await userAPI.findAllUser();
    return data;
  } catch (error) {
    const msg = error?.message || String(error);
    return rejectWithValue(msg);
  }
});

// CREATE user
export const createUser = createAsyncThunk("user/create", async (userData, { rejectWithValue }) => {
  try {
    const { data } = await userAPI.createUser(userData);
    return data;
  } catch (error) {
    const msg = error?.message || String(error);
    return rejectWithValue(msg);
  }
});

// DELETE user
export const deleteUser = createAsyncThunk("user/delete", async (id, { rejectWithValue }) => {
  try {
    await userAPI.deleteUser(id);
    return id; // Return the ID so we can remove it from the list
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
      // Find All Users
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

      // Delete User
      .addCase(deleteUser.pending, (state) => {
        state.loadingFlags.isSaving = true;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        // Remove user from list by filtering out the deleted ID
        state.userList = state.userList.filter(user => user.id !== action.payload);
        state.loadingFlags.isSaving = false;
      })
      .addCase(deleteUser.rejected, (state) => {
        state.loadingFlags.isSaving = false;
      });
  },
});

export default userSlice.reducer;