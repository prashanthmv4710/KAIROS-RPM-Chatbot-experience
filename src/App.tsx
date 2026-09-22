import * as React from 'react';
import { useInitializeTheming } from "./utils/Theming";
import { useInitializeStore } from "./utils/store";
import { A11yAnnouncementProvider } from "./components/A11yAnnouncement";
import { A11yDevAssertions } from "./components/A11yDevAssertions";
import { Page } from "./components/Page";

import { KairosChatPage } from "./pages/KairosChatPage";

export default function App() {
  useInitializeTheming('Walmart', ['Walmart'] as const);
  useInitializeStore();

  return (
    <A11yAnnouncementProvider>
      <A11yDevAssertions />
      <KairosChatPage />
    </A11yAnnouncementProvider>
  );
}
