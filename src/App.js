import React from "react";
import { Route, Switch, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { ProtectedRoute, ScrollManager } from "./components/common";
import Home from "./pages/Home";
import Discover from "./pages/Discover";
import CampaignDetail from "./pages/CampaignDetail";
import StartCampaign from "./pages/StartCampaign";
import Dashboard from "./pages/Dashboard";
import { Login, Register } from "./pages/Auth";
import { HowItWorks, Stories } from "./pages/Info";
import NotFound from "./pages/NotFound";

export default function App() {
  const { pathname } = useLocation();
  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <div className="app">
      <ScrollManager />
      {!isAuthPage && <Navbar />}
      <main className="app__main">
        <Switch>
          <Route exact path="/" component={Home} />
          <Route path="/discover" component={Discover} />
          <Route path="/campaigns/:id" component={CampaignDetail} />
          <Route path="/how-it-works" component={HowItWorks} />
          <Route path="/stories" component={Stories} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <ProtectedRoute path="/start" component={StartCampaign} />
          <ProtectedRoute path="/dashboard" component={Dashboard} />
          <Route component={NotFound} />
        </Switch>
      </main>
      {!isAuthPage && <Footer />}
    </div>
  );
}
