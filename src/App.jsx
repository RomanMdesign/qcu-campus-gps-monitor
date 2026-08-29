import {
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
  auth,
  database,
  ref,
  onValue,
} from "./firebase";

import {
  signOut,
} from "firebase/auth";

import AuthPanel from "./components/AuthPanel";

import StudentTracker from "./components/StudentTracker";

import AdminDashboard from "./components/AdminDashboard";

export default function App() {
  const [firebaseUser, setFirebaseUser] =
    useState(null);

  const [profile, setProfile] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      (user) => {
        setFirebaseUser(user);
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    if (!firebaseUser) {
      setProfile(null);
      return;
    }

    const userRef = ref(
      database,
      `users/${firebaseUser.uid}`
    );

    return onValue(
      userRef,
      (snapshot) => {
        setProfile(
          snapshot.val() || {
            uid: firebaseUser.uid,
            name:
              firebaseUser.displayName ||
              firebaseUser.email,
            email:
              firebaseUser.email,
            role: "student",
          }
        );
      }
    );
  }, [firebaseUser]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-box">
          <div className="spinner" />
          <strong>
            QCU CAMPUS GPS
          </strong>
          <span>
            INITIALIZING SYSTEM...
          </span>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <AuthPanel />;
  }

  const isAdmin =
    profile?.isAdmin === true;

  if (isAdmin) {
    return (
      <AdminDashboard
        user={{
          ...firebaseUser,
          ...profile,
        }}
      />
    );
  }

  return (
    <StudentTracker
      user={{
        ...firebaseUser,
        ...profile,
      }}
      onLogout={() =>
        signOut(auth)
      }
    />
  );
}
