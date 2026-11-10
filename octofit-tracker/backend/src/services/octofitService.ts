import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  const payload = (typeof input === 'object' && input !== null) ? input as Record<string, unknown> : {};
  const { userId, teamId, type, minutes } = payload;

  if (!userId || !teamId || type === undefined || type === null || minutes === undefined || minutes === null) {
    throw Object.assign(new Error('userId, teamId, type, and minutes are required'), { status: 400 });
  }

  if (!mongoose.Types.ObjectId.isValid(String(userId)) || !mongoose.Types.ObjectId.isValid(String(teamId))) {
    throw Object.assign(new Error('userId and teamId must be valid ObjectIds'), { status: 400 });
  }

  const normalizedType = String(type).trim();
  const numericMinutes = Number(minutes);
  if (!normalizedType) {
    throw Object.assign(new Error('type is required'), { status: 400 });
  }
  if (!Number.isFinite(numericMinutes) || numericMinutes <= 0) {
    throw Object.assign(new Error('minutes must be a positive number'), { status: 400 });
  }

  const [user, team] = await Promise.all([
    User.findById(userId),
    Team.findById(teamId),
  ]);

  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }
  if (!team) {
    throw Object.assign(new Error('Team not found'), { status: 404 });
  }

  const activity = await Activity.create({
    user: user._id,
    team: team._id,
    type: normalizedType,
    minutes: numericMinutes,
    points: numericMinutes,
    occurredAt: new Date(),
  });

  return activity.toObject();
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  const payload = (typeof input === 'object' && input !== null) ? input as Record<string, unknown> : {};
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';

  if (!name) {
    throw Object.assign(new Error('name is required'), { status: 400 });
  }

  const mascot = typeof payload.mascot === 'string' ? payload.mascot.trim() : '';
  const rawMembers = Array.isArray(payload.members) ? payload.members : [];
  const members = rawMembers.map((member) => {
    const memberId = String(member);
    if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
      throw Object.assign(new Error('members must contain valid ObjectIds'), { status: 400 });
    }
    return new mongoose.Types.ObjectId(memberId);
  });

  const team = await Team.create({
    name,
    mascot,
    members,
  });

  return team.toObject();
}

export async function getLeaderboard() {
  const rows = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $lookup: { from: 'teams', localField: '_id', foreignField: '_id', as: 'team' } },
    { $unwind: '$team' },
    { $project: { _id: 0, teamName: '$team.name', totalPoints: 1 } },
    { $sort: { totalPoints: -1, teamName: 1 } },
  ]);

  return rows.map((entry, index) => ({
    teamName: entry.teamName,
    totalPoints: entry.totalPoints,
    rank: index + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const email = String(userEmail ?? '').trim();
  const user = await User.findOne({ email }).lean();

  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const recentActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const preferredFocus = (user.fitnessGoal && String(user.fitnessGoal).trim()) || (recentActivity?.type ? String(recentActivity.type).trim() : 'activity');

  const workouts = await Workout.find().lean();
  const suggestions = workouts
    .sort((left, right) => Number(right.focus === preferredFocus) - Number(left.focus === preferredFocus))
    .map((workout) => {
      const workoutFocus = String(workout.focus ?? '').trim();
      const recentType = recentActivity?.type ? String(recentActivity.type).trim() : 'activity';
      const reason = workoutFocus === preferredFocus
        ? `Your ${recentType} activity and ${preferredFocus} goal make this a strong fit.`
        : `This workout supports your ${preferredFocus} goal and complements recent ${recentType} activity.`;

      return {
        ...workout,
        reason,
      };
    });

  return suggestions;
}

export { User };
