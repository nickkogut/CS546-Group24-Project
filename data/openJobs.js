import { checkBorough, checkDate, checkNumber, checkString, valOrDefault } from "../helpers.js";
import { openJobs } from "../config/mongoCollections.js";

export const filterJobs = async (agency, title, borough, keywords, residency, fullTime, minDate, minSalary, maxSalary) => {
    agency = valOrDefault(agency, "", checkString); // TODO: autocomplete search / show possible choices and verify that this is one of them
    title = valOrDefault(title, "", checkString); // TODO: same as agency
    keywords = valOrDefault(keywords, []);
    if (!Array.isArray(keywords)) throw "Error: keywords must be an array";
    keywords = keywords.map((keyword) => {
        checkString(keyword);
    });
    fullTime = valOrDefault(fullTime, false);                               // label as: "fulltime offered"? - we could switch the default and label as "part-time offered"
    borough = valOrDefault(borough, "", checkBorough);
    residency = valOrDefault(residency, true);                              // label as: "open to non-residents"
    minDate = valOrDefault(minDate, new Date("01/01/2000"), checkDate);
    minSalary = valOrDefault(minSalary, 0, checkNumber)
    maxSalary = valOrDefault(maxSalary, 10e8, checkNumber)


    const searchParams = {
        agency: { $regex: new RegExp(`${agency}`, "i") }, // match case insensitive, and anywhere in the string
        title: { $regex: new RegExp(`${title}`, "i") },
        borough: { $regex: new RegExp(`${borough}`, "i") },
        residency: { $in: [false, residency] }, // if residency is TRUE this matches all
        fullTime: { $in: [true, fullTime] },    // if fulltime is FALSE this matches all
        $and: [{ salary: { $gte: minSalary } }, { salary: { $lte: maxSalary } }],
        postingDate: { $gte: minDate },
    };

    // todo: keywords

    try {
        const openJobsCollection = await openJobs();
        // const jobs = await openJobsCollection.find({}).toArray();
        const jobs = await openJobsCollection.find(searchParams).toArray();
        return jobs;
        // TODO: paginate results, maybe project

    } catch (e) {
        // TODO
        throw e;
    }










}










