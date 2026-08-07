import { useEffect, useState } from 'react';
import { registerServiceWorker, isPushNotificationSupported, isPushNotificationPermitted } from '@/utils/pwaUtils';
import { NotificationPermission } from './NotificationPermission';

interface PWAInitializerProps {
  autoAskPermission?: boolean;
  delayPermissionPrompt?: number; // Delay in milliseconds
}

export function PWAInitializer({ 
  autoAskPermission = true,
  delayPermissionPrompt = 3000 // Default 3 seconds
}: PWAInitializerProps) {
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize PWA and service worker
  useEffect(() => {
    const initializePWA = async () => {
      try {
        // Register service worker
        const registration = await registerServiceWorker();
        
        if (registration) {
          console.log('PWA initialized successfully');
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize PWA:', error);
      }
    };

    initializePWA();
  }, []);

  // Handle notification permission prompt with delay
  useEffect(() => {
    if (!isInitialized || !autoAskPermission) return;

    const checkAndPromptForPermission = async () => {
      // Only show prompt if push is supported and not already permitted
      if (isPushNotificationSupported() && !(await isPushNotificationPermitted())) {
        // Delay the prompt to avoid overwhelming the user on first visit
        const timer = setTimeout(() => {
          setShowPermissionPrompt(true);
        }, delayPermissionPrompt);
        
        return () => clearTimeout(timer);
      }
    };
    
    checkAndPromptForPermission();
  }, [isInitialized, autoAskPermission, delayPermissionPrompt]);

  // Auto-dismiss after 15 seconds with fade-out animation
  useEffect(() => {
    if (!showPermissionPrompt) return;
    
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 12000); // Start fade-out at 12s
    
    const removeTimer = setTimeout(() => {
      setShowPermissionPrompt(false);
      setIsFadingOut(false);
    }, 15000); // Fully removed at 15s
    
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [showPermissionPrompt]);

  const handleClose = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setShowPermissionPrompt(false);
      setIsFadingOut(false);
    }, 300); // Match animation duration
  };

  return showPermissionPrompt ? (
    <div 
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[90] w-full max-w-md px-4 transition-opacity duration-300 ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <NotificationPermission 
        onClose={handleClose}
        showOnlyIfNotGranted={true}
      />
    </div>
  ) : null;
}
