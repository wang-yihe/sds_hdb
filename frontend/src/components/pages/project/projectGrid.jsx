import CreateProjectCard from './CreateProjectCard';
import ProjectCard from './ProjectCard';

export default function ProjectsGrid({
  projects,
  viewMode,
  onCreateClick,
  onProjectClick,
  onProjectEdit,
  onProjectDelete,
  hasProjects,
  isLoading,
}) {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">All Projects</h1>
      <p className="text-muted-foreground mb-6">
        {projects.length} projects
      </p>

      <div
        className={
          viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
        }
      >
        {/* Create new project card */}
        <CreateProjectCard onClick={onCreateClick} />

        {/* Project cards */}
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={onProjectClick}
            onEdit={onProjectEdit}
            onDelete={onProjectDelete}
          />
        ))}
      </div>

      {!hasProjects && !isLoading && (
        <div className="text-center py-16 text-muted-foreground">
          <p>No projects yet. Create your first project to get started!</p>
        </div>
      )}
    </div>
  );
}