const mongoose = require('mongoose');

const BackgroundCheckSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'passed', 'failed', 'expired'],
    default: 'pending'
  },
  checkType: {
    type: String,
    enum: ['basic', 'standard', 'premium'],
    default: 'basic',
    description: 'Type of background check performed'
  },
  checkResults: {
    identityVerified: {
      type: Boolean,
      default: false
    },
    ageVerified: {
      type: Boolean,
      default: false
    },
    sexOffenderCheck: {
      type: Boolean,
      default: false,
      description: 'True if person is on sex offender registry'
    },
    criminaRecordCheck: {
      type: Boolean,
      default: false,
      description: 'True if any criminal records found'
    },
    fraudCheck: {
      type: Boolean,
      default: false,
      description: 'True if any fraud history detected'
    },
    licenseVerified: {
      type: Boolean,
      default: false
    }
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'unknown'],
    default: 'unknown'
  },
  riskFactors: [
    {
      type: String,
      description: 'List of identified risk factors'
    }
  ],
  certificationNumber: {
    type: String,
    description: 'Reference number from third-party verification service'
  },
  verificationDate: Date,
  expirationDate: {
    type: Date,
    description: 'When background check expires (typically 1 year)'
  },
  verifiedBy: {
    type: String,
    enum: ['manual', 'third_party_api', 'admin_review'],
    default: 'third_party_api'
  },
  certificateUrl: String,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Auto update the updatedAt field
BackgroundCheckSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('BackgroundCheck', BackgroundCheckSchema);
