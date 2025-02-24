import { Button } from "@/components/ui/button";

interface ShowMoreButtonProps {
  onClick: () => void;
}

export const ShowMoreButton = ({ onClick }: ShowMoreButtonProps) => {
  return (
    <div className="flex justify-center pt-4 pb-8">
      <Button onClick={onClick} variant="outline">
        Show More
      </Button>
    </div>
  );
};
