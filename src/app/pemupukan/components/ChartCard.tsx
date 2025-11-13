import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChartCard({
  title, children, className = "", height = "h-[320px]",
}: { title: string; children: React.ReactNode; className?: string; height?: string; }) {
  return (
    <Card className={`bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 ${className}`}>
      <CardHeader className="pb-1">
        <CardTitle className="text-[13px]">{title}</CardTitle>
      </CardHeader>
      <CardContent className={`${height}`}>{children}</CardContent>
    </Card>
  );
}
