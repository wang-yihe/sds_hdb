import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isLoading: false,
  message: "",
};

const globalLoaderSlice = createSlice({
  name: "globalLoader",
  initialState,
  reducers: {
    showGlobalLoader: (state, action) => {
      state.isLoading = true;
      state.message = action.payload || "Loading...";
    },
    hideGlobalLoader: (state) => {
      state.isLoading = false;
      state.message = "";
    },
  },
});

export const { showGlobalLoader, hideGlobalLoader } = globalLoaderSlice.actions;
export default globalLoaderSlice.reducer;