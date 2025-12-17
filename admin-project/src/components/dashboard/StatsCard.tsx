import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  variant?: 'default' | 'warning' | 'success' | 'info';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  variant = 'default',
  trend 
}: StatsCardProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return 'border-l-amber-500 bg-amber-500/5';
      case 'success':
        return 'bg-primary/5';
      case 'info':
        return 'border-l-blue-500 bg-blue-500/5';
      default:
        return '';
    }
  };

  const getIconStyles = () => {
    switch (variant) {
      case 'warning':
        return 'bg-gradient-to-br from-amber-500 to-orange-500 text-white';
      case 'success':
        return 'bg-gradient-primary text-white';
      case 'info':
        return 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  return (
    <div className={`bg-card rounded-xl border border-border p-6 border-l-4 ${getVariantStyles()} transition-all duration-200 hover:shadow-lg`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {trend && (
            <div className={`flex items-center text-xs font-medium ${trend.isPositive ? 'text-primary' : 'text-destructive'}`}>
              <span>{trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="ml-1 text-muted-foreground">vs last month</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getIconStyles()}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};