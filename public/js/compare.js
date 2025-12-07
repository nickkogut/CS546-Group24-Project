// public/js/compare.js
(() => {
  document.addEventListener("DOMContentLoaded", () => {
    // === Unified graph section elements ===
    const jobSelect = document.getElementById("jobSelect");
    const salaryInput = document.getElementById("salaryInput");
    const chartTypeSelect = document.getElementById("chartType");
    const compareBtn = document.getElementById("compareBtn");
    const statusP = document.getElementById("status");
    const histCanvas = document.getElementById("histChart");
    const histCtx = histCanvas ? histCanvas.getContext("2d") : null;
    const filterAgency = document.getElementById("filterAgency");
    const filterBorough = document.getElementById("filterBorough");
    const filterMinSalary = document.getElementById("filterMinSalary");
    const listingLink = document.getElementById("listingLink");

    // === Job Stats elements ===
    const fromJobInput = document.getElementById("fromJobInput");
    const findTransitionsBtn = document.getElementById("findTransitionsBtn");
    const transitionsList = document.getElementById("transitionsList");
    const transitionsStatus = document.getElementById("transitionsStatus");
    const compareSelectedBtn = document.getElementById("compareSelectedBtn");
    const compareResults = document.getElementById("compareResults");

    let chartInstance = null;

    function formatMoney(n) {
      if (typeof n !== "number" || !Number.isFinite(n)) return "$0";
      return "$" + Math.round(n).toLocaleString();
    }

    function cleanAndSortSalaries(rawArr) {
      if (!Array.isArray(rawArr)) return [];
      return rawArr
        .map((s) => {
          if (s === null || s === undefined) return NaN;
          if (typeof s === "string") {
            s = s.replace(/[,$\s]/g, "");
          }
          return Number(s);
        })
        .filter((v) => Number.isFinite(v) && v >= 0)
        .sort((a, b) => a - b);
    }

    function destroyChart(ch) {
      if (ch) {
        try {
          ch.destroy();
        } catch (_) {
          // ignore
        }
      }
    }

    function buildHistogramBins(salaries, userSalary) {
      salaries = Array.isArray(salaries) ? salaries.slice() : [];
      salaries = salaries.map(Number).filter(Number.isFinite);

      let maxSalary = 0;
      if (salaries.length) maxSalary = Math.max(...salaries);
      if (typeof userSalary === "number" && Number.isFinite(userSalary)) {
        maxSalary = Math.max(maxSalary, userSalary);
      }

      if (maxSalary < 10000) maxSalary = 10000;

      let rawBin = Math.ceil(maxSalary / 10);
      const niceSteps = [1000, 5000, 10000, 25000, 50000, 100000];
      let binSize =
        niceSteps.find((s) => rawBin <= s) ||
        Math.ceil(rawBin / 100000) * 100000;
      if (binSize < 10000) binSize = 10000;

      const bins = [];
      for (let start = 0; start <= maxSalary + binSize; start += binSize) {
        bins.push({
          start,
          end: start + binSize,
          count: 0,
          label: `${formatMoney(start)} - ${formatMoney(start + binSize)}`,
        });
      }

      salaries.forEach((s) => {
        const b = bins.find((bin) => s >= bin.start && s < bin.end);
        if (b) b.count++;
        else {
          const last = bins[bins.length - 1];
          const newStart = last.end;
          bins.push({
            start: newStart,
            end: newStart + binSize,
            count: 1,
            label: `${formatMoney(newStart)} - ${formatMoney(
              newStart + binSize
            )}`,
          });
        }
      });

      if (typeof userSalary === "number" && Number.isFinite(userSalary)) {
        let ub = bins.find(
          (bin) => userSalary >= bin.start && userSalary < bin.end
        );
        if (ub) {
          ub.count += 1;
          ub._userIncluded = true;
        } else {
          const last = bins[bins.length - 1];
          const newStart = last.end;
          bins.push({
            start: newStart,
            end: newStart + binSize,
            count: 1,
            label: `${formatMoney(newStart)} - ${formatMoney(
              newStart + binSize
            )}`,
            _userIncluded: true,
          });
        }
      }

      return { bins, binSize };
    }

    function renderHistogram(salaries, userSalary) {
      if (!histCtx) return;
      const cleaned = cleanAndSortSalaries(salaries);
      const { bins } = buildHistogramBins(cleaned, userSalary);

      if (!bins || !bins.length) {
        statusP.textContent = "No salary data to show.";
        destroyChart(chartInstance);
        chartInstance = null;
        return;
      }

      const labels = bins.map((b) => b.label);
      const counts = bins.map((b) => b.count);
      const backgroundColors = bins.map((b) =>
        b._userIncluded ? "rgba(255,0,0,0.4)" : "rgba(0,0,0,0.8)"
      );

      destroyChart(chartInstance);
      chartInstance = new Chart(histCtx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Employees",
              data: counts,
              backgroundColor: backgroundColors,
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            x: {
              title: { display: true, text: "Salary Range" },
              ticks: {
                color: (ctx) => {
                  const idx = ctx.index;
                  const bin = bins[idx];
                  return bin && bin._userIncluded ? "red" : "#000";
                },
              },
            },
            y: {
              title: { display: true, text: "Count" },
              beginAtZero: true,
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const idx = context.dataIndex;
                  const b = bins[idx];
                  return `${b.count} employees (${b.label})`;
                },
              },
            },
          },
        },
      });
    }

