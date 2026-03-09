import React, { useEffect, useState } from "react";
import axios from "axios";
import "./styles.css";
import { useNavigate } from "react-router-dom";

const statusStyles = {
  Healthy: "bg-success",
  Down: "bg-danger",
  Degraded: "bg-warning",
};

const getStatusColor = (status) => {
  switch (status) {
    case "Healthy":
      return "green";
    case "Degraded":
      return "orange";
    case "Down":
      return "red";
    default:
      return "gray";
  }
};

function App() {
  const [apis, setApis] = useState([]);
  const [lastChecked, setLastChecked] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [usage, setUsage] = useState({});
  const [monthlyUsage, setMonthlyUsage] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchStatus();
    fetchUsage();
    fetchMonthlyUsage();
    const interval = setInterval(fetchUsage, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/status");
      setApis(res.data);
      updateLastChecked();
    } catch (error) {
      console.log("Fetch Failed: ", error);
    } finally {
      setLoading(false);
    }
  };

  const updateLastChecked = () => {
    const formattedDateTime = new Date().toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
      hour12: false,
    });

    const [date, time] = formattedDateTime.split(", ");
    const [day, month, year] = date.split("/");
    const formatted = `${year}-${month}-${day} ${time} CET`;
    setLastChecked(formatted);
  };

  const retryAPI = async (url) => {
    try {
      const res = await axios.get("http://localhost:5000/api/retry", {
        params: { url },
      });
      const result = res.data;

      if (result.error) {
        console.error("Retry response error:", result.error);
      }
      // Replace the old result with the new one
      setApis((prevStatuses) =>
        prevStatuses.map((api) => (api.url === url ? res.data : api))
      );
      updateLastChecked();
    } catch (err) {
      console.error("Retry failed for:", url, err.message);
    }
  };

  const fetchUsage = async () => {
    setLoadingUsage(true);
    try {
      const res = await axios.get("http://localhost:5000/api/usage");
      setUsage(res.data);
      console.log(JSON.stringify(res.data));
    } catch (err) {
      console.error("Error fetchin usage:", err);
    } finally {
      setLoadingUsage(false);
    }
  };

  const fetchMonthlyUsage = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/usage/monthly");
      setMonthlyUsage(res.data);
    } catch (err) {
      console.error("Error fetching monthly usage:", err);
    }
  };

  const goToDetails = (apiUrl) => {
    navigate(`/details?api=${encodeURIComponent(apiUrl)}`);
  };

  return (
    <div className="container my-5">
      <h3 className="mb-3">
        <i className="bi bi-wrench-adjustable-circle me-2"></i>
        <b>API Connectivity Dashboard</b>
      </h3>

      <div className="sub-header-panel d-flex justify-content-left align-items-center gap-3">
        <h5 className="mb-0 me-2">
          <strong>Last checked: </strong> {lastChecked} &nbsp;&nbsp;&nbsp; |
        </h5>

        <div className="d-flex align-items-center gap-2">
          <h5 className="mb-0">
            <strong>Refresh Status</strong>
          </h5>
          <button
            className="btn btn-outline-primary btn-sm refresh-button"
            onClick={fetchStatus}
            disabled={loading}
          >
            {loading ? (
              <span
                className="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              ></span>
            ) : (
              <i className="bi bi-arrow-repeat me-1"></i>
            )}
          </button>
        </div>

        <div className="d-flex align-items-center gap-2">
          <h5 className="mb-0">
            <strong>Refresh Usage Count</strong>
          </h5>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={fetchUsage}
            disabled={loadingUsage}
          >
            {loadingUsage ? (
              <span className="spinner-border spinner-border-sm me-1"></span>
            ) : (
              <i className="bi bi-bar-chart-line me-1"></i>
            )}
          </button>
        </div>
      </div>

      <table className="table table-bordered table-hover bg-white">
        <thead className="table-light">
          <tr>
            <th>API Name</th>
            <th>Status</th>
            <th>Response Time</th>
            <th>Last Error</th>
            <th>Usage Count</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {apis.map((api, index) => (
            <tr key={index}>
              <td>{api.apiName}</td>
              {/* <td style={{ color: getStatusColor(api.status) }}>
                {api.status}
              </td>
              */}
              <td>
                <span
                  className={`d-inline-block rounded-circle me-2 ${
                    statusStyles[api.status]
                  }`}
                  style={{ width: "12px", height: "12px" }}
                ></span>
                {api.status}
              </td>
              <td>{api.responseTime ? `${api.responseTime} ms` : "—"}</td>
              <td>{api.lastError || "—"}</td>
              <td>{usage[new URL(api.url).pathname] || "-"}</td>
              <td>
                <div className="d-flex align-items-center gap-2">
                  {api.status !== "Healthy" && (
                    <button
                      onClick={() => retryAPI(api.url)}
                      class="btn btn-primary btn-sm"
                    >
                      <i
                        className="bi bi-arrow-clockwise me-2"
                        color="white"
                        role="button"
                        title="Retry"
                      ></i>
                    </button>
                  )}{" "}
                  &nbsp;&nbsp;&nbsp;
                  <button
                    onClick={() => goToDetails(api.url)}
                    className="btn btn-outline-secondary btn-sm"
                    data-bs-toggle="tooltip"
                    data-bs-placement="top"
                    title="View details"
                    type="button"
                  >
                    <i className="bi bi-eye text-secondary" role="button"></i>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/*
   <div>
        {Object.entries(monthlyUsage).map(([api, months]) => (
          <div key={api} className="mb-3">
            <h6>{api}</h6>
            <ul className="list-group">
              {Object.entries(months).map(([month, count]) => (
                <li
                  className="list-group-item d-flex justify-content-between"
                  key={month}
                >
                  <span>{month}</span> <span>{count} hits</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
*/}
    </div>
  );
}

export default App;
