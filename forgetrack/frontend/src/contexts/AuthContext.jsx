import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const profileRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Auth init error:", err);
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event);
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        // Only fetch if we don't have it or it's a different user
        if (!profileRef.current || profileRef.current.id !== session.user.id) {
          await fetchProfile(session.user.id);
        }
      } else {
        setUser(null);
        setProfile(null);
        profileRef.current = null;
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId) => {
    console.log("Fetching profile for user:", userId);
    try {
      // Add a timeout to the profile fetch
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 8000)
      );

      console.log("fetchProfile: Executing Supabase query...");
      const fetchPromise = supabase
        .from('users')
        .select('id, email, role, display_name')
        .eq('id', userId)
        .maybeSingle();

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
      console.log("fetchProfile: Query returned. Data:", !!data, "Error:", !!error);
      
      if (error) {
        console.error("Profile fetch error:", error);
        setLoading(false);
      } else if (data) {
        console.log("Profile found:", data.role);
        profileRef.current = data;
        setProfile(data);
      } else {
        console.warn("No profile found in public.users for ID:", userId);
      }
    } catch (err) {
      console.error("Unexpected error in fetchProfile:", err);
    } finally {
      console.log("Auth context initialization complete");
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log("Signing out...");
      await supabase.auth.signOut();
      // Force clear state just in case onAuthStateChange is slow
      setUser(null);
      setProfile(null);
      window.location.href = '/login';
    } catch (err) {
      console.error("Logout error:", err);
      // Fallback redirect
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
