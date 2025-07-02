import React from "react";
import { theme, combineClasses } from "../../config/theme";

interface CardProps {
  className?: string;
  [key: string]: any;
}

export const Card = ({ className = "", ...props }: CardProps) => (
  <div
    className={combineClasses(
      theme.components.card.background,
      theme.components.card.border,
      theme.components.card.shadow,
      theme.components.card.rounded,
      theme.components.card.hover,
      className
    )}
    {...props}
  />
);

export const CardHeader = ({ className = "", ...props }: CardProps) => (
  <div className={combineClasses("p-6 pb-3", className)} {...props} />
);

export const CardTitle = ({ className = "", ...props }: CardProps) => (
  <h3 
    className={combineClasses(
      "text-lg font-semibold",
      theme.colors.text.primary,
      className
    )} 
    {...props} 
  />
);

export const CardContent = ({ className = "", ...props }: CardProps) => (
  <div className={combineClasses("p-6 pt-0", className)} {...props} />
);

export const CardDescription = ({ className = "", ...props }: CardProps) => (
  <p 
    className={combineClasses(
      "text-sm",
      theme.colors.text.secondary,
      className
    )} 
    {...props} 
  />
);
