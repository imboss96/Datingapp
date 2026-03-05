import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  id:              { type: String, unique: true, required: true, index: true },
  user1Id:         { type: String, required: true, index: true },
  user2Id:         { type: String, required: true, index: true },
  user1Name:       { type: String },
  user2Name:       { type: String },
  user1Image:      { type: String },
  user2Image:      { type: String },
  // ── Legacy percentage fields (kept for backward-compat) ─────────────────
  interestMatch:   { type: Number, default: 0 }, // 0–100 %
  ageMatch:        { type: Number, default: 0 }, // 0–100 %
  distanceMatch:   { type: Number, default: 0 }, // km apart (legacy)
  // ── New multi-factor composite score ────────────────────────────────────
  overallScore:    { type: Number, default: 0 }, // 0–100 composite
  proximityScore:  { type: Number, default: 0 }, // 0–20 pts
  recencyScore:    { type: Number, default: 0 }, // 0–15 pts
  trustScore:      { type: Number, default: 0 }, // 0–10 pts
  bioScore:        { type: Number, default: 0 }, // 0–5 pts
  distKm:          { type: Number, default: null }, // actual km distance
  // ─────────────────────────────────────────────────────────────────────────
  createdAt:       { type: Date, default: Date.now, index: true },
  lastInteractedAt:{ type: Date, default: Date.now },
  mutualInterests: [{ type: String }],
  notified:        { type: Boolean, default: false },
});

const Match = mongoose.model('Match', matchSchema);
export default Match;
