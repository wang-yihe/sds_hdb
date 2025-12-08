import { Card, CardContent } from '@/components/ui/card';

export default function CreateProjectCard({ onClick }) {
  return (
    <Card
      onClick={onClick}
      className="border-2 border-dashed cursor-pointer hover:border-primary hover:bg-accent transition min-h-[300px] flex flex-col items-center justify-center"
    >
      <CardContent className="flex flex-col items-center justify-center p-8">
        <div className="text-6xl text-muted-foreground mb-4">+</div>
        <h3 className="text-lg font-semibold mb-2">Create new project</h3>
        <p className="text-sm text-muted-foreground text-center">
          Start designing your HDB green space
        </p>
      </CardContent>
    </Card>
  );
}