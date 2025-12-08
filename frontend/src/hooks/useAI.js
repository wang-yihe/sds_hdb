import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { 
    generateAllSmart, 
    clearGeneratedContent, 
    resetAiState 
} from '@/store/slices/aiSlice';

export const useGenerateAllSmart = () => {
    const dispatch = useDispatch();
    const { generatedContent, loading, error } = useSelector((state) => state.ai);

    const generate = useCallback(
        (generationForm) => {
            return dispatch(generateAllSmart(generationForm));
        },
        [dispatch]
    );

    const clear = useCallback(() => {
        dispatch(clearGeneratedContent());
    }, [dispatch]);

    const reset = useCallback(() => {
        dispatch(resetAiState());
    }, [dispatch]);

    return {
        generatedContent,
        loading,
        error,
        generate,
        clear,
        reset,
    };
};