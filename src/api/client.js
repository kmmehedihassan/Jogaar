/**
 * Jogaar data layer.
 *
 * With no configuration the app keeps all data in the browser (./local.js), so it
 * works as a plain static site. Set REACT_APP_API_URL (for example "/api" when the
 * site is served by `npm run server`, or "http://localhost:4000/api" during
 * development) to use the Jogaar server instead (./remote.js, server/app.js).
 */
import * as local from "./local";
import * as remote from "./remote";

export { ApiError } from "./errors";

export const USING_SERVER = Boolean(process.env.REACT_APP_API_URL);
const impl = USING_SERVER ? remote : local;

export const {
  register,
  login,
  logout,
  getCurrentUser,
  updateProfile,
  changePassword,
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  postUpdate,
  pledge,
  addComment,
  deleteComment,
  getSavedIds,
  toggleSaved,
  getDashboard,
  getNotifications,
  markNotificationsRead,
  report,
  getAdminOverview,
  adminUpdateCampaign,
  resolveReport,
  resetLocalData,
} = impl;
