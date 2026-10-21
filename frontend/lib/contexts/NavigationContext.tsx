"use client";

import React, { createContext, useContext, useState } from 'react';

interface NavigationUIContextType {
    hideMobileNav: boolean;
    setHideMobileNav: (hide: boolean) => void;
}

const NavigationUIContext = createContext<NavigationUIContextType>({
    hideMobileNav: false,
    setHideMobileNav: () => {},
});

export function NavigationUIProvider({ children }: { children: React.ReactNode }) {
    const [hideMobileNav, setHideMobileNav] = useState(false);

    return (
        <NavigationUIContext.Provider value={{ hideMobileNav, setHideMobileNav }}>
            {children}
        </NavigationUIContext.Provider>
    );
}

export function useNavigationUI() {
    return useContext(NavigationUIContext);
}
