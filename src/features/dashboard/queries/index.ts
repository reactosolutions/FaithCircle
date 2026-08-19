// Barrel re-export so `@/features/dashboard/queries` keeps resolving to
// this folder exactly like it resolved to the single file this replaced —
// split by audience (member/leader/admin) since the original had grown to
// 550+ lines mixing all three dashboard views in one place.
export { getMemberDashboardData, getStudentChartsData } from "./member";
export { getLeaderDashboardData, getCircleChartsData } from "./leader";
export { getAdminDashboardData, getAdminChartsData } from "./admin";
