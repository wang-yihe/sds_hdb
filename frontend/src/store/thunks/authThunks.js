import { createAsyncThunk } from "@reduxjs/toolkit";
import { loginSuccess, logoutUser } from "@/store/slices/authSlice";
import { persistor } from "@/store/store";
import authAPI from "@/api/authAPI";

export const logout = createAsyncThunk("auth/logout", async (_, { dispatch }) => {
  dispatch(logoutUser());
  await persistor.purge();
});

export const loginUser = createAsyncThunk("auth/login", async (userForm, { dispatch, rejectWithValue }) => {
  try {
    const { data } = await authAPI.loginUser(userForm);
    dispatch(loginSuccess(data)); 
  } catch (error) {
    const msg = error?.message || String(error);
    return rejectWithValue(msg);
  }
});

export const validateToken = createAsyncThunk("auth/validate-token", async (_, { dispatch, rejectWithValue }) => {
  try {
    await authAPI.validateToken();
  } catch (error) {
    dispatch(logout());
    return rejectWithValue("Invalid token");
  }
});