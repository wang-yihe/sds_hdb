import { useSelector, useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { 
    searchPlants, 
    searchPlantsWithImages,
    getPlantDetails, 
    getExampleQueries, 
    clearSearchResults, 
    clearPlantDetails 
} from "@/store/slices/ragSlice";

const useRag = () => {
    const dispatch = useDispatch();
    const { searchResults, searchQuery, plantDetails, exampleQueries, loadingFlags } = useSelector((state) => state.rag);
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
        setValue,
        watch
    } = useForm({
        defaultValues: {
            query: "",
            max_results: 10
        }
    });

    const handleSearchPlants = async (searchData) => {
        try {
            await dispatch(searchPlants(searchData)).unwrap();
        } catch (error) {
            alert("Failed to search plants: " + error);
        }
    };

    const handleSearchPlantsWithImages = async (searchData) => {
        try {
            await dispatch(searchPlantsWithImages(searchData)).unwrap();
        } catch (error) {
            alert("Failed to search plants with images: " + error);
        }
    };

    const handleGetPlantDetails = async (botanicalName) => {
        try {
            await dispatch(getPlantDetails(botanicalName)).unwrap();
        } catch (error) {
            alert("Failed to get plant details: " + error);
        }
    };

    const loadExampleQueries = async () => {
        try {
            await dispatch(getExampleQueries()).unwrap();
        } catch (error) {
            alert("Failed to load example queries: " + error);
        }
    };

    const handleClearSearch = () => {
        dispatch(clearSearchResults());
        reset();
    };

    const handleClearDetails = () => {
        dispatch(clearPlantDetails());
    };

    const clearForm = () => {
        reset();
    };

    const hasResults = searchResults.length > 0;

    const getPlantByName = (botanicalName) => {
        return searchResults.find(plant => plant === botanicalName);
    };

    return {
        // State
        searchResults,
        searchQuery,
        plantDetails,
        exampleQueries,
        loadingFlags,
        hasResults,
        
        // Form controls
        register,
        handleSubmit,
        errors,
        watch,
        setValue,
        
        // Actions
        handleSearchPlants,
        handleSearchPlantsWithImages,
        handleGetPlantDetails,
        loadExampleQueries,
        handleClearSearch,
        handleClearDetails,
        clearForm,
        getPlantByName
    };
};

export default useRag;