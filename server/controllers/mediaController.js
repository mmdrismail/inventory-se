const MediaAsset = require('../models/MediaAsset');
const { cleanStr, escapeRegex } = require('../utils/domainNormalizers');

// @desc    List registered MediaAssets with optional filter by tag/provider/category/machine/search
// @route   GET /api/media
// @access  Private
exports.getMediaAssets = async (req, res, next) => {
  try {
    const { search, tag, provider, categoryId, machineModelId, limit } = req.query;
    const filter = {};
    if (tag && tag !== 'all') filter.tag = tag;
    if (provider && provider !== 'all') filter.provider = provider;
    if (categoryId) filter.categoryId = categoryId;
    if (machineModelId) filter.machineModelId = machineModelId;

    if (search && cleanStr(search)) {
      const re = { $regex: escapeRegex(search), $options: 'i' };
      filter.$or = [{ originalName: re }, { caption: re }, { folder: re }, { tag: re }];
    }

    const lim = Math.min(200, Math.max(1, parseInt(limit, 10) || 100));
    const assets = await MediaAsset.find(filter).sort({ createdAt: -1 }).limit(lim).lean();

    res.json({
      success: true,
      count: assets.length,
      data: assets,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Content-addressable SHA-256 lookup to deduplicate identical reference images
// @route   GET /api/media/lookup-hash/:sha256
// @access  Private
exports.lookupMediaByHash = async (req, res, next) => {
  try {
    const sha256 = cleanStr(req.params.sha256).toLowerCase();
    if (!sha256) {
      return res.status(400).json({ success: false, message: 'SHA-256 hash is required.' });
    }
    const existing = await MediaAsset.findOne({ sha256 }).lean();
    res.json({
      success: true,
      found: Boolean(existing),
      data: existing || null,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register or deduplicate-reuse a MediaAsset reference in MongoDB
// @route   POST /api/media
// @access  Private
exports.registerMediaAsset = async (req, res, next) => {
  try {
    const url = cleanStr(req.body.url);
    if (!url) {
      return res.status(400).json({ success: false, message: 'Image URL is required.' });
    }

    const sha256 = cleanStr(req.body.sha256).toLowerCase();
    const productId = req.body.productId || null;

    if (sha256) {
      const existing = await MediaAsset.findOne({ sha256 });
      if (existing) {
        existing.usageCount = (existing.usageCount || 1) + 1;
        if (productId && !existing.linkedProductIds.some((id) => String(id) === String(productId))) {
          existing.linkedProductIds.push(productId);
        }
        await existing.save();
        return res.status(200).json({
          success: true,
          deduplicated: true,
          message: 'Identical image matched in Media Vault and reused without duplicate storage.',
          data: existing,
        });
      }
    }

    const asset = await MediaAsset.create({
      sha256,
      url,
      thumbnailUrl: cleanStr(req.body.thumbnailUrl) || url,
      provider: ['cloudinary', 'external_url', 'inline_webp'].includes(req.body.provider)
        ? req.body.provider
        : 'external_url',
      publicId: cleanStr(req.body.publicId),
      folder: cleanStr(req.body.folder) || 'stockline/products',
      originalName: cleanStr(req.body.originalName),
      mimeType: cleanStr(req.body.mimeType) || 'image/webp',
      originalBytes: Math.max(0, Number(req.body.originalBytes) || 0),
      compressedBytes: Math.max(0, Number(req.body.compressedBytes) || 0),
      width: Math.max(0, Number(req.body.width) || 0),
      height: Math.max(0, Number(req.body.height) || 0),
      tag: req.body.tag || 'primary',
      caption: cleanStr(req.body.caption),
      categoryId: req.body.categoryId || null,
      machineModelId: req.body.machineModelId || null,
      linkedProductIds: productId ? [productId] : [],
      usageCount: 1,
      uploadedBy: req.user?.name || req.body.uploadedBy || 'Staff',
    });

    res.status(201).json({
      success: true,
      deduplicated: false,
      message: 'Media asset registered.',
      data: asset,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a MediaAsset reference record from registry
// @route   DELETE /api/media/:id
// @access  Private (Admin, Manager)
exports.deleteMediaAsset = async (req, res, next) => {
  try {
    const asset = await MediaAsset.findByIdAndDelete(req.params.id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Media asset not found.' });
    }
    res.json({ success: true, message: 'Media asset removed from registry.' });
  } catch (error) {
    next(error);
  }
};
