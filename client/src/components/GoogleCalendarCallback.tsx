import { useEffect } from "react";
import { LoadingScreen } from "./LoadingScreen";

export function GoogleCalendarCallback() {
  useEffect(() => {
    // Get authorization code from URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      // Send error to parent window
      if (window.opener) {
        window.opener.postMessage(
          { type: 'google_oauth_error', error },
          '*' // Allow any origin for OAuth callback
        );
      }
      window.close();
      return;
    }

    if (code) {
      // Send code to parent window
      if (window.opener) {
        window.opener.postMessage(
          { type: 'google_oauth_success', code },
          '*' // Allow any origin for OAuth callback
        );
      }
      
      // Close popup after a short delay
      setTimeout(() => {
        window.close();
      }, 1000);
    }
  }, []);

  return <LoadingScreen message="กำลังเชื่อมต่อ Google Calendar..." />;
}
