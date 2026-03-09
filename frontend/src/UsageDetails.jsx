import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";

function UsageDetails() {
  const [yearlyUsage, setYearlyUsage] = useState({});
  const [selectedYear, setSelectedYear] = useState(null);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const api = queryParams.get("api");

  useEffect(() => {
    fetchUsage();
  }, [api]);

  const fetchUsage = async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `http://localhost:5000/api/usage/monthly?api=${encodeURIComponent(api)}`
      );
      setYearlyUsage(res.data);
    } catch (err) {
      console.error("Error fetching usage per year/month:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container my-5">
      <h4 className="mb-4">
        Usage Details for <code style={{ wordBreak: "break-all" }}>{api}</code>
      </h4>

      {loading ? (
        <div>Loading usage...</div>
      ) : Object.keys(yearlyUsage).length === 0 ? (
        <div>No usage data found.</div>
      ) : (
        <>
          <div className="mb-4">
            <strong>Select Year:</strong>
            <div className="d-flex flex-wrap gap-2 mt-2">
              {Object.keys(yearlyUsage).map((year) => (
                <button
                  key={year}
                  className={`yearButton btn btn-sm ${
                    year === selectedYear
                      ? "btn-primary"
                      : "btn-outline-secondary"
                  }`}
                  onClick={() => setSelectedYear(year)}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          {selectedYear && (
            <>
              <h6>Monthly Usage for {selectedYear}</h6>
              <ul className="list-group">
                {Object.entries(yearlyUsage[selectedYear])
                  .sort(([a], [b]) => a - b)
                  .map(([month, count]) => (
                    <li
                      className="list-group-item d-flex justify-content-between"
                      key={month}
                    >
                      <span>{getMonthName(month)}</span>{" "}
                      <span>{count} hits</span>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

// Utility to map "01" => "January"
function getMonthName(monthNum) {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const index = parseInt(monthNum, 10) - 1;
  return monthNames[index] || monthNum;
}

export default UsageDetails;
