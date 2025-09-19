import { useApp } from "@/context/AppContext";
import { Outlet, useLocation } from "react-router-dom";
import { useEffect, Suspense, lazy } from "react";

// Import the skeleton loader
import { DashboardSkeleton } from '../skeletons/DashboardSkeleton';

// Properly typed import for LoginPage component with its props
interface LoginPageProps {
  noRedirect?: boolean;
}

// Lazy loaded LoginPage to avoid loading it until needed
const LoginPage = lazy(() => 
  import('../../pages/LoginPage').then(module => ({
    default: (props: LoginPageProps) => <module.LoginPage {...props} />
  }))
);

export function ProtectedRoute() {
  const { currentUser, isAuthLoading, authInitialized } = useApp();
  const location = useLocation();
  
  // Store the current route for potential login redirect
  useEffect(() => {
    if (location.pathname !== '/login') {
      sessionStorage.setItem('redirectPath', location.pathname);
    }
  }, [location.pathname]);

  console.log('ProtectedRoute: Auth state -', { 
    currentUser: currentUser?.email || 'none', 
    isAuthLoading, 
    authInitialized 
  });

  // If Firebase hasn't initialized yet, or we're explicitly loading, show skeleton
  if (!authInitialized || isAuthLoading) {
    console.log('ProtectedRoute: Showing skeleton - auth not ready');
    return <DashboardSkeleton />;
  }

  // If auth is initialized and we have no user, show login
  if (authInitialized && !currentUser) {
    console.log('ProtectedRoute: Showing login - no authenticated user');
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <LoginPage noRedirect />
      </Suspense>
    );
  }

  // User is authenticated, render the requested route
  console.log('ProtectedRoute: User authenticated, rendering protected route');
  return <Outlet />;
}
