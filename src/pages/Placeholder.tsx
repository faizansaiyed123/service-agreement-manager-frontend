import { Card, PageHeader } from "../components/ui";

export function PlaceholderPage({
  title,
  eyebrow,
}: {
  title: string;
  eyebrow: string;
}) {
  return (
    <div>
      <PageHeader
        title={title}
        eyebrow={eyebrow}
        description="This workspace is ready for the live API workflow implementation."
      />
      <Card>
        <div className="empty-state">
          <strong>Module shell is ready</strong>
          <span>
            Backend integration for this section is the next verified frontend
            chunk.
          </span>
        </div>
      </Card>
    </div>
  );
}
