import "bootstrap/dist/css/bootstrap.min.css";
import { useEffect, useState } from "react";
import { Container, Toast, ToastBody } from "react-bootstrap";
import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import "./App.css";
import { StartLayout } from "./components/StartLayout";
import NavHeader from "./components/NavHeader";
import NotFound from "./components/NotFoundComponent";
import { MatchLayout } from "./components/MatchLayout";
import API from "./API.mjs";
import { LoginForm } from "./components/Auth";
import { HistoryLayout } from "./components/HistoryLayout";

function App() {
  const [user, setUser] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);

  // feedback message to be shown in the toast
  const [feedback, setFeedback] = useState("");

  const setFeedbackFromError = (err) => {
    let message = "";
    if (err.message) message = err.message;
    else message = "Unknown Error";
    setFeedback(message);
  };

  useEffect(() => {
    // Checking if the user is already logged-in
    API.getUserInfo()
      .then((user) => {
        setLoggedIn(true);
        setUser(user);
      })
      .catch((e) => {
        if (loggedIn)
          setFeedbackFromError(e);
        setLoggedIn(false);
        setUser(null);
      });
  }, []);

  const handleLogin = async (credentials) => {
    const user = await API.logIn(credentials);
    setUser(user);
    setLoggedIn(true);
    setFeedback("Welcome, " + user.name);
  };

  const handleLogout = async () => {
    await API.logOut();
    // clean up everything
    setLoggedIn(false);
    setUser(null);
  };

  return (
    <div>
      <Routes>
        <Route
          element={
            <>
              <NavHeader
                logout={handleLogout}
                user={user}
                loggedIn={loggedIn}
              />
              <Container fluid className="mt-3">
                <Outlet />
              </Container>
            </>
          }
        >
          <Route index element={<StartLayout />} />
          <Route
            path="/match"
            element={<MatchLayout user={user} loggedIn={loggedIn} />}
          />
          <Route
            path="/login"
            element={
              loggedIn ? (
                <Navigate replace to="/" />
              ) : (
                <LoginForm login={handleLogin} />
              )
            }
          />
          <Route
            path="/history"
            element={
              loggedIn ? (
                <HistoryLayout user={user} loggedIn={loggedIn} />
              ) : (
                <Navigate replace to="/" />
              )
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toast
        show={feedback !== ""}
        autohide
        onClose={() => setFeedback("")}
        delay={4000}
        position="top-end"
        className="position-fixed end-0 m-3"
      >
        <ToastBody>{feedback}</ToastBody>
      </Toast>
    </div>
  );
}

export default App;
