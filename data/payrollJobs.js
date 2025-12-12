// data/payrollJobs.js
import { payrollJobs, openJobs } from "../config/mongoCollections.js";

async function _getCollection() {
  return await payrollJobs();
}

// compute average salary for doc
function salaryFromDoc(doc) {
  const s1 = Number(doc.startSalary);
  const s2 = Number(doc.endSalary);
  if (Number.isFinite(s1) && Number.isFinite(s2)) return (s1 + s2) / 2;
  if (Number.isFinite(s1)) return s1;
  if (Number.isFinite(s2)) return s2;
  return null;
}

// ===== Helpers for matching payroll titles to openJobs titles =====
function normalizeTitle(str) {
  return String(str)
    .toLowerCase()
    .replace(/[-–\/]/g, " ")
    .replace(/\b(level|per|session|temporary|temp|provisional|assoc|assistant|l\d+)\b/g, "")
    .replace(/[^\w\s]/g, "")
    .trim();
}

function extractKeywords(str) {
  return normalizeTitle(str)
    .split(/\s+/)
    .filter((w) => w.length > 4);
}

function keywordOverlap(payrollTitle, openTitle) {
  const a = extractKeywords(payrollTitle);
  const b = extractKeywords(openTitle);
  let overlap = 0;
  for (const w of a) {
    if (b.includes(w)) overlap++;
  }
  return overlap;
}

// Find best-matching open job for a given payroll title
async function findMatchingOpenJobDoc(title) {
  if (!title) return null;
  const col = await openJobs();

  // Get all open job titles + urls once
  const docs = await col
    .find({})
    .project({ title: 1, url: 1 })
    .toArray();

  let best = null;
  let bestScore = 0;

  for (const d of docs) {
    if (!d.title) continue;

    const openTitle = String(d.title);

    // Strong: direct substring hit
    if (openTitle.toLowerCase().includes(title.toLowerCase())) {
      if (d.url) return d; // immediate win
    }

    // Fallback: keyword overlap
    const score = keywordOverlap(title, openTitle);
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }

  // Only accept if there's at least 1 overlapping keyword
  if (best && bestScore > 0 && best.url) return best;
  return null;
}


// list unique job titles
export async function getAllPayrollTitles() {
  const col = await _getCollection();
  const docs = await col.find({}).project({ title: 1 }).toArray();
  const set = new Set(
    docs.map((d) => (d.title || "").trim()).filter((t) => t.length > 0)
  );
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

// salaries for one job
export async function getPayrollSalaries(title) {
  if (!title) throw "Missing title";
  const col = await _getCollection();
  const docs = await col.find({ title }).toArray();
  return docs
    .map((d) => salaryFromDoc(d))
    .filter((v) => v !== null && Number.isFinite(v));
}

// transitions
export async function getCareerTransitions(fromTitle, limit = 5) {
  if (!fromTitle || typeof fromTitle !== "string")
    throw "fromTitle must be string";

  const col = await _getCollection();

  const fromDocs = await col
    .find({ title: fromTitle, employee: { $exists: true } })
    .project({ employee: 1 })
    .toArray();

  const ids = Array.from(
    new Set(
      fromDocs
        .map((d) => d.employee)
        .filter((e) => typeof e === "string" && e.trim().length > 0)
    )
  );

  if (!ids.length) return [];

  const otherDocs = await col
    .find({
      employee: { $in: ids },
      title: { $ne: fromTitle },
    })
    .project({ title: 1, startSalary: 1, endSalary: 1 })
    .toArray();

  const stats = {};

  for (const d of otherDocs) {
    const t = (d.title || "").trim();
    if (!t) continue;

    const sal = salaryFromDoc(d);
    if (!stats[t]) stats[t] = { total: 0, countSal: 0, count: 0 };

    stats[t].count++;
    if (sal !== null && Number.isFinite(sal)) {
      stats[t].total += sal;
      stats[t].countSal++;
    }
  }
  const titles = Object.keys(stats);

  // Build base array first
  const baseArr = titles.map((t) => {
    const s = stats[t];
    return {
      title: t,
      count: s.count,
      avgSalary: s.countSal ? s.total / s.countSal : null,
      url: null,
    };
  });

  // Sort by how common the transition is (same as before)
  baseArr.sort((a, b) => b.count - a.count);
  const top = baseArr.slice(0, limit);

  // Attach URLs from openJobs using keyword-overlap matching
  for (const item of top) {
    const match = await findMatchingOpenJobDoc(item.title);
    if (match && match.url) {
      item.url = match.url;
    }
  }

  return top;
}

// stats for side-by-side compare
export async function getJobStats(title, filters = {}) {
  if (!title) throw "Missing title";

  const col = await _getCollection();
  const q = { title };

  if (filters.agency) q.agency = filters.agency;
  if (filters.borough) q.borough = filters.borough;
  if (typeof filters.minSalary === "number") {
    q.$or = [
      { startSalary: { $gte: filters.minSalary } },
      { endSalary: { $gte: filters.minSalary } },
    ];
  }

  const docs = await col
    .find(q)
    .project({ startSalary: 1, endSalary: 1 })
    .toArray();

  const sals = docs
    .map((d) => salaryFromDoc(d))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);

  if (!sals.length)
    return { title, count: 0, avg: null, median: null, min: null, max: null };

  const n = sals.length;
  const sum = sals.reduce((a, b) => a + b, 0);
  const mid = Math.floor(n / 2);

  return {
    title,
    count: filters.transitionCount ?? n,
    avg: sum / n,
    min: sals[0],
    max: sals[n - 1],
    median:
      n % 2 ? sals[mid] : (sals[mid - 1] + sals[mid]) / 2,
  };
}

