import { users as usersCollection } from "../config/mongoCollections.js";
import { ObjectId } from "mongodb";
import { checkString } from "../helpers.js";
import { application } from "express";

const _idToObjectId = (id) => {
  if (!ObjectId.isValid(id)) throw "Error: invalid ObjectId";
  return new ObjectId(id);
};

const VALID_BOROUGHS = ["", "Manhattan", "Brooklyn", "Queens", "Bronx"];

export const createUser = async ({
  firstName,
  lastName,
  email,
  borough,
  age,
  resume = "",
  publicProfile = true,
  hashedPassword
}) => {
  firstName = checkString(firstName);
  lastName = checkString(lastName);
  email = checkString(email);
  borough = checkString(borough);
  if (typeof age !== "number" || age <= 0) throw "Error: invalid age";
  if (!hashedPassword) throw "Error: hashedPassword is required";

  // resume should be allowed to be empty at account creation
  resume = typeof resume === "string" ? resume : "";
  resume = resume.trim();

  const userDoc = {
    firstName,
    lastName,
    email,
    borough,
    age,
    public: !!publicProfile,
    resume,
    hashedPassword,
    heldJobs: [],
    taggedJobs: []
  };

  const users = await usersCollection();
  const insertInfo = await users.insertOne(userDoc);
  if (!insertInfo.insertedId) throw "Error: could not create user";

  userDoc._id = insertInfo.insertedId;
  return userDoc;
};

export const getUserById = async (id) => {
  const _id = _idToObjectId(id);
  const users = await usersCollection();
  const user = await users.findOne({ _id });
  if (!user) throw "Error: user not found";
  return user;
};

export const updateUserProfile = async (id, updates) => {
  const _id = _idToObjectId(id);
  const users = await usersCollection();

  const updateDoc = {};
  if (updates.firstName) updateDoc.firstName = checkString(updates.firstName);
  if (updates.lastName) updateDoc.lastName = checkString(updates.lastName);
  if (updates.email) updateDoc.email = checkString(updates.email);
  if (updates.borough) updateDoc.borough = checkString(updates.borough);
  if (typeof updates.age === "number") updateDoc.age = updates.age;
  if (typeof updates.public === "boolean") updateDoc.public = updates.public;
  if (typeof updates.resume === "string") updateDoc.resume = updates.resume;

  const updateInfo = await users.findOneAndUpdate(
    { _id },
    { $set: updateDoc },
    { returnDocument: "after" }
  );

  if (!updateInfo.value) throw "Error: could not update user";
  return updateInfo.value;
};

/**
 * NEW: Add a job to job history (heldJobs)
 * Supports: title, salary (optional), startDate (optional), borough (optional), currentJob (checkbox)
 * Enforces: only ONE job can be marked currentJob=true
 */
export const addJobHistory = async (userId, jobData) => {
  const _id = _idToObjectId(userId);
  const users = await usersCollection();

  const title = checkString(jobData.title, "job title").trim();
  if (title.length === 0) throw "Error: job title is required";
  if (title.length > 100) throw "Error: job title is too long";

  let salary = null;
  if (jobData.salary !== undefined && jobData.salary !== null && String(jobData.salary).trim() !== "") {
    const n = Number(jobData.salary);
    if (!Number.isFinite(n) || n < 0) throw "Error: salary must be a non-negative number";
    salary = n;
  }

  let startDate = null;
  if (jobData.startDate && String(jobData.startDate).trim() !== "") {
    const d = new Date(jobData.startDate);
    if (isNaN(d.getTime())) throw "Error: invalid start date";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d > today) throw "Error: start date cannot be in the future";
    startDate = d;
  }

  let borough = "";
  if (jobData.borough && String(jobData.borough).trim() !== "") {
    borough = checkString(jobData.borough, "borough");
  }
  if (!VALID_BOROUGHS.includes(borough)) throw "Error: invalid borough";

  const currentJob = !!jobData.currentJob;

  // If this is marked current, clear currentJob from all other jobs first
  if (currentJob) {
    await users.updateOne(
      { _id },
      { $set: { "heldJobs.$[].currentJob": false } }
    );
  }

  const job = {
    _id: new ObjectId(),
    title,
    salary,
    startDate,
    borough,
    currentJob
  };

  const updateInfo = await users.updateOne(
    { _id },
    { $push: { heldJobs: job } }
  );

  if (!updateInfo) throw "Error: could not add job";
  return job;
};

