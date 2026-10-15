import { create } from "zustand";

interface SelectedDeviceState {
  selectedDeviceId: string | null;
  setSelectedDeviceId: (id: string | null) => void;
}

export const useSelectedDeviceStore = create<SelectedDeviceState>((set) => ({
  selectedDeviceId: null,
  setSelectedDeviceId: (id) => set({ selectedDeviceId: id }),
}));
