import { connectDB, videoProjects } from '@/lib/db/client';
import { PageHeader } from '@/components/shared/page-header';
import { CalendarView } from './calendar-view';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  await connectDB();
  const projects = (await videoProjects.find().sort({ scheduledDate: -1 })).map(r => r.toJSON());
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
