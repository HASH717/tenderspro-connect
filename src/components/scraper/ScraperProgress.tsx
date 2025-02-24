import { Progress } from "@/components/ui/progress";

interface ScraperProgressProps {
  progress: number;
  isLoading: boolean;
}

export const ScraperProgress = ({ progress, isLoading }: ScraperProgressProps) => {
  if (!isLoading) return null;
  
  return <Progress value={progress} className="mt-4 w-full" />;
};