// list of salaries for graph
export async function getAllSalariesForJob(title, filters = {}) {
  if (!title) throw "Missing title";
  const col = await _getCollection();

  const q = { title };
  if (filters.agency) q.agency = filters.agency;
  if (filters.borough) q.borough = filters.borough;
  if (typeof filters.minSalary === "number") {
    q.$or = [
      { startSalary: { $gte: filters.minSalary } },
      { endSalary: { $gte: filters.minSalary } },
    ];
  }

  const docs = await col
    .find(q)
    .project({ startSalary: 1, endSalary: 1 })
    .toArray();

  return docs
    .map((d) => salaryFromDoc(d))
    .filter((v) => Number.isFinite(v));
}

// placeholder listing URL
export async function getJobListingUrl() {
  return null;
}

// advanced job list
export async function getAdvancedJobList(filters = {}) {
  const col = await _getCollection();
  const q = {};

  // BASIC FILTERS
  if (filters.agency) q.agency = filters.agency;
  if (filters.borough) q.borough = filters.borough;

  // YEAR FILTER LOGIC — FIXED
  const match = [];
  const yearFrom = filters.yearFrom ? Number(filters.yearFrom) : null;
  const yearTo   = filters.yearTo   ? Number(filters.yearTo)   : null;


  if (yearFrom !== null && yearTo !== null) {
    // Overlap logic
    match.push({
      $and: [
        { startYear: { $lte: yearTo } },  
        { endYear: { $gte: yearFrom } },  
      ],
    });
  } else if (yearFrom !== null) {
    match.push({ endYear: { $gte: yearFrom } });
  } else if (yearTo !== null) {
    match.push({ startYear: { $lte: yearTo } });
  }

  if (match.length > 0) q.$and = match;

  // QUERY
  const docs = await col
    .find(q)
    .project({
      title: 1,
      startSalary: 1,
      endSalary: 1,
      startYear: 1,
      endYear: 1,
    })
    .toArray();

  // STATS
  const stats = {};

  for (const d of docs) {
    const title = (d.title || "").trim();
    if (!title) continue;

    const sal = salaryFromDoc(d);
    const sy = Number(d.startYear);
    const ey = Number(d.endYear);

    if (!stats[title]) {
      stats[title] = {
        total: 0,
        countSal: 0,
        count: 0,
        minYear: sy,
        maxYear: ey,
      };
    }

    const st = stats[title];
    st.count++;

    if (Number.isFinite(sal)) {
      st.total += sal;
      st.countSal++;
    }

    if (Number.isFinite(sy)) st.minYear = Math.min(st.minYear, sy);
    if (Number.isFinite(ey)) st.maxYear = Math.max(st.maxYear, ey);
  }

  // ARRAY
  let arr = Object.keys(stats).map((t) => {
    const s = stats[t];
    return {
      title: t,
      count: s.count,
      avgSalary: s.countSal ? s.total / s.countSal : null,
      minYear: s.minYear,
      maxYear: s.maxYear,
    };
  });

  // MIN AVG FILTER
  if (typeof filters.minAvgSalary === "number") {
    arr = arr.filter(
      (j) => j.avgSalary !== null && j.avgSalary >= filters.minAvgSalary
    );
  }

  // MIN COUNT FILTER
  if (typeof filters.minCount === "number") {
    arr = arr.filter((j) => j.count >= filters.minCount);
  }

  // SORT
  arr.sort((a, b) => (b.avgSalary || 0) - (a.avgSalary || 0));

  return arr;
}


export async function getExperienceStats(title, minYears, maxYears, filters = {}) {
  if (!title) throw "Missing title";

  const col = await _getCollection();
  const q = { title };

  if (filters.agency) q.agency = filters.agency;
  if (filters.borough) q.borough = filters.borough;

  const docs = await col
    .find(q)
    .project({
      startSalary: 1,
      endSalary: 1,
      startYear: 1,
      endYear: 1,
    })
    .toArray();

  const sals = [];

  for (const d of docs) {
    const sy = Number(d.startYear);
    const ey = Number(d.endYear);
    if (!Number.isFinite(sy) || !Number.isFinite(ey)) continue;

    const yrs = ey - sy;

    if (minYears !== undefined && yrs < minYears) continue;
    if (maxYears !== undefined && yrs > maxYears) continue;

    const sal = salaryFromDoc(d);
    if (Number.isFinite(sal)) sals.push(sal);
  }

  if (!sals.length)
    return { title, minYears, maxYears, count: 0, avg: null, median: null, min: null, max: null };

  sals.sort((a, b) => a - b);
  const n = sals.length;
  const mid = Math.floor(n / 2);
  const sum = sals.reduce((a, b) => a + b, 0);

  return {
    title,
    minYears,
    maxYears,
    count: n,
    avg: sum / n,
    min: sals[0],
    max: sals[n - 1],
    median:
      n % 2 ? sals[mid] : (sals[mid - 1] + sals[mid]) / 2,
  };
}
