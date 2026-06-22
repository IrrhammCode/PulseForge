import { Card } from "@/components/ui/Card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md" interactive={false}>
        <div className="flex gap-2">
          <AlertCircle className="h-8 w-8 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">404 Page Not Found</h1>
        </div>
        <p className="mt-4 text-sm text-muted">
          Did you forget to add the page to the router?
        </p>
      </Card>
    </div>
  );
}
