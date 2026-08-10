import { useEffect, useRef } from "react";
import { toast } from "sonner";

const nodeAPI = import.meta.env.VITE_NODE_API || (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}/node` : "http://localhost:4000");
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

  // Send error logs to logs_audit DB table so they appear on Logs & Audit page
  if (type === 'error') {
    fetch(`${nodeAPI}/api/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'ERROR',
        service: 'PRINT_AGENT',
        message: message,
        username: 'PrintAgent'
      })
    }).catch(() => {});
  }
};

export function PrintAgent() {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const processJobs = async (siteId: string) => {
    try {
      // 1. Fetch pending jobs from Node backend
      const res = await fetch(`${nodeAPI}/api/jobs/pending/${siteId}`);
      if (!res.ok) return;
      
      const jobs = await res.json();
      if (!Array.isArray(jobs) || jobs.length === 0) return;

      logToUI(`Found ${jobs.length} pending jobs for site ${siteId}`, 'info');

      for (const job of jobs) {
        const { id, payload, ip_address } = job;
        
        logToUI(`Processing job ${id.substring(0, 8)} for printer ${ip_address}`, 'info');

        // 2. Direct print via the backend's direct-print endpoint
        try {
          const printRes = await fetch(`${nodeAPI}/api/direct-print`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ip_address,
              payload
            })
          });

          const status = printRes.ok ? "COMPLETED" : "FAILED";
          const error_msg = printRes.ok ? null : (await printRes.json()).error;

          if (status === "COMPLETED") {
            logToUI(`Successfully printed job ${id.substring(0, 8)}`, 'success');
          } else {
            logToUI(`Failed to print job ${id.substring(0, 8)}: ${error_msg}`, 'error');
          }

          // 3. Update job status on backend
          await fetch(`${nodeAPI}/api/jobs/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, error_msg })
          });
        } catch (err) {
          logToUI(`Error processing job ${id.substring(0, 8)}: ${err}`, 'error');
          await fetch(`${nodeAPI}/api/jobs/${id}/status`, {
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
      const res = await fetch(`${nodeAPI}/api/model-configs`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
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
