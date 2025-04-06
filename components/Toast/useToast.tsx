import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from './Toast';

interface ToastContextType {
  showToast: (
    message: string,
    type?: 'success' | 'error' | 'info',
    duration?: number,
    position?: 'top' | 'bottom'
  ) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
    duration: number;
    position: 'top' | 'bottom';
  }>({
    visible: false,
    message: '',
    type: 'info',
    duration: 3000,
    position: 'top',
  });

  const showToast = useCallback((
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
    duration: number = 3000,
    position: 'top' | 'bottom' = 'top'
  ) => {
    setToast({
      visible: true,
      message,
      type,
      duration,
      position,
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          position={toast.position}
          onHide={hideToast}
        />
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}; 