import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button.js";

/**
 * 404 Not Found page for unmapped routes.
 */
export function NotFoundPage(): React.JSX.Element {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-50 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
        <h1 className="text-4xl font-extrabold text-stone-900 mb-3">404</h1>
        <h2 className="text-xl font-bold text-stone-800 mb-4">Page not found</h2>
        <p className="text-stone-600 text-lg mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link to="/" className="inline-block w-full">
          <Button variant="primary" size="secondary" className="w-full">
            Return to home
          </Button>
        </Link>
      </div>
    </div>
  );
}
