import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider.js";

export function UserMenu(): React.JSX.Element | null {
  const { user, logout, logoutAll } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent): void => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!user) {
    return null;
  }

  const handleLogout = async (): Promise<void> => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } finally {
      setIsLoggingOut(false);
      setIsOpen(false);
    }
  };

  const handleLogoutAll = async (): Promise<void> => {
    setIsLoggingOut(true);
    try {
      await logoutAll();
      navigate("/login");
    } finally {
      setIsLoggingOut(false);
      setIsOpen(false);
    }
  };

  const initial = user.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="relative inline-block text-left">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`User menu for ${user.name}`}
        className="flex items-center gap-3 p-2 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-700 cursor-pointer min-h-[48px]"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="h-9 w-9 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="h-9 w-9 rounded-full bg-teal-800 text-white font-bold flex items-center justify-center text-sm select-none"
            aria-hidden="true"
          >
            {initial}
          </div>
        )}
        <span className="font-semibold text-stone-900 text-base hidden sm:inline">{user.name}</span>
        <svg
          className={`h-5 w-5 text-stone-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="User actions"
          className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-xl border border-stone-200 py-3 z-50 focus:outline-none"
        >
          <div className="px-4 py-2 border-b border-stone-100 mb-2">
            <p className="font-bold text-stone-900 truncate">{user.name}</p>
            <p className="text-sm text-stone-500 truncate">{user.email}</p>
          </div>

          <div className="px-2 space-y-1">
            <button
              type="button"
              role="menuitem"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 rounded-xl text-base font-semibold text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 transition-colors cursor-pointer"
            >
              Sign out
            </button>

            <button
              type="button"
              role="menuitem"
              disabled={isLoggingOut}
              onClick={handleLogoutAll}
              className="w-full text-left px-4 py-3 rounded-xl text-base font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 transition-colors cursor-pointer"
            >
              Sign out everywhere
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
