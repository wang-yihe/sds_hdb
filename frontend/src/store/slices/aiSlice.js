import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import aiAPI from '@/api/aiAPI';

export const generateAllSmart = createAsyncThunk(
  'ai/generateAllSmart',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await aiAPI.generateAllSmart(payload);
      
      // 🟢 SIMPLIFIED: dataString is the complete, ready-to-use Data URI string.
      const finalImageSrc = response.data.image; 
      
      // Add a quick check to prevent passing empty data if something goes wrong
      if (!finalImageSrc || typeof finalImageSrc !== 'string' || finalImageSrc.length < 50) {
          throw new Error('API returned empty or invalid image source.');
      }
      
      console.log("Image source successfully received.");

      return finalImageSrc; 

    } catch (error) {
      // Log error details for debugging
      console.error("Image generation failed:", error);
      return rejectWithValue(error.response?.data?.detail || error.message);
    }
  }
);

export const editLasso = createAsyncThunk(
  'ai/editLasso',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await aiAPI.editLasso(payload);

      // Response contains the base64 data URI image (matching generate_all_smart pattern)
      const finalImageSrc = response.data.image;

      if (!finalImageSrc || typeof finalImageSrc !== 'string' || finalImageSrc.length < 50) {
        throw new Error('API returned empty or invalid image source.');
      }

      console.log('Lasso edit successful');
      return finalImageSrc;

    } catch (error) {
      console.error('Lasso edit failed:', error);
      return rejectWithValue(error.response?.data?.detail || error.message);
    }
  }
);

const aiSlice = createSlice({
    name: 'ai',
    initialState: {
        generatedContent: null,
        loading: false,
        error: null,
    },
    reducers: {
        clearGeneratedContent: (state) => {
            state.generatedContent = null;
            state.error = null;
        },
        resetAiState: (state) => {
            state.generatedContent = null;
            state.loading = false;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(generateAllSmart.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(generateAllSmart.fulfilled, (state, action) => {
                state.loading = false;
                state.generatedContent = action.payload;
            })
            .addCase(generateAllSmart.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(editLasso.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(editLasso.fulfilled, (state, action) => {
                state.loading = false;
                state.generatedContent = action.payload;
            })
            .addCase(editLasso.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearGeneratedContent, resetAiState } = aiSlice.actions;
export default aiSlice.reducer;