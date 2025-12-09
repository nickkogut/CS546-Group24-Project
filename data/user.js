// data/users.js
import { users as usersCollection } from "../config/mongoCollections.js";
import { ObjectId } from "mongodb";
import { checkString } from "../helpers.js";

const _idToObjectId = (id) => {
  if (!ObjectId.isValid(id)) throw "Error: invalid ObjectId";
  return new ObjectId(id);
};

export const createUser = async ({
  firstName,
  lastName,
  email,
  borough,
  age,
  resume = "",
  publicProfile = false, // opt in
  hashedPassword
}) => {
  firstName = checkString(firstName);
  lastName = checkString(lastName);
  email = checkString(email);
  borough = checkString(borough);
  if (typeof age !== "number" || age <= 0) throw "Error: invalid age";
  if (!hashedPassword) throw "Error: hashedPassword is required";

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
  const jobId = _idToObjectId(taggedJobData.jobId); // unused, throws if invalid

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
    { _id: _id },
    { $pull: { taggedJobs: { jobId: jobId } } },

  );

  if (!removalInfo) throw "Error: failed to remove job status";
  return removalInfo;

}

export const getPublicUsers = async (numResults) => {
  // Returns up to numResults users with public profiles
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
