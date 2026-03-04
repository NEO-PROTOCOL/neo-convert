import type { Metadata } from "next";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
    title: "JPG para PDF — NeoConvert",
    description: "Converta imagens JPG e PNG para PDF gratuitamente.",
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
