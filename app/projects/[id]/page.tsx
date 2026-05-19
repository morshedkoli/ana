import { connectDB, videoProjects, productionTasks, plainOne, plain } from '@/lib/db/client';
import type { VideoProject, ProductionTask } from '@/lib/db/schema';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { ProjectWorkspace } from './project-workspace';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const project = plainOne<VideoProject>(await videoProjects.findById(id));
  if (!project) notFound();
  const tasks = plain<ProductionTask>(
    await productionTasks.find({ videoProjectId: id }).sort({ taskOrder: 1 })
  );

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