function renderBoxplot(salaries, userSalary) {
  if (!histCtx) return;

  const cleaned = cleanAndSortSalaries(salaries);
  if (!cleaned.length) {
    statusP.textContent = "No salary data to show.";
    destroyChart(chartInstance);
    return;
  }

  // Insert the user's salary into the dataset before calculating box stats
  let data = cleaned.slice();
  let showUser = false;

  if (typeof userSalary === "number" && Number.isFinite(userSalary) && userSalary >= 0) {
    data.push(userSalary);
    showUser = true;
  }

  data.sort((a, b) => a - b);

  const n = data.length;

  const min = data[0];
  const max = data[n - 1];

  // True quartile positions
  const q1Index = Math.floor((n - 1) * 0.25);
  const medianIndex = Math.floor((n - 1) * 0.5);
  const q3Index = Math.floor((n - 1) * 0.75);

  const q1 = data[q1Index];
  const median = data[medianIndex];
  const q3 = data[q3Index];

  // Main dataset (no mean anymore)
  const datasets = [
    {
      label: "Salary Distribution",
      data: [min, q1, median, q3, max],
      backgroundColor: [
        "rgba(100,100,255,0.6)",
        "rgba(100,150,255,0.6)",
        "rgba(100,200,255,0.6)",
        "rgba(100,150,255,0.6)",
        "rgba(100,100,255,0.6)",
      ],
      borderWidth: 1,
    },
  ];

  if (showUser) {
    // Determine which box slot the user's salary aligns with
    const positions = [null, null, null, null, null];

    if (userSalary === min) positions[0] = userSalary;
    else if (userSalary === q1) positions[1] = userSalary;
    else if (userSalary === median) positions[2] = userSalary;
    else if (userSalary === q3) positions[3] = userSalary;
    else if (userSalary === max) positions[4] = userSalary;

    datasets.push({
      label: "Your Salary",
      data: positions,
      backgroundColor: "rgba(255,0,0,0.8)",
      borderColor: "red",
      borderWidth: 2,
      type: "bar",
    });
  }

  destroyChart(chartInstance);
  chartInstance = new Chart(histCtx, {
    type: "bar",
    data: {
      labels: ["Min", "Q1", "Median", "Q3", "Max"],
      datasets,
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: showUser },
        tooltip: {
          callbacks: {
            label: function (context) {
              if (context.dataset.label === "Your Salary") {
                return "Your Salary: " + formatMoney(context.parsed.y);
              }
              return `${context.label}: ${formatMoney(context.parsed.y)}`;
            },
          },
        },
      },
      scales: {
        y: {
          title: { display: true, text: "Salary" },
          beginAtZero: false,
        },
      },
    },
  });
}


    function renderDotplot(salaries, userSalary) {
      if (!histCtx) return;
      const cleaned = cleanAndSortSalaries(salaries);
      if (!cleaned.length) {
        statusP.textContent = "No salary data to show.";
        destroyChart(chartInstance);
        return;
      }

      const dataPoints = cleaned.map((s) => ({ x: s, y: Math.random() * 0.8 }));
      destroyChart(chartInstance);
      chartInstance = new Chart(histCtx, {
        type: "scatter",
        data: {
          datasets: [
            {
              label: "Salaries",
              data: dataPoints,
              showLine: false,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            x: { title: { display: true, text: "Salary" } },
            y: { display: false },
          },
          plugins: {
            legend: { display: false },
          },
        },
      });

      if (typeof userSalary === "number" && Number.isFinite(userSalary)) {
        chartInstance.data.datasets.push({
          label: "Your salary",
          data: [{ x: userSalary, y: 0.95 }],
          pointRadius: 6,
          borderWidth: 2,
          borderColor: "red",
          backgroundColor: "rgba(255,0,0,0.6)",
          showLine: false,
        });
        chartInstance.update();
      }
    }

    async function handleGraph() {
      statusP.textContent = "";
      listingLink.innerHTML = "";

      const selectedJob = jobSelect ? jobSelect.value : "";
      if (!selectedJob) {
        statusP.textContent = "Please select a job.";
        return;
      }

      const userSalaryRaw = salaryInput ? salaryInput.value : "";
      let userSalary = null;
      if (userSalaryRaw !== "" && userSalaryRaw !== null) {
        const cleanedVal = String(userSalaryRaw).replace(/[,$\s]/g, "");
        const val = Number(cleanedVal);
        if (Number.isFinite(val) && val >= 0) userSalary = val;
      }

      const filters = {};
      if (filterAgency && filterAgency.value)
        filters.agency = filterAgency.value.trim();
      if (filterBorough && filterBorough.value)
        filters.borough = filterBorough.value.trim();
      if (filterMinSalary && filterMinSalary.value) {
        const mn = Number(
          String(filterMinSalary.value).replace(/[,$\s]/g, "")
        );
        if (Number.isFinite(mn)) filters.minSalary = mn;
      }

      try {
        const res = await fetch("/compare/graphData", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: selectedJob, filters }),
        });

        if (!res.ok) {
          statusP.textContent = "Server returned error. See console.";
          console.error("graphData non-ok", await res.text());
          return;
        }

        const json = await res.json();
        const salaries = Array.isArray(json.salaries) ? json.salaries : [];
        const type = chartTypeSelect ? chartTypeSelect.value : "histogram";

        if (!salaries.length) {
          statusP.textContent = "No salary data found for that job.";
          destroyChart(chartInstance);
          chartInstance = null;
          return;
        }

        if (type === "histogram") {
          renderHistogram(salaries, userSalary);
        } else if (type === "boxplot") {
          renderBoxplot(salaries, userSalary);
        } else if (type === "dotplot") {
          renderDotplot(salaries, userSalary);
        } else {
          statusP.textContent = "Unknown chart type.";
        }

        if (json.listingUrl) {
          listingLink.innerHTML = `<a href="${json.listingUrl}" target="_blank">Open listings for this job</a>`;
        } else {
          listingLink.innerHTML = "";
        }
      } catch (err) {
        console.error("Error fetching graph data:", err);
        statusP.textContent = "Error fetching data. Check console.";
      }
    }

    if (compareBtn) {
      compareBtn.addEventListener("click", handleGraph);
      if (jobSelect && jobSelect.value) {
        setTimeout(() => {
          handleGraph();
        }, 350);
      }
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, (m) => {
        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[m];
      });
    }

    function formatPct(v) {
      if (v === null || v === undefined || Number.isNaN(v)) return "(n/a)";
      const rounded = Math.round(v * 100) / 100;
      const sign = rounded > 0 ? "+" : "";
      return `${sign}${rounded}%`;
    }

    if (findTransitionsBtn) {
      findTransitionsBtn.addEventListener("click", async () => {
        transitionsStatus.textContent = "";
        transitionsList.innerHTML = "";
        compareResults.innerHTML = "";

        const fromTitle = (fromJobInput.value || "").trim();
        if (!fromTitle) {
          transitionsStatus.textContent = "Enter a job title.";
          return;
        }

        try {
          const res = await fetch("/compare/transitions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fromTitle }),
          });
          if (!res.ok) {
            transitionsStatus.textContent = "Server error. See console.";
            console.error("transitions non ok", await res.text());
            return;
          }
          const json = await res.json();
          const transitions = Array.isArray(json.transitions)
            ? json.transitions
            : [];
          if (!transitions.length) {
            transitionsStatus.textContent =
              "No transitions found for that job.";
            return;
          }

          transitionsList.innerHTML = "";
          transitions.slice(0, 5).forEach((t) => {
            const div = document.createElement("div");
            div.style.padding = "6px";
            div.innerHTML = `
              <label>
                <input type="checkbox" class="transition-checkbox" data-title="${escapeHtml(
                  t.title
                )}" />
                <strong>${escapeHtml(t.title)}</strong>
              </label>
              &nbsp;&nbsp; Avg: ${
                t.avgSalary ? formatMoney(t.avgSalary) : "(n/a)"
              } &nbsp;&nbsp; Count: ${t.count}
            `;
            transitionsList.appendChild(div);
          });
        } catch (e) {
          transitionsStatus.textContent =
            "Error fetching transitions. Check console.";
          console.error(e);
        }
      });
    }

    if (compareSelectedBtn) {
      compareSelectedBtn.addEventListener("click", async () => {
        compareResults.innerHTML = "";
        const checks = Array.from(
          document.querySelectorAll(".transition-checkbox")
        ).filter((c) => c.checked);

        if (checks.length !== 2) {
          compareResults.innerHTML =
            "<p style='color:darkred'>Select exactly two jobs to compare.</p>";
          return;
        }

        const titleA = checks[0].getAttribute("data-title");
        const titleB = checks[1].getAttribute("data-title");

        try {
          const res = await fetch("/compare/compareJobs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ titleA, titleB }),
          });
          if (!res.ok) {
            console.error("compareJobs non-ok", await res.text());
            compareResults.innerHTML =
              "<p style='color:darkred'>Server error when comparing.</p>";
            return;
          }
          const json = await res.json();
          const a = json.a;
          const b = json.b;
          const diffs = json.diffs || {};

          compareResults.innerHTML = `
            <table border="1" cellpadding="6">
              <tr>
                <th>Stat</th>
                <th>${escapeHtml(a.title)}</th>
                <th>${escapeHtml(b.title)}</th>
                <th>% diff (B vs A)</th>
              </tr>
              <tr>
                <td>Avg</td>
                <td>${a.avg ? formatMoney(a.avg) : "(n/a)"}</td>
                <td>${b.avg ? formatMoney(b.avg) : "(n/a)"}</td>
                <td>${formatPct(diffs.avgPct)}</td>
              </tr>
              <tr>
                <td>Median</td>
                <td>${a.median ? formatMoney(a.median) : "(n/a)"}</td>
                <td>${b.median ? formatMoney(b.median) : "(n/a)"}</td>
                <td>${formatPct(diffs.medianPct)}</td>
              </tr>
              <tr>
                <td>Min</td>
                <td>${a.min ? formatMoney(a.min) : "(n/a)"}</td>
                <td>${b.min ? formatMoney(b.min) : "(n/a)"}</td>
                <td>${formatPct(diffs.minPct)}</td>
              </tr>
              <tr>
                <td>Max</td>
                <td>${a.max ? formatMoney(a.max) : "(n/a)"}</td>
                <td>${b.max ? formatMoney(b.max) : "(n/a)"}</td>
                <td>${formatPct(diffs.maxPct)}</td>
              </tr>
              <tr>
                <td>Count</td>
                <td>${a.count}</td>
                <td>${b.count}</td>
                <td>${formatPct(diffs.countPct)}</td>
              </tr>
            </table>
          `;
        } catch (e) {
          compareResults.innerHTML =
            "<p style='color:darkred'>Error comparing jobs. Check console.</p>";
          console.error(e);
        }
      });
    }
  });
})();
