import {dbConnection} from './mongoConnection.js';

const getCollectionFn = (collection) => {
  let _col = undefined;

  return async () => {
    if (!_col) {
      const db = await dbConnection();
      _col = await db.collection(collection);
    }

    return _col;
  };
};

export const users = getCollectionFn('users');
export const userJobs = getCollectionFn('userJobs');
export const payrollJobs = getCollectionFn('payrollJobs');
export const openJobs = getCollectionFn('openJobs');
export const passwordResetTokens = getCollectionFn('passwordResetTokens');
