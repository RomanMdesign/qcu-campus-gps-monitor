import { useEffect, useState } from "react";

import {
  onAuthStateChanged,
  auth,
  database,
  ref,
  onValue,
} from "./firebase";

import { signOut } from "firebase/auth";

import AuthPanel from "./components/AuthPanel";
import StudentTracker from "./components/StudentTracker";
import AdminDashboard from "./components/AdminDashboard";

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      return onAuthStateChanged(auth, (user) => {
        setFirebaseUser(user);
        setLoading(false);
      });
    } catch (err) {
      console.error(err);
      setError(err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!firebaseUser) {
      setProfile(null);
      return;
    }

    try {
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
              email: firebaseUser.email,
              role: "student",
            }
          );
        },
        (err) => {
          console.error(err);
          setError(err);
        }
      );
    } catch (err) {
      console.error(err);
      setError(err);
    }
  }, [firebaseUser]);

  // TEMPORARY ERROR SCREEN
  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#111827",
          color: "white",
          padding: "30px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1 style={{ color: "#ff5555" }}>
          QCU CAMPUS GPS ERROR
        </h1>

        <p>
          The application started but encountered an
          error.
        </p>

        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "#000",
            padding: "20px",
            borderRadius: "10px",
            overflowX: "auto",
          }}
        >
          {error?.message ||
            String(error)}
        </pre>

        <p>
          Take a screenshot of this screen and send it
          to me.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#111827",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "4px solid #374151",
            borderTop: "4px solid #60a5fa",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            marginBottom: "20px",
          }}
        />

        <h2>QCU CAMPUS GPS</h2>

        <p>
          Connecting to Firebase...
        </p>
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
      onLogout={() => signOut(auth)}
    />
  );
}
