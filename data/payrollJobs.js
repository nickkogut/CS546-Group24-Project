import { payrollJobs } from "../config/mongoCollections.js";

async function _getCollection() {
  return await payrollJobs();
}

function salaryFromDoc(doc) {
  const s1 = Number(doc.startSalary);
  const s2 = Number(doc.endSalary);

  if (Number.isFinite(s1) && Number.isFinite(s2)) {
    return (s1 + s2) / 2;
  }
  if (Number.isFinite(s1)) return s1;
  if (Number.isFinite(s2)) return s2;

  return null;
}

export async function getAllPayrollTitles() {
  const collection = await _getCollection();
  const docs = await collection.find({}).project({ title: 1 }).toArray();

  const unique = new Set(
    docs
      .map((d) => (d.title || "").trim())
      .filter((t) => t.length > 0)
  );

  return Array.from(unique).sort((a, b) => a.localeCompare(b));
}

export async function getPayrollSalaries(title) {
  if (!title) throw "Missing title for salary lookup";

  const collection = await _getCollection();
  const docs = await collection.find({ title }).toArray();

  return docs
    .map((doc) => salaryFromDoc(doc))
    .filter((v) => v !== null && Number.isFinite(v));
}

export async function getCareerTransitions(fromTitle, limit = 5) {
  if (!fromTitle || typeof fromTitle !== "string") {
    throw "fromTitle must be a non-empty string";
  }

  const collection = await _getCollection();

  const fromDocs = await collection
    .find({ title: fromTitle, employee: { $exists: true } })
    .project({ employee: 1 })
    .toArray();

  if (!fromDocs || fromDocs.length === 0) return [];

  const employeeIds = Array.from(
    new Set(
      fromDocs
        .map((d) => d.employee)
        .filter((e) => typeof e === "string" && e.trim().length > 0)
    )
  );

  if (employeeIds.length === 0) return [];

  const otherDocs = await collection
    .find({
      employee: { $in: employeeIds },
      title: { $ne: fromTitle },
    })
    .project({ title: 1, startSalary: 1, endSalary: 1 })
    .toArray();

  if (!otherDocs || otherDocs.length === 0) return [];

  const stats = {};

  for (const doc of otherDocs) {
    const title = (doc.title || "").trim();
    if (!title) continue;

    const sal = salaryFromDoc(doc);
    if (!stats[title]) {
      stats[title] = { totalSalary: 0, salaryCount: 0, count: 0 };
    }
    stats[title].count += 1;
    if (sal !== null && Number.isFinite(sal)) {
      stats[title].totalSalary += sal;
      stats[title].salaryCount += 1;
    }
  }

  const arr = Object.keys(stats).map((title) => {
    const s = stats[title];
    return {
      title,
      avgSalary: s.salaryCount ? s.totalSalary / s.salaryCount : null,
      count: s.count,
    };
  });

  arr.sort((a, b) => b.count - a.count);
  return arr.slice(0, limit);
}

export async function getJobStats(title, filters = {}) {
  if (!title || typeof title !== "string") throw "title must be a string";

  const collection = await _getCollection();

  const query = { title };

  if (filters.agency) query.agency = filters.agency;
  if (filters.borough) query.borough = filters.borough;
  if (typeof filters.minSalary === "number") {
    query.$or = [
      { startSalary: { $gte: filters.minSalary } },
      { endSalary: { $gte: filters.minSalary } },
    ];
  }

  const docs = await collection
    .find(query)
    .project({ startSalary: 1, endSalary: 1 })
    .toArray();

  if (!docs || docs.length === 0)
    return { title, count: 0, avg: null, median: null, min: null, max: null };

  const salaries = docs
    .map((d) => salaryFromDoc(d))
    .filter((v) => v !== null && Number.isFinite(v))
    .sort((a, b) => a - b);

  if (salaries.length === 0)
    return { title, count: 0, avg: null, median: null, min: null, max: null };

  const n = salaries.length;
  const sum = salaries.reduce((a, b) => a + b, 0);
  const avg = sum / n;

  const min = salaries[0];
  const max = salaries[n - 1];
  const mid = Math.floor(n / 2);
  const median =
    n % 2 === 1 ? salaries[mid] : (salaries[mid - 1] + salaries[mid]) / 2;

  return { title, count: n, avg, median, min, max };
}

export async function getAllSalariesForJob(title, filters = {}) {
  if (!title || typeof title !== "string") throw "title must be a string";

  const collection = await _getCollection();
  const query = { title };

  if (filters.agency) query.agency = filters.agency;
  if (filters.borough) query.borough = filters.borough;
  if (typeof filters.minSalary === "number") {
    query.$or = [
      { startSalary: { $gte: filters.minSalary } },
      { endSalary: { $gte: filters.minSalary } },
    ];
  }

  const docs = await collection
    .find(query)
    .project({ startSalary: 1, endSalary: 1 })
    .toArray();

  return docs
    .map((d) => salaryFromDoc(d))
    .filter((v) => v !== null && Number.isFinite(v));
}

export async function getJobListingUrl(title) {
  return null;
}