// (kept as-is in case other parts of your app still call it)
export const addHeldJob = async (userId, jobData) => {
  const _id = _idToObjectId(userId);
  const users = await usersCollection();

  const job = {
    _id: new ObjectId(),
    title: checkString(jobData.title),
    agency: checkString(jobData.agency),
    startYear: jobData.startYear,
    endYear: jobData.endYear,
    startSalary: jobData.startSalary,
    endSalary: jobData.endSalary,
    borough: checkString(jobData.borough),
    currentJob: !!jobData.currentJob
  };

  const updateInfo = await users.findOneAndUpdate(
    { _id },
    { $push: { heldJobs: job } },
    { returnDocument: "after" }
  );

  if (!updateInfo.value) throw "Error: could not add held job";
  return updateInfo.value;
};

export const addTaggedJob = async (userId, taggedJobData) => {
  const _id = _idToObjectId(userId);
  const jobId = _idToObjectId(taggedJobData.jobId);

  const taggedJob = {
    jobId: checkString(taggedJobData.jobId),
    applicationStatus: checkString(taggedJobData.applicationStatus),
    notes: taggedJobData.notes || "",
    confidence: typeof taggedJobData.confidence === "number" ? taggedJobData.confidence : 5
  };

  if (taggedJob.notes.length > 500) throw "Error: notes must be <= 500 chars";

  const users = await usersCollection();

  let updateInfo = await users.updateOne(
    { _id: new ObjectId(userId), "taggedJobs.jobId": taggedJob.jobId },
    { $set: { "taggedJobs.$": taggedJob } }
  );

  if (updateInfo.matchedCount === 0) {
    updateInfo = await users.updateOne(
      { _id: new ObjectId(userId) },
      { $push: { taggedJobs: taggedJob } }
    );
  }

  if (!updateInfo) throw "Error: could not add tagged job";
  return updateInfo;
};

export const removeTaggedJob = async (userId, jobId) => {
  const _id = _idToObjectId(checkString(userId));
  jobId = checkString(jobId);
  if (!ObjectId.isValid(jobId)) throw "Error: invalid ObjectId";

  const users = await usersCollection();

  const removalInfo = await users.updateOne(
    { _id },
    { $pull: { taggedJobs: { jobId } } }
  );

  if (!removalInfo) throw "Error: failed to remove job status";
  return removalInfo;
};

export const updateUserResume = async (id, resumeText) => {
  const _id = _idToObjectId(id);

  resumeText = checkString(resumeText, "resume");
  if (resumeText.length > 10000) throw "Error: resume is too long";

  const users = await usersCollection();

  const updateInfo = await users.findOneAndUpdate(
    { _id },
    { $set: { resume: resumeText } },
    { returnDocument: "after" }
  );

  if (!updateInfo) throw "Error: could not update resume";
  return updateInfo;
};

// kept, but your account page no longer needs it once you switch to heldJobs
export const updateCurrentJob = async (userId, jobData) => {
  const _id = _idToObjectId(userId);
  const users = await usersCollection();

  const title = checkString(jobData.title, "job title");

  const currentJob = {
    title,
    salary: typeof jobData.salary === "number" ? jobData.salary : null,
    borough: jobData.borough ? checkString(jobData.borough, "borough") : null,
    startDate: jobData.startDate || null
  };

  const updateInfo = await users.updateOne(
    { _id },
    { $set: { currentJob } }
  );

  if (!updateInfo || updateInfo.modifiedCount === 0) {
    throw "Error: could not update current job";
  }

  return updateInfo;
};

export const getPublicUsers = async (numResults) => {
  const usersCol = await usersCollection();
  const users = await usersCol.find({
    public: true
  }).limit(numResults).toArray();

  if (users) {
    return users;
  } else {
    return [];
  }
}

export const getMatchingTaggedJobs = async (userId, jobList) => {
  // Takes a list of open job ids
  // Returns an object matching each job id to its tagged job entry if it exists, or to an object with all fields set to default values otherwise
  // Used for pre-populating tag information on the openJobs page for authed users
  const output = {};

  jobList.map((jobId) => {
    return checkString(jobId);
  });

  jobList.forEach((jobId) => {
    output[jobId] = { jobId: output.jobId, applicationStatus: "", notes: "", confidence: 5 };
  });

  userId = _idToObjectId(checkString(userId));

  const usersCol = await usersCollection();
  const taggedJobMatches = await usersCol.find(
    {
      _id: new ObjectId(userId),
      "taggedJobs.jobId": { $in: jobList }
    },
    {
      projection: {
        taggedJobs: 1,
        _id: 0
      }
    }
  ).toArray();

  if (taggedJobMatches.length > 0) {
    const filtered = taggedJobMatches[0].taggedJobs.filter(j =>
      jobList.includes(j.jobId)
    );


    if (filtered.length > 0) {
      filtered.forEach((match) => {
        output[match.jobId] = match;
      });
    }
  }




  return output;
}
