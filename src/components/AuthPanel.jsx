import { useState } from "react";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

import {
  auth,
  database,
  ref,
  set,
} from "../firebase";

const USER_ROLES = [
  "student",
  "faculty",
  "staff",
  "guest",
];

export default function AuthPanel() {
  const [mode, setMode] = useState("login");

  const [name, setName] = useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [role, setRole] = useState("student");

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        if (!name.trim()) {
          throw new Error("Please enter your name.");
        }

        const result =
          await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );

        await updateProfile(result.user, {
          displayName: name.trim(),
        });

        await set(
          ref(database, `users/${result.user.uid}`),
          {
            uid: result.user.uid,
            name: name.trim(),
            email: result.user.email,
            role,
            status: "offline",
            createdAt: Date.now(),
          }
        );
      } else {
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
      }
    } catch (err) {
      setError(
        err?.message ||
          "Authentication failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="qcu-logo-placeholder">
            QCU
          </div>

          <div>
            <h1>QCU CAMPUS GPS</h1>
            <p>LIVE LOCATION MONITOR</p>
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={
              mode === "login"
                ? "active"
                : ""
            }
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            LOGIN
          </button>

          <button
            className={
              mode === "register"
                ? "active"
                : ""
            }
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            REGISTER
          </button>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          {mode === "register" && (
            <>
              <label>
                Full Name

                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Your name"
                />
              </label>

              <label>
                User Type

                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value)
                  }
                >
                  {USER_ROLES.map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="name@example.com"
              required
            />
          </label>

          <label>
            Password

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Password"
              required
            />
          </label>

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          <button
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? "PLEASE WAIT..."
              : mode === "login"
              ? "SIGN IN"
              : "CREATE ACCOUNT"}
          </button>
        </form>

        <div className="privacy-note">
          GPS sharing is optional and requires
          your permission.
        </div>
      </div>
    </div>
  );
}
