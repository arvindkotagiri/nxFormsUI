import { useEffect, useRef } from "react";
import { toast } from "sonner";

const flaskAPI = import.meta.env.VITE_FLASK_API;
const POLL_INTERVAL = 5000; // 5 seconds

const logToUI = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
  const event = new CustomEvent('agent-log', {
    detail: {
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    }
  });
  window.dispatchEvent(event);
};

export function PrintAgent() {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const processJobs = async (siteId: string) => {
    try {
      // 1. Fetch pending jobs
      const res = await fetch(`${flaskAPI}/api/jobs/pending/${siteId}`);
      if (!res.ok) return;
      
      const jobs = await res.json();
      if (!Array.isArray(jobs) || jobs.length === 0) return;

      logToUI(`Found ${jobs.length} pending jobs for site ${siteId}`, 'info');

      for (const job of jobs) {
        const { id, payload, ip_address } = job;
        
        logToUI(`Processing job ${id.substring(0, 8)} for printer ${ip_address}`, 'info');

        // 2. Direct print via the backend's direct-print endpoint
        // Since the browser can't do raw sockets, we tell our (local) backend to do it
        try {
          const printRes = await fetch(`${flaskAPI}/api/direct-print`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ip_address,
              payload
            })
          });

          const status = printRes.ok ? "COMPLETED" : "FAILED";
          const error_msg = printRes.ok ? null : (await printRes.json()).error;

          // 3. Update status back to server
          await fetch(`${flaskAPI}/api/jobs/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, error_msg })
          });

          if (printRes.ok) {
            logToUI(`Job ${id.substring(0, 8)} printed successfully`, 'success');
            toast.success(`Job ${id.substring(0, 8)} printed successfully`);
          } else {
            logToUI(`Job ${id.substring(0, 8)} failed: ${error_msg}`, 'error');
            toast.error(`Job ${id.substring(0, 8)} failed: ${error_msg}`);
          }
        } catch (err) {
          logToUI(`Error printing job ${id.substring(0, 8)}: ${err}`, 'error');
          console.error(`[PrintAgent] Error printing job ${id}:`, err);
          await fetch(`${flaskAPI}/api/jobs/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: "FAILED", error_msg: String(err) })
          });
        }
      }
    } catch (err) {
      console.error("[PrintAgent] Polling error:", err);
    }
  };

  const startPolling = async () => {
    if (timerRef.current) return;

    // Check if agent is enabled in settings
    try {
      const res = await fetch(`${flaskAPI}/model-configs`);
      const configs = await res.json();
      
      if (configs.agent_enabled === 'true' && configs.agent_site_id) {
        logToUI(`Agent started for site: ${configs.agent_site_id}`, 'success');
        timerRef.current = setInterval(() => processJobs(configs.agent_site_id), POLL_INTERVAL);
        // Run once immediately
        processJobs(configs.agent_site_id);
      } else {
        logToUI("Agent is disabled in settings", "info");
      }
    } catch (err) {
      logToUI(`Failed to load agent config: ${err}`, 'error');
    }
  };

  const stopPolling = () => {
    if (timerRef.current) {
      console.log("[PrintAgent] Stopping polling");
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    startPolling();

    // Listen for setting changes from the Settings page
    const handleStorageChange = () => {
      stopPolling();
      startPolling();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      stopPolling();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return null; // This component doesn't render anything
}
