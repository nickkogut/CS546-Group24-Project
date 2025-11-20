import { payrollJobs } from "../config/mongoCollections.js";

// Get all unique job titles
export async function getAllPayrollTitles() {
  const collection = await payrollJobs();
  const docs = await collection.find({}).project({ title: 1 }).toArray();

  const unique = new Set(
    docs
      .map(d => (d.title || "").trim())
      .filter(t => t.length > 0)
  );

  return Array.from(unique).sort((a, b) => a.localeCompare(b));
}

// Get salary list for a particular title
export async function getPayrollSalaries(title) {
  if (!title) throw "Missing title for salary lookup";

  const collection = await payrollJobs();
  const docs = await collection.find({ title }).toArray();

  const salaries = docs
    .map(doc => {
      const s1 = Number(doc.startSalary);
      const s2 = Number(doc.endSalary);

      // Average salary
      if (Number.isFinite(s1) && Number.isFinite(s2)) {
        return (s1 + s2) / 2;
      }

      // fallback if dataset is weird
      if (Number.isFinite(s1)) return s1;
      if (Number.isFinite(s2)) return s2;

      return null;
    })
    .filter(v => v !== null && Number.isFinite(v));

  return salaries;
}
