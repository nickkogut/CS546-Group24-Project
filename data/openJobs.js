import { checkBorough, checkDate, checkNumber, checkString, valOrDefault, clamp, checkId } from "../helpers.js";
import { openJobs, users } from "../config/mongoCollections.js";
import { keywordWhitelist } from "./openJobKeywords.js";
import { ObjectId } from "mongodb";

const parseKeywords = (input) => {
    const output = [];
    input = valOrDefault(input, "", checkString);
    if (input === "") return output;

    input = input.replace(/[^0-9a-zA-Z\-\s]/g, ""); // Remove every character that does not show up in the keyword list
    input = input.split(" ");

    keywordWhitelist.forEach((keyword) => {
        if (input.includes(keyword)) {
            output.push(keyword);
        }
    })

    return output;
}
export const filterJobs = async (jobOpts) => {
    jobOpts = valOrDefault(jobOpts, {});
    jobOpts.agency = valOrDefault(jobOpts.agency, "", checkString);
    jobOpts.title = valOrDefault(jobOpts.title, "", checkString);
    jobOpts.keywords = valOrDefault(jobOpts.keywords, []);
    jobOpts.resume = valOrDefault(jobOpts.resume, [], parseKeywords);


    if (!Array.isArray(jobOpts.keywords) && typeof jobOpts.keywords !== "string") throw "Error: keywords must be an array or string delimited by spaces";

    if (typeof jobOpts.keywords === "string") jobOpts.keywords = jobOpts.keywords.split(" ");

    // remove any empty arrays created by splitting multiple spaces in a row
    jobOpts.keywords = jobOpts.keywords.filter((keyword) => {
        if (keyword == []) {
            return false;
        }
        return true;
    });

    jobOpts.keywords = jobOpts.keywords.map((keyword) => {
        return checkString(keyword).toLowerCase();
    });
    jobOpts.keywords = [...new Set(jobOpts.keywords)]; // all keywords must appear in result

    const resumeAndKeywords = [...new Set([...jobOpts.resume, ...jobOpts.keywords])]; // sort by results with most matching keywords (not all need to match)

    jobOpts.fullTime = valOrDefault(jobOpts.fullTime, true, Boolean);
    jobOpts.nonResidency = valOrDefault(jobOpts.nonResidency, true, Boolean);
    jobOpts.borough = valOrDefault(jobOpts.borough, "", checkBorough);
    jobOpts.minDate = valOrDefault(jobOpts.minDate, new Date("01/01/2000"), checkDate);
    jobOpts.minSalary = valOrDefault(jobOpts.minSalary, 0, checkNumber);
    jobOpts.maxSalary = valOrDefault(jobOpts.maxSalary, 10e9, checkNumber);

    jobOpts.numPerPage = valOrDefault(jobOpts.numPerPage, 10, checkNumber);
    jobOpts.numPerPage = clamp(jobOpts.numPerPage, 10, 100);

    jobOpts.page = valOrDefault(jobOpts.page, 1, checkNumber);
    jobOpts.page = clamp(jobOpts.page, 1, 10e4);

    // TODO: if the user is passed here it must be authenticated previously as the current user 
    jobOpts.userId = valOrDefault(jobOpts.userId, "", checkId);
    jobOpts.jobTag = valOrDefault(jobOpts.jobTag, "", checkString);

    // Force jobTag to match one of these or be blank
    if (!["applied", "rejected", "interview scheduled", "offer received", ""].includes(jobOpts.jobTag.toLowerCase())) throw `Error: jobTag ${jobOpts.jobTag} is invalid`;



    const matchParams = {
        $match: {
            agency: { $regex: new RegExp(`${jobOpts.agency}`, "i") }, // match case insensitive, and anywhere in the string
            title: { $regex: new RegExp(`${jobOpts.title}`, "i") },
            borough: { $regex: new RegExp(`${jobOpts.borough}`, "i") },
            residency: { $in: [false, jobOpts.nonResidency] }, // if residency is TRUE this matches all
            fullTime: { $in: [true, jobOpts.fullTime] },    // if fulltime is FALSE this matches all
            $and: [{ salary: { $gte: jobOpts.minSalary } }, { salary: { $lte: jobOpts.maxSalary } }],
            postingDate: { $gte: jobOpts.minDate },
        }
    };

    // Add filters that are only active if certain data is supplied
    // i.e. only use whitelists if data is provided 

    if (jobOpts.keywords.length > 0) {
        matchParams.$match.keywords = { $all: jobOpts.keywords };
    }

    if (jobOpts.userId != "" && jobOpts.jobTag != "") {
        const usersCollection = await users();
        const user = await usersCollection.findOne({
            _id: new ObjectId(jobOpts.userId),
        });
        if (user) {
            const jobIdsMatchingJobTag = [];
            user.taggedJobs.forEach((job) => {
                if (job.applicationStatus.toLowerCase() === jobOpts.jobTag.toLowerCase()) {
                    jobIdsMatchingJobTag.push(job.jobId);
                }
            });

            matchParams.$match._id = { $in: jobIdsMatchingJobTag };
        }
    }

    // Count number of results to determine valid page range
    let numResults, maxPage;
    try {
        const openJobsCollection = await openJobs();
        numResults = await openJobsCollection.count(matchParams.$match);
        if (numResults === 0) throw "Error: no jobs found";
        maxPage = Math.ceil(numResults / jobOpts.numPerPage);
        jobOpts.page = Math.min(jobOpts.page, maxPage);
    } catch (e) {
        throw e;
    }

    const searchParams = [
        matchParams,
        {
            $set: { kwMatches: { $size: { $setIntersection: [resumeAndKeywords, "$keywords"] } } },
        },
        {
            $sort: { kwMatches: -1 },
        },
        {
            $limit: jobOpts.numPerPage + jobOpts.numPerPage * (jobOpts.page - 1),
        },
        {
            $skip: jobOpts.numPerPage * (jobOpts.page - 1)
        }
    ];


    try {
        const openJobsCollection = await openJobs();
        const jobs = await openJobsCollection.aggregate(searchParams).toArray();
        if (!jobs) throw "Error: found no jobs";
        const result = {
            pageInfo: {
                page: jobOpts.page,
                maxPage,
                numResults,
            },
            jobs
        }
        return result;
    } catch (e) {
        throw e;
    }
}


