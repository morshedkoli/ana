import { connectDB, videoProjects, plain } from '@/lib/db/client';
import type { VideoProject } from '@/lib/db/schema';
import { PageHeader } from '@/components/shared/page-header';
import { CalendarView } from './calendar-view';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  await connectDB();
  const projects = plain<VideoProject>(await videoProjects.find().sort({ scheduledDate: -1 }));
  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Plan"
        title="Content calendar"
        description="Map your videos across days. Drag, drop, post."
      />
      <CalendarView projects={projects} />
    </div>
  );
}
