import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import {
    generateVideo,
    getVideoFile,
    clearGeneratedVideo,
    clearRetrievedVideo,
    resetVideoState
} from '@/store/slices/videoSlice';

export const useVideoGeneration = () => {
    const dispatch = useDispatch();
    const { generatedVideo, loading, error } = useSelector((state) => state.video);

    const generate = useCallback(
        (videoData) => {
            return dispatch(generateVideo(videoData));
        },
        [dispatch]
    );

    const clear = useCallback(() => {
        dispatch(clearGeneratedVideo());
    }, [dispatch]);

    return {
        generatedVideo,
        loading,
        error,
        generate,
        clear,
    };
};

export const useVideoRetrieval = () => {
    const dispatch = useDispatch();
    const { retrievedVideo, loading, error } = useSelector((state) => state.video);

    const retrieve = useCallback(
        (filename) => {
            return dispatch(getVideoFile(filename));
        },
        [dispatch]
    );

    const clear = useCallback(() => {
        dispatch(clearRetrievedVideo());
    }, [dispatch]);

    return {
        retrievedVideo,
        loading,
        error,
        retrieve,
        clear,
    };
};

export const useVideo = () => {
    const dispatch = useDispatch();
    const videoState = useSelector((state) => state.video);

    const form = useForm({
        defaultValues: {
            image_b64: '',
            prompt: ''
        },
        mode: 'onChange'
    });

    const generate = useCallback(
        (videoData) => {
            return dispatch(generateVideo(videoData));
        },
        [dispatch]
    );

    const retrieve = useCallback(
        (filename) => {
            return dispatch(getVideoFile(filename));
        },
        [dispatch]
    );

    const clearGenerated = useCallback(() => {
        dispatch(clearGeneratedVideo());
    }, [dispatch]);

    const clearRetrieved = useCallback(() => {
        dispatch(clearRetrievedVideo());
    }, [dispatch]);

    const reset = useCallback(() => {
        dispatch(resetVideoState());
        form.reset();
    }, [dispatch, form]);

    const handleSubmit = useCallback(
        async (data) => {
            try {
                const result = await dispatch(generateVideo(data)).unwrap();
                return result;
            } catch (error) {
                console.error('Video generation failed:', error);
                throw error;
            }
        },
        [dispatch]
    );

    return {
        generatedVideo: videoState.generatedVideo,
        retrievedVideo: videoState.retrievedVideo,
        loading: videoState.loading,
        error: videoState.error,
        form,
        handleSubmit: form.handleSubmit(handleSubmit),
        generate,
        retrieve,
        clearGenerated,
        clearRetrieved,
        reset,
    };
};

export default useVideo;
