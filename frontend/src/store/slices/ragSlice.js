import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import ragAPI from "@/api/ragAPI"; 

const initialState = {
  searchResults: [],
  searchQuery: "",
  plantDetails: null,
  exampleQueries: null,
  loadingFlags: {
    isSearching: false,
    isLoadingDetails: false,
    isLoadingExamples: false,
  },
};

export const searchPlants = createAsyncThunk("rag/search_plants", async (searchData, { rejectWithValue }) => {
  try {
    const { data } = await ragAPI.searchPlants(searchData);
    return data;
  } catch (error) {
    const msg = error?.message || String(error);
    return rejectWithValue(msg);
  }
});

export const searchPlantsWithImages = createAsyncThunk("rag/search_plants_with_images", async (searchData, { rejectWithValue }) => {
  try {
    const { data } = await ragAPI.searchPlantsWithImages(searchData);
    return data;
  } catch (error) {
    const msg = error?.message || String(error);
    return rejectWithValue(msg);
  }
});

export const getPlantDetails = createAsyncThunk("rag/get_plant_details", async (botanicalName, { rejectWithValue }) => {
  try {
    const { data } = await ragAPI.getPlantDetails(botanicalName);
    return data;
  } catch (error) {
    const msg = error?.message || String(error);
    return rejectWithValue(msg);
  }
});

export const getExampleQueries = createAsyncThunk("rag/get_example_queries", async (_, { rejectWithValue }) => {
  try {
    const { data } = await ragAPI.getExampleQueries();
    return data;
  } catch (error) {
    const msg = error?.message || String(error);
    return rejectWithValue(msg);
  }
});

const ragSlice = createSlice({
  name: "rag",
  initialState,
  reducers: {
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchQuery = "";
    },
    clearPlantDetails: (state) => {
      state.plantDetails = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Search Plants
      .addCase(searchPlants.pending, (state) => {
        state.loadingFlags.isSearching = true;
      })
      .addCase(searchPlants.fulfilled, (state, action) => {
        state.searchResults = action.payload.plants;
        state.searchQuery = action.payload.query;
        state.loadingFlags.isSearching = false;
      })
      .addCase(searchPlants.rejected, (state) => {
        state.loadingFlags.isSearching = false;
      })

      // Search Plants With Images
      .addCase(searchPlantsWithImages.pending, (state) => {
        state.loadingFlags.isSearching = true;
      })
      .addCase(searchPlantsWithImages.fulfilled, (state, action) => {
        state.searchResults = action.payload.plants;  // Array of {botanical_name, image}
        state.searchQuery = action.payload.query;
        state.loadingFlags.isSearching = false;
      })
      .addCase(searchPlantsWithImages.rejected, (state) => {
        state.loadingFlags.isSearching = false;
      })

      // Get Plant Details
      .addCase(getPlantDetails.pending, (state) => {
        state.loadingFlags.isLoadingDetails = true;
      })
      .addCase(getPlantDetails.fulfilled, (state, action) => {
        state.plantDetails = action.payload;
        state.loadingFlags.isLoadingDetails = false;
      })
      .addCase(getPlantDetails.rejected, (state) => {
        state.loadingFlags.isLoadingDetails = false;
      })

      // Get Example Queries
      .addCase(getExampleQueries.pending, (state) => {
        state.loadingFlags.isLoadingExamples = true;
      })
      .addCase(getExampleQueries.fulfilled, (state, action) => {
        state.exampleQueries = action.payload;
        state.loadingFlags.isLoadingExamples = false;
      })
      .addCase(getExampleQueries.rejected, (state) => {
        state.loadingFlags.isLoadingExamples = false;
      });
  },
});

export const { clearSearchResults, clearPlantDetails } = ragSlice.actions;
export default ragSlice.reducer;