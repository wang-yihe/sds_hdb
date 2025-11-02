import {Tldraw} from "tldraw"
import { useSelector, useDispatch } from 'react-redux';
import { selectHasUnsavedChanges, selectElementsForSave, markAsSaved, setSaving } from '@/store/slices/canvasSlice';

const Canvas = () => {
    return (
        <div className = "flex flex-col h-full" > 
                <Tldraw />
        </div>
    )
}

export default (Canvas)