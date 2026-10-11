const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const TRAVEL_FREQUENCY=["Rarely","Occasionally","Monthly","Weekly","Digital Nomad"]

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, minlength: 8, select: false },
  googleId: { type: String,unique:true, sparse: true },
  avatar: { type: String, default: null },
  phone:{type:String,default:"",trim:true,maxlength:20},
  country:{type:String,default:"",trim:true,maxlength:60},
  bio:{type:String,default:"",trim:true,maxlength:300},
  travelFrequency:{type:String,enum:TRAVEL_FREQUENCY,default:"Occasionally"},

  city: { type: String, default: "" },
  language: { type: String, default: "English" },
  role: { type: String, enum: ["user", "admin", "moderator"], default: "user" },
  isActive:{type:Boolean,default:true},

  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  badges: [{ type: String }],
  savedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  contributionCount: { type: Number, default: 0 },
  plan:{type:String,enum:["free","pro"],default:"free"},
  planExpires:{type:Date},
  aiUsage:{
    data:{type:String},
    count:{type:Number,default:0},
  },

  isVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastActive: { type: Date, default: Date.now },
}, { timestamps: true });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isProActive=function()
{
  return this.plan==="pro"&& !!this.planExpires && this.planExpires.getTime()>Date.now();
}

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.aiUsage;
  delete obj.__v;
  obj.isPro = this.isProActive();
  return obj;
};

module.exports = mongoose.model("User", userSchema);
module.exports.TRAVEL_FREQUENCY=TRAVEL_FREQUENCY;