// TODO: these application status functions for the user's subdocument should be combined with the functions in users.js

// export const setAppStatus = async (userId, jobId, status) => {
//     // TODO: if the user is passed here it must be authenticated previously as the current user 
//     userId = checkId(userId);
//     jobId = checkId(jobId)
//     status = valOrDefault(status, "", checkString);

//     // Force status to match one of these or be blank
//     if (!["Applied", "Rejected", "Interview Scheduled", "Offer Received", ""].includes(status)) throw `Error: status ${status} is invalid`;

//     // Make sure the user and job ids are valid
//     const jobIdObj = new ObjectId(jobId);
//     const userIdObj = new ObjectId(userId);

//     const usersCollection = await users();
//     const user = await usersCollection.findOne({
//         _id: userIdObj
//     });
//     if (!user) throw `Error could not find user with id ${userId}`;

//     const openJobsCollection = await openJobs();
//     const job = await openJobsCollection.findOne({
//         _id: jobIdObj,
//     });
//     if (!job) throw `Error could not find job with id ${jobId}`;


//     let statusAlreadyExists = false;
//     // check if the user has already tagged this job with a status
//     for (let i = 0; i < user.taggedJobs.length; i++) {
//         if (user.taggedJobs[i].jobId.equals(jobIdObj)) {
//             if (user.taggedJobs[i].applicationStatus === status) {
//                 return true; // No update needed
//             }
//             statusAlreadyExists = true;
//             break;
//         }
//     }

//     if (!statusAlreadyExists) {
//         // add this job entry to the user
//         const insertion = await usersCollection.updateOne({
//             _id: userIdObj
//         },
//             {
//                 $push: {
//                     taggedJobs: {
//                         jobId: jobIdObj,
//                         applicationStatus: status,
//                         notes: "",
//                         confidence: 0, // TODO: what is the default?
//                     }
//                 }
//             });

//         if (!insertion) throw "Error: failed to remove job status";
//         return insertion;

//     }

//     if (status == "") {
//         // Remove the tagged job from the user
//         const removal = await usersCollection.updateOne({
//             _id: userIdObj
//         },
//             {
//                 $pull: { taggedJobs: { jobId: jobIdObj } }
//             });

//         if (!removal) throw "Error: failed to remove job status";
//         return removal; // not currentl checking whether or not a change occurred
//     }

//     // update the user's entry for this job
//     const update = await usersCollection.updateOne({
//         _id: userIdObj,
//         "taggedJobs.jobId": jobIdObj
//     },
//         {
//             $set: { "taggedJobs.$.applicationStatus": status }
//         });

//     if (!update) throw "Error: failed to update job status";
//     // TODO: may want to return updated job to the route that calls this so it can be updated on the page
//     return update;
// }

export const getDropdownOptions = async () => {
    // Returns all job titles and agencies availabile in the dataset.
    // Used to populate searchable dropdowns on the search form.
    try {
        const openJobsCollection = await openJobs();
        const response = {
            titles: await openJobsCollection.distinct("title"),
            agencies: await openJobsCollection.distinct("agency")
        };
        return response;
    } catch (e) {
        throw e;
    }



}


