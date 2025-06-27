import React from "react";

interface CardProps {
  className?: string;
  [key: string]: any;
}

export const Card = ({ className = "", ...props }: CardProps) => (
  <div
    className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}
    {...props}
  />
);

export const CardHeader = ({ className = "", ...props }: CardProps) => (
  <div className={`p-6 pb-3 ${className}`} {...props} />
);

export const CardTitle = ({ className = "", ...props }: CardProps) => (
  <h3 className={`text-lg font-semibold text-gray-900 ${className}`} {...props} />
);

export const CardContent = ({ className = "", ...props }: CardProps) => (
  <div className={`p-6 pt-0 ${className}`} {...props} />
);

export const CardDescription = ({ className = "", ...props }: CardProps) => (
  <p className={`text-sm text-gray-600 ${className}`} {...props} />
);
