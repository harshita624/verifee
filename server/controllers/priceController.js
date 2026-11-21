const PriceReport = require("../models/PriceReport");
const aiService = require("../services/aiService");
const { escapeRegex } = require("../utils/regex");
const { awardXp } = require("../utils/xp");
const crypto = require("crypto");
const path = require("path");
const ReceiptAsset = require("../models/ReceiptAsset");
const { productNameRegex } = require("../utils/productName");
const { normalizeCategory, categoryFilter, cleanComparisonDetails } = require("../utils/category");

const DAILY_REPORT_LIMIT = 25;

const ci = (s) => new RegExp(escapeRegex(s), "i");
const displayContributor = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Community member";
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

const anonymizeContributors = (reports) => reports.map((report) => {
  // Legacy records may carry the old automatic plausibility flag. Only human
  // approval in the current workflow should be presented as verification.
  report.isVerified = report.verificationStatus === "approved" && report.isVerified === true;
  if (report.submittedBy) {
    report.submittedBy = { name: displayContributor(report.submittedBy.name) };
  }
  return report;
});

exports.getReports = async (req, res, next) => {
  try {
    const { product, city, category, quality } = req.query;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const requestedPage = Number.parseInt(req.query.page, 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 10_000) : 1;

    const filter = { verificationStatus: { $ne: "rejected" } };
    if (product) filter.product = productNameRegex(product);
    if (city) filter.city = ci(city);
    if (category) Object.assign(filter, categoryFilter(category, product));
    if (["poor", "fair", "good", "excellent"].includes(String(quality || ""))) {
      if (quality === "good") filter.$and = [...(filter.$and || []), { $or: [{ quality: "good" }, { quality: { $exists: false } }] }];
      else filter.quality = quality;
    }

    const [reports, total, stats] = await Promise.all([
      PriceReport.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .select("-receiptUrl -receiptAssetId -images -ocrData -gpsLat -gpsLng")
        .populate("submittedBy", "name")
        .lean(),
      PriceReport.countDocuments(filter),
      PriceReport.aggregate([
        { $match: { ...filter, verificationStatus: "approved", isVerified: true } },
        {
          $group: {
            _id: null,
            avg: { $avg: "$pricePaid" },
            min: { $min: "$pricePaid" },
            max: { $max: "$pricePaid" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: anonymizeContributors(reports),
      stats: stats[0] || null,
      pagination: { total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyReports = async (req, res, next) => {
  try {
    const reports = await PriceReport.find({ submittedBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .select("product category pricePaid shopName city marketName quality notes receiptUrl receiptAssetId isVerified verificationStatus helpfulVotes createdAt")
      .lean();
    const data = await Promise.all(reports.map(async (report) => {
      report.isVerified = report.verificationStatus === "approved" && report.isVerified === true;
      if (report.receiptAssetId) {
        const assetFilter = { _id: report.receiptAssetId, owner: req.user._id };
        let asset = await ReceiptAsset.findOne(assetFilter).select("+downloadToken +downloadTokenExpiresAt");
        const now = new Date();
        if (asset && (!asset.downloadToken || !asset.downloadTokenExpiresAt || asset.downloadTokenExpiresAt <= now)) {
          const newToken = crypto.randomBytes(32).toString("hex");
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          const updated = await ReceiptAsset.updateOne(
            {
              ...assetFilter,
              $or: [
                { downloadToken: { $exists: false } },
                { downloadTokenExpiresAt: { $exists: false } },
                { downloadTokenExpiresAt: { $lte: now } },
              ],
            },
            { $set: { downloadToken: newToken, downloadTokenExpiresAt: expiresAt } }
          );
          asset = updated.matchedCount
            ? { _id: asset._id, downloadToken: newToken }
            : await ReceiptAsset.findOne(assetFilter).select("+downloadToken +downloadTokenExpiresAt");
        }
        report.receiptUrl = asset?.downloadToken
          ? `/api/v1/prices/receipt-asset/${report.receiptAssetId}?access=${asset.downloadToken}`
          : undefined;
      }
      delete report.receiptAssetId;
      return report;
    }));
    res.removeHeader("ETag");
    res.set("Cache-Control", "private, no-store, max-age=0");
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

async function saveReceiptToDatabase(req, res) {
  const asset = await ReceiptAsset.create({
    owner: req.user._id,
    filename: path.basename(req.file.originalname || "receipt").replace(/[\r\n\"\\]/g, "_").slice(0, 180),
    contentType: req.file.mimetype,
    data: req.file.buffer,
  });
  return res.status(201).json({ success: true, data: { receiptAssetId: String(asset._id) } });
}

exports.downloadReceipt = async (req, res, next) => {
  try {
    const access = String(req.query.access || "");
    if (!/^[a-f\d]{64}$/i.test(access) || !/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(401).json({ success: false, message: "Receipt link is invalid. Refresh your dashboard and try again." });
    }
    const asset = await ReceiptAsset.findOne({
      _id: req.params.id,
      downloadToken: access,
      downloadTokenExpiresAt: { $gt: new Date() },
    }).select("+data +downloadToken");
    if (!asset) return res.status(404).json({ success: false, message: "Receipt not found" });
    const safeFilename = path.basename(asset.filename).replace(/[\r\n\"\\]/g, "_");
    res.set({
      "Content-Type": asset.contentType,
      "Content-Length": String(asset.data.length),
      "Content-Disposition": `${asset.contentType === "application/pdf" ? "attachment" : "inline"}; filename="${safeFilename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    return res.send(asset.data);
  } catch (err) {
    next(err);
  }
};

exports.uploadReceipt = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Choose a receipt file to upload" });
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return await saveReceiptToDatabase(req, res);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "verifee/receipts";
    const publicId = `receipt_${req.user._id}_${timestamp}`;
    const signatureBase = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash("sha1").update(signatureBase).digest("hex");
    const form = new FormData();
    form.append("file", new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);
    form.append("api_key", CLOUDINARY_API_KEY);
    form.append("timestamp", String(timestamp));
    form.append("folder", folder);
    form.append("public_id", publicId);
    form.append("signature", signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
      method: "POST",
      body: form,
    });
    const uploaded = await response.json();
    if (!response.ok || !uploaded.secure_url) {
      const cloudinaryMessage = String(uploaded.error?.message || "");
      const permissionDenied = /missing permissions|actions=.*create/i.test(cloudinaryMessage);
      if (permissionDenied) {
        console.warn("Cloudinary upload key lacks create permission; storing receipt in MongoDB instead.");
        return await saveReceiptToDatabase(req, res);
      }
      console.error("Cloudinary receipt upload failed:", cloudinaryMessage || response.status);
      return res.status(502).json({ success: false, message: "Receipt upload failed. Please try again." });
    }
    res.status(201).json({ success: true, data: { receiptUrl: uploaded.secure_url } });
  } catch (err) {
    next(err);
  }
};

exports.createReport = async (req, res, next) => {
  try {
    const {
      product, pricePaid, shopName, city, state,
      marketName, gpsLat, gpsLng, quality, notes, details,
    } = req.body;
    const category = String(req.body.category || "").trim() || "other";

    if (!product?.trim() || !pricePaid || !city?.trim())
      return res.status(400).json({ success: false, message: "Product, price, and city are required" });

    const price = Number(pricePaid);
    if (!Number.isFinite(price) || price <= 0 || price > 10_000_000)
      return res.status(400).json({ success: false, message: "Enter a valid price greater than 0" });

    let receiptUrl;
    let receiptAssetId;
    if (req.body.receiptUrl) {
      try {
        const parsedReceiptUrl = new URL(String(req.body.receiptUrl));
        const expectedReceiptId = `receipt_${req.user._id}_`;
        if (parsedReceiptUrl.protocol !== "https:" || parsedReceiptUrl.hostname !== "res.cloudinary.com" || !parsedReceiptUrl.pathname.includes(expectedReceiptId)) {
          return res.status(400).json({ success: false, message: "Upload your receipt using the receipt upload field" });
        }
        receiptUrl = parsedReceiptUrl.toString();
      } catch {
        return res.status(400).json({ success: false, message: "Receipt link is invalid" });
      }
    }
    if (req.body.receiptAssetId) {
      if (!/^[a-f\d]{24}$/i.test(String(req.body.receiptAssetId))) {
        return res.status(400).json({ success: false, message: "Receipt reference is invalid" });
      }
      const asset = await ReceiptAsset.exists({ _id: req.body.receiptAssetId, owner: req.user._id });
      if (!asset) return res.status(400).json({ success: false, message: "Receipt upload was not found for this account" });
      receiptAssetId = asset._id;
    }
    if (receiptUrl && receiptAssetId) {
      return res.status(400).json({ success: false, message: "Choose one receipt upload" });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await PriceReport.countDocuments({ submittedBy: req.user._id, createdAt: { $gte: since } });
    if (recent >= DAILY_REPORT_LIMIT)
      return res.status(429).json({ success: false, message: "Daily contribution limit reached. Come back tomorrow." });

    const normalizedCategory = normalizeCategory(category, product);
    const normalizedQuality = ["poor", "fair", "good", "excellent"].includes(String(quality).toLowerCase()) ? String(quality).toLowerCase() : "good";
    const normalizedDetails = cleanComparisonDetails(normalizedCategory, details);
    const report = await PriceReport.create({
      product: product.trim(),
      category: normalizedCategory,
      pricePaid: price,
      shopName: shopName?.trim(),
      city: city.trim(),
      state: state?.trim(),
      marketName: marketName?.trim(),
      gpsLat: gpsLat ? Number(gpsLat) : undefined,
      gpsLng: gpsLng ? Number(gpsLng) : undefined,
      quality: normalizedQuality,
      details: normalizedDetails,
      notes: notes ? String(notes).trim().slice(0, 300) : undefined,
      receiptUrl,
      receiptAssetId,
      submittedBy: req.user._id,
      verificationStatus: "pending",
      isVerified: false,
      aiConfidence: 0,
    });

    const xpAwarded = 50;
    await awardXp(req.user._id, xpAwarded, { contributionCount: 1 });

    res.status(201).json({
      success: true,
      data: report,
      message: `Price report submitted for human review. You earned ${xpAwarded} XP.`,
      xpAwarded,
    });
  } catch (err) {
    next(err);
  }
};

exports.getProductStats = async (req, res, next) => {
  try {
    const product = decodeURIComponent(req.params.product);
    const { city, category, quality } = req.query;

    const match = { product: productNameRegex(product), verificationStatus: "approved", isVerified: true };
    if (city) match.city = ci(city);
    if (category) Object.assign(match, categoryFilter(category, product));
    if (["poor", "fair", "good", "excellent"].includes(String(quality || ""))) {
      if (quality === "good") match.$and = [...(match.$and || []), { $or: [{ quality: "good" }, { quality: { $exists: false } }] }];
      else match.quality = quality;
    }

    const [stats, recentReports] = await Promise.all([
      PriceReport.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            avg: { $avg: "$pricePaid" },
            min: { $min: "$pricePaid" },
            max: { $max: "$pricePaid" },
            count: { $sum: 1 },
          },
        },
      ]),
      PriceReport.find(match)
        .sort({ createdAt: -1 })
        .limit(5)
        .select("-receiptUrl -receiptAssetId -images -ocrData")
        .populate("submittedBy", "name")
        .lean(),
    ]);

    res.json({ success: true, data: { stats: stats[0] || null, recentReports: anonymizeContributors(recentReports) } });
  } catch (err) {
    next(err);
  }
};

exports.getPendingReports = async (_req, res, next) => {
  try {
    const reports = await PriceReport.find({ $or: [{ verificationStatus: "pending" }, { verificationStatus: { $exists: false } }] })
      .sort({ createdAt: 1 }).limit(100)
      .select("product category pricePaid shopName city state marketName quality details notes receiptUrl receiptAssetId ocrData verificationStatus isVerified submittedBy createdAt")
      .populate("submittedBy", "name email").lean();
    res.set("Cache-Control", "private, no-store");
    res.json({ success: true, data: reports });
  } catch (err) { next(err); }
};

exports.reviewReport = async (req, res, next) => {
  try {
    const status = req.body.status;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be approved or rejected." });
    }
    const filter = {
      _id: req.params.id,
      $or: [{ verificationStatus: "pending" }, { verificationStatus: { $exists: false } }],
    };
    if (status === "approved") {
      filter.$and = [{ $or: [{ receiptUrl: { $exists: true, $ne: "" } }, { receiptAssetId: { $exists: true, $ne: null } }] }];
    }
    const update = {
      $set: {
        verificationStatus: status,
        isVerified: status === "approved",
        moderationNote: String(req.body.note || "").trim().slice(0, 300) || undefined,
      },
    };
    if (status === "approved") update.$set.verifiedBy = req.user._id;
    else update.$unset = { verifiedBy: 1 };
    const report = await PriceReport.findOneAndUpdate(filter, update, { new: true, runValidators: true });
    if (!report) {
      const current = await PriceReport.findById(req.params.id).select("verificationStatus receiptUrl receiptAssetId").lean();
      if (!current) return res.status(404).json({ success: false, message: "Price report not found." });
      if (current.verificationStatus && current.verificationStatus !== "pending") {
        return res.status(409).json({ success: false, message: "This report has already been reviewed." });
      }
      return res.status(400).json({ success: false, message: "An uploaded receipt is required before approval." });
    }
    res.json({ success: true, data: report });
  } catch (err) { next(err); }
};

exports.downloadAdminReceipt = async (req, res, next) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(400).json({ success: false, message: "Receipt reference is invalid." });
    const asset = await ReceiptAsset.findById(req.params.id).select("+data");
    if (!asset) return res.status(404).json({ success: false, message: "Receipt not found." });
    const safeFilename = path.basename(asset.filename).replace(/[\r\n"\\]/g, "_");
    res.set({ "Content-Type": asset.contentType, "Content-Length": String(asset.data.length), "Content-Disposition": `${asset.contentType === "application/pdf" ? "attachment" : "inline"}; filename="${safeFilename}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    res.send(asset.data);
  } catch (err) { next(err); }
};

// FIX: a user could previously vote on the same report unlimited times.
exports.voteHelpful = async (req, res, next) => {
  try {
    const report = await PriceReport.findOneAndUpdate(
      { _id: req.params.id, votedBy: { $ne: req.user._id } },
      { $inc: { helpfulVotes: 1 }, $addToSet: { votedBy: req.user._id } },
      { new: true }
    );
    if (!report) {
      const exists = await PriceReport.exists({ _id: req.params.id });
      return res
        .status(exists ? 409 : 404)
        .json({ success: false, message: exists ? "You already voted on this report" : "Report not found" });
    }
    res.json({ success: true, data: { helpfulVotes: report.helpfulVotes } });
  } catch (err) {
    next(err);
  }
};
