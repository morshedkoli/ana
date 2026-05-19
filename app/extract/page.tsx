import { PageHeader } from '@/components/shared/page-header';
import { FrameExtractor } from './frame-extractor';

export default function ExtractPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Extract"
        title="Frame extractor"
        description="Pull reference frames from any video to build your style and pose library."
      />
      <FrameExtractor />
    </div>
  );
}
