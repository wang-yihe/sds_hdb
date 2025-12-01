import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    user: null,
    access_token: null,
    isAuthenticated: false,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        loginSuccess: (state, action) => {
            state.user = action.payload.user;
            state.access_token = action.payload.access_token;
            state.isAuthenticated = true;
        },
        logoutUser: (state) => {
            state.user = null;      
            state.access_token = null;         
            state.isAuthenticated = false;
        },
    },
});

export const { logoutUser, loginSuccess } = authSlice.actions; 
export default authSlice.reducer;