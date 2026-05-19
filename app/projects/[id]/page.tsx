import { connectDB, videoProjects, productionTasks } from '@/lib/db/client';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { ProjectWorkspace } from './project-workspace';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const projectDoc = await videoProjects.findById(id);
  if (!projectDoc) notFound();
  const project = projectDoc.toJSON();
  const tasks = (await productionTasks.find({ videoProjectId: id }).sort({ taskOrder: 1 })).map(t => t.toJSON());

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow={`${project.scheduledDate || 'Unscheduled'} · ${project.contentType}`}
        title={project.title}
      />
      <ProjectWorkspace project={project} tasks={tasks} />
    </div>
  );
}
