import type { Metadata } from "next";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
    title: "Deletar páginas — NeoConvert",
    description: "Remova páginas específicas de um PDF com precisão.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <div className="neo-bg-grid" />
            <div className="neo-orb neo-orb-1" />
            <div className="neo-orb neo-orb-2" />
            <div className="glow-line" />
            <div style={{ position: "relative", zIndex: 1 }}>
                <Navbar />
                {children}
            </div>
        </>
    );
}
