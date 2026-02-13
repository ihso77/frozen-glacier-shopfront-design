import { Wrench } from "lucide-react";

interface MaintenancePageProps {
  message: string;
}

const MaintenancePage = ({ message }: MaintenancePageProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Wrench className="w-12 h-12 text-primary animate-pulse" />
        </div>
        <h1 className="text-3xl font-black text-foreground mb-4 frozen-logo">فروزن</h1>
        <p className="text-xl text-foreground font-bold mb-3">الموقع تحت الصيانة</p>
        <p className="text-muted-foreground text-lg leading-relaxed">{message}</p>
        <div className="mt-8 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
