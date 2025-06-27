import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline';
}

export const Button = ({
  children,
  className = "",
  variant = "default",
  ...props
}: ButtonProps) => {
  const variantClasses = variant === "default"
    ? "bg-blue-600 text-white hover:bg-blue-700"
    : "border border-gray-300 hover:bg-gray-50";

  return (
    <button
      className={`px-4 py-2 rounded font-medium transition-colors ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
