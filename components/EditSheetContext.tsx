import { createContext, useContext, useState } from 'react';

interface EditSheetContextType {
  openEditSheet: () => void;
  closeEditSheet: () => void;
  isOpen: boolean;
}

const EditSheetContext = createContext<EditSheetContextType>({
  openEditSheet: () => {},
  closeEditSheet: () => {},
  isOpen: false,
});

export function useEditSheet() {
  return useContext(EditSheetContext);
}

export function EditSheetProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openEditSheet = () => setIsOpen(true);
  const closeEditSheet = () => setIsOpen(false);

  return (
    <EditSheetContext.Provider value={{ openEditSheet, closeEditSheet, isOpen }}>
      {children}
    </EditSheetContext.Provider>
  );
}