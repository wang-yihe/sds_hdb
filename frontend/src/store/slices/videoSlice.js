import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import videoAPI from '@/api/videoAPI';

export const generateVideo = createAsyncThunk(
  'video/generateVideo',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await videoAPI.generateVideo(payload);

      const videoData = response.data.video_data;

      if (!videoData || typeof videoData !== 'string' || videoData.length < 50) {
        throw new Error('API returned empty or invalid video data.');
      }

      console.log("Video generated successfully - base64 length:", videoData.length);

      return {
        video_data: videoData
      };

    } catch (error) {
      console.error("Video generation failed:", error);
      return rejectWithValue(error.response?.data?.detail || error.message);
    }
  }
);

export const getVideoFile = createAsyncThunk(
  'video/getVideoFile',
  async (filename, { rejectWithValue }) => {
    try {
      const response = await videoAPI.getVideoFile(filename);

      // Convert blob to data URL
      const blob = response.data;
      const videoUrl = URL.createObjectURL(blob);

      console.log("Video file retrieved successfully:", filename);

      return {
        filename: filename,
        video_url: videoUrl,
        blob: blob
      };

    } catch (error) {
      console.error("Failed to retrieve video file:", error);
      return rejectWithValue(error.response?.data?.detail || error.message);
    }
  }
);

const videoSlice = createSlice({
  name: 'video',
  initialState: {
    generatedVideo: null,
    retrievedVideo: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearGeneratedVideo: (state) => {
      state.generatedVideo = null;
      state.error = null;
    },
    clearRetrievedVideo: (state) => {
      // Revoke object URL to prevent memory leaks
      if (state.retrievedVideo?.video_url) {
        URL.revokeObjectURL(state.retrievedVideo.video_url);
      }
      state.retrievedVideo = null;
      state.error = null;
    },
    resetVideoState: (state) => {
      // Clean up object URLs
      if (state.retrievedVideo?.video_url) {
        URL.revokeObjectURL(state.retrievedVideo.video_url);
      }
      state.generatedVideo = null;
      state.retrievedVideo = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Generate video
      .addCase(generateVideo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateVideo.fulfilled, (state, action) => {
        state.loading = false;
        state.generatedVideo = action.payload;
      })
      .addCase(generateVideo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get video file
      .addCase(getVideoFile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getVideoFile.fulfilled, (state, action) => {
        state.loading = false;
        state.retrievedVideo = action.payload;
      })
      .addCase(getVideoFile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearGeneratedVideo, clearRetrievedVideo, resetVideoState } = videoSlice.actions;
export default videoSlice.reducer;