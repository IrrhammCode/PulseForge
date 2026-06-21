import {
  Switch,
  Route,
  Redirect,
  useParams,
  Router as WouterRouter,
} from "wouter";

import { AppShell } from "@/components/layout/AppShell";
import { ChunkLoadRecovery } from "@/components/layout/ChunkLoadRecovery";
import { StudioHubShell } from "@/components/studio/StudioHubShell";
import { isOnboardedClient } from "@/lib/onboarding";

import WelcomePage from "@/app/welcome/page";
import DashboardRoutePage from "@/app/dashboard/page";
import AnalyzePage from "@/app/analyze/page";
import StudioPage from "@/app/studio/page";
import ViralRoutePage from "@/app/viral/page";
import PartnersPage from "@/app/partners/page";
import IntegrationsRoutePage from "@/app/integrations/page";
import SettingsPage from "@/app/settings/page";
import HelpPage from "@/app/help/page";

import { WriteTab } from "@/components/studio/WriteTab";
import { ProduceTab } from "@/components/studio/ProduceTab";
import { AnalyzeTab } from "@/components/studio/AnalyzeTab";
import { CompareTab } from "@/components/studio/CompareTab";
import { LaunchTab } from "@/components/studio/LaunchTab";

function Protected({ children }: { children: React.ReactNode }) {
  if (!isOnboardedClient()) return <Redirect to="/welcome" />;
  return <>{children}</>;
}

function StudioTab({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <StudioHubShell>{children}</StudioHubShell>
    </Protected>
  );
}

function StudioIndexRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Redirect to={`/studio/${id}/write`} />;
}

/** Container that mirrors the old analyze/viral route layouts. */
function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">{children}</div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/welcome" component={WelcomePage} />

      <Route path="/dashboard">
        <Protected>
          <DashboardRoutePage />
        </Protected>
      </Route>

      <Route path="/analyze">
        <Protected>
          <PageContainer>
            <AnalyzePage />
          </PageContainer>
        </Protected>
      </Route>

      <Route path="/studio/:id/write">
        <StudioTab>
          <WriteTab />
        </StudioTab>
      </Route>
      <Route path="/studio/:id/produce">
        <StudioTab>
          <ProduceTab />
        </StudioTab>
      </Route>
      <Route path="/studio/:id/analyze">
        <StudioTab>
          <AnalyzeTab />
        </StudioTab>
      </Route>
      <Route path="/studio/:id/compare">
        <StudioTab>
          <CompareTab />
        </StudioTab>
      </Route>
      <Route path="/studio/:id/launch">
        <StudioTab>
          <LaunchTab />
        </StudioTab>
      </Route>
      <Route path="/studio/:id">
        <Protected>
          <StudioIndexRedirect />
        </Protected>
      </Route>
      <Route path="/studio">
        <Protected>
          <StudioPage />
        </Protected>
      </Route>

      <Route path="/viral">
        <Protected>
          <PageContainer>
            <ViralRoutePage />
          </PageContainer>
        </Protected>
      </Route>

      <Route path="/partners">
        <Protected>
          <PartnersPage />
        </Protected>
      </Route>

      <Route path="/integrations">
        <Protected>
          <IntegrationsRoutePage />
        </Protected>
      </Route>

      <Route path="/settings">
        <Protected>
          <SettingsPage />
        </Protected>
      </Route>

      <Route path="/help">
        <Protected>
          <HelpPage />
        </Protected>
      </Route>

      <Route path="/">
        <Redirect to="/welcome" />
      </Route>

      <Route>
        <Redirect to="/welcome" />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <ChunkLoadRecovery />
      <AppShell>
        <Router />
      </AppShell>
    </WouterRouter>
  );
}

export default App;
