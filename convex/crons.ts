import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()
crons.daily("sync card catalogue", { hourUTC: 5, minuteUTC: 0 }, internal.catalog.sync)
export default crons
