// data/payrollJobs.js
import { payrollJobs } from "../config/mongoCollections.js";

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

  const arr = Object.keys(stats).map((t) => {
    const s = stats[t];
    return {
      title: t,
      count: s.count,
      avgSalary: s.countSal ? s.total / s.countSal : null,
    };
  });

  arr.sort((a, b) => b.count - a.count);
  return arr.slice(0, limit);
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
    count: n,
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

  if (filters.agency) q.agency = filters.agency;
  if (filters.borough) q.borough = filters.borough;

  if (typeof filters.yearFrom === "number") {
    q.endYear = Object.assign({}, q.endYear, { $gte: filters.yearFrom });
  }
  if (typeof filters.yearTo === "number") {
    q.startYear = Object.assign({}, q.startYear, { $lte: filters.yearTo });
  }

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

  const stats = {};

  for (const d of docs) {
    const t = (d.title || "").trim();
    if (!t) continue;

    const sal = salaryFromDoc(d);
    const sy = Number(d.startYear);
    const ey = Number(d.endYear);

    if (!stats[t]) {
      stats[t] = {
        total: 0,
        countSal: 0,
        count: 0,
        minYear: sy,
        maxYear: ey,
      };
    }

    const s = stats[t];
    s.count++;
    if (sal !== null && Number.isFinite(sal)) {
      s.total += sal;
      s.countSal++;
    }
    if (Number.isFinite(sy)) s.minYear = Math.min(s.minYear, sy);
    if (Number.isFinite(ey)) s.maxYear = Math.max(s.maxYear, ey);
  }

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

  if (typeof filters.minAvgSalary === "number") {
    arr = arr.filter(
      (j) => j.avgSalary !== null && j.avgSalary >= filters.minAvgSalary
    );
  }
  if (typeof filters.minCount === "number") {
    arr = arr.filter((j) => j.count >= filters.minCount);
  }

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
