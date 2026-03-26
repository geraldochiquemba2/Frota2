import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6">
        <h1 className="text-8xl font-display font-bold text-primary">404</h1>
        <h2 className="text-2xl font-semibold text-foreground">Page Not Found</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          The route you are looking for doesn't exist or you don't have permission to view it.
        </p>
        <Link href="/">
          <Button size="lg" className="mt-4">Return Home</Button>
        </Link>
      </div>
    </div>
  );
}
