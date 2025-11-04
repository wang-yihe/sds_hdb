import { Tldraw } from "tldraw";
import { useCanvas } from '@/hooks/useCanvas';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Save, Loader2 } from 'lucide-react';

const Canvas = () => {
  const {
    canvasTitle,
    hasUnsavedChanges,
    isSaving,
    handleTitleChange,
    handleSave,
    handleEditorChange
  } = useCanvas();

  return (
    <div className="flex flex-col h-full">
      {/* Canvas Toolbar */}
      <Card className="rounded-none border-x-0 border-t-0">
        <div className="p-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Input 
              value={canvasTitle}
              onChange={handleTitleChange}
              className="text-lg font-medium border-none shadow-none focus-visible:ring-1 focus-visible:ring-ring px-2 w-64"
              placeholder="Canvas title..."
            />
            {hasUnsavedChanges && (
              <Badge variant="outline" className="border-orange-500 text-orange-600">
                <span className="mr-1">●</span> Unsaved
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              size="sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Canvas Area */}
      <div className="flex-1">
        <Tldraw 
          onMount={handleEditorChange}
          persistenceKey="my-canvas"
        />
      </div>
    </div>
  );
};

export default Canvas;