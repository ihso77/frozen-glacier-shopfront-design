"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://ogtwquccqenwyzrozpvt.supabase.co";

const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ndHdxdWNjcWVud3l6cm96cHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjIzMDIsImV4cCI6MjA4NTc5ODMwMn0.4ASsdjbz_nSuzVwN2aP8mTlJV4_K-ZjxVCu8iiHRDog";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface User {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    role: "user" | "owner" | "admin" | "member" | "customer" | "vip_customer" | "supplier";
    avatar?: string;
    createdAt: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const buildUser = async (sessionUser: any): Promise<User> => {
    const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase
            .from("profiles")
            .select("full_name, email, phone, created_at")
            .eq("user_id", sessionUser.id)
            .maybeSingle(),
        supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", sessionUser.id),
    ]);

    const resolvedRole =
        roles?.find((entry) => entry.role === "owner")?.role ||
        roles?.[0]?.role ||
        "customer";

    return {
        id: sessionUser.id,
        email: profile?.email || sessionUser.email || "",
        name:
            profile?.full_name ||
            sessionUser.user_metadata?.name ||
            sessionUser.user_metadata?.full_name ||
            "User",
        phone: profile?.phone || sessionUser.user_metadata?.phone || null,
        role: resolvedRole,
        avatar: sessionUser.user_metadata?.avatar,
        createdAt: profile?.created_at || sessionUser.created_at || new Date().toISOString(),
    };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (session?.user) {
                    setUser(await buildUser(session.user));
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error("Auth session error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session?.user) {
                    setUser(await buildUser(session.user));
                } else {
                    setUser(null);
                }
                setLoading(false);
            }
        );

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